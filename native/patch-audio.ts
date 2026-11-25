import {createAudioPlayer,type AudioPlayer} from 'expo-audio';
import {PatchCueTracker,type PatchCue} from '../src/patch-audio-cues';
import type {World} from '../src/survival-engine';

const sounds:Record<PatchCue,number>={
 beacon:require('../public/audio/patch/beacon.wav'),
 ledger:require('../public/audio/patch/ledger.wav'),
 brake:require('../public/audio/patch/brake.wav'),
 servo:require('../public/audio/patch/servo.wav'),
 home:require('../public/audio/patch/home.wav'),
};
export class NativePatchAudio{
 private tracker=new PatchCueTracker();
 private player?:AudioPlayer;
 private cue?:PatchCue;
 private epoch=0;
 enabled=false;
 update(w:World,active:boolean){
  const cue=this.tracker.update(w,active&&this.enabled);
  if(!active||!this.enabled){this.stop();return}
  if(!cue)return;
  try{
   if(!this.player||cue.cue!==this.cue){
    this.stop();this.player=createAudioPlayer(sounds[cue.cue]);this.cue=cue.cue;
    this.player.volume=cue.volume;this.player.play();return;
   }
   const player=this.player,epoch=++this.epoch;
   player.volume=cue.volume;
   void player.seekTo(0).then(()=>{if(epoch===this.epoch&&this.enabled)player.play()}).catch(()=>{});
  }catch{}
 }
 stop(){if(this.player){this.epoch++;try{this.player.remove()}catch{}this.player=undefined}}
}
