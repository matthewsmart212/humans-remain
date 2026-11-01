// UI worklet logic runs with deterministic native-service adapters. This checks
// event ordering and presentation equivalence, not physical iPhone latency.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {build,transformSync} from 'esbuild';
import ts from 'typescript';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'native-map-gestures-'));
try{
 const ui=[],rn=[],effects=[],cleanups=[],reactions=[],gestures=[],states=[];
 const runtime={
  useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:fn=>effects.push(fn),
  useSharedValue(value){return{get value(){return value},set value(next){value=next},modify(fn){value=fn(value)}}},
  useAnimatedReaction(prepare,react){reactions.push({prepare,react,last:undefined})},
  cancelAnimation(){},withTiming(value,_config,done){ui.push(()=>done?.(true));return value},
  Easing:{cubic:t=>t*t*t,out:fn=>t=>1-fn(1-t)},
  scheduleOnUI(fn,...args){ui.push(()=>fn(...args))},scheduleOnRN(fn,...args){rn.push(()=>fn(...args))},
  useManualGesture(config){const g={handlerTag:gestures.length+1,config};gestures.push(g);return g},
  GestureStateManager:{activate:tag=>states.push(['active',tag]),deactivate:tag=>states.push(['ended',tag])},
  createElement:(type,props,...children)=>({type,props:{...props,children:children.length===1?children[0]:children}}),GestureDetector:'GestureDetector',
 };
 globalThis.__nativeMapHooks=runtime;
 const exports=["export * from './native/native-pinch-model';","export * from './native/map-presentation';","export * from './native/use-native-play-zoom';","export * from './native/play-zoom';","export * from './native/NativePinchSurface';","export * from './src/player-map';","export * from './src/player-map-labels';","export {CAMP_MAP_WALL} from './src/player-map-camp-wall';","export {PlayPinchZoom} from './src/play-zoom';"];
 await build({stdin:{contents:exports.join(''),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error',plugins:[{name:'platform-services',setup(b){
  b.onResolve({filter:/^(react|react-native|react-native-reanimated|react-native-gesture-handler|react-native-worklets)$/},a=>({path:a.path,namespace:'platform'}));
  b.onLoad({filter:/.*/,namespace:'platform'},a=>({contents:a.path==='react-native'?'module.exports={};':'module.exports=globalThis.__nativeMapHooks;',loader:'js'}));
 }}]});
 const m=createRequire(import.meta.url)(path.join(temp,'model.cjs'));
 const flushUI=()=>{for(let n=0;n<100;n++){while(ui.length)ui.shift()();let dirty=false;for(const r of reactions){const next=r.prepare(),key=JSON.stringify(next);if(key!==r.last){r.last=key;r.react(next);dirty=true}}if(!ui.length&&!dirty)return}throw Error('UI worklets failed to settle')};
 const flushRN=()=>{while(rn.length){rn.shift()();flushUI()}};
 const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
 // Exact shared camera math: bounds, near-edge focus, both orientations and all
 // blend amounts remain equivalent to the existing map coordinate system.
 const bounds={left:-3200,top:-2400,right:7400,bottom:6200,width:10600,height:8600};
 let cameraChecks=0;
 for(const [width,height]of [[844,390],[390,844],[320,568]])for(const zoom of [1,1.5,2.5,8,12,25])for(const focus of [{x:0,y:0},{x:-8000,y:9000},{x:1700,y:1550}]){
  const old=m.playerMapView(bounds,width,height,zoom,focus,25),next=m.nativeMapView(bounds,width,height,zoom,focus,25);for(const key of ['x','y','width','height','scale'])near(next[key],old[key]);cameraChecks++;
  const from={x:width*.45,y:height*.4},to={x:from.x+25,y:from.y-18},p=m.unprojectMapPoint(from,old),centre=m.nativeMapPan(next,from,to,width,height),after=m.nativeMapView(bounds,width,height,zoom,centre,25);
  // Only unconstrained camera movement can retain the anchor exactly at edges.
  if(after.x>bounds.left-32/after.scale&&after.x+after.width<bounds.right+32/after.scale&&after.y>bounds.top-32/after.scale&&after.y+after.height<bounds.bottom+32/after.scale){const projected=m.projectMapPoint(p,after);near(projected.x,to.x);near(projected.y,to.y)}
 }
 const mark={id:'hq',kind:'headquarters',label:'Headquarters',x:1700,y:1550},illustration={...mark,kind:'headquarters',width:400,height:300,rotation:.2,flipX:false,flipY:false,source:{x:0,y:0,width:400,height:300}},features={landmarks:[mark],illustrations:[illustration],paths:[]};
 for(const zoom of [1,2,4,8,12]){const view=m.playerMapView(bounds,844,390,zoom,{x:1700,y:1550}),old=m.playerMapLabels(features,view,844,390,zoom,{x:200,y:200},true)[0],next=m.nativeMapLabel({...mark,illustration},view,844,390,m.CAMP_MAP_WALL.radius*2);if(!old){assert.equal(next.labelOpacity,0);continue}near(next.anchor.x,old.anchor.x);near(next.anchor.y,old.anchor.y);if(old.box){near(next.left,old.box.left);near(next.top,old.box.top);near(next.labelOpacity,old.opacity)}else assert.equal(next.labelOpacity,0)}
 // Surface/parent handlers have independent native IDs and can deliver down/up
 // in either order. Only native-surface grants participate; action IDs never do.
 const native=(id,x,y)=>({id,absoluteX:x,absoluteY:y}),state=m.nativePinchState();
 m.registerNativePinchSurface(state,'movement:0',100,100);
 m.updateNativePinchTouches(state,'down',[native(0,700,100),native(1,100,100)],[native(0,700,100),native(1,100,100)]);
 assert.equal(state.contacts.find(c=>c.id===0).surfaceId,undefined);
 m.updateNativePinchTouches(state,'down',[native(0,700,100),native(1,100,100),native(2,300,100)],[native(2,300,100)]);
 m.registerNativePinchSurface(state,'world:0',300,100);
 assert(m.advanceNativePinch(state,1,.1).started);
 m.updateNativePinchTouches(state,'move',[native(0,701,100),native(1,100,100),native(2,250,100)],[]);
 near(m.advanceNativePinch(state,1,.1).zoom,.75);
 m.unregisterNativePinchSurface(state,'movement:0');m.updateNativePinchTouches(state,'up',[native(0,701,100),native(2,250,100)],[native(1,100,100)]);
 assert(!m.advanceNativePinch(state,.75,.1).ended,'One remaining registered finger keeps movement blocked');
 m.updateNativePinchTouches(state,'up',[native(0,701,100)],[native(2,250,100)]);m.unregisterNativePinchSurface(state,'world:0');
 assert(m.advanceNativePinch(state,.75,.1).ended,'An action finger cannot keep gameplay movement blocked');
 m.registerNativePinchSurface(state,'cancelled:0',400,100);m.unregisterNativePinchSurface(state,'cancelled:0');
 m.updateNativePinchTouches(state,'down',[native(0,701,100),native(1,400,100)],[native(1,400,100)]);
 assert.equal(state.contacts.find(c=>c.id===1).surfaceId,undefined,'Revoked unmatched grants cannot authorize a future action finger');
 // Nearby unregistered actions cannot steal a child-before-parent grant.
 const nearby=m.nativePinchState();m.updateNativePinchTouches(nearby,'down',[native(0,100,100)],[native(0,100,100)]);m.registerNativePinchSurface(nearby,'child:0',105,100);assert.equal(nearby.contacts[0].surfaceId,undefined);m.updateNativePinchTouches(nearby,'down',[native(0,100,100),native(1,105,100)],[native(1,105,100)]);assert.equal(nearby.contacts[1].surfaceId,'child:0');assert.equal(nearby.contacts[0].surfaceId,undefined);
 const moved=m.nativePinchState();m.updateNativePinchTouches(moved,'down',[native(0,100,100)],[native(0,100,100)]);m.updateNativePinchTouches(moved,'move',[native(0,120,100)],[]);m.registerNativePinchSurface(moved,'child:1',100,100);assert.equal(moved.contacts[0].surfaceId,undefined,'An old action down coordinate does not authorize its moved finger');
 // Follow snapshots queued on RN must recheck UI authority when they execute.
 assert(m.nativeMapFollowAllowed(true,'camp',1,'camp',1));
 assert(!m.nativeMapFollowAllowed(false,'camp',1,'camp',1),'A native pan wins over a queued follow snapshot');
 assert(!m.nativeMapFollowAllowed(true,'bunker',2,'camp',1),'A new scene rejects old follow work');
 assert(!m.nativeMapFollowAllowed(true,'camp',3,'camp',1),'Find-me/scene reset invalidates earlier queued pan/follow work');
 // Execute the production prefetch/sampler effects: walking with the atlas
 // closed refreshes its retained UI camera, without scheduling React samples.
 const mapSource=fs.readFileSync('native/PlayerMap.tsx','utf8'),mapAst=ts.createSourceFile('PlayerMap.tsx',mapSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),mapEffects=[];
 const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(mapAst)==='useEffect')mapEffects.push(node.arguments[0]);ts.forEachChild(node,visit)};visit(mapAst);
 const effectSource=part=>{const node=mapEffects.find(fn=>fn.getText(mapAst).includes(part));assert(node,`Production map effect exists: ${part}`);return transformSync(`globalThis.mount=${node.getText(mapAst)}`,{loader:'ts'}).code};
 const pendingEntry=[],tileRequests=[],sampleTimers=new Map();let sampled={x:0},sampleWrites=0;
 const mapContext={MIN_PLAY_ZOOM:.7,OPEN_TILES:48,CLOSED_TILES:32,PixelRatio:{get:()=>3},nativeMapFollowAllowed:m.nativeMapFollowAllowed,playerMapView:m.playerMapView,
  pump:{current:undefined},preparation:{},world:{current:{scene:undefined,x:1200,y:900}},current:{current:{scene:{id:'camp',bounds},size:{width:844,height:390},view:m.playerMapView(bounds,844,390,2.5),active:false,tiles:{want:(...args)=>tileRequests.push(args),trim(){}}}},
  uiCamera:{value:{continuous:true,entry:12,baseFocus:{x:0,y:0}}},uiFocus:{value:{x:0,y:0}},uiFollowing:{value:true},uiScene:{value:'camp'},uiEpoch:{value:1},cameraEpoch:{current:1},amount:{value:1},
  scheduleOnUI:(fn,...args)=>pendingEntry.push(()=>fn(...args)),setTileRevision:()=>assert.fail('Closed prefetch cannot render React'),
  active:false,sampleWorld:w=>({...w}),setSample:update=>{sampleWrites++;sampled=update(sampled)},setInterval:fn=>{sampleTimers.set(1,fn);return 1},clearInterval:id=>sampleTimers.delete(id),
 };
 mapContext.continuousCamera=()=>({focus:{x:mapContext.world.current.x,y:mapContext.world.current.y},entry:20,zoom:20});
 const mapVM=vm.createContext(mapContext);vm.runInContext(effectSource('pump.current=frameStart'),mapVM);const stopPump=mapContext.mount();
 const flushEntry=()=>{while(pendingEntry.length)pendingEntry.shift()()};
 mapContext.pump.current(0);flushEntry();near(mapContext.uiCamera.value.baseFocus.x,1200);near(mapContext.uiFocus.value.y,900);assert.equal(mapContext.uiCamera.value.entry,20);assert.equal(sampleWrites,0);
 mapContext.world.current.x=2000;mapContext.pump.current(100);assert.equal(pendingEntry.length,0,'Closed entry work reuses the existing 250 ms prefetch cadence');
 mapContext.pump.current(250);mapContext.amount.value=.6;flushEntry();near(mapContext.uiFocus.value.x,1200);
 mapContext.amount.value=1;mapContext.pump.current(500);mapContext.uiFollowing.value=false;flushEntry();near(mapContext.uiFocus.value.x,1200);
 mapContext.uiFollowing.value=true;mapContext.pump.current(750);mapContext.uiEpoch.value=2;flushEntry();near(mapContext.uiFocus.value.x,1200);
 mapContext.uiEpoch.value=1;mapContext.pump.current(1000);mapContext.uiScene.value='bunker';flushEntry();near(mapContext.uiFocus.value.x,1200);
 mapContext.uiScene.value='camp';mapContext.world.current.scene={id:'bunker'};const requestsBeforeScene=tileRequests.length;mapContext.pump.current(1250);assert.equal(pendingEntry.length,0);assert.equal(tileRequests.length,requestsBeforeScene,'A changed world scene cannot prefetch or publish into the old map');
 stopPump();assert.equal(mapContext.pump.current,undefined);
 vm.runInContext(effectSource('const refresh='),mapVM);assert.equal(mapContext.mount(),undefined);assert.equal(sampleWrites,0);assert.equal(sampleTimers.size,0);
 mapContext.active=true;const stopSampler=mapContext.mount();assert.equal(sampleWrites,1,'Opening samples immediately, before the first 100 ms timer');assert.equal(sampled.x,2000);mapContext.world.current.x=2500;sampleTimers.get(1)();assert.equal(sampled.x,2500);stopSampler();assert.equal(sampleTimers.size,0);
 // Actual hook: UI keeps advancing while RN is withheld; queued reports stay
 // bounded, final zoom is exact, and late reports cannot override cancellation.
 let enabled=true,authority=1,begins=0,ends=0;
 const store=m.createZoomStore(1),controller=m.useNativePlayZoom({enabled:()=>enabled,getZoom:()=>authority,setZoom:value=>{authority=value;store.set(value,false)},minimumZoom:()=>.1,onPinchStart:()=>begins++,onGestureEnd:()=>ends++},store);
 for(const fn of effects.splice(0)){const cleanup=fn();if(typeof cleanup==='function')cleanups.push(cleanup)}flushUI();
 const root=controller.gesture.config,event=(touches,changed)=>({handlerTag:controller.gesture.handlerTag,numberOfTouches:touches.length,allTouches:touches,changedTouches:changed});
 const a=native(0,100,100),b=native(1,300,100);
 root.onTouchesDown(event([a,b],[a,b]));controller.registration.registerSurface('world:0',100,100);controller.registration.registerSurface('movement:0',300,100);flushUI();
 for(let distance=198;distance>=100;distance-=2){root.onTouchesMove(event([a,native(1,100+distance,100)],[]));flushUI()}
 near(controller.amount.value,.5);near(authority,1);assert(rn.length<=2,'At most one zoom report plus one lifecycle notification waits for busy RN');
 flushRN();near(authority,.5);assert(controller.blocksMovement());assert.equal(begins,1);
 root.onTouchesUp(event([a],[native(1,200,100)]));controller.registration.unregisterSurface('movement:0');flushUI();flushRN();assert(controller.blocksMovement());
 root.onTouchesUp(event([],[a]));controller.registration.unregisterSurface('world:0');flushUI();flushRN();assert(!controller.blocksMovement());assert.equal(ends,1);near(authority,.5);
 // Late raw RN touch events are compatibility no-ops, even after the native ID
 // and coordinates have been reused for an action button.
 controller.start({nativeEvent:{identifier:71,touches:[{identifier:71,pageX:100,pageY:100}]}});
 root.onTouchesDown(event([a],[a]));controller.registration.registerSurface('new-world:0',300,100);root.onTouchesDown(event([a,b],[b]));flushUI();assert(!controller.uiPinching.value,'Late JS start never grants a future action-button touch');
 controller.registration.unregisterSurface('new-world:0');root.onTouchesUp(event([],[a,b]));flushUI();flushRN();
 root.onTouchesDown(event([a,b],[a,b]));controller.registration.registerSurface('w:0',100,100);controller.registration.registerSurface('m:0',300,100);root.onTouchesMove(event([a,native(1,250,100)],[]));flushUI();
 controller.cancel();const held=authority;flushUI();flushRN();near(authority,held);assert(!controller.blocksMovement(),'Cancellation invalidates in-flight lifecycle/zoom reports');
 controller.animateTo(.7,150);flushUI();flushRN();near(authority,.7);assert(!controller.uiPinching.value);
 enabled=false;controller.syncConfig();flushUI();assert(controller.blocksMovement());enabled=true;controller.syncConfig();flushUI();assert(!controller.blocksMovement());
 // Unmount invalidates all queued work without invoking a React/game callback.
 root.onTouchesDown(event([a,b],[a,b]));controller.registration.registerSurface('last:0',100,100);controller.registration.registerSurface('last:1',300,100);flushUI();const beforeUnmount=[authority,begins,ends];for(const cleanup of cleanups)cleanup();flushUI();flushRN();assert.deepEqual([authority,begins,ends],beforeUnmount);
 console.log(JSON.stringify({passed:true,cameraChecks,checks:['UI camera/label equivalence','native surface namespaces and event ordering','action exclusion and pointer reuse','exact end sync','bounded RN delivery under stalls','cancel/replacement/unmount token guards','native UI zoom progresses without RN'],physicalIPhoneTested:false}));
}finally{delete globalThis.__nativeMapHooks;fs.rmSync(temp,{recursive:true,force:true})}
