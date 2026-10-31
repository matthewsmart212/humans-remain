import {warehouses,warehouseDock} from '../src/warehouse';
import {seedScrapSalvage} from '../src/scrap-salvage';
import {normalizeAtlasZoom,settleAtlasZoom,atlasZoomTween} from '../src/continuous-zoom-state';
import {placeWaypoint,stepWaypoint,WAYPOINT_ARRIVAL_RADIUS} from '../src/waypoint';
// Development-only component exercise. No cloud writes or authentication changes.
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import snapshot from '../native/assets/world-snapshot.json';
import {installImportedArt} from '../src/imported-art';
import {prepareAuthoredWorld} from '../src/authored-world';
import {createWorld,type World} from '../src/survival-engine';
import {startSurvivalCycle,cycleNightAmount,RUN_DAY_SECONDS,RUN_NIGHT_SECONDS,DUSK_SECONDS,DAWN_SECONDS} from '../src/survival-cycle';
import {BUNKER_SCENE} from '../src/world-scenes';
import {FieldKitController} from '../src/field-kit';
import {playerMapOutdoorBounds} from '../src/player-map';
import {continuousMapCamera} from '../src/continuous-zoom';
const PLAY_VIEW={x:0,y:0,zoom:1,follow:true,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true};
import PlayerMap,{preloadPlayerMap} from '../src/PlayerMap';
import {attachPlayZoom} from '../src/play-zoom-web';
import FieldKitHUD from '../src/FieldKitHUD';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/barlow/600.css';
import '../src/styles.css';
import '../src/world-editor.css';
import '../src/game-play.css';
import type {WorldLayout} from '../src/world-layout';
import type {ArtworkRecord} from '../src/artwork-model';
installImportedArt(snapshot.records as ArtworkRecord[]);
const layout=prepareAuthoredWorld(snapshot.layout as WorldLayout);
const quickbarFixture=new URLSearchParams(window.location.search).get('quickbar');
function previewLighting(w:World,mode:string){w.phase=mode==='night'||mode==='dawn'?'night':'day';w.phaseLeft=mode==='night'?RUN_NIGHT_SECONDS/2:mode==='dawn'?DAWN_SECONDS/2:mode==='dusk'?DUSK_SECONDS/2:RUN_DAY_SECONDS;w.nightAmount=cycleNightAmount(w)}
function QA(){
 const world=useRef<World>(createWorld(layout)),input=useRef({x:0,y:0}),controller=useMemo(()=>new FieldKitController(),[]);
 const zoomCanvas=useRef<HTMLCanvasElement>(null),zoomControls=useRef<ReturnType<typeof attachPlayZoom>|null>(null),zoom=useRef(1),[zoomValue,setZoomValue]=useState(1),mapBlocked=useRef(false);
 const [gestureResult,setGestureResult]=useState('Not run');
 const [renderStatus,setRenderStatus]=useState('Not started'),rendererCleanup=useRef<(()=>void)|null>(null);
 useEffect(()=>()=>rendererCleanup.current?.(),[]);
 const enableTerrain=async()=>{if(rendererCleanup.current){placeWaypoint(world.current,{x:world.current.player.x+600,y:world.current.player.y+70});return}setRenderStatus('Loading');try{const [{createWebWorld},{editorEntryArtwork,editorTerrainDetail,EDITOR_ENTRY_IMAGES},{drawWorldEditor}]=await Promise.all([import('../src/skia-web'),import('../src/editor-image-sources'),import('../src/placed-world-renderer')]);const localSources=(sources:Record<string,string>)=>Object.fromEntries(Object.entries(sources).map(([key,url])=>[key,url.startsWith('/api/asset-files/')?'/native/assets/world/'+url.split('/').at(-1)+'.png':/\/(motion-[ab]-v1|camp-axe-v1|camp-workshop)\.png$/.test(url)?url.replace(/\.png$/,'.webp'):url]));const r=await createWebWorld(zoomCanvas.current!,(ctx,atlas,imgs,w)=>drawWorldEditor(ctx,atlas,imgs,w,{...PLAY_VIEW,zoom:zoom.current}),localSources(editorEntryArtwork(layout)),{sources:localSources(EDITOR_ENTRY_IMAGES)});let frame=0;rendererCleanup.current=()=>{cancelAnimationFrame(frame);r.dispose()};void r.loadImages(editorTerrainDetail(layout.terrainImage)).catch(()=>{});placeWaypoint(world.current,{x:world.current.player.x+600,y:world.current.player.y+70});const draw=()=>{r.draw(world.current);frame=requestAnimationFrame(draw)};draw();setRenderStatus('Ready')}catch(error){setRenderStatus(String(error))}};
 const trailPreview=useRef(false);
 const previewTrail=()=>{const region=document.querySelector<HTMLElement>('.kit-movement-region')!,canvas=zoomCanvas.current!,r=canvas.getBoundingClientRect();const held=trailPreview.current;
  const send=(type:string,x:number,y:number)=>region.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:9101,isPrimary:true,button:0,clientX:x,clientY:y}));
  if(held){send('pointerup',r.left+r.width*.35+55,r.top+r.height*.7-65);trailPreview.current=false;return}
  const capture=region.setPointerCapture;region.setPointerCapture=()=>{};try{send('pointerdown',r.left+r.width*.35,r.top+r.height*.7);send('pointermove',r.left+r.width*.35+55,r.top+r.height*.7-65);trailPreview.current=true}finally{region.setPointerCapture=capture}
 };
 const testArrival=()=>{const w=world.current;placeWaypoint(w,{x:w.player.x+WAYPOINT_ARRIVAL_RADIUS+1,y:w.player.y});if(stepWaypoint(w))return setGestureResult('FAIL · distant waypoint deleted');w.player.x+=2;if(!stepWaypoint(w)||w.waypoint)return setGestureResult('FAIL · arrival did not clear');setGestureResult('PASS · arrival removes destination and navigation button')};
 const [open,setOpen]=useState(false),[bag,setBag]=useState(false),[demo,setDemo]=useState(false),[location,setLocation]=useState('camp'),[lighting,setLighting]=useState('day');
 const [showQA,setShowQA]=useState(true),[paused,setPaused]=useState(false),[sprinting,setSprinting]=useState(false),[held,setHeld]=useState(false),[starts,setStarts]=useState(0),[movement,setMovement]=useState({x:0,y:0,lastX:0,lastY:0});
 mapBlocked.current=bag||paused;
 const mapCamera=()=>continuousMapCamera(world.current,PLAY_VIEW,zoomCanvas.current?.clientWidth||390,zoomCanvas.current?.clientHeight||844,zoom.current);
 const applyZoom=(amount:number)=>{const value=normalizeAtlasZoom(amount);zoom.current=value;setZoomValue(value);setOpen(value<.7);if(value<.95)preloadPlayerMap(world.current)};
 const settleFrame=useRef(0);
 const settleZoom=(interrupted:boolean)=>{const start=zoom.current,target=settleAtlasZoom(start);if(start===target)return;cancelAnimationFrame(settleFrame.current);if(interrupted){applyZoom(target);return}const at=performance.now();const frame=(now:number)=>{const t=Math.min(1,(now-at)/150);applyZoom(atlasZoomTween(start,target,t));if(t<1)settleFrame.current=requestAnimationFrame(frame)};settleFrame.current=requestAnimationFrame(frame)};
 useEffect(()=>()=>cancelAnimationFrame(settleFrame.current),[]);
 useEffect(()=>{const receive=(event:MessageEvent)=>{if(event.source===window.parent&&event.origin===locationOrigin&&event.data?.type==='atlas-qa-view'&&[.1,.24,.48,1].includes(event.data.zoom))applyZoom(event.data.zoom)};const locationOrigin=window.location.origin;window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive)},[]);
 useEffect(()=>{const canvas=zoomCanvas.current;if(!canvas)return;const controls=attachPlayZoom(canvas,{touchRoot:canvas.closest('.camp-studio') as HTMLElement,enabled:()=>!mapBlocked.current,getZoom:()=>zoom.current,setZoom:value=>{cancelAnimationFrame(settleFrame.current);applyZoom(value)},onGestureEnd:settleZoom,minimumZoom:()=>mapCamera().minimum,mapActive:()=>zoom.current<.7,onPinchStart:()=>{cancelAnimationFrame(settleFrame.current);input.current={x:0,y:0}}});zoomControls.current=controls;return()=>{controls.dispose();zoomControls.current=null}},[]);
 // Synthetic touch replay exercises the real DOM capture order and React HUD.
 // Only browser pointer capture is stubbed: synthetic contacts cannot own it.
 const testMovementPinch=()=>{
  const canvas=zoomCanvas.current!,region=document.querySelector<HTMLElement>('.kit-movement-region')!,controls=zoomControls.current!;
  const restored=[canvas,region,canvas.closest('.camp-studio') as HTMLElement].map(el=>({el,set:el.setPointerCapture,has:el.hasPointerCapture,release:el.releasePointerCapture}));
  const send=(el:HTMLElement,type:string,id:number,x:number,y=200)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:id,clientX:x,clientY:y,button:0}));
  const check=(ok:boolean,label:string)=>{if(!ok)throw Error(label)};
  try{
   for(const {el} of restored){el.setPointerCapture=()=>{};el.hasPointerCapture=()=>false;el.releasePointerCapture=()=>{}}
   controls.cancel();zoom.current=1;setZoomValue(1);
   send(region,'pointerdown',101,60);send(region,'pointermove',101,90);check(input.current.x>.9,'Single-finger walking');
   send(canvas,'pointerdown',102,260);check(input.current.x===0&&controls.blocksMovement(),'Second finger stops movement immediately');
   send(region,'pointermove',101,110);check(input.current.x===0&&zoom.current<1,'Left thumb participates in pinch without walking');
   send(canvas,'pointermove',102,170);check(zoom.current<.7,'Same pinch enters atlas');
   send(canvas,'pointermove',102,140);check(zoom.current<.3,'Same pinch zooms farther out');
   send(canvas,'pointermove',102,270);check(zoom.current>.7,'Reversing same pinch returns to gameplay');
   send(canvas,'pointermove',102,310);check(zoom.current===1,'Same pinch keeps zooming in');
   send(canvas,'pointerup',102,260);send(region,'pointermove',101,120);check(input.current.x===0&&controls.blocksMovement(),'Remaining thumb cannot resume walking');
   send(region,'pointerup',101,120);check(!controls.blocksMovement(),'All fingers released');
   send(region,'pointerdown',103,60);send(region,'pointermove',103,90);check(input.current.x>.9,'Fresh movement drag works');send(region,'pointerup',103,90);
   setGestureResult('PASS · continuous round trip, movement suppression, release and fresh drag');
  }catch(error){setGestureResult('FAIL · '+String(error))}finally{controls.cancel();input.current={x:0,y:0};for(const {el,set,has,release} of restored){el.setPointerCapture=set;el.hasPointerCapture=has;el.releasePointerCapture=release}}
 };
 const testContinuous=async()=>{
  const canvas=zoomCanvas.current!,root=canvas.closest('.camp-studio') as HTMLElement,region=document.querySelector<HTMLElement>('.kit-movement-region')!;
  const controls=zoomControls.current!,saved=[canvas,root,region].map(el=>({el,set:el.setPointerCapture,has:el.hasPointerCapture,release:el.releasePointerCapture}));
  const send=(el:HTMLElement,type:string,id:number,x:number)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:id,clientX:x,clientY:200,button:0}));
  const tick=()=>new Promise(resolve=>setTimeout(resolve,40));
  try{
   for(const {el}of saved){el.setPointerCapture=()=>{};el.hasPointerCapture=()=>false;el.releasePointerCapture=()=>{}}
   controls.cancel();applyZoom(1);send(region,'pointerdown',201,0);send(canvas,'pointerdown',202,200);
   for(const [distance,expected] of [[120,.6],[60,.3],[20,.1],[120,.6],[160,.8],[200,1]]){
    send(root,'pointermove',202,distance);await tick();
    if(Math.abs(zoom.current-expected)>.001||input.current.x!==0||input.current.y!==0)throw Error('Scale or movement failed at '+expected);
    const visible=getComputedStyle(document.querySelector('.live-atlas')!).display!=='none';
    if(visible!==(expected<.7))throw Error('Map handoff failed at '+expected);
   }
   send(root,'pointerup',202,200);send(root,'pointerup',201,0);
   setGestureResult('PASS · same contacts survived mounted atlas and return; no walking');
  }catch(error){setGestureResult('FAIL · '+String(error))}finally{controls.cancel();for(const {el,set,has,release}of saved){el.setPointerCapture=set;el.hasPointerCapture=has;el.releasePointerCapture=release}}
 };
 const testHudBoundary=async()=>{
  const canvas=zoomCanvas.current!,root=canvas.closest('.camp-studio') as HTMLElement,controls=zoomControls.current!;
  const saved=[canvas,root].map(el=>({el,set:el.setPointerCapture,has:el.hasPointerCapture,release:el.releasePointerCapture}));
  const send=(type:string,id:number,x:number)=>root.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:id,isPrimary:id===601,clientX:x,clientY:200,button:0}));
  const tick=(ms=80)=>new Promise(resolve=>setTimeout(resolve,ms));
  try{
   for(const {el}of saved){el.setPointerCapture=()=>{};el.hasPointerCapture=()=>false;el.releasePointerCapture=()=>{}}
   controls.cancel();applyZoom(1);await tick();
   // Start on the real canvas, then replay root-captured pinch contacts.
   canvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:601,isPrimary:true,clientX:0,clientY:200,button:0}));
   canvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:602,isPrimary:false,clientX:200,clientY:200,button:0}));
   send('pointermove',602,136);await tick();send('pointerup',602,136);send('pointerup',601,0);const deadline=performance.now()+4000;while(zoom.current<.7&&performance.now()<deadline)await tick();await tick();
   const hud=document.querySelector<HTMLElement>('.field-kit')!,map=document.querySelector<HTMLElement>('.live-atlas')!;
   if(zoom.current<.7||getComputedStyle(hud).visibility==='hidden')throw Error('Released pinch left HUD hidden with map opacity '+getComputedStyle(map).opacity);
   if(controls.blocksMovement())throw Error('Walking remains blocked after release');
   setGestureResult('PASS · releasing near the map boundary restores HUD and walking');
  }catch(error){applyZoom(1);setGestureResult('FAIL · '+String(error))}finally{controls.cancel();for(const {el,set,has,release}of saved){el.setPointerCapture=set;el.hasPointerCapture=has;el.releasePointerCapture=release}}
 };
 const testWaypointZoom=async()=>{
  const root=zoomCanvas.current!.closest('.camp-studio') as HTMLElement,controls=zoomControls.current!;
  const saved:{el:HTMLElement;set:HTMLElement['setPointerCapture'];has:HTMLElement['hasPointerCapture'];release:HTMLElement['releasePointerCapture']}[]=[];
  const stub=(el:HTMLElement)=>{if(saved.some(s=>s.el===el))return;saved.push({el,set:el.setPointerCapture,has:el.hasPointerCapture,release:el.releasePointerCapture});el.setPointerCapture=()=>{};el.hasPointerCapture=()=>false;el.releasePointerCapture=()=>{}};
  const send=(el:HTMLElement,type:string,id:number,x:number,y:number,primary=true)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:id,isPrimary:primary,clientX:x,clientY:y,button:0}));
  const tick=()=>new Promise(resolve=>setTimeout(resolve,80));
  const check=(ok:unknown,label:string)=>{if(!ok)throw Error(label)};
  try{
   stub(root);controls.cancel();applyZoom(.48);await tick();
   for(let cycle=0;cycle<4;cycle++){
    const viewport=document.querySelector<HTMLElement>('.player-map-viewport')!;stub(viewport);
    const r=viewport.getBoundingClientRect(),x=r.left+r.width*.45,y=r.top+r.height*.5;
    (document.querySelector('.player-map-place') as HTMLButtonElement).click();await tick();
    const before=world.current.waypoint;
    send(viewport,'pointerdown',301,x-50,y);send(viewport,'pointerdown',302,x+50,y,false);
    send(root,'pointermove',302,x+30,y,false);await tick();
    // Root owns capture after the second contact, so release bypasses viewport.
    send(root,'pointerup',302,x+30,y,false);send(root,'pointerup',301,x-50,y);await tick();
    check(world.current.waypoint===before,'Pinch must never place a waypoint');
    send(viewport,'pointerdown',303,x,y);send(viewport,'pointermove',303,x+10,y);send(viewport,'pointerup',303,x+10,y);await tick();
    check(world.current.waypoint!==before&&document.querySelector('.player-map-waypoint'),'Tap after stopped/repeated pinch places waypoint');
    check(input.current.x===0&&input.current.y===0,'Map gestures never walk');
    (document.querySelector('.player-map-place') as HTMLButtonElement).click();await tick();const placed=world.current.waypoint;
    send(viewport,'pointerdown',304,x,y);send(viewport,'pointermove',304,x+30,y);send(viewport,'pointerup',304,x+30,y);await tick();
    check(world.current.waypoint===placed,'A drag cannot place a waypoint');
    (document.querySelector('.player-map-place') as HTMLButtonElement).click();await tick();
   }
   applyZoom(1);setGestureResult('PASS · 4 repeated map pinches, captured releases, thumb taps, drag rejection and no walking');
  }catch(error){applyZoom(1);setGestureResult('FAIL · '+String(error))}finally{controls.cancel();for(const {el,set,has,release}of saved){el.setPointerCapture=set;el.hasPointerCapture=has;el.releasePointerCapture=release}}
 };
 const change=(value:string)=>{setLocation(value);const w=createWorld(value==='bunker'?undefined:layout);if(value==='bunker'){w.scene=BUNKER_SCENE;Object.assign(w.player,BUNKER_SCENE.spawns.stairs)}else if(value==='warehouse'){const p=warehouses(layout)[0];if(p)Object.assign(w.player,warehouseDock(p));w.bag.pallets=12;w.bag.scrap=25;seedScrapSalvage(w,42)}else if(value==='river'){w.player.x=-4200;w.player.y=-2000;w.player.direction='up-right'}else if(value==='edge'){const b=playerMapOutdoorBounds();w.player.x=b.left+19;w.player.y=b.top+19;w.player.direction='up-left'}else w.player.direction='down-left';startSurvivalCycle(w);previewLighting(w,lighting);world.current=w};
 useEffect(()=>{change('camp');if(quickbarFixture){const w=world.current;w.gear={bag:{axe:1,woodenAxe:quickbarFixture==='all'?1:0},chest:{axe:0,woodenAxe:0}};w.cooked=3;w.cookedRabbit=2;w.cookedVenison=quickbarFixture==='all'?5:0;w.player.equipped='axe';w.player.hp=70;w.hunger=40}if(new URLSearchParams(window.location.search).has('hex')){const w=world.current;w.combatTest=true;w.enemies.push({id:99001,x:w.player.x+220,y:w.player.y,hp:100,maxHp:100,attackAt:0,path:[],repathAt:0,flashUntil:0})}},[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key.toLowerCase()==='m'&&!e.repeat)setOpen(v=>!v)};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[]);
 useEffect(()=>{if(!demo)return;let turn=0;const timer=setInterval(()=>{world.current.player.x+=45;world.current.player.direction=(['up','up-right','right','down-right','down','down-left','left','up-left'] as const)[turn++%8]},600);return()=>clearInterval(timer)},[demo]);
 useEffect(()=>{const timer=setInterval(()=>{const {x,y}=input.current;setMovement(old=>old.x===x&&old.y===y?old:{x,y,lastX:x||y?x:old.lastX,lastY:x||y?y:old.lastY})},30);return()=>clearInterval(timer)},[]);
 return <div className="camp-studio" data-mode="play" data-map-open={open} style={{position:'fixed',inset:0,background:'#283e33 url(/maps/world-terrain.webp) center/cover'}}>
  <div className="we-world" style={{position:'absolute',inset:0}}><canvas ref={zoomCanvas} aria-label="Gameplay zoom test surface" style={{width:'100%',height:'100%',touchAction:'none'}}/></div>
  <FieldKitHUD world={world} controller={controller} enabled={!open&&!bag&&!paused} mobile input={input} sprinting={sprinting} onSprint={()=>setSprinting(v=>!v)} onHeld={setHeld} onDodge={()=>{}} onTool={()=>{}} onMove={()=>setStarts(n=>n+1)} isPinching={()=>zoomControls.current?.blocksMovement()??false} onPause={()=>setPaused(true)} bagOpen={bag} onBag={setBag} mapOpen={open} onMap={open=>applyZoom(open?.1:.7)}/>
  {showQA&&!open&&!bag&&<div style={{position:'absolute',top:150,right:12,width:'44%',maxWidth:300,zIndex:12,display:'flex',flexDirection:'column',gap:6,padding:10,background:'#0d292ced',borderRadius:9,color:'#eddcba',fontSize:12}}><b>Map & controls QA</b><label>Lighting <select aria-label="Test map lighting" value={lighting} onChange={e=>{setLighting(e.target.value);previewLighting(world.current,e.target.value)}}><option value="day">Daylight</option><option value="dusk">Dusk</option><option value="night">Night</option><option value="dawn">Dawn</option></select></label><label>Facing <select aria-label="Torch test direction" defaultValue="down-left" onChange={e=>{world.current.player.direction=e.target.value as World['player']['direction']}}>{['up','up-right','right','down-right','down','down-left','left','up-left'].map(d=><option key={d}>{d}</option>)}</select></label><button onClick={()=>setShowQA(false)}>Hide diagnostics</button><button onClick={previewTrail}>Toggle movement dot preview</button><button onClick={enableTerrain}>Preview waypoint on terrain</button><output aria-label="Terrain render status">{renderStatus}</output><button onClick={testArrival}>Test waypoint arrival</button><output aria-label="Movement test status">Starts {starts} · Input {movement.x.toFixed(2)}, {movement.y.toFixed(2)} · Last {movement.lastX.toFixed(2)}, {movement.lastY.toFixed(2)} · Action {held?'held':'released'}</output><label>Location <select aria-label="Test location" value={location} onChange={e=>change(e.target.value)}><option value="camp">Camp · facing southwest</option><option value="warehouse">Warehouse · stocked backpack</option><option value="river">River · facing northeast</option><option value="bunker">Bunker interior</option><option value="edge">Northwest world edge</option></select></label><label><input type="checkbox" checked={demo} onChange={e=>setDemo(e.target.checked)}/>Move and turn marker while map is open</label><button onClick={()=>applyZoom(.1)}>Open map preview</button>{paused&&<button onClick={()=>setPaused(false)}>Resume controls</button>}</div>}
  {!open&&<div style={{position:'absolute',bottom:70,left:'35%',color:'white',zIndex:14}}><output aria-label="Gameplay zoom">Zoom {zoomValue.toFixed(2)}</output>{showQA&&<><button onClick={()=>zoomCanvas.current?.dispatchEvent(new WheelEvent('wheel',{ctrlKey:true,deltaY:40,deltaMode:0,cancelable:true,bubbles:true}))}>Test pinch-to-map</button><button onClick={testMovementPinch}>Test movement pinch</button><button onClick={testContinuous}>Test continuous gesture</button><button onClick={testWaypointZoom}>Test waypoint after repeated zoom</button><button onClick={testHudBoundary}>Test HUD at map boundary</button><output aria-label="Gesture regression result">{gestureResult}</output></>}</div>}
  <PlayerMap world={world} open={open} continuous={mapCamera()} onClose={()=>applyZoom(.7)}/>
 </div>;
}
createRoot(document.getElementById('root')!).render(<QA/>);
