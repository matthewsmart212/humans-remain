/** Opt-in, bounded CPU/frame-cadence recorder. No DOM, timers, IO or React here. */
import {PerformanceTraceHistory,PERFORMANCE_TRACE_LIMIT,PERFORMANCE_HITCH_LIMIT,PERFORMANCE_HITCH_TRACE_LIMIT,PERFORMANCE_IMPORTANT_TRACE_LIMIT,type PerformanceTraceDetail} from './performance-trace-history';
export {PERFORMANCE_TRACE_LIMIT} from './performance-trace-history';
export type {PerformanceTraceDetail} from './performance-trace-history';
export const PERFORMANCE_LIMITS={frames:120000,wallMs:15*60*1000,sampleMs:1000} as const;
export const PERFORMANCE_COLUMNS=['elapsedMs','frameMs','updateCpuMs','renderCpuMs','simulationSteps','simulationClampedMs'] as const;
export const PERFORMANCE_PHASES=['surfaceMs','textureDrawMs','textureFlushMs','worldDrawMs','submitFlushMs','cleanupMs','shaderBuildMs','silhouetteBuildMs'] as const;
export type PerformancePhase=typeof PERFORMANCE_PHASES[number];
const phaseIndex=new Map<PerformancePhase,number>(PERFORMANCE_PHASES.map((key,index)=>[key,index]));
export type PerformanceActivity='playing'|'paused'|'bag'|'background'|'editor'|'menu'|'error';
export type PerformanceMetadata=Record<string,unknown>;
export type PerformanceSample=Record<string,unknown>;
type Event={elapsedMs:number;type:string;detail:string};
export type PerformanceSummary={frames:number;activeSeconds:number;wallSeconds:number;averageFps:number;meanFrameMs:number;p95FrameMs:number;p99FrameMs:number;worstFrameMs:number;meanUpdateCpuMs:number;meanRenderCpuMs:number;worstRenderCpuMs:number;worstRenderStage:string;worstRenderStageMs:number;over33ms:number;over50ms:number;over100ms:number;simulationSteps:number;simulationClampedMs:number;stopReason:string};
const phaseLabels=['Surface setup','Texture preparation','Texture flush','World drawing','Render flush','Cleanup'];
const PHASE_NAMES:Record<PerformancePhase,string>={surfaceMs:'Surface setup',textureDrawMs:'Texture preparation',textureFlushMs:'Texture flush',worldDrawMs:'World drawing',submitFlushMs:'Render flush',cleanupMs:'Cleanup',shaderBuildMs:'Shader builds',silhouetteBuildMs:'Silhouette builds'};
export type PerformanceStageStat={key:PerformancePhase;label:string;meanMs:number;maxMs:number;shareOfRender:number;spikesOver8ms:number};
export type PerformanceHitch={atSeconds:number;peakMs:number;repeats:number;frame:{frameMs:number;updateCpuMs:number;renderCpuMs:number;slowestStage:string}|null;activity:{stage:string;count:number;totalMs:number}[]};
export type PerformanceAnalysis={cpuSplit:{updateShare:number;renderShare:number;simulationStepsPerFrame:number};stages:PerformanceStageStat[];hitches:PerformanceHitch[];findings:string[]};
const round=(v:number)=>Math.round(v*1000)/1000;
const positive=(v:number)=>Number.isFinite(v)?Math.max(0,v):0;

export class GamePerformanceRecorder{
 overlay=false;
 recording=false;
 private activity:PerformanceActivity='paused';
 private listeners=new Set<()=>void>();
 private data:Float32Array|null=null;
 private phases:Float32Array|null=null;
 private links:Uint8Array|null=null;
 private phaseTotals=new Float64Array(PERFORMANCE_PHASES.length);
 private traceFrame=false;
 private linked=false;
 private history=new PerformanceTraceHistory();
 private generation=0;
 private count=0;
 private started=0;
 private ended=0;
 private startedIso='';
 private reason='';
 private metadata:PerformanceMetadata={};
 private samples:({elapsedMs:number}&PerformanceSample)[]=[];
 private events:Event[]=[];
 private nextSample=0;
 private previous:number|null=null;
 private frameAt=0;
 private interval=0;
 private ready=false;
 private windowMs=0;
 private windowFrames=0;
 private windowDraw=0;
 private windowWorst=0;
 private live={fps:0,frameMs:0,renderMs:0,worstMs:0};
 private lastLive=-Infinity;
 private cachedSummary:PerformanceSummary|null=null;
 private cachedAnalysis:PerformanceAnalysis|null=null;
 constructor(private readonly limits:{frames:number;wallMs:number}=PERFORMANCE_LIMITS){}
 get enabled(){return this.overlay||this.recording}
 get hasLog(){return !!this.data}
 get bufferBytes(){return (this.data?.byteLength||0)+(this.phases?.byteLength||0)+(this.links?.byteLength||0)}
 get session(){return this.generation}
 get tracing(){return this.recording&&this.traceFrame}
 phase(name:PerformancePhase,ms:number){if(this.tracing)this.phaseTotals[phaseIndex.get(name)!]+=positive(ms)}
 trace(now:number,stage:string,durationMs=0,detail:PerformanceTraceDetail={},session=this.generation){
  if(!this.recording||session!==this.generation||!Number.isFinite(now))return;
  this.history.add(now-this.started,stage,positive(durationMs),detail);
 }
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener)}};
 private notify(){for(const listener of this.listeners)listener()}
 setOverlay(value:boolean){if(value===this.overlay)return;this.overlay=value;this.resetWindow();this.notify()}
 private resetWindow(){this.previous=null;this.ready=false;this.traceFrame=false;this.linked=false;this.history.breakCapture();this.windowMs=0;this.windowFrames=0;this.windowDraw=0;this.windowWorst=0;this.lastLive=-Infinity}
 start(now:number,metadata:PerformanceMetadata){
  if(this.recording)return;
  // One allocation on the paused screen, never inside the render loop.
  this.data=new Float32Array(this.limits.frames*PERFORMANCE_COLUMNS.length);
  this.phases=new Float32Array(this.limits.frames*PERFORMANCE_PHASES.length);this.links=new Uint8Array(this.limits.frames);
  this.generation++;this.history.clear();this.phaseTotals.fill(0);
  this.count=0;this.started=now;this.ended=0;this.startedIso=new Date().toISOString();this.reason='';
  this.metadata=metadata;this.samples=[];this.events=[];this.cachedSummary=null;this.cachedAnalysis=null;this.nextSample=now;
  this.recording=true;this.resetWindow();this.event(now,'start','Recording started');this.notify();
 }
 stop(now:number,reason='Stopped by player'){
  if(!this.recording)return;
  this.event(now,'stop',reason);this.recording=false;this.traceFrame=false;this.ended=now;this.reason=reason;this.cachedSummary=null;this.cachedAnalysis=null;this.notify();
 }
 event(now:number,type:string,detail:string){
  // Lifecycle events only, never per-frame messages. Leave space for Stop.
  if(this.recording&&(this.events.length<2047||type==='stop'))this.events.push({elapsedMs:round(Math.max(0,now-this.started)),type,detail});
 }
 setActivity(activity:PerformanceActivity,now:number){
  if(activity===this.activity)return;
  this.activity=activity;this.resetWindow();this.event(now,'activity',activity);
 }
 beginFrame(now:number,activity:PerformanceActivity){
  if(!this.enabled)return false;
  this.setActivity(activity,now);
  if(this.recording&&now-this.started>=this.limits.wallMs)this.stop(now,'15-minute recording limit reached');
  if(!this.enabled||activity!=='playing')return false;
  this.frameAt=now;this.interval=this.previous===null?0:now-this.previous;this.previous=now;
  this.traceFrame=this.recording;if(this.traceFrame)this.phaseTotals.fill(0);
  this.ready=Number.isFinite(this.interval)&&this.interval>0;
  return true;
 }
 endFrame(updateCpuMs:number,renderCpuMs:number,simulationSteps:number){
  if(this.recording&&this.traceFrame&&!this.ready)this.trace(this.frameAt,'resume-frame',positive(updateCpuMs)+positive(renderCpuMs),{updateCpuMs:positive(updateCpuMs),renderCpuMs:positive(renderCpuMs),...Object.fromEntries(PERFORMANCE_PHASES.map((name,i)=>[name,round(this.phaseTotals[i])]))});
  this.traceFrame=false;
  if(!this.ready)return;this.ready=false;
  const dt=this.interval,update=positive(updateCpuMs),draw=positive(renderCpuMs);
  this.windowMs+=dt;this.windowFrames++;this.windowDraw+=draw;this.windowWorst=Math.max(this.windowWorst,dt);
  if(this.windowMs>=500){
   this.live={fps:this.windowFrames*1000/this.windowMs,frameMs:this.windowMs/this.windowFrames,renderMs:this.windowDraw/this.windowFrames,worstMs:this.windowWorst};
   this.lastLive=this.frameAt;this.windowMs=0;this.windowFrames=0;this.windowDraw=0;this.windowWorst=0;
  }
  if(!this.recording||!this.data)return;
  const i=this.count*PERFORMANCE_COLUMNS.length;
  this.data[i]=this.frameAt-this.started;this.data[i+1]=dt;this.data[i+2]=update;this.data[i+3]=draw;this.data[i+4]=simulationSteps;this.data[i+5]=Math.max(0,dt-100);
  this.phases!.set(this.phaseTotals,this.count*PERFORMANCE_PHASES.length);this.links![this.count]=this.linked?1:0;
  if(dt>1000/30||update+draw>16.667)this.history.capture(this.frameAt-this.started,this.linked?this.data[i-PERFORMANCE_COLUMNS.length]:this.frameAt-this.started,Math.max(dt,update+draw),this.count);
  this.linked=true;
  this.count++;
  if(this.count>=this.limits.frames)this.stop(this.frameAt,'Frame buffer limit reached');
 }
 sampleDue(now:number){return this.recording&&this.activity==='playing'&&now>=this.nextSample}
 sample(now:number,context:PerformanceSample){
  if(!this.sampleDue(now))return;
  this.nextSample=now+PERFORMANCE_LIMITS.sampleMs;
  if(this.samples.length<901)this.samples.push({...context,elapsedMs:round(now-this.started)});
 }
 read(now:number){
  return {overlay:this.overlay,recording:this.recording,hasLog:this.hasLog,frames:this.count,wallSeconds:this.hasLog?Math.max(0,((this.recording?now:this.ended)-this.started)/1000):0,
   activity:this.activity,live:this.activity==='playing'&&now-this.lastLive<2000?this.live:null,bufferBytes:this.bufferBytes};
 }
 summary():PerformanceSummary|null{
  if(!this.data||this.recording)return null;
  if(this.cachedSummary)return this.cachedSummary;
  // Percentile sorting is deliberately deferred until the paused results screen.
  const times=new Float32Array(this.count);let total=0,update=0,draw=0,worstDraw=0,steps=0,clamped=0,over33=0,over50=0,over100=0,worstRenderStage='Unavailable',worstRenderStageMs=0;
  for(let f=0;f<this.count;f++){
   const i=f*PERFORMANCE_COLUMNS.length,dt=this.data[i+1];times[f]=dt;total+=dt;update+=this.data[i+2];draw+=this.data[i+3];worstDraw=Math.max(worstDraw,this.data[i+3]);steps+=this.data[i+4];clamped+=this.data[i+5];
   if(dt>1000/30)over33++;if(dt>50)over50++;if(dt>100)over100++;
   for(let c=0;c<phaseLabels.length;c++){const ms=this.phases![f*PERFORMANCE_PHASES.length+c];if(ms>worstRenderStageMs){worstRenderStageMs=ms;worstRenderStage=phaseLabels[c]}}
  }
  times.sort();const n=this.count||1,p=(q:number)=>times[Math.max(0,Math.ceil(this.count*q)-1)]||0;
  return this.cachedSummary={frames:this.count,activeSeconds:round(total/1000),wallSeconds:round((this.ended-this.started)/1000),averageFps:round(total?this.count*1000/total:0),meanFrameMs:round(total/n),p95FrameMs:round(p(.95)),p99FrameMs:round(p(.99)),worstFrameMs:round(p(1)),meanUpdateCpuMs:round(update/n),meanRenderCpuMs:round(draw/n),worstRenderCpuMs:round(worstDraw),worstRenderStage,worstRenderStageMs:round(worstRenderStageMs),over33ms:over33,over50ms:over50,over100ms:over100,simulationSteps:steps,simulationClampedMs:round(clamped),stopReason:this.reason};
 }
 /** Post-stop breakdown of where frame time went and what the hitches coincided with. */
 analysis():PerformanceAnalysis|null{
  const summary=this.summary(),data=this.data,phases=this.phases;if(!summary||!data||!phases)return null;
  if(this.cachedAnalysis)return this.cachedAnalysis;
  const n=this.count,cols=PERFORMANCE_COLUMNS.length,phaseCount=PERFORMANCE_PHASES.length;
  let total=0,update=0,draw=0,sim=0,over16=0;
  const phaseTotals=new Float64Array(phaseCount),phaseMax=new Float64Array(phaseCount),phaseSpikes=new Uint32Array(phaseCount);
  for(let f=0;f<n;f++){
   const i=f*cols,dt=data[i+1];total+=dt;update+=data[i+2];draw+=data[i+3];sim+=data[i+4];if(dt>1000/60+.5)over16++;
   for(let c=0;c<phaseCount;c++){const ms=phases[f*phaseCount+c];phaseTotals[c]+=ms;if(ms>phaseMax[c])phaseMax[c]=ms;if(ms>8)phaseSpikes[c]++}
  }
  const cpu=update+draw||1,stages=PERFORMANCE_PHASES.map((key,c)=>({key,label:PHASE_NAMES[key],meanMs:round(phaseTotals[c]/(n||1)),maxMs:round(phaseMax[c]),shareOfRender:round(draw?phaseTotals[c]/draw:0),spikesOver8ms:phaseSpikes[c]})).filter(s=>s.meanMs>0||s.maxMs>0).sort((a,b)=>b.meanMs-a.meanMs);
  const {hitchCaptures}=this.history.snapshot();
  const hitches=[...hitchCaptures].sort((a,b)=>b.peakMs-a.peakMs).slice(0,8).map(capture=>{
   const byStage=new Map<string,{count:number;ms:number}>();
   for(const t of capture.traceEvents){const entry=byStage.get(t.stage)||{count:0,ms:0};entry.count++;entry.ms+=t.durationMs;byStage.set(t.stage,entry)}
   const worst=capture.worstFrameIndex,wi=worst*cols,frame=worst<n?{frameMs:round(data[wi+1]),updateCpuMs:round(data[wi+2]),renderCpuMs:round(data[wi+3]),slowestStage:this.slowestStage(worst)}:null;
   return {atSeconds:round(capture.fromMs/1000),peakMs:capture.peakMs,repeats:capture.triggerCount,frame,activity:[...byStage].sort((a,b)=>b[1].ms-a[1].ms).slice(0,4).map(([stage,v])=>({stage,count:v.count,totalMs:round(v.ms)}))};
  });
  const findings:string[]=[];
  const renderShare=draw/cpu,meanBudget=total/(n||1);
  findings.push(`Average frame ${summary.meanFrameMs.toFixed(1)} ms (${summary.averageFps.toFixed(0)} FPS). ${Math.round(over16/(n||1)*100)}% of frames missed the 60 FPS budget, ${summary.over33ms} missed 30 FPS.`);
  findings.push(renderShare>.65?`Drawing dominates: Skia picture recording averages ${summary.meanRenderCpuMs.toFixed(1)} ms per frame versus ${summary.meanUpdateCpuMs.toFixed(1)} ms of simulation. Reducing draw calls, visible sprites or shader rebuilds will help most.`:renderShare<.35?`Simulation dominates: world update averages ${summary.meanUpdateCpuMs.toFixed(1)} ms per frame versus ${summary.meanRenderCpuMs.toFixed(1)} ms drawing. Enemy AI, collision and pathfinding are the first places to look.`:`Simulation (${summary.meanUpdateCpuMs.toFixed(1)} ms) and drawing (${summary.meanRenderCpuMs.toFixed(1)} ms) share the frame roughly equally.`);
  if(stages[0])findings.push(`Heaviest render stage: ${stages[0].label} at ${stages[0].meanMs.toFixed(2)} ms average, ${stages[0].maxMs.toFixed(1)} ms worst (${Math.round(stages[0].shareOfRender*100)}% of render CPU).`);
  const shaderBuilds=stages.find(s=>s.key==='shaderBuildMs'),silhouettes=stages.find(s=>s.key==='silhouetteBuildMs');
  if(shaderBuilds&&shaderBuilds.spikesOver8ms)findings.push(`${shaderBuilds.spikesOver8ms} frames spent over 8 ms compiling or rebuilding terrain shaders (worst ${shaderBuilds.maxMs.toFixed(1)} ms). Those appear as stutters when new terrain or river sections come into view.`);
  if(silhouettes&&silhouettes.spikesOver8ms)findings.push(`${silhouettes.spikesOver8ms} frames spent over 8 ms building shelter silhouettes (worst ${silhouettes.maxMs.toFixed(1)} ms).`);
  const loading=new Map<string,{count:number;ms:number}>();for(const h of hitches)for(const a of h.activity){const e=loading.get(a.stage)||{count:0,ms:0};e.count+=a.count;e.ms+=a.totalMs;loading.set(a.stage,e)}
  const topLoad=[...loading].sort((a,b)=>b[1].ms-a[1].ms)[0];
  if(hitches.length)findings.push(`${hitchCaptures.length} hitch window${hitchCaptures.length===1?'':'s'} recorded; the worst peaked at ${hitches[0].peakMs.toFixed(0)} ms around ${performanceDuration(hitches[0].atSeconds)}${hitches[0].frame?.slowestStage?` with ${hitches[0].frame.slowestStage} as the slowest stage`:''}.${topLoad?` Most hitches overlapped "${topLoad[0]}" activity (${topLoad[1].count} events, ${topLoad[1].ms.toFixed(0)} ms).`:''}`);
  else findings.push('No hitch windows were recorded: no frame exceeded 33 ms or 16.7 ms of CPU.');
  if(summary.simulationClampedMs>0)findings.push(`${summary.simulationClampedMs.toFixed(0)} ms of game time was dropped because frames exceeded the 100 ms catch-up cap; the game visibly slowed rather than skipped.`);
  if(meanBudget<17&&summary.p99FrameMs<34)findings.push('Overall pacing is healthy; focus on the individual hitch windows above.');
  return this.cachedAnalysis={cpuSplit:{updateShare:round(update/cpu),renderShare:round(renderShare),simulationStepsPerFrame:round(sim/(n||1))},stages,hitches,findings};
 }
 private slowestStage(frame:number){
  let best='',bestMs=0;const phaseCount=PERFORMANCE_PHASES.length;
  for(let c=0;c<phaseCount;c++){const ms=this.phases![frame*phaseCount+c];if(ms>bestMs){bestMs=ms;best=PHASE_NAMES[PERFORMANCE_PHASES[c]]}}
  return best;
 }
 exportJson(){
  const summary=this.summary();if(!summary||!this.data)throw Error('Stop recording before exporting.');
  const frames:number[][]=[];for(let f=0;f<this.count;f++){const row:number[]=[];for(let c=0;c<PERFORMANCE_COLUMNS.length;c++)row.push(round(this.data[f*PERFORMANCE_COLUMNS.length+c]));frames.push(row)}
  const renderPhases=frames.map((_,i)=>Array.from(this.phases!.subarray(i*PERFORMANCE_PHASES.length,(i+1)*PERFORMANCE_PHASES.length),round));
  const {traceEvents,importantTraceEvents,hitchCaptures,browserCapabilities,retention}=this.history.snapshot();
  const describe=(i:number)=>({frameIndex:i,elapsedMs:frames[i][0],updateCpuMs:frames[i][2],renderCpuMs:frames[i][3],phases:Object.fromEntries(PERFORMANCE_PHASES.map((name,c)=>[name,renderPhases[i][c]]))});
  const slowIndices=frames.flatMap((r,i)=>r[1]>1000/30||r[2]+r[3]>16.667?[i]:[]).sort((a,b)=>Math.max(frames[b][1],frames[b][2]+frames[b][3])-Math.max(frames[a][1],frames[a][2]+frames[a][3]));
  const slowFrames=slowIndices.slice(0,128).map(i=>({frameMs:frames[i][1],current:describe(i),previous:this.links![i]?describe(i-1):null,captureIds:hitchCaptures.filter(c=>frames[i][0]>=c.fromMs&&frames[i][0]<=c.toMs).map(c=>c.id)}));
  const phaseSummary=Object.fromEntries(PERFORMANCE_PHASES.map((name,c)=>{const xs=renderPhases.map(row=>row[c]).sort((a,b)=>a-b);return [name,{meanMs:round(xs.reduce((a,b)=>a+b,0)/(xs.length||1)),p95Ms:xs[Math.max(0,Math.ceil(xs.length*.95)-1)]||0,maxMs:xs.at(-1)||0}]}));
  return JSON.stringify({schema:'safety-last-performance/v2',recorderRevision:'hitch-retention-2026-10-23',startedAt:this.startedIso,metadata:this.metadata,limits:{...this.limits,traceEvents:PERFORMANCE_TRACE_LIMIT,slowFrames:128,hitchCaptures:PERFORMANCE_HITCH_LIMIT,traceEventsPerHitch:PERFORMANCE_HITCH_TRACE_LIMIT,importantTraceEvents:PERFORMANCE_IMPORTANT_TRACE_LIMIT},
   measurement:{fps:'Game requestAnimationFrame callback cadence during active play; not GPU/display FPS.',updateCpu:'Synchronous world simulation, streaming and audio work on the JS thread.',renderCpu:'CPU drawing/submission (web) or Skia picture recording (native); not GPU completion.',frameIntervals:'Unclamped callback intervals. First frame after a pause/background/resume is excluded.',clampedTime:'Active frame time above the simulation 100 ms catch-up cap.',context:'Sampled at most once per second, not per-frame visibility/draw-call counts.',privacy:'Local diagnostic log. Includes in-game position and device/render settings; no account credentials or world artwork.'},
   diagnostics:{phaseTiming:'Synchronous CPU time, not GPU execution. shaderBuildMs and silhouetteBuildMs are nested within worldDrawMs; do not sum them twice. Zero means no measured work (or unsupported stage on this platform).',frameAlignment:'frameMs ends at this callback. Its delay may originate in the previous callback. Slow-frame records link both, never across pause/resume.',assetTiming:'Download/decode/queue spans are elapsed wall time and may overlap frames; they are not CPU attribution. Texture draw/flush spans are synchronous CPU.',gpuMemory:'CanvasKit cache counters, not total process/GPU memory; null means unavailable, not zero.',traceRetention:'Recent events, important events and hitch captures share event IDs. Deduplicate by id. Captures keep nearby evidence for the worst 32 windows; per-window omissions are explicit. Overlap is not proof of causation.',...retention,slowFramesOmitted:Math.max(0,slowIndices.length-128)},
   summary,analysis:this.analysis(),events:this.events,contextSamples:this.samples,frameColumns:PERFORMANCE_COLUMNS,frames,renderPhaseColumns:PERFORMANCE_PHASES,renderPhases,phaseSummary,slowFrames,traceEvents,importantTraceEvents,hitchCaptures,browserCapabilities});
 }
 filename(){return `humans-remain-performance-${this.startedIso.replace(/[:.]/g,'-')}.json`}
}

export function performanceDuration(seconds:number){const n=Math.floor(seconds);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`}
export function performanceResultRows(summary:PerformanceSummary){return [
 ['Average FPS',summary.averageFps.toFixed(1)],['Frame p95 / p99',`${summary.p95FrameMs.toFixed(1)} / ${summary.p99FrameMs.toFixed(1)} ms`],
 ['Worst frame',`${summary.worstFrameMs.toFixed(1)} ms`],['CPU update / render',`${summary.meanUpdateCpuMs.toFixed(1)} / ${summary.meanRenderCpuMs.toFixed(1)} ms`],
 ['Largest render-stage spike',summary.worstRenderStageMs?`${summary.worstRenderStage} · ${summary.worstRenderStageMs.toFixed(1)} ms`:'Unavailable'],
 ['Frames > 50 / 100 ms',`${summary.over50ms} / ${summary.over100ms}`],['Active play / frames',`${performanceDuration(summary.activeSeconds)} / ${summary.frames.toLocaleString()}`]
]}
