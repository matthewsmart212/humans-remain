import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'play-zoom-')),require=createRequire(import.meta.url);
const original={window:globalThis.window,document:globalThis.document,Image:globalThis.Image};
try{
 await build({stdin:{contents:"export * from './src/play-zoom';export * from './src/continuous-zoom-state';export * from './src/play-zoom-web';export * from './native/play-zoom';export * from './src/player-map-images';export * from './src/placed-world-renderer';export * from './src/studio-play';export * from './src/imported-art';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),plugins:[{name:'responder-events',setup(b){b.onResolve({filter:/^react-native$/},()=>({path:'responder',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const PanResponder={create:handlers=>({panHandlers:handlers})};'}))}}]});
 const m=require(path.join(temp,'model.cjs')),close=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} equals ${b}`);
 const pair=(distance,ids=[1,2])=>[{id:ids[0],x:0,y:0},{id:ids[1],x:distance,y:0}];
 const continuous=new m.PlayPinchZoom(.02);
 let c=continuous.update(pair(100),1);
 for(const [distance,expected] of [[60,.6],[30,.3],[10,.1],[60,.6],[80,.8],[100,1]]){c=continuous.update(pair(distance),c);close(c,expected)}
 continuous.setMinimum(.05);c=continuous.update(pair(4),c);close(c,.05);c=continuous.update(pair(8),c);close(c,.1);
 continuous.cancel();
 const pinch=new m.PlayPinchZoom();let z=pinch.update(pair(100),1);close(z,1);z=pinch.update(pair(70),z);close(z,.7);
 z=pinch.update(pair(10),z);close(z,.7);z=pinch.update(pair(11),z);close(z,.77);z=pinch.update(pair(1000),z);close(z,1);
 z=pinch.update(pair(1000,[1,3]),.8);close(z,.8);z=pinch.update(pair(500,[3,1]),z);close(z,.7);
 pinch.update([{id:1,x:0,y:0}],z);close(pinch.update(pair(10000),z),z);pinch.cancel();close(pinch.update(pair(20),z),z);
 const event=(type,values={})=>Object.assign(new Event(type,{cancelable:true}),values);
 class Surface extends EventTarget{clientHeight=480;setPointerCapture(){}hasPointerCapture(){return false}}
 const canvas=new Surface();globalThis.window=new EventTarget();globalThis.document=new EventTarget();document.hidden=false;
 let enabled=true;z=1;
 const web=m.attachPlayZoom(canvas,{enabled:()=>enabled,getZoom:()=>z,setZoom:v=>z=v});
 const pointer=(type,id,x)=>{const e=event(type,{pointerId:id,clientX:x,clientY:0,pointerType:'touch'});canvas.dispatchEvent(e);return e};
 pointer('pointerdown',1,0);pointer('pointerdown',2,100);assert(pointer('pointermove',2,70).defaultPrevented);close(z,.7);
 pointer('pointermove',2,100);close(z,1);pointer('pointercancel',2,100);pointer('pointermove',1,200);close(z,1);
 pointer('pointerup',1,200);let e=event('wheel',{ctrlKey:true,deltaY:100,deltaMode:0});canvas.dispatchEvent(e);assert(e.defaultPrevented);close(z,.7);
 e=event('wheel',{ctrlKey:false,deltaY:-100,deltaMode:0});canvas.dispatchEvent(e);assert(!e.defaultPrevented);close(z,.7);
 canvas.dispatchEvent(event('wheel',{ctrlKey:true,deltaY:-100,deltaMode:0}));close(z,1);
 canvas.dispatchEvent(event('gesturestart'));canvas.dispatchEvent(event('gesturechange',{scale:.7}));close(z,.7);canvas.dispatchEvent(event('gestureend'));
 pointer('pointerdown',1,0);canvas.dispatchEvent(event('gesturestart'));pointer('pointerdown',2,100);canvas.dispatchEvent(event('gesturechange',{scale:.5}));close(z,.7);pointer('pointermove',2,110);close(z,.77);canvas.dispatchEvent(event('gestureend'));
 window.dispatchEvent(event('resize'));pointer('pointermove',2,500);close(z,.77);
 enabled=false;canvas.dispatchEvent(event('wheel',{ctrlKey:true,deltaY:100,deltaMode:0}));close(z,.77);web.dispose();enabled=true;canvas.dispatchEvent(event('wheel',{ctrlKey:true,deltaY:100,deltaMode:0}));close(z,.77);
 // Events on the movement overlay and canvas reach the same parent listener.
 const root=new Surface(),worldSurface=new Surface(),movementSurface={closest:()=>movementSurface},actionSurface={closest:()=>null};
 let stops=0;z=1;
 const mixed=m.attachPlayZoom(worldSurface,{touchRoot:root,enabled:()=>enabled,getZoom:()=>z,setZoom:v=>z=v,onPinchStart:()=>stops++});
 const mixedEvent=(target,type,values={})=>{const e=event(type,{pointerType:'touch',clientY:0,...values});Object.defineProperty(e,'target',{value:target});root.dispatchEvent(e)};
 const mixedPointer=(target,type,id,x)=>mixedEvent(target,type,{pointerId:id,clientX:x});
 for(const [a,b]of [[movementSurface,worldSurface],[worldSurface,movementSurface],[movementSurface,movementSurface]]){
  mixed.cancel();z=1;const beforeStops=stops;
  mixedPointer(a,'pointerdown',1,50);mixedPointer(b,'pointerdown',2,250);assert(mixed.blocksMovement());assert.equal(stops,beforeStops+1);
  mixedPointer(a,'pointermove',1,80);close(z,.85);
  mixedPointer(b,'pointerup',2,250);mixedPointer(a,'pointermove',1,100);close(z,.85);assert(mixed.blocksMovement(),'The remaining finger belongs to the pinch until released');
  mixedPointer(a,'pointerup',1,100);assert(!mixed.blocksMovement());
 }
 mixedPointer(movementSurface,'pointerdown',1,50);mixedPointer(actionSurface,'pointerdown',2,250);
 mixedEvent(movementSurface,'gesturestart');mixedEvent(movementSurface,'gesturechange',{scale:.5});mixedPointer(movementSurface,'pointermove',1,80);
 close(z,.85);assert(!mixed.blocksMovement(),'Movement plus action must not turn into a Safari pinch');
 mixedEvent(movementSurface,'gestureend');mixedPointer(movementSurface,'pointerup',1,80);
 mixedPointer(movementSurface,'pointerdown',1,50);mixedPointer(worldSurface,'pointerdown',2,250);mixedPointer(worldSurface,'pointercancel',2,250);assert(mixed.blocksMovement());
 mixedPointer(movementSurface,'pointercancel',1,50);assert(!mixed.blocksMovement());mixed.dispose();
 const touch=(id,x,target='world')=>({identifier:id,pageX:x,pageY:0,target});
 const nativeEvent=(touches,identifier=touches.at(-1)?.identifier)=>({nativeEvent:{target:'world',identifier,touches}});z=1;
 let movementStops=0;
 const native=m.createNativePlayZoom({enabled:()=>enabled,getZoom:()=>z,setZoom:v=>z=v,onPinchStart:()=>movementStops++}),handlers=native.touchHandlers;
 native.start(nativeEvent([touch(1,0,'movement')]));
 handlers.onTouchMove(nativeEvent([touch(1,0,'movement'),touch(9,100,'attack')]));close(z,1);assert(!native.blocksMovement(),'Movement plus action stays independent');
 native.start(nativeEvent([touch(1,0,'movement'),touch(2,100)]));assert(native.blocksMovement());assert.equal(movementStops,1);
 handlers.onTouchMove(nativeEvent([touch(1,0,'movement'),touch(2,70)]));close(z,.7);handlers.onTouchMove(nativeEvent([touch(1,0),touch(2,1000)]));close(z,1);
 handlers.onTouchEnd(nativeEvent([touch(1,0)]));assert(native.blocksMovement(),'Lifting only one pinch finger cannot resume walking');
 native.start(nativeEvent([touch(1,0),touch(3,200)]));close(z,1);handlers.onTouchMove(nativeEvent([touch(1,0),touch(3,140)]));close(z,.7);
 handlers.onTouchCancel(nativeEvent([]));assert(!native.blocksMovement());
 native.start(nativeEvent([touch(4,0)]));native.start(nativeEvent([touch(4,0),touch(5,100)]));close(z,.7);enabled=false;handlers.onTouchMove(nativeEvent([touch(4,0),touch(5,200)]));close(z,.7);assert(native.blocksMovement(),'Disabled gameplay blocks movement after gesture cancellation');native.cancel();enabled=true;assert(!native.blocksMovement());
 // Both platform adapters retain the same contacts through the entire scale range.
 z=1;enabled=true;const liveSurface=new Surface();
 const live=m.attachPlayZoom(liveSurface,{enabled:()=>enabled,getZoom:()=>z,setZoom:v=>z=v,minimumZoom:()=>.02,mapActive:()=>z<.7});
 const livePointer=(type,id,x)=>liveSurface.dispatchEvent(event(type,{pointerId:id,clientX:x,clientY:0,pointerType:'touch'}));
 livePointer('pointerdown',1,0);livePointer('pointerdown',2,100);
 for(const [distance,expected]of [[60,.6],[30,.3],[10,.1],[60,.6],[80,.8],[100,1]]){livePointer('pointermove',2,distance);close(z,expected);assert(live.blocksMovement())}
 livePointer('pointerup',2,100);assert(live.blocksMovement());livePointer('pointerup',1,0);assert(!live.blocksMovement());
 liveSurface.dispatchEvent(event('wheel',{ctrlKey:false,deltaY:300,deltaMode:0}));assert(z<.7,'Ordinary wheel enters atlas');
 liveSurface.dispatchEvent(event('wheel',{ctrlKey:false,deltaY:-600,deltaMode:0}));close(z,1);live.dispose();
 z=1;const liveNative=m.createNativePlayZoom({enabled:()=>enabled,getZoom:()=>z,setZoom:v=>z=v,minimumZoom:()=>.02});
 liveNative.start(nativeEvent([touch(1,0,'movement')]));liveNative.start(nativeEvent([touch(1,0,'movement'),touch(2,100)]));
 for(const [distance,expected]of [[60,.6],[30,.3],[10,.1],[60,.6],[80,.8],[100,1]]){liveNative.touchHandlers.onTouchMove(nativeEvent([touch(1,0),touch(2,distance)]));close(z,expected);assert(liveNative.blocksMovement())}
 liveNative.touchHandlers.onTouchEnd(nativeEvent([touch(1,0)]));assert(liveNative.blocksMovement());liveNative.touchHandlers.onTouchEnd(nativeEvent([]));assert(!liveNative.blocksMovement());
 // Releasing in the crossfade must leave either usable gameplay or a full map.
 for(const [raw,expected]of [[.68,.7],[.65,.7],[.699999999999,.7],[.62,.56],[.6,.56],[.5,.5],[1,1],[NaN,1]])close(m.settleAtlasZoom(raw),expected);
 for(let raw=.01;raw<=1;raw+=.001){const settled=m.settleAtlasZoom(raw);assert(settled>=.7||settled<=.56,'Idle state cannot strand hidden HUD behind a transparent map');close(m.atlasZoomTween(raw,.7,1),.7)}
 z=1;let endings=[];const settleSurface=new Surface();
 const settledWeb=m.attachPlayZoom(settleSurface,{enabled:()=>true,getZoom:()=>z,setZoom:v=>z=v,minimumZoom:()=>.02,onGestureEnd:interrupted=>{endings.push(interrupted);z=m.settleAtlasZoom(z)}});
 const boundaryPointer=(type,id,x)=>settleSurface.dispatchEvent(event(type,{pointerId:id,clientX:x,clientY:0,pointerType:'touch'}));
 const beginBoundary=distance=>{z=1;boundaryPointer('pointerdown',1,0);boundaryPointer('pointerdown',2,100);boundaryPointer('pointermove',2,distance)};
 beginBoundary(68);boundaryPointer('pointerup',2,68);close(z,.68);assert(settledWeb.blocksMovement());assert.equal(endings.length,0);boundaryPointer('pointerup',1,0);close(z,.7);assert.deepEqual(endings,[false]);
 for(const kind of ['blur','resize']){beginBoundary(60);window.dispatchEvent(event(kind));close(z,.56);assert.equal(endings.at(-1),true);assert(!settledWeb.blocksMovement())}
 beginBoundary(68);boundaryPointer('pointercancel',2,68);boundaryPointer('pointercancel',1,0);close(z,.7);assert.equal(endings.at(-1),true);
 settleSurface.dispatchEvent(event('gesturestart'));settleSurface.dispatchEvent(event('gesturechange',{scale:.97}));settleSurface.dispatchEvent(event('gestureend'));close(z,.7);assert.equal(endings.at(-1),false);
 z=.68;settleSurface.dispatchEvent(event('wheel',{ctrlKey:true,deltaY:0,deltaMode:0}));await new Promise(resolve=>setTimeout(resolve,380));close(z,.7);
 beginBoundary(68);const prior=endings.length;settledWeb.dispose();assert.equal(endings.length,prior,'Unmount must not update state');
 let nativeEndings=[];z=1;const settledNative=m.createNativePlayZoom({enabled:()=>true,getZoom:()=>z,setZoom:v=>z=v,minimumZoom:()=>.02,onGestureEnd:interrupted=>{nativeEndings.push(interrupted);z=m.settleAtlasZoom(z)}});
 const beginNative=distance=>{z=1;settledNative.start(nativeEvent([touch(1,0)]));settledNative.start(nativeEvent([touch(1,0),touch(2,100)]));settledNative.touchHandlers.onTouchMove(nativeEvent([touch(1,0),touch(2,distance)]))};
 beginNative(68);settledNative.touchHandlers.onTouchEnd(nativeEvent([touch(1,0)]));close(z,.68);assert.equal(nativeEndings.length,0);settledNative.touchHandlers.onTouchEnd(nativeEvent([]));close(z,.7);assert.deepEqual(nativeEndings,[false]);
 beginNative(60);settledNative.touchHandlers.onTouchCancel(nativeEvent([]));close(z,.56);assert.equal(nativeEndings.at(-1),true);
 beginNative(68);settledNative.cancel();close(z,.7);const afterCancel=nativeEndings.length;settledNative.cancel();assert.equal(nativeEndings.length,afterCancel);
 console.log('HUD boundary regressions passed: both platforms, partial release, cancellation, interruption, Safari, wheel and exact animation completion');
 const imageLoads=new Map();let decoded=0;
 globalThis.Image=class{set src(url){this.url=url;const n=(imageLoads.get(url)||0)+1;imageLoads.set(url,n);queueMicrotask(()=>url==='/failed-atlas'&&n===1?this.onerror():this.onload())}decode(){decoded++;return Promise.resolve()}};
 m.prefetchPlayerMapImages(['/atlas']);const firstImage=await m.loadPlayerMapImage('/atlas');assert.equal(await m.loadPlayerMapImage('/atlas'),firstImage);assert.equal(imageLoads.get('/atlas'),1);assert.equal(decoded,1,'Atlas reuses its prefetched decoded image');
 await assert.rejects(()=>m.loadPlayerMapImage('/failed-atlas'));await m.loadPlayerMapImage('/failed-atlas');assert.equal(imageLoads.get('/failed-atlas'),2,'Failed prefetch remains retryable');
 for(const url of ['/cache1','/cache2','/cache3','/cache4','/cache5'])await m.loadPlayerMapImage(url);
 await m.loadPlayerMapImage('/cache1');assert.equal(imageLoads.get('/cache1'),2,'Old decoded atlas entries leave the bounded cache');
 const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));m.installImportedArt(snapshot.records);const world=m.createCampPlaySession(snapshot.layout);
 const view={x:0,y:0,zoom:1,follow:true,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true};
 for(const [w,h]of [[390,844],[844,390],[1440,900]]){
  const normal=m.editorCamera(w,h,world,view),out=m.editorCamera(w,h,world,{...view,zoom:.7});close(out.scale/normal.scale,.7);close(m.editorCamera(w,h,world,{...view,zoom:.01}).scale,out.scale);close(m.editorCamera(w,h,world,{...view,zoom:8}).scale,normal.scale);close(m.editorCamera(w,h,world,{...view,playing:false,zoom:.1}).scale/normal.scale,.1);
 }
 const report={passed:true,zoomRange:[.7,1],web:['touch pinch','movement + world in either touch order','two movement-area touches','movement suppressed until all pinch fingers lift','movement + action stays independent including Safari events','trackpad Ctrl+wheel','Safari gesture fallback','no double application','cancel/resize cleanup','disabled outside Play','continuous game/atlas round trip with same contacts','ordinary wheel across boundary in both directions'],native:['registered world and movement touches share a pinch','action touches excluded','movement suppressed until all pinch fingers lift','release/rejoin','cancellation','disabled while paused','continuous game/atlas round trip without disabling input adapter'],camera:['same bounds in portrait and landscape','editor zoom unchanged','player follow retained','map close retains gameplay zoom'],physicalIPhoneTested:false};
 fs.mkdirSync('docs/qa/play-zoom-v1',{recursive:true});fs.writeFileSync('docs/qa/play-zoom-v1/gestures.json',JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{globalThis.window=original.window;globalThis.document=original.document;if(original.Image)globalThis.Image=original.Image;else delete globalThis.Image;fs.rmSync(temp,{recursive:true,force:true})}
