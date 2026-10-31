import type {GamePerformanceRecorder} from './performance-recording';

/** Browser scheduling evidence, opt-in only. Safari may expose neither entry
 * type: record that explicitly, never imply that no entries means no blocking. */
export function observeBrowserPerformance(recorder:GamePerformanceRecorder,canvas:HTMLCanvasElement){
 let active=false;const observers:PerformanceObserver[]=[];
 const contextEvent=(event:Event)=>recorder.trace(performance.now(),event.type,0,{});
 const stop=()=>{for(const observer of observers)observer.disconnect();observers.length=0;canvas.removeEventListener?.('webglcontextlost',contextEvent);canvas.removeEventListener?.('webglcontextrestored',contextEvent);active=false};
 const sync=()=>{
  if(!recorder.recording){stop();return}if(active)return;active=true;
  const supported=typeof PerformanceObserver==='undefined'?[]:PerformanceObserver.supportedEntryTypes||[],session=recorder.session;
  const requested=['longtask','long-animation-frame'].filter(type=>supported.includes(type)),installed:string[]=[];
  for(const type of requested){
   let observer:PerformanceObserver|undefined;
   try{
    observer=new PerformanceObserver(list=>{for(const entry of list.getEntries())recorder.trace(entry.startTime,`browser-${type}`,entry.duration,{},session)});
    observer.observe({type,buffered:false});observers.push(observer);installed.push(type);
   }catch{observer?.disconnect()}
  }
  recorder.trace(performance.now(),'browser-capabilities',0,{longTasks:installed.includes('longtask'),longAnimationFrames:installed.includes('long-animation-frame')});
  canvas.addEventListener?.('webglcontextlost',contextEvent);canvas.addEventListener?.('webglcontextrestored',contextEvent);
 };
 const unsubscribe=recorder.subscribe(sync);sync();
 return()=>{unsubscribe();stop()};
}
