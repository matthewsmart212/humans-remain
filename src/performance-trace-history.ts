/** Bounded event history with separate retention for faults and slow frames. */
export const PERFORMANCE_TRACE_LIMIT=2048;
export const PERFORMANCE_HITCH_LIMIT=32;
export const PERFORMANCE_HITCH_TRACE_LIMIT=256;
export const PERFORMANCE_IMPORTANT_TRACE_LIMIT=128;
export type PerformanceTraceDetail=Record<string,string|number|boolean>;
type Trace={id:number;elapsedMs:number;durationMs:number;stage:string;detail:PerformanceTraceDetail};
type HitchCapture={id:number;fromMs:number;toMs:number;peakMs:number;worstFrameIndex:number;triggerCount:number;traceEvents:Trace[];traceEventsOmitted:number};
const importantStages=new Set(['browser-capabilities','webglcontextlost','webglcontextrestored','stream-failed','surface-created','resume-frame']);
const overlaps=(trace:Trace,capture:HitchCapture)=>trace.elapsedMs<=capture.toMs&&trace.elapsedMs+trace.durationMs>=capture.fromMs;
const round=(value:number)=>Math.round(value*1000)/1000;

export class PerformanceTraceHistory{
 private recent:Trace[]=[];
 private important:Trace[]=[];
 private captures:HitchCapture[]=[];
 private active:HitchCapture|null=null;
 private count=0;
 private importantCount=0;
 private captureCount=0;
 private capabilities:PerformanceTraceDetail|null=null;
 clear(){this.recent=[];this.important=[];this.captures=[];this.active=null;this.count=0;this.importantCount=0;this.captureCount=0;this.capabilities=null}
 breakCapture(){this.active=null}
 private append(capture:HitchCapture,trace:Trace){
  if(!overlaps(trace,capture))return;
  if(capture.traceEvents.length<PERFORMANCE_HITCH_TRACE_LIMIT)capture.traceEvents.push(trace);
  else capture.traceEventsOmitted++;
 }
 add(elapsedMs:number,stage:string,durationMs:number,detail:PerformanceTraceDetail){
  const trace:Trace={id:this.count,elapsedMs:round(elapsedMs),durationMs:round(durationMs),stage:stage.slice(0,64),detail};
  this.recent[this.count++%PERFORMANCE_TRACE_LIMIT]=trace;
  if(importantStages.has(stage))this.important[this.importantCount++%PERFORMANCE_IMPORTANT_TRACE_LIMIT]=trace;
  if(stage==='browser-capabilities')this.capabilities=detail;
  // Async spans are inserted on completion, and can overlap an older capture.
  // These are shared references, not event/detail copies or per-frame scans.
  for(const capture of this.captures)this.append(capture,trace);
 }
 capture(at:number,previousAt:number,score:number,frameIndex:number){
  // Nearby slow frames share a fixed window with at least a second afterwards.
  if(this.active&&at<=this.active.toMs-1000){
   this.active.triggerCount++;
   if(score>this.active.peakMs){this.active.peakMs=round(score);this.active.worstFrameIndex=frameIndex}
   return;
  }
  this.active=null;
  const id=this.captureCount++;
  let replace=-1;
  if(this.captures.length>=PERFORMANCE_HITCH_LIMIT){
   replace=0;for(let i=1;i<this.captures.length;i++)if(this.captures[i].peakMs<this.captures[replace].peakMs)replace=i;
   if(score<=this.captures[replace].peakMs)return;
  }
  // Bound a single extreme callback gap too: retain the preceding callback
  // separately through slowFrames, with a maximum five-second event window.
  const capture:HitchCapture={id,fromMs:round(Math.max(0,at-3000,previousAt-1000)),toMs:round(at+2000),peakMs:round(score),worstFrameIndex:frameIndex,triggerCount:1,traceEvents:[],traceEventsOmitted:0};
  for(let i=Math.max(0,this.count-PERFORMANCE_TRACE_LIMIT);i<this.count;i++)this.append(capture,this.recent[i%PERFORMANCE_TRACE_LIMIT]);
  if(replace<0)this.captures.push(capture);else this.captures[replace]=capture;
  this.active=capture;
 }
 snapshot(){
  const ordered=(events:Trace[],count:number,limit:number)=>count>limit?[...events.slice(count%limit),...events.slice(0,count%limit)]:events;
  const traceEvents=ordered(this.recent,this.count,PERFORMANCE_TRACE_LIMIT),importantTraceEvents=ordered(this.important,this.importantCount,PERFORMANCE_IMPORTANT_TRACE_LIMIT);
  const hitchCaptures=[...this.captures].sort((a,b)=>a.fromMs-b.fromMs);
  const retained=new Set<number>();for(const trace of traceEvents)retained.add(trace.id);for(const trace of importantTraceEvents)retained.add(trace.id);for(const capture of hitchCaptures)for(const trace of capture.traceEvents)retained.add(trace.id);
  return {traceEvents,importantTraceEvents,hitchCaptures,browserCapabilities:this.capabilities,
   retention:{traceEventsTotal:this.count,traceEventsDropped:this.count-retained.size,recentTraceEventsOverwritten:Math.max(0,this.count-PERFORMANCE_TRACE_LIMIT),importantTraceEventsOverwritten:Math.max(0,this.importantCount-PERFORMANCE_IMPORTANT_TRACE_LIMIT),hitchCapturesOmitted:this.captureCount-hitchCaptures.length}};
 }
}
