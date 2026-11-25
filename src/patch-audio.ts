import {PATCH_CUES,PATCH_SOUND_KEY,PatchCueTracker,type PatchCue} from './patch-audio-cues';
import type {World} from './survival-engine';

export function patchSoundEnabled(){try{return localStorage.getItem(PATCH_SOUND_KEY)!=='off'}catch{return true}}
export function setPatchSoundEnabled(on:boolean){
 try{localStorage.setItem(PATCH_SOUND_KEY,on?'on':'off')}catch{}
 window.dispatchEvent(new CustomEvent(PATCH_SOUND_KEY,{detail:on}));
}

export class PatchAudio{
 private tracker=new PatchCueTracker();
 private context?:AudioContext;
 private buffers=new Map<PatchCue,AudioBuffer>();
 private sources=new Set<AudioBufferSourceNode>();
 enabled=patchSoundEnabled();
 unlock(){
  if(!this.enabled)return;
  try{
   if(!this.context){
    const Audio=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
    if(!Audio)return;
    const context=this.context=new Audio();
    for(const cue of PATCH_CUES){
     void fetch('/audio/patch/'+cue+'.wav').then(res=>res.arrayBuffer()).then(data=>context.decodeAudioData(data)).then(buffer=>{if(this.context===context)this.buffers.set(cue,buffer)}).catch(()=>{});
    }
   }
   if(this.context.state==='suspended')void this.context.resume().catch(()=>{});
  }catch{}
 }
 update(w:World,active:boolean){
  const c=this.context,cue=this.tracker.update(w,active&&this.enabled&&c?.state==='running');
  if(!active||!this.enabled){this.stop();return}
  const buffer=cue&&this.buffers.get(cue.cue);
  if(!c||!cue||!buffer)return;
  const source=c.createBufferSource(),gain=c.createGain();
  source.buffer=buffer;gain.gain.value=cue.volume;
  source.connect(gain);gain.connect(c.destination);this.sources.add(source);
  source.onended=()=>{this.sources.delete(source);source.disconnect();gain.disconnect()};source.start();
 }
 stop(){for(const s of this.sources)s.stop();this.sources.clear()}
 dispose(){this.stop();if(this.context)void this.context.close().catch(()=>{});this.context=undefined;this.buffers.clear()}
}
