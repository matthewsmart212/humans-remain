import type {GamePerformanceRecorder,PerformanceTraceDetail} from '../src/performance-recording';

export const DEVICE_CONTEXT_INTERVAL_MS=2000;
export type NativeDeviceContext={
 session:number;sequence:number;nativeUptimeMs:number;nativeSampleMs:number;
 thermalState:'nominal'|'fair'|'serious'|'critical'|'unknown';lowPowerMode:boolean;
 memoryStatus:number;memoryAvailable:boolean;residentBytes?:number;physicalFootprintBytes?:number;
};
export type NativeDeviceContextModule={sample:(session:number,sequence:number)=>Promise<NativeDeviceContext>};
type Recorder=Pick<GamePerformanceRecorder,'recording'|'session'|'trace'|'read'>;
type Clock={now:()=>number;later:(callback:()=>void,ms:number)=>unknown;cancel:(timer:unknown)=>void};
const systemClock:Clock={now:()=>performance.now(),later:(callback,ms)=>setTimeout(callback,ms),cancel:timer=>clearTimeout(timer as ReturnType<typeof setTimeout>)};
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0;

/** Reject malformed native results rather than turning unavailable memory into
 * a plausible zero. Native time and JS time are deliberately kept separate. */
export function deviceContextDetail(sample:NativeDeviceContext):PerformanceTraceDetail|null{
 if(!finite(sample.nativeUptimeMs)||!finite(sample.nativeSampleMs)||!Number.isInteger(sample.memoryStatus)||typeof sample.lowPowerMode!=='boolean'||typeof sample.memoryAvailable!=='boolean'||!['nominal','fair','serious','critical','unknown'].includes(sample.thermalState))return null;
 const detail:PerformanceTraceDetail={nativeUptimeMs:sample.nativeUptimeMs,nativeSampleMs:sample.nativeSampleMs,thermalState:sample.thermalState,lowPowerMode:sample.lowPowerMode,memoryStatus:sample.memoryStatus,memoryAvailable:sample.memoryAvailable};
 if(sample.memoryAvailable){
  if(!finite(sample.residentBytes)||!finite(sample.physicalFootprintBytes))return null;
  detail.residentBytes=sample.residentBytes;detail.physicalFootprintBytes=sample.physicalFootprintBytes;
 }
 return detail;
}

/** One native request at a time, including across stop/start and app lifecycle
 * changes. No timer or native sampling is scheduled while inactive. */
export class NativeDeviceContextSampler{
 private enabled=false;private generation=0;private session=-1;private announced=-1;
 private pending=false;private sequence=0;private failures=0;private timer:unknown;
 constructor(private recorder:Recorder,private module:NativeDeviceContextModule|null,private platform:string,private clock:Clock=systemClock){}
 configure(active:boolean){
  const enabled=active&&this.recorder.recording,session=this.recorder.session;
  if(this.enabled===enabled&&this.session===session)return;
  this.enabled=enabled;this.session=session;this.generation++;this.failures=0;this.clearTimer();
  if(this.announced!==session)this.sequence=0;
  if(!enabled)return;
  if(this.announced!==session){
   this.announced=session;
   this.recorder.trace(this.clock.now(),'native-device-context-capability',0,{available:!!this.module,platform:this.platform,intervalMs:DEVICE_CONTEXT_INTERVAL_MS,reason:this.module?'Local iOS module installed':'Native module unavailable; rebuild an iOS development/release app to include it.',measurement:'Process memory and system state; no GPU/display FPS'},session);
  }
  if(this.module&&!this.pending)this.sample();
 }
 private clearTimer(){if(this.timer!==undefined){this.clock.cancel(this.timer);this.timer=undefined}}
 private eligible(){return this.enabled&&this.recorder.recording&&this.recorder.session===this.session}
 private schedule(delay:number){
  this.clearTimer();
  if(!this.eligible()||!this.module||this.failures>=3)return;
  this.timer=this.clock.later(()=>{this.timer=undefined;this.sample()},delay);
 }
 private sample(){
  if(!this.eligible()||!this.module||this.pending||this.failures>=3)return;
  // App changes activity before React commits pause/background UI.
  if(this.recorder.read(this.clock.now()).activity!=='playing'){this.schedule(DEVICE_CONTEXT_INTERVAL_MS);return}
  const generation=this.generation,session=this.session,sequence=++this.sequence,requestedAt=this.clock.now();
  this.pending=true;
  void Promise.resolve().then(()=>{
   if(!this.eligible()||generation!==this.generation)return null;
   return this.module!.sample(session,sequence);
  }).then(result=>{
   if(!result||!this.eligible()||generation!==this.generation||this.recorder.read(this.clock.now()).activity!=='playing')return;
   const detail=deviceContextDetail(result);
   if(!detail||result.session!==session||result.sequence!==sequence)throw Error('Malformed native context');
   this.failures=0;
   const receivedAt=this.clock.now();
   this.recorder.trace(requestedAt,'native-device-context',receivedAt-requestedAt,{...detail,session,sequence,requestedAtJsMs:requestedAt,receivedAtJsMs:receivedAt,roundTripMs:receivedAt-requestedAt,clockAlignment:'Native uptime and JS clock reported separately; correlate using the matching Instruments sample marker'},session);
  }).catch(()=>{
   if(!this.eligible()||generation!==this.generation)return;
   this.failures++;
   this.recorder.trace(this.clock.now(),'native-device-context-error',0,{failures:this.failures,suspended:this.failures>=3,reason:'Native context request failed; existing game recording remains available'},session);
  }).finally(()=>{
   this.pending=false;
   this.schedule(generation===this.generation?DEVICE_CONTEXT_INTERVAL_MS:0);
  });
 }
 stop(){this.enabled=false;this.generation++;this.clearTimer()}
}
