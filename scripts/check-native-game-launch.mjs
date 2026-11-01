// Exercise the actual native Game component/effects with platform services
// replaced. The engine, world loader, save codec and scene travel remain real.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {build,transformSync} from 'esbuild';
import ts from 'typescript';
import React from 'react';

const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'native-launch-'));
const source=fs.readFileSync('native/App.tsx','utf8');
const ast=ts.createSourceFile('App.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const component=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='Game');
const styles=ast.statements.flatMap(n=>ts.isVariableStatement(n)?[...n.declarationList.declarations]:[]).find(n=>n.name.getText(ast)==='s');
const modules=['run-save','station-menu-layout','continuous-zoom-state','continuous-zoom','studio-play','survival-engine','player-presentation','camp-lighting','weather-model','placed-world-renderer','editor-image-sources','world-assets','world-layout','terrain-art','scene-resources','scene-travel','world-scenes','performance-recording','performance-context','field-kit'];
const noop=()=>{};
const nodes=tree=>Array.isArray(tree)?tree.flatMap(nodes):tree&&typeof tree==='object'&&tree.props?[tree,...nodes(tree.props.children)]:[];
const text=tree=>Array.isArray(tree)?tree.map(text).join(' '):typeof tree==='string'?tree:tree?.props?text(tree.props.children):'';
async function until(predicate){for(let i=0;i<1000;i++){if(predicate())return;await new Promise(resolve=>setImmediate(resolve))}assert.fail('Native startup did not settle')}
try{
 await build({stdin:{contents:modules.map(id=>`export * from './src/${id}';`).join('')+"export * from './native/game-world';export * from './native/play-zoom';export * from './native/frame-diagnostics';export * from './native/run-save-store';export * from './native/frame-work-scheduler';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error'});
 const m=require(path.join(temp,'model.cjs'));
 function app(saved,{background=false,failArtwork=false,holdArtwork=false,holdTerrain=false,failTerrain=false}={}){
  const storage=new Map([['safety-last-authored-world-v2','invalid retired editor cache']]);if(saved instanceof Map){for(const entry of saved)storage.set(...entry)}else if(saved!==undefined)storage.set(m.RUN_SAVE_KEY,saved);
  const slots=[],effects=[],timers=new Map(),frames=new Map(),events=new Map(),reads=[],writes=[],errors=[],draws=[],preparationFrames=[];
  let cursor=0,id=0,releaseArtwork,releaseTerrain;
  const terrainGate=holdTerrain?new Promise(resolve=>releaseTerrain=resolve):Promise.resolve();
  const artworkGate=holdArtwork?new Promise(resolve=>releaseArtwork=resolve):Promise.resolve();
  const slot=initialize=>{const i=cursor++;return slots[i]??=initialize()};
  const useRef=value=>slot(()=>({current:value}));
  const useState=value=>{const s=slot(()=>({value:typeof value==='function'?value():value}));return[s.value,next=>{s.value=typeof next==='function'?next(s.value):next}]};
  const useMemo=fn=>slot(()=>({value:fn()})).value;
  const useEffect=(fn,deps)=>{const s=slot(()=>({}));if(!s.deps||deps.some((v,i)=>v!==s.deps[i])){s.deps=deps;effects.push(()=>{s.cleanup?.();s.cleanup=fn()})}};
  // UI-thread worklets/recognizers are platform services here; the separate
  // native gesture regression runs their real model and camera math. This
  // bridge commits UI animation endpoints through the production App callback.
  const useNativePlayZoom=(options,store)=>{
   const ref=useRef(options);ref.current=options;
   return useMemo(()=>{
    const amount={value:store.get()},uiPinching={value:false};store.bindPresentation(amount);
    const legacy=m.createNativePlayZoom({enabled:()=>ref.current.enabled(),getZoom:()=>ref.current.getZoom(),minimumZoom:()=>ref.current.minimumZoom?.()??.7,setZoom:value=>{amount.value=value;ref.current.setZoom(value)},onPinchStart:()=>ref.current.onPinchStart?.(),onGestureEnd:interrupted=>ref.current.onGestureEnd?.(interrupted)});
    const gesture={nativeGesture:true},registration={gesture,enabled:{get value(){return ref.current.enabled()}},registerSurface:noop,unregisterSurface:noop};
    return{...legacy,gesture,registration,amount,uiPinching,animateTo:target=>{const value=Math.max(ref.current.minimumZoom?.()??.7,Math.min(1,target));amount.value=value;ref.current.setZoom(value)},stopAnimation:noop,syncConfig:noop};
   });
  };
  const renderer={revision:1,frameManaged:false,setFrameManaged(value){this.frameManaged=value},warmImages:async()=>{await artworkGate;if(failArtwork)throw new TypeError('artwork failed')},prepareTerrain:async()=>{renderer.preparingTerrain=true;await terrainGate;if(failTerrain)throw Error('terrain failed');renderer.terrainPrepared=true},releaseImages:noop,dispose:noop,draw:(world,width,height)=>{draws.push({world,width,height});return {frame:draws.length}},textureStats:()=>undefined};
  const ctx={...m,useNativePlayZoom,GestureDetector:'GestureDetector',NativePinchSurface:function NativePinchSurface(){},NativeFrameWorkScheduler:class extends m.NativeFrameWorkScheduler{drain(...args){preparationFrames.push(args);return super.drain(...args)}},React,Profiler:React.Profiler,useCallback:fn=>useMemo(()=>fn),useRef,useState,useMemo,useEffect,Error,console:{error:(...args)=>errors.push(args)},performance,zero:()=>({x:0,y:0}),
   __DEV__:true,process:{env:{}},Platform:{OS:'ios',Version:'test',constants:{reactNativeVersion:{major:0,minor:88,patch:1}}},PixelRatio:{get:()=>3},require:()=>1,View:'View',Text:'Text',Pressable:'Pressable',ScrollView:'ScrollView',StatusBar:'StatusBar',Canvas:'Canvas',Picture:'Picture',
   StyleSheet:{create:v=>v,absoluteFill:{}},useWindowDimensions:()=>({width:844,height:390}),useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0}),
   useSharedValue:value=>slot(()=>({value})),Skia:{PictureRecorder:()=>({beginRecording:noop,finishRecordingAsPicture:()=>({empty:true}),dispose:noop})},
   AppState:{currentState:background?'background':'active',addEventListener:(event,fn)=>{events.set(event,fn);return{remove:()=>events.delete(event)}}},
   AccessibilityInfo:{isReduceMotionEnabled:async()=>false,addEventListener:()=>({remove:noop})},Font:{loadAsync:async()=>{}},Haptics:{selectionAsync:async()=>{},impactAsync:async()=>{},ImpactFeedbackStyle:{Light:1}},
   AsyncStorage:{getItem:async key=>{reads.push(key);return storage.get(key)||null},setItem:async(key,value)=>{writes.push(key);storage.set(key,value)}},
   Alert:{alert:(title,description,buttons)=>{ctx.alert=buttons}},PLAY_VIEW:{x:0,y:0,zoom:1,follow:true,grid:false,collision:false,selected:null,playing:true},
   createNativeRenderer:async(_view,_diagnostics,preparation)=>{renderer.preparation=preparation;return renderer},OutdoorTerrainStream:class{ready=true;update(){}settled(){return Promise.resolve()}dispose(){}retry(){}},
   NativeUiFrameProbe:function NativeUiFrameProbe(){},NativeDeviceContextProbe:function NativeDeviceContextProbe(){},NativePerformanceOverlay:function NativePerformanceOverlay(){},NativePerformanceMenuOptions:function NativePerformanceMenuOptions(){},NativePerformancePanel:function NativePerformancePanel(){},NativeFieldKitHUD:function NativeFieldKitHUD(){},NativePlayerMap:function NativePlayerMap(){},
   setInterval:fn=>{const next=++id;timers.set(next,fn);return next},clearInterval:key=>timers.delete(key),
   requestAnimationFrame:fn=>{const next=++id;frames.set(next,fn);return next},cancelAnimationFrame:key=>frames.delete(key),
  };
  const context=vm.createContext(ctx);
  vm.runInContext(transformSync(`globalThis.Game=${component.getText(ast)};globalThis.s=${styles.initializer.getText(ast)};`,{loader:'tsx'}).code,context);
  let tree;
  const render=()=>{cursor=0;tree=ctx.Game();for(const effect of effects.splice(0))effect();return tree};
  const labels=()=>text(render());
  const hud=()=>nodes(render()).find(n=>n.type===ctx.NativeFieldKitHUD);
  const press=label=>{const button=nodes(render()).find(n=>n.type==='Pressable'&&text(n)===label);assert(button,`Native button exists: ${label}`);button.props.onPress();render()};
  const frame=at=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(at))};
  render();
  const flush=async()=>{const store=slots.map(s=>s.value).find(value=>value instanceof m.NativeRunSaveStore||value instanceof m.RunSaveWriter);assert(store,'The production component owns a real save store');await store.flush()};
  const readSaved=async()=>{await flush();return new m.NativeRunSaveStore({getItem:async key=>storage.get(key)??null,setItem:async(key,value)=>{storage.set(key,value)}}).load()};
  return{render,labels,hud,press,frame,draws,reads,writes,errors,storage,ctx,releaseArtwork,releaseTerrain,renderer,flush,readSaved,preparationFrames,
   state:value=>events.get('change')?.(value),memoryWarning:()=>events.get('memoryWarning')?.(),autosave:()=>{for(const timer of timers.values())timer()},
   settled:()=>until(()=>Boolean(hud())||/Game paused|Run ended|Unable to open game/.test(labels())),
   close:()=>{for(const s of slots)s.cleanup?.()},
  };
 }
 const gatedTerrain=app(undefined,{holdTerrain:true});await until(()=>gatedTerrain.renderer.preparingTerrain);
 assert(!gatedTerrain.hud(),'No movement/HUD before detailed terrain is prepared');assert.equal(gatedTerrain.draws.length,0,'Final frame waits for detail');assert(!gatedTerrain.renderer.frameManaged,'Startup warming must not depend on gameplay frames');
 gatedTerrain.releaseTerrain();await gatedTerrain.settled();assert(gatedTerrain.hud());gatedTerrain.close();
 const brokenTerrain=app(undefined,{failTerrain:true});await brokenTerrain.settled();assert(brokenTerrain.labels().includes('Prepare nearby detail: terrain failed'));assert(brokenTerrain.labels().includes('Retry'));assert(!brokenTerrain.hud());brokenTerrain.close();
 const cold=app();await cold.settled();assert(cold.hud(),'First launch goes straight to the HUD');
 const world=cold.hud().props.world.current;assert(world.progression,'Native always starts Survival');assert(cold.renderer.terrainPrepared,'Nearby detail is prepared before gameplay');assert(cold.draws.length,'The first scene is drawn before gameplay');assert(cold.renderer.frameManaged,'Artwork preparation joins gameplay budgeting after startup');
 assert.deepEqual(cold.reads,[m.RUN_SAVE_KEY],'No editor cache or web service is consulted');
 for(const label of ['Continue game','Main menu','Open testing sandbox','Spawn tools','editor'])assert(!cold.labels().includes(label));
 const tick=world.tick;cold.frame(1000);cold.frame(1034);assert(world.tick>tick,'The game simulation starts without a Play button');
 cold.hud().props.onPause();assert(cold.labels().includes('Game paused'));const paused=world.tick;cold.frame(1068);assert.equal(world.tick,paused);
 cold.press('Resume');assert(cold.hud());
 world.player.hp=83;cold.autosave();await cold.flush();
 assert.equal(JSON.parse(cold.storage.get(m.RUN_SAVE_KEY)).nativeStorage,'native-split-layouts','The native component uses compact saves');
 const writesBeforeCheckpoint=cold.writes.length;world.bag.pallets=19;cold.hud().props.onCheckpoint();await cold.flush();
 assert.deepEqual(cold.writes.slice(writesBeforeCheckpoint),[m.RUN_SAVE_KEY],'An unchanged layout checkpoint writes only changing run state');
 assert.equal((await cold.readSaved()).worlds.find(([id])=>id==='camp')[1].bag.pallets,19,'HUD checkpoint persists current resources');
 world.stock.scrap=27;world.repairCheckpoint=true;cold.frame(1102);await cold.flush();
 assert.equal(world.repairCheckpoint,false,'The frame loop consumes repair-completion checkpoints');
 assert.equal((await cold.readSaved()).worlds.find(([id])=>id==='camp')[1].stock.scrap,27,'Repair completion reaches the real compact store');
 // A ready opaque atlas must stop hidden draws while simulation continues.
 const map=()=>nodes(cold.render()).find(n=>n.type===cold.ctx.NativePlayerMap);
 const stamp=performance.now()+2000;cold.hud().props.onMap();cold.frame(stamp);cold.render();
 assert(map().props.active,'Map button enters the continuous atlas');
 assert.equal(map().props.presentation.value,map().props.zoom.get(),'The UI presentation and authoritative camera agree at the animation endpoint');
 const mapNodes=nodes(cold.render()),mapNode=mapNodes.find(n=>n.type===cold.ctx.NativePlayerMap),hudNode=mapNodes.find(n=>n.type===cold.ctx.NativeFieldKitHUD),surfaceNodes=mapNodes.filter(n=>n.type===cold.ctx.NativePinchSurface),rootGesture=mapNodes.find(n=>n.type===cold.ctx.GestureDetector).props.gesture;
 assert.equal(mapNode.props.pinchGesture,rootGesture,'The atlas shares the root native pinch recognizer');
 assert.equal(surfaceNodes.length,1,'Only the empty background is directly registered at the App boundary');
 const registration=surfaceNodes[0].props.registration;
 assert(registration&&registration.gesture===rootGesture);assert.equal(hudNode.props.nativePinch,registration);assert.equal(mapNode.props.nativePinch,registration,'Background, movement HUD and atlas share one selective touch-permit stream');
 assert.equal(surfaceNodes[0].props.children.type,'View');assert.equal(surfaceNodes[0].props.children.props.children,undefined,'The background permit wrapper contains no HUD/action buttons');
 assert.equal(map().props.preparation,cold.renderer.preparation,'Tiles and artwork receive the same scheduler instance');assert(map().props.preparation instanceof m.NativeFrameWorkScheduler);
 const beforeReady=cold.draws.length;cold.frame(stamp+17);assert(cold.draws.length>beforeReady,'Keep drawing until map textures are ready');
 map().props.onReady(true);const beforeHidden=cold.draws.length,hiddenTick=world.tick;cold.frame(stamp+34);cold.frame(stamp+51);
 assert.equal(cold.draws.length,beforeHidden,'No world picture recording behind a ready opaque map');assert(world.tick>hiddenTick,'Map does not pause survival');
 const pumped=[];map().props.pump.current=at=>pumped.push(at);cold.frame(stamp+68);
 assert(pumped.length===1&&Number.isFinite(pumped[0]),'Each play frame hands the map its start time for tile requests');
 assert(cold.preparationFrames.some(([start])=>start===pumped[0]),'Map and image work share the same production preparation scheduler frame');
 assert(map().props.active&&map().props.zoom.get()<.7&&map().props.camera(.7).zoom>map().props.camera(map().props.zoom.get()).zoom,'The map reads the pinch amount from its store');
 map().props.onClose();cold.frame(stamp+500);cold.frame(stamp+517);assert(cold.draws.length>beforeHidden,'World resumes drawing when the atlas closes');
 cold.hud().props.onPause();const pumpedBeforePause=pumped.length,preparationBeforePause=cold.preparationFrames.length;cold.frame(stamp+600);assert.equal(pumped.length,pumpedBeforePause,'No tile rendering while paused');assert.equal(cold.preparationFrames.length,preparationBeforePause,'Paused frames do not drain gameplay preparation');
 const options=nodes(cold.render()).find(n=>n.type===cold.ctx.NativePerformanceMenuOptions);assert(options,'Pause menu exposes diagnostics');options.props.onOpen();
 const panel=nodes(cold.render()).find(n=>n.type===cold.ctx.NativePerformancePanel);assert(panel);panel.props.onStart();assert(panel.props.recorder.recording);assert(cold.hud(),'Recording resumes play');
 const probe=nodes(cold.render()).find(n=>n.type===cold.ctx.NativeUiFrameProbe);assert(probe.props.active&&probe.props.recorder===panel.props.recorder,'UI cadence probe shares the active native recorder');
 cold.frame(stamp+700);cold.frame(stamp+734);cold.memoryWarning();cold.autosave();await new Promise(resolve=>setImmediate(resolve));
 panel.props.recorder.stop(stamp+735);const log=JSON.parse(panel.props.recorder.exportJson());
 assert.equal(log.frameContexts.length,log.frames.length);assert(log.frames.length>0);
 const lastContext=log.frameContexts.at(-1),playerX=log.frameContextColumns.indexOf('playerX');assert(Math.abs(lastContext[playerX]-world.player.x)<.01,'Recorded frame contains the actual native player position');
 assert(log.systemTimings.some(row=>row[log.systemTimingColumns.indexOf('simulationMs')]>0),'Native simulation system is instrumented');
 assert(log.traceEvents.some(event=>event.stage==='native-save-encode'),'Native autosave serialization is captured');
 assert(log.importantTraceEvents.some(event=>event.stage==='native-memory-warning'),'Native memory warnings are retained');
 assert.equal(log.metadata.nativeDiagnosticsRevision,'ios-native-smoothness-v2');assert.equal(log.metadata.nativeSaveFormat,'split-layouts-v2');assert.equal(log.metadata.sharedPreparationBudget,true);
 await cold.flush();const saved=cold.storage.get(m.RUN_SAVE_KEY);assert(saved);const snapshot=await cold.readSaved(),captured=snapshot.worlds.find(([id])=>id==='camp')[1];
 const returning=app(new Map(cold.storage));await returning.settled();assert(returning.hud(),'A compact saved expedition resumes directly');assert.equal(returning.hud().props.world.current.player.hp,captured.player.hp);assert.equal(returning.hud().props.world.current.tick,captured.tick);
 const legacyText=JSON.stringify({version:1,savedAt:new Date().toISOString(),...snapshot},m.runSaveValue),legacy=app(legacyText);await legacy.settled();assert(legacy.hud(),'An existing v1 expedition still resumes directly');assert.equal(legacy.hud().props.world.current.bag.pallets,19);
 legacy.autosave();await legacy.flush();assert.equal(JSON.parse(legacy.storage.get(m.RUN_SAVE_KEY)).version,2,'An old save upgrades only after a successful native save');
 const interiorData=JSON.parse(legacyText),interiorWorld=structuredClone(interiorData.worlds[0][1]);
 interiorWorld.layout=m.emptyLayout();Object.assign(interiorWorld.player,{x:936,y:649,direction:'down-left'});interiorWorld.enemies=[];interiorWorld.animals=[];
 interiorData.worlds.push([m.BUNKER_SCENE.id,interiorWorld]);interiorData.currentId=m.BUNKER_SCENE.id;interiorData.route=[{sceneId:m.CAMP_SCENE_ID,spawn:{...captured.layout.spawn,direction:'down'}}];
 const inside=app(JSON.stringify(interiorData));await inside.settled();assert(inside.hud());assert.equal(inside.hud().props.world.current.scene.id,m.BUNKER_SCENE.id,'A legacy interior save restores its actual scene before the HUD');assert.equal(inside.draws[0].world.scene.id,m.BUNKER_SCENE.id,'No temporary camp frame is shown before the saved interior');
 inside.hud().props.onCheckpoint();await inside.flush();const insideReload=app(new Map(inside.storage));await insideReload.settled();assert.equal(insideReload.hud().props.world.current.scene.id,m.BUNKER_SCENE.id,'A compact interior save resumes in the same scene');
 const insideSaved=await insideReload.readSaved();assert.equal(insideSaved.worlds.length,2);assert.deepEqual(insideSaved.route,interiorData.route,'Compact save keeps the interior return route');assert.equal(insideSaved.worlds.find(([id])=>id===m.CAMP_SCENE_ID)[1].bag.pallets,19);
 const returningWorld=returning.hud().props.world.current,backgroundTick=returningWorld.tick;returningWorld.player.hp=71;returning.state('background');await returning.flush();returning.frame(stamp+800);
 assert.equal((await returning.readSaved()).worlds.find(([id])=>id==='camp')[1].player.hp,71,'Backgrounding saves the latest survivor state');assert.equal(returningWorld.tick,backgroundTick,'Backgrounding stops the simulation');assert(returning.labels().includes('Game paused'));returning.state('active');assert(!returning.hud(),'Foregrounding does not bypass Resume');
 const endedData=JSON.parse(legacyText);endedData.worlds.find(([id])=>id==='camp')[1].phase='over';endedData.worlds.find(([id])=>id==='camp')[1].player.hp=0;
 const ended=app(JSON.stringify(endedData));await ended.settled();assert(ended.labels().includes('Run ended'));assert(!ended.hud());
 const damaged=app('{broken save');await damaged.settled();assert(damaged.labels().includes('Your save has been kept'));assert(!damaged.hud());damaged.autosave();await new Promise(resolve=>setImmediate(resolve));assert.equal(damaged.storage.get(m.RUN_SAVE_KEY),'{broken save');assert(!damaged.labels().includes('Resume'));
 damaged.press('New Survival run');assert.equal(damaged.ctx.alert.length,2,'Replacing a save still requires the existing destructive-action confirmation');assert.equal(damaged.storage.get(m.RUN_SAVE_KEY),'{broken save');
 damaged.ctx.alert.find(button=>button.style==='destructive').onPress();assert(damaged.hud());await damaged.flush();assert((await damaged.readSaved()).worlds.length,'Confirmed replacement creates a valid compact save');
 const missingData=new Map(cold.storage),manifest=JSON.parse(saved);missingData.delete(m.NATIVE_LAYOUT_SAVE_KEYS[manifest.slot]);
 const missing=app(missingData);await missing.settled();assert(missing.labels().includes('Your save has been kept'));assert(!missing.hud());missing.autosave();await missing.flush();assert.equal(missing.storage.get(m.RUN_SAVE_KEY),saved,'Missing layout data preserves the original manifest');assert.equal(missing.writes.length,0,'An unreadable compact save is never overwritten by autosave');
 const inactive=app(undefined,{holdArtwork:true});await until(()=>inactive.labels().includes('Preparing game'));inactive.state('background');inactive.releaseArtwork();await inactive.settled();assert(inactive.labels().includes('Game paused'),'Backgrounding during startup must not launch a hidden simulation');inactive.state('active');assert(!inactive.hud());inactive.press('Resume');assert(inactive.hud());
 const failed=app(undefined,{failArtwork:true});await failed.settled();assert(failed.labels().includes('Warm artwork: artwork failed'));assert(failed.labels().includes('Retry'));assert.equal(failed.storage.has(m.RUN_SAVE_KEY),false);
 for(const instance of [cold,returning,legacy,inside,insideReload,ended,damaged,missing,inactive,failed])instance.close();
 console.log(JSON.stringify({passed:true,checks:['offline direct Survival launch','first frame before HUD','no native editor/test menu','legacy and compact camp/interior saved-run resume','compact state-only checkpoint writes','HUD and repair-completion checkpoints','background checkpoint durability','pause/resume','map suppresses hidden drawing without pausing survival','map and image preparation share play frames only, from the pinch store','selective background/HUD/atlas pinch registration','map close resumes drawing','recorder accessible from pause menu','ended-run screen','damaged and missing-layout saves preserved','confirmed new run','background during boot','named startup failure and retry'],physicalIPhoneTested:false},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
