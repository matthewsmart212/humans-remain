import type {GamePerformanceRecorder} from '../src/performance-recording';

export type NativeWorkPriority='foreground'|'prefetch';
export type NativeFrameWorkHint={
 /** Stable cost family, such as a raster batch or decoded-image size bucket. */
 kind:string;priority:NativeWorkPriority;initialMs:number;
};
export type NativeFrameWorkSource={
 name:string;peek:()=>NativeFrameWorkHint|null;run:()=>void;maxPerFrame?:number;
};
type Source={source:NativeFrameWorkSource;lastRun:number;waitingSince:number|null;deferredFrames:number};
type Cost={mean:number;recent:number;samples:number};
const PREPARATION_MS=10,MIN_HEADROOM_MS=.25,MAX_UNITS=24,OVERDUE_MS=250,UNAVOIDABLE_WAIT_MS=1000,UNAVOIDABLE_COOLDOWN_MS=500;

/** Shares the time left after gameplay between map and artwork preparation.
 * Admission is adaptive, not a hard real-time guarantee: Skia decode/raster
 * calls cannot be interrupted. Overdue work may borrow spare full-frame time;
 * a slower-than-frame unit eventually runs alone at a bounded rate, so a cost
 * estimate cannot deadlock visible loading on a consistently busy device.
 * Every overrun remains observable; late gameplay frames never force a unit. */
export class NativeFrameWorkScheduler{
 private sources=new Set<Source>();
 private costs=new Map<string,Cost>();
 private serial=0;
 private lastUnavoidableAt=-Infinity;
 private disposed=false;
 private totals={units:0,deferredFrames:0,overdueUnits:0,unavoidableUnits:0,overruns:0,lastMs:0};
 constructor(private diagnostics?:GamePerformanceRecorder,private now:()=>number=()=>performance.now()){}
 register(source:NativeFrameWorkSource){
  if(this.disposed)return()=>{};
  const entry:Source={source,lastRun:0,waitingSince:null,deferredFrames:0};this.sources.add(entry);
  return()=>{this.sources.delete(entry)};
 }
 /** Startup uses the same cost history, while its preparation can run before
  * a gameplay loop exists. The renderer calls this for each standalone warm. */
 observe(source:string,kind:string,ms:number){
  if(!Number.isFinite(ms)||ms<0)return;
  const key=source+':'+kind,old=this.costs.get(key);
  if(old){old.mean=old.mean*.75+ms*.25;old.recent=Math.max(ms,old.recent*.9);old.samples++}
  else{if(this.costs.size>=128)this.costs.delete(this.costs.keys().next().value!);this.costs.set(key,{mean:ms,recent:ms,samples:1})}
 }
 private estimate(source:string,hint:NativeFrameWorkHint){
  const cost=this.costs.get(source+':'+hint.kind);
  return Math.max(MIN_HEADROOM_MS,cost?Math.max(cost.mean*1.2,cost.recent):hint.initialMs);
 }
 drain(frameStart:number,frameIntervalMs=1000/60){
  if(this.disposed)return;
  const start=this.now(),frameMs=Number.isFinite(frameIntervalMs)?Math.max(8,Math.min(1000/60,frameIntervalMs)):1000/60;
  const allowance=Math.min(PREPARATION_MS,frameMs*.6),deadline=frameStart+allowance;
  const counts=new Map<Source,number>();let units=0,overdueUnits=0,unavoidableUnits=0;
  const candidates=()=>{
   const now=this.now(),pending:{entry:Source;hint:NativeFrameWorkHint;estimate:number;age:number}[]=[];
   for(const entry of this.sources){
    const hint=entry.source.peek();
    if(!hint){entry.waitingSince=null;entry.deferredFrames=0;continue}
    entry.waitingSince??=now;
    if((counts.get(entry)??0)>=(entry.source.maxPerFrame??MAX_UNITS))continue;
    pending.push({entry,hint,estimate:this.estimate(entry.source.name,hint),age:now-entry.waitingSince});
   }
   // Foreground has priority, but aged prefetch competes equally. Round-robin
   // within a priority prevents one continually populated source monopolising it.
   return pending.sort((a,b)=>Number(b.hint.priority==='foreground'||b.age>=OVERDUE_MS)-Number(a.hint.priority==='foreground'||a.age>=OVERDUE_MS)||a.entry.lastRun-b.entry.lastRun);
  };
  while(units<MAX_UNITS){
   const now=this.now(),remaining=deadline-now,pending=candidates();
   if(!pending.length)break;
   if(remaining<MIN_HEADROOM_MS)break;
   let next=pending.find(p=>p.estimate<=remaining),overdue=false,unavoidable=false;
   if(units===0){
    // First borrow real frame headroom, retaining a 2 ms reserve. A 6 ms game
    // frame can still finish a pending 7 ms operation without starving it.
    const fullHeadroom=frameStart+frameMs-2-now;
    const waiting=pending.filter(p=>p.age>=OVERDUE_MS&&p.estimate>remaining);
    const borrowed=waiting.find(p=>p.estimate<=fullHeadroom);
    if(borrowed){next=borrowed;overdue=true}
    // No admission policy can make a 20 ms synchronous decode fit 16.7 ms.
    // Keep its fallback visible, then allow one overdue operation in isolation
    // at most twice/second. Never do this after gameplay has used the normal
    // allowance. Trace the exception so it cannot masquerade as smooth work.
    if(!borrowed&&now-this.lastUnavoidableAt>=UNAVOIDABLE_COOLDOWN_MS){
     const forced=waiting.find(p=>p.age>=UNAVOIDABLE_WAIT_MS);
     if(forced){next=forced;overdue=unavoidable=true}
    }
   }
   if(!next)break;
   const {entry,hint}=next,at=this.now();
   try{entry.source.run()}finally{
    const elapsed=Math.max(0,this.now()-at);this.observe(entry.source.name,hint.kind,elapsed);
    entry.lastRun=++this.serial;entry.waitingSince=null;entry.deferredFrames=0;
    counts.set(entry,(counts.get(entry)??0)+1);units++;
    if(overdue)overdueUnits++;
    if(unavoidable){unavoidableUnits++;this.lastUnavoidableAt=at}
   }
   if(overdue)break;
  }
  let waiting=0;
  for(const entry of this.sources)if(entry.source.peek()){
   entry.waitingSince??=this.now();entry.deferredFrames++;waiting++;
  }else{entry.waitingSince=null;entry.deferredFrames=0}
  const elapsed=Math.max(0,this.now()-start),overrun=units>0&&this.now()>deadline;
  this.totals.units+=units;this.totals.deferredFrames+=waiting?1:0;this.totals.overdueUnits+=overdueUnits;this.totals.unavoidableUnits+=unavoidableUnits;this.totals.overruns+=overrun?1:0;this.totals.lastMs=elapsed;
  if(this.diagnostics?.recording&&(elapsed>=1||overdueUnits))this.diagnostics.trace(start,'native-preparation-work',elapsed,{units,waiting,overdueUnits,unavoidableUnits,overrun,frameHeadroomMs:Math.max(0,deadline-start),sources:[...counts].map(([entry,count])=>entry.source.name+':'+count).join(',')});
 }
 stats(){return{...this.totals,sources:this.sources.size,costFamilies:this.costs.size}}
 dispose(){this.disposed=true;this.sources.clear();this.costs.clear()}
}
