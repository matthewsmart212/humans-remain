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
 await build({stdin:{contents:"export * from './src/fishing-feedback';export {FishingCatchCheckpoint} from './src/fishing-hud-presentation';export * from './src/fishing-sound-design';export * from './src/fishing-audio';export * from './native/fishing-feedback';export {default as WebHUD} from './src/FishingHUD';export {default as NativeHUD} from './native/FishingHUD';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(directory,'model.cjs'),logLevel:'error',loader:{'.css':'empty'},plugins:[{name:'feedback-platform',setup(b){
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
 // display are adapted. Inspect visible text separately from full accessible
 // status so the visual loop cannot accidentally restore explanatory panels.
 const expand=node=>node==null||typeof node!=='object'?node:Array.isArray(node)?node.map(expand):typeof node.type==='function'?expand(node.type(node.props)):{...node,props:{...node.props,children:expand(node.props?.children)}};
 const nodes=node=>node==null||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...nodes(node.props?.children)];
 const rawText=node=>node==null||typeof node==='boolean'?'':Array.isArray(node)?node.map(rawText).join(' '):typeof node==='object'?rawText(node.props?.children):String(node);
 const text=node=>node==null||typeof node==='boolean'?'':Array.isArray(node)?node.map(text).join(' '):typeof node==='object'?(node.props?.className?.split(' ').includes('fishing-sr-only')||node.props?.style?.visibility==='hidden')?'':text(node.props?.children):String(node);
 const accessible=node=>nodes(node).map(n=>n.props['aria-label']??n.props.accessibilityLabel??(n.props.className?.split(' ').includes('fishing-sr-only')?rawText(n):'')).join(' ');
 const buttons=node=>nodes(node).filter(n=>['button','pressable'].includes(n.type));
 const base={phase:'ready',action:'CAST',command:'TAP TO CAST',detail:'Hold to aim.',hint:'Hold to aim.',tone:'neutral',bait:4,tension:0,charge:0,holding:false,active:false,disabled:false,progress:0,castValid:true,castHint:'Clear water',nibbleAmount:0,canKeep:false,assists:{autoHook:false,toggleReel:false},caught:0,bestKg:0};
 let uiCases=0;
 for(const platform of ['Web','Native']){
  const decisions=[];let bagOpens=0;
  const draw=(hud,extra={})=>expand(m[platform+'HUD']({hud,inputMode:'touch',onCatch:value=>decisions.push(value),onOpenBag:()=>bagOpens++,...extra}));
  let tree=draw(base);assert.equal(text(tree).trim(),'4','Ready shows only the bait resource');assert.match(accessible(tree),/Hold CAST, then drag on the left to aim/);assert.match(accessible(tree),/4 bait remaining/);assert.equal(buttons(tree).length,0);uiCases++;
  if(platform==='Web'){const keyboard=draw(base,{inputMode:'keyboard'});assert.equal(text(keyboard).trim(),'4');assert.match(accessible(keyboard),/Hold Space, then use WASD/);uiCases++}
  for(const [phase,command,detail] of [
   ['aiming','RELEASE TO CAST','Move the landing marker.'],['casting','CASTING','Watch the float land.'],
   ['waiting','WATCH THE FLOAT','Waiting for a fish. Tap RETRIEVE to stop.'],
   ['nibble','WAIT','Just a nibble. Wait for the float to sink.'],
   ['bite','TAP HOOK','The float is under. Hook the fish now!'],['landing','LANDING YOUR FISH','Your catch is coming aboard.'],
  ]){
   tree=draw({...base,phase,active:true,command,detail});
   assert.equal(text(tree).trim(),'4',phase+' has no changing explanatory card');assert.equal(buttons(tree).length,0);
   assert.match(accessible(tree),new RegExp(command));
   if(phase==='nibble')assert.match(accessible(tree),/Nibble.*Wait for the float to sink/);
   if(phase==='bite')assert(nodes(tree).some(n=>n.props['aria-live']==='assertive'||n.props.accessibilityLiveRegion==='assertive'),'A true bite retains its urgent accessible cue');
   uiCases++;
  }
  tree=draw({...base,phase:'aiming',active:true,command:'ADJUST YOUR AIM',castValid:false,castHint:'Aim into open water'});assert.equal(text(tree).trim(),'4');assert.match(accessible(tree),/landing marker.*Aim into open water/);uiCases++;
  tree=draw({...base,disabled:true,bait:0,command:'GATHER BAIT',detail:'Walk to the lakeshore reeds and tap BAIT.'});assert.equal(text(tree).trim(),'0');assert.match(accessible(tree),/reeds.*BAIT/);uiCases++;
  tree=draw({...base,disabled:true,command:'FIND CLEAR WATER',detail:'Move to the pier edge or a clear bank.'});assert.equal(text(tree).trim(),'4');assert.match(accessible(tree),/pier edge or a clear bank/);uiCases++;
  for(const [command,detail,holding,fightBehavior,tension,toggleReel] of [
   ['HOLD TO REEL','Fish is resting. Bring it closer.',true,'calm',.4,false],
   ['RELEASE TO EASE OFF','A strong pull is coming.',true,'warning',.7,false],
   ['WAIT · LINE EASING','Line under strain. Let it recover.',false,'surge',.8,false],
   ['TAP TO EASE OFF','Strong pull. Let the line settle.',true,'surge',.7,true],
   ['REELING · TAP TO EASE','Fish is resting. Bring it closer.',true,'calm',.4,true],
   ['TAP TO REEL','Nearly there. Reel while it is tired.',false,'tiring',.2,true],
  ]){
   const hud={...base,phase:'reeling',active:true,command,detail,holding,fightBehavior,tension,progress:.45,assists:{...base.assists,toggleReel}};
   tree=draw(hud);assert.match(text(tree),/TENSION/);assert.match(text(tree),/TO SHORE/);assert(!/HOLD|REEL|EASING|STEADY|TOO TIGHT|SLACK|%|\d/.test(text(tree)),'Visible fight feedback uses stable labels and meter geometry');
   assert(accessible(tree).includes(command)&&accessible(tree).includes(detail),'Complete action and reason stay accessible');
   for(const [label,expected] of [['Line tension',Math.round(tension*100)],['Catch brought to shore',45]]){
    const meter=nodes(tree).find(n=>(n.props['aria-label']??n.props.accessibilityLabel)===label);assert(meter,label+' remains named');assert.equal(meter.props['aria-valuenow']??meter.props.accessibilityValue?.now,expected);
   }
   if(tension>.78){assert.match(accessible(tree),/Line tension/);const meter=nodes(tree).find(n=>(n.props['aria-label']??n.props.accessibilityLabel)==='Line tension');assert.equal(meter.props['aria-valuetext']??meter.props.accessibilityValue?.text,'TOO TIGHT')}
   assert.equal(buttons(tree).length,0);uiCases++;
  }
  tree=draw({...base,phase:'escaped',active:true,command:'CATCH LOST',detail:'Line snapped · Release REEL before the big pull'});assert.match(text(tree),/Line snapped/);assert(!/Release REEL/.test(text(tree)));assert.match(accessible(tree),/Release REEL before the big pull/);uiCases++;
  for(const species of ['perch','carp','pike','drone']){
   const caught={id:1,species,name:species,kg:3.2,isRecord:species!=='drone',image:'/test.webp',portions:3};
   const rewardLabel=species==='drone'?'6 scrap + 2 iron ore':'3 raw '+species+' portions',receipt={id:12,catch:caught,rewardLabel,rewardWeight:1.65,age:.3,duration:2.6};
   tree=draw(undefined,{receipt});assert.match(text(tree),species==='drone'?/Scout drone salvaged/:new RegExp(species+' caught','i'));assert.match(text(tree),/3\.20 kg · In bag/);assert.equal(buttons(tree).length,0,'Successful collection never requests KEEP confirmation');assert(accessible(tree).includes(rewardLabel));if(species!=='drone')assert.match(accessible(tree),/species best/);uiCases++;
   const hud={...base,phase:'caught',active:true,canKeep:false,catch:caught,rewardLabel,rewardWeight:1.65};
   tree=draw(hud,{receipt});assert.match(text(tree),/Bag full · catch held/);assert(!/In bag/.test(text(tree)),'A held catch takes priority over an older success receipt');assert(accessible(tree).includes(rewardLabel));
   const choices=buttons(tree);assert.equal(choices.length,2);assert.equal(text(choices[0]).trim(),'BAG');assert.equal(text(choices[1]).trim(),species==='drone'?'RETURN':'RELEASE');assert(!choices[0].props.disabled&&!choices[1].props.disabled,'Full bag still allows opening the bag and releasing');
   (choices[0].props.onClick??choices[0].props.onPress)();(choices[1].props.onClick??choices[1].props.onPress)();assert.deepEqual(decisions.splice(0),[false]);assert.equal(bagOpens,['perch','carp','pike','drone'].indexOf(species)+1);
   assert(buttons(draw(hud,{disabled:true})).every(b=>b.props.disabled),'Paused or unavailable controls stay disabled');
   assert.equal(buttons(draw({...hud,canKeep:true})).length,0,'Making room awaits automatic collection, not a KEEP button');uiCases++;
  }
  assert.equal(draw(undefined),null,'No fishing state or receipt leaves no overlay');
 }
 const checkpointOwner={},replacementOwner={},checkpoint=new m.FishingCatchCheckpoint(checkpointOwner,2);
 assert.equal(checkpoint.update(checkpointOwner,2),false,'Rendering the existing kept total does not save again');
 assert.equal(checkpoint.update(checkpointOwner,3),true,'A new automatic award triggers an immediate checkpoint');
 assert.equal(checkpoint.update(checkpointOwner,3),false,'The same award checkpoints only once');
 assert.equal(checkpoint.update(replacementOwner,9),false,'A replacement world establishes its own baseline');
 assert.equal(checkpoint.update(replacementOwner,10),true);
 assert.equal(new m.FishingCatchCheckpoint(replacementOwner,10).update(replacementOwner,10),false,'Remount does not replay a historical award');
 assert.equal(new m.FishingCatchCheckpoint().update(checkpointOwner,3),false,'Uninitialized tracker establishes a baseline');
 const heldCheckpoint=new m.FishingCatchCheckpoint(checkpointOwner,3);
 assert.equal(heldCheckpoint.update(checkpointOwner,3,41),true,'A newly held full-bag catch is checkpointed immediately');
 assert.equal(heldCheckpoint.update(checkpointOwner,3,41),false,'The same pending animal checkpoints only once');
 assert.equal(heldCheckpoint.update(checkpointOwner,3),false,'Clearing a pending catch alone does not repeat the manual-release checkpoint');
 assert.equal(heldCheckpoint.update(checkpointOwner,3,42),true,'A different held catch gets its own checkpoint');
 assert.equal(heldCheckpoint.update(checkpointOwner,4),true,'Automatic collection checkpoints the award after space is made');
 assert.equal(heldCheckpoint.update(checkpointOwner,4),false,'The stored catch does not checkpoint again');
 assert.equal(new m.FishingCatchCheckpoint(checkpointOwner,4,43).update(checkpointOwner,4,43),false,'Remounting with a pending catch establishes its saved baseline');
 assert.equal(heldCheckpoint.update(replacementOwner,4,44),false,'A pending animal in a replacement world does not replay a checkpoint');

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
 const report={uiCases,platforms:['web component','native component'],nativeDeferredPlaybackGuards:['world','hidden','pause','mute-unmute','dispose'],oneShotEvents:true,reelCuesPerSecond:clicks,offlineSoundCues:cues.length,visualFishingWithoutInstructionPanels:true,accessibleInstructions:true,automaticCatchCheckpoints:true,actualDeviceTest:false};
 fs.mkdirSync('docs/qa/fishing-gameplay-v2',{recursive:true});fs.writeFileSync('docs/qa/fishing-gameplay-v2/feedback-checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{fs.rmSync(directory,{recursive:true,force:true});delete globalThis.__fishingFeedbackTest}
