import {FishingFeedbackTracker,type FishingFeedbackSnapshot,type FishingCue} from './fishing-feedback';
import {fishingSoundSamples,FISHING_SAMPLE_RATE} from './fishing-sound-design';

const KEY='humans-remain-fishing-sound-v1';
export const FISHING_SOUND_EVENT='humans-remain-fishing-sound';
export function fishingSoundEnabled(){try{return localStorage.getItem(KEY)!=='off'}catch{return true}}
export function setFishingSoundEnabled(value:boolean){try{localStorage.setItem(KEY,value?'on':'off')}catch{}window.dispatchEvent(new Event(FISHING_SOUND_EVENT))}

/** Audio has no authority over controls; unavailable audio never blocks fishing. */
export class FishingAudio{
 private context?:AudioContext;private buffers=new Map<FishingCue,AudioBuffer>();private voices=new Set<AudioBufferSourceNode>();private tracker=new FishingFeedbackTracker();private enabled=true;private owner?:object;private disposed=false;
 setEnabled(value:boolean){this.enabled=value;if(!value)this.pause()}
 unlock(){
  if(!this.enabled||this.disposed)return;
  try{if(!this.context){const Audio=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Audio)return;this.context=new Audio()}
   if(this.context.state==='suspended')void this.context.resume().catch(()=>{});
  }catch{/* Visual prompts remain the primary feedback. */}
 }
 private play(cue:FishingCue){
  const context=this.context;if(!context||context.state!=='running'||this.voices.size>=4)return;
  try{let buffer=this.buffers.get(cue);if(!buffer){const samples=fishingSoundSamples(cue);buffer=context.createBuffer(1,samples.length,FISHING_SAMPLE_RATE);buffer.copyToChannel(samples,0);this.buffers.set(cue,buffer)}
   const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect()};source.start();
  }catch{/* A device/audio interruption must not affect the simulation. */}
 }
 update(owner:object,hud:FishingFeedbackSnapshot|undefined,time:number,active:boolean){
  if(this.disposed)return;
  if(this.owner!==owner){this.pause();this.owner=owner}
  const playing=active&&!!hud&&this.enabled&&this.context?.state==='running';
  for(const cue of this.tracker.update(owner,hud,time,!!playing))this.play(cue);
  if(!playing&&this.voices.size)this.pause();
 }
 pause(){this.tracker.reset();for(const source of this.voices){try{source.stop()}catch{}}this.voices.clear()}
 dispose(){this.disposed=true;this.pause();const context=this.context;this.context=undefined;this.buffers.clear();if(context)void context.close().catch(()=>{})}
}
