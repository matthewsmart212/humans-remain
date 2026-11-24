import AsyncStorage from '@react-native-async-storage/async-storage';
import {createAudioPlayer,type AudioPlayer} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import {FishingFeedbackTracker,type FishingFeedbackSnapshot,type FishingCue} from '../src/fishing-feedback';

export type FishingFeedbackSettings={sound:boolean;haptics:boolean};
const KEY='humans-remain-fishing-feedback-v2';
let settings:FishingFeedbackSettings={sound:true,haptics:true},loaded:Promise<FishingFeedbackSettings>|undefined,revision=0;
export function loadFishingFeedbackSettings(){
 if(!loaded){const initial=revision;loaded=AsyncStorage.getItem(KEY).then(raw=>{try{const value=raw&&JSON.parse(raw);if(initial===revision&&value)settings={sound:value.sound!==false,haptics:value.haptics!==false}}catch{}return{...settings}}).catch(()=>({...settings}))}
 return loaded;
}
export function saveFishingFeedbackSettings(next:FishingFeedbackSettings){settings={...next};revision++;void AsyncStorage.setItem(KEY,JSON.stringify(settings)).catch(()=>{})}

// Literal requires keep all cues available in airplane mode and in iOS exports.
const sounds:Record<FishingCue,number>={
 cast:require('../public/audio/fishing-v2/cast.wav'),splash:require('../public/audio/fishing-v2/splash.wav'),nibble:require('../public/audio/fishing-v2/nibble.wav'),bite:require('../public/audio/fishing-v2/bite.wav'),hook:require('../public/audio/fishing-v2/hook.wav'),surge:require('../public/audio/fishing-v2/surge.wav'),land:require('../public/audio/fishing-v2/land.wav'),keep:require('../public/audio/fishing-v2/keep.wav'),release:require('../public/audio/fishing-v2/release.wav'),escape:require('../public/audio/fishing-v2/escape.wav'),signal:require('../public/audio/fishing-v2/signal.wav'),warning:require('../public/audio/fishing-v2/warning.wav'),reel:require('../public/audio/fishing-v2/reel.wav'),
};
export class NativeFishingFeedback{
 private tracker=new FishingFeedbackTracker();private players=new Map<FishingCue,AudioPlayer>();private epoch=0;private disposed=false;private active=false;private prepared=false;private preparation?:ReturnType<typeof setTimeout>;
 private owner?:object;private settingsRevision=revision;private sound=settings.sound;
 constructor(){void loadFishingFeedbackSettings()}
 private prepare(){
  if(this.prepared||this.disposed)return;this.prepared=true;
  const cues=Object.keys(sounds) as FishingCue[];let index=0;
  const next=()=>{if(this.disposed||index>=cues.length)return;const cue=cues[index++];try{const player=createAudioPlayer(sounds[cue],{updateInterval:1000});player.volume=.8;this.players.set(cue,player)}catch{}this.preparation=setTimeout(next,24)};
  this.preparation=setTimeout(next,0);
 }
 private play(cue:FishingCue){
  if(settings.sound){const player=this.players.get(cue),epoch=this.epoch,settingsAtCue=revision;if(player)try{void player.seekTo(0).then(()=>{if(!this.disposed&&this.active&&settings.sound&&this.epoch===epoch&&settingsAtCue===revision)player.play()}).catch(()=>{})}catch{}}
  if(!settings.haptics)return;
  // Nibble is a light tick; the real bite is a clear, stronger impact.
  if(cue==='nibble')void Haptics.selectionAsync().catch(()=>{});
  else if(cue==='bite'||cue==='surge')void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(()=>{});
  else if(cue==='hook'||cue==='warning')void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(()=>{});
  else if(cue==='land')void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});
  else if(cue==='cast'||cue==='keep'||cue==='release')void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{});
 }
 update(owner:object,hud:FishingFeedbackSnapshot|undefined,time:number,active:boolean){
  if(this.disposed)return;
  if(this.owner!==owner||this.settingsRevision!==revision||this.sound!==settings.sound){this.stopPlayers();this.owner=owner;this.settingsRevision=revision;this.sound=settings.sound}
  this.active=active&&!!hud;if(this.active&&settings.sound)this.prepare();
  for(const cue of this.tracker.update(owner,hud,time,this.active))this.play(cue);
  if(!this.active||!settings.sound)this.stopPlayers();
 }
 private stopPlayers(){this.epoch++;for(const player of this.players.values())try{if(player.playing)player.pause()}catch{}}
 pause(){this.active=false;this.tracker.reset();this.stopPlayers()}
 dispose(){this.disposed=true;clearTimeout(this.preparation);this.pause();for(const player of this.players.values())try{player.remove()}catch{}this.players.clear()}
}
