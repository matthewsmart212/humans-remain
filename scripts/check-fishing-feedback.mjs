import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const directory=fs.mkdtempSync(path.join(os.tmpdir(),'fishing-feedback-')),require=createRequire(import.meta.url);
const native={players:[],haptics:[]};globalThis.__fishingFeedbackTest=native;
const aliases={
 'react-native':"export const View='view',Text='text',Pressable='pressable';export const StyleSheet={create:x=>x};",
 'fishing-glyph':"export const actionImageGlyph=()=>null;",
 '@react-native-async-storage/async-storage':"export default {getItem:async()=>null,setItem:async()=>{}};",
 'expo-audio':"export const createAudioPlayer=(source)=>{const p={source,playing:false,plays:0,pauses:0,removed:false,pending:[],seekTo(){return new Promise(resolve=>this.pending.push(resolve))},play(){this.plays++;this.playing=true},pause(){this.pauses++;this.playing=false},remove(){this.removed=true}};globalThis.__fishingFeedbackTest.players.push(p);return p};",
 'expo-haptics':"export const ImpactFeedbackStyle={Light:'light',Medium:'medium',Heavy:'heavy'},NotificationFeedbackType={Success:'success'};export const impactAsync=async value=>{globalThis.__fishingFeedbackTest.haptics.push(value)},selectionAsync=async()=>{globalThis.__fishingFeedbackTest.haptics.push('selection')},notificationAsync=impactAsync;",
};
try{
 await build({stdin:{contents:"export * from './src/fishing-feedback';export * from './src/fishing-sound-design';export * from './src/fishing-audio';export * from './native/fishing-feedback';export {default as WebHUD} from './src/FishingHUD';export {default as NativeHUD} from './native/FishingHUD';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(directory,'model.cjs'),logLevel:'error',loader:{'.css':'empty'},plugins:[{name:'feedback-platform',setup(b){
  b.onResolve({filter:/^(react-native|expo-audio|expo-haptics|@react-native-async-storage\/async-storage)$/},a=>({path:a.path,namespace:'feedback'}));
  b.onResolve({filter:/\/FieldItemArt$/},a=>({path:'fishing-glyph',namespace:'feedback'}));
  b.onLoad({filter:/.*/,namespace:'feedback'},a=>({contents:aliases[a.path],loader:'js'}));
  b.onLoad({filter:/\.wav$/},a=>({contents:'module.exports='+JSON.stringify(a.path),loader:'js'}));
 }}]});
 const m=require(path.join(directory,'model.cjs'));
 const owner={},tracker=new m.FishingFeedbackTracker(),state={phase:'waiting',holding:false};
 assert.deepEqual(tracker.update(owner,state,0,true),[]);
 const bite={...state,phase:'bite',event:{id:1,type:'bite',at:1}};
 assert.deepEqual(tracker.update(owner,bite,1,true),['bite']);assert.deepEqual(tracker.update(owner,bite,1.1,true),[],'One bite, one cue');
 tracker.update(owner,{...bite,event:{id:2,type:'hook',at:2}},2,false);
 assert.deepEqual(tracker.update(owner,{...bite,event:{id:2,type:'hook',at:2}},2,true),[],'A paused event cannot replay');
 assert.deepEqual(tracker.update({},bite,1,true),[],'A replacement world starts silently');
 tracker.reset();tracker.update(owner,state,0,true);
 assert.deepEqual(tracker.update(owner,{...state,event:{id:4,type:'bite',at:.1}},1,true),[],'Late cues are dropped');
 const warning={phase:'reeling',holding:false,fightBehavior:'warning'};
 assert.deepEqual(tracker.update(owner,warning,2,true),['warning']);assert.deepEqual(tracker.update(owner,warning,2.1,true),[],'One vibration per warning');
 let clicks=0;for(let i=0;i<60;i++)clicks+=tracker.update(owner,{phase:'reeling',holding:true,fightBehavior:'calm'},3+i/60,true).filter(c=>c==='reel').length;
 assert(clicks<=5,'Reel audio is throttled independently of frame rate');

 // These are real web/native components; only platform primitives and artwork
 // display are adapted. Assertions inspect the text, roles and actual handlers.
 const expand=node=>node==null||typeof node!=='object'?node:Array.isArray(node)?node.map(expand):typeof node.type==='function'?expand(node.type(node.props)):{...node,props:{...node.props,children:expand(node.props?.children)}};
 const nodes=node=>node==null||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...nodes(node.props?.children)];
 const text=node=>node==null||typeof node==='boolean'?'':Array.isArray(node)?node.map(text).join(' '):typeof node==='object'?node.props?.className==='fishing-sr-only'?'':text(node.props?.children):String(node);
 const base={phase:'ready',action:'CAST',command:'TAP TO CAST',detail:'Hold to aim.',hint:'Hold to aim.',tone:'neutral',bait:4,tension:0,charge:0,holding:false,active:false,disabled:false,progress:0,castValid:true,castHint:'Clear water',nibbleAmount:0,canKeep:false,assists:{autoHook:false,toggleReel:false},caught:0,bestKg:0};
 let uiCases=0;
 for(const platform of ['Web','Native']){
  const decisions=[],draw=hud=>expand(m[platform+'HUD']({hud,compact:true,inputMode:'touch',onCatch:value=>decisions.push(value)}));
  const accessible=node=>nodes(node).map(n=>n.props['aria-label']??n.props.accessibilityLabel??'').join(' ');
  let tree=draw(base);assert.match(text(tree),/TAP TO CAST/);assert.match(text(tree),/Hold CAST.*drag on left/);assert.match(accessible(tree),/Hold CAST, then drag on the left to aim/);assert(!/OPTIONS/.test(text(tree)));
  if(platform==='Web'){const keyboard=expand(m.WebHUD({hud:base,inputMode:'keyboard',onCatch(){}}));assert.match(text(keyboard),/Hold Space.*WASD/);assert.match(accessible(keyboard),/Hold Space, then use WASD/)}
  tree=draw({...base,phase:'nibble',active:true,disabled:true,command:'WAIT',detail:'Just a nibble. Wait for the float to sink.'});assert.match(text(tree),/NIBBLE · WAIT/);assert(!/TAP HOOK/.test(text(tree)));uiCases++;
  tree=draw({...base,phase:'bite',active:true,command:'TAP HOOK',detail:'The float is under. Hook the fish now!'});assert.match(text(tree),/BITE!/);assert(nodes(tree).some(n=>n.props['aria-live']==='assertive'||n.props.accessibilityLiveRegion==='assertive'));uiCases++;
  tree=draw({...base,phase:'aiming',active:true,command:'ADJUST YOUR AIM',castValid:false,castHint:'Aim into open water',charge:.5});assert.match(text(tree),/ADJUST AIM/);assert.match(text(tree),/×/);assert.match(text(tree),/Aim into open water/);assert.match(accessible(tree),/landing marker/);uiCases++;
  tree=draw({...base,phase:'reeling',active:true,command:'RELEASE TO EASE OFF',detail:'A strong pull is coming.',holding:true,fightBehavior:'warning',tension:.7,progress:.45});assert.match(text(tree),/RELEASE REEL/);assert.match(text(tree),/Strong pull coming/);assert.match(text(tree),/LINE TENSION/);assert.match(text(tree),/TO SHORE/);assert.match(text(tree),/45/);uiCases++;
  // Compact guidance must still distinguish the next action, including when
  // the player has already eased off and when toggle-reel is enabled.
  tree=draw({...base,phase:'ready',disabled:true,bait:0,command:'GATHER BAIT',detail:'Walk to the lakeshore reeds and tap BAIT.'});assert.match(text(tree),/GATHER BAIT/);assert.match(text(tree),/reeds.*BAIT/);uiCases++;
  tree=draw({...base,phase:'ready',disabled:true,command:'FIND CLEAR WATER',detail:'Move to the pier edge or a clear bank.'});assert.match(text(tree),/FIND CLEAR WATER/);assert.match(text(tree),/Pier edge or clear bank/);uiCases++;
  for(const toggleReel of [false,true]){
   tree=draw({...base,phase:'reeling',active:true,holding:false,fightBehavior:'surge',tension:.8,assists:{...base.assists,toggleReel}});assert.match(text(tree),/WAIT · EASING/);assert(!/RELEASE REEL|TAP TO EASE/.test(text(tree)));assert.match(text(tree),/TOO TIGHT/);uiCases++;
   tree=draw({...base,phase:'reeling',active:true,holding:true,fightBehavior:'calm',assists:{...base.assists,toggleReel}});assert.match(text(tree),toggleReel?/REELING.*Tap to ease off/:/HOLD TO REEL/);uiCases++;
  }
  tree=draw({...base,phase:'escaped',active:true,command:'CATCH LOST',detail:'Line snapped · Release REEL before the big pull'});assert.match(text(tree),/Line snapped.*ease off/);assert.match(accessible(tree),/Release REEL before the big pull/);uiCases++;
  for(const species of ['perch','carp','pike','drone']){
   const hud={...base,phase:'caught',active:true,canKeep:true,rewardLabel:species==='drone'?'6 scrap + 2 iron ore':'3 raw '+species+' portions',rewardWeight:1.65,catch:{id:1,species,name:species,kg:3.2,isRecord:true,image:'/test.webp',portions:3}};
   tree=draw(hud);assert.match(text(tree),species==='drone'?/Scout drone|SCOUT DRONE/:/BEST/);assert.match(text(tree),/1\.65\s+kg in bag/);assert.match(accessible(tree),new RegExp(hud.rewardLabel.replace('+','\\+')));if(species!=='drone')assert.match(accessible(tree),/Species best/);
   const buttons=nodes(tree).filter(n=>['button','pressable'].includes(n.type));assert.equal(buttons.length,2);(buttons[0].props.onClick??buttons[0].props.onPress)();(buttons[1].props.onClick??buttons[1].props.onPress)();assert.deepEqual(decisions.splice(0),[true,false]);
   const full=draw({...hud,canKeep:false});assert(nodes(full).filter(n=>['button','pressable'].includes(n.type))[0].props.disabled);assert.match(text(full),/catch held safely/);assert.match(text(full),/Open bag to make room/);uiCases++;
  }
 }

 const cues=Object.keys(m.FISHING_CUE_DURATION),rms={};
 for(const cue of cues){const samples=m.fishingSoundSamples(cue),wav=fs.readFileSync('public/audio/fishing-v2/'+cue+'.wav');assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.length,44+samples.length*2);assert.equal(wav.readUInt32LE(24),m.FISHING_SAMPLE_RATE);rms[cue]=Math.sqrt(samples.reduce((n,x)=>n+x*x,0)/samples.length);assert(rms[cue]>.002&&samples.every(x=>Number.isFinite(x)&&Math.abs(x)<=.7));for(let i=0;i<samples.length;i++)assert.equal(wav.readInt16LE(44+i*2),(Math.round(samples[i]*32767)||0))}
 assert(rms.bite>rms.nibble*1.5,'A true bite is clearly stronger than a nibble');

 const timer=globalThis.setTimeout,clear=globalThis.clearTimeout;let queue=[];
 globalThis.setTimeout=fn=>{queue.push(fn);return queue.length};globalThis.clearTimeout=()=>{};
 try{
  await m.loadFishingFeedbackSettings();
  for(const scenario of ['world','hidden','pause','mute-unmute','dispose']){
   m.saveFishingFeedbackSettings({sound:true,haptics:true});native.players=[];queue=[];const f=new m.NativeFishingFeedback(),w={};f.update(w,state,0,true);while(queue.length)queue.shift()();assert.equal(native.players.length,13);
   f.update(w,bite,1,true);assert(native.players.some(p=>p.pending.length),'A fresh cue was queued');
   if(scenario==='world')f.update({},bite,1,true);else if(scenario==='hidden')f.update(w,undefined,1,true);else if(scenario==='pause')f.pause();else if(scenario==='mute-unmute'){m.saveFishingFeedbackSettings({sound:false,haptics:true});m.saveFishingFeedbackSettings({sound:true,haptics:true})}else f.dispose();
   native.players.flatMap(p=>p.pending).forEach(resolve=>resolve());await Promise.resolve();await Promise.resolve();assert.equal(native.players.reduce((n,p)=>n+p.plays,0),0,'No deferred native sound after '+scenario);f.dispose();assert(native.players.every(p=>p.removed));
  }
  // Sound-off retains the distinct vibration signal, but neither mode creates
  // a player or cue when fishing itself is inactive.
  m.saveFishingFeedbackSettings({sound:false,haptics:true});native.players=[];native.haptics=[];const f=new m.NativeFishingFeedback(),w={};f.update(w,state,0,true);f.update(w,bite,1,true);assert.equal(native.players.length,0);assert.deepEqual(native.haptics,['heavy']);f.dispose();
 }finally{globalThis.setTimeout=timer;globalThis.clearTimeout=clear}
 const sources=[];let contexts=0;
 class AudioContext{state='running';constructor(){contexts++}createBuffer(_channels,length){return{copyToChannel(){},length}}createBufferSource(){const source={stopped:false,connect(){},disconnect(){},start(){},stop(){this.stopped=true;this.onended?.()}};sources.push(source);return source}resume(){return Promise.resolve()}close(){return Promise.resolve()}}
 const previous=globalThis.window;globalThis.window={AudioContext};
 try{const audio=new m.FishingAudio();audio.unlock();audio.update(owner,state,0,true);audio.update(owner,bite,1,true);assert.equal(sources.length,1);audio.update({},bite,1,true);assert(sources[0].stopped,'World changes stop old web voices');audio.update(owner,state,2,true);audio.update(owner,{...bite,event:{id:2,type:'bite',at:3}},3,true);audio.update(owner,undefined,3,true);assert(sources.every(s=>s.stopped));audio.dispose();audio.unlock();assert.equal(contexts,1,'Disposed browser feedback cannot reopen a context')}finally{globalThis.window=previous}
 const report={uiCases,platforms:['web component','native component'],nativeDeferredPlaybackGuards:['world','hidden','pause','mute-unmute','dispose'],oneShotEvents:true,reelCuesPerSecond:clicks,offlineSoundCues:cues.length,soundOffVisualInstructions:true,actualDeviceTest:false};
 fs.mkdirSync('docs/qa/fishing-gameplay-v2',{recursive:true});fs.writeFileSync('docs/qa/fishing-gameplay-v2/feedback-checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{fs.rmSync(directory,{recursive:true,force:true});delete globalThis.__fishingFeedbackTest}
