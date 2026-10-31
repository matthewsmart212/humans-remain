// Development-only UI exercise: the real world, renderer, inventory and HUD, without cloud writes.
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import snapshot from '../native/assets/world-snapshot.json';
import {installImportedArt} from '../src/imported-art';
import {prepareAuthoredWorld} from '../src/authored-world';
import {createWorld,timeOf,worldBlocked,type World} from '../src/survival-engine';
import {FORAGE_ART,FORAGE_BY_ID} from '../src/forage-art';
import {nearbyForage} from '../src/foraging';
import {FieldKitController} from '../src/field-kit';
import FieldKitHUD from '../src/FieldKitHUD';
import {itemCount,setItemCount} from '../src/expedition-inventory';
import type {ArtworkRecord} from '../src/artwork-model';
import type {WorldLayout} from '../src/world-layout';
import '@fontsource/barlow-condensed/800.css';import '@fontsource/barlow/600.css';
import '../src/styles.css';import '../src/world-editor.css';import '../src/game-play.css';
installImportedArt(snapshot.records as ArtworkRecord[]);
const layout=prepareAuthoredWorld(snapshot.layout as WorldLayout),plants=layout.items.filter(p=>FORAGE_BY_ID.has(p.assetId));
const view={x:0,y:0,zoom:1,follow:true,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true,hideFoliage:false};
function QA(){
 const world=useRef<World>(createWorld(layout)),canvas=useRef<HTMLCanvasElement>(null),controller=useMemo(()=>new FieldKitController(),[]),input=useRef({x:0,y:0});
 const [ready,setReady]=useState('Loading woodland…'),[bag,setBag]=useState(false),[status,setStatus]=useState(''),[kind,setKind]=useState(0),[controls,setControls]=useState(true);
 const setPlant=(kind:number)=>{
  const w=world.current;controller.reset();w.enemies=[];w.animals=[];w.loot=[];w.breakables=[];w.combatTest=true;
  const p=plants.find(p=>p.assetId===FORAGE_ART[kind].id)!;
  for(let i=0;i<16;i++){const a=Math.PI/2+i*Math.PI/8;Object.assign(w.player,{x:p.x+Math.cos(a)*90,y:p.y+Math.sin(a)*90,direction:'up'});if(!worldBlocked(w,w.player.x,w.player.y,19)&&nearbyForage(w)?.placement.id===p.id)break}
  controller.release();setKind(kind);
 };
 useEffect(()=>{
  setPlant(0);let alive=true,frame=0,dispose=()=>{};
  (async()=>{try{
   const [{createWebWorld},{EDITOR_ENTRY_IMAGES,editorEntryArtwork,editorTerrainDetail},{drawWorldEditor}]=await Promise.all([import('../src/skia-web'),import('../src/editor-image-sources'),import('../src/placed-world-renderer')]);
   const local=(sources:Record<string,string>)=>Object.fromEntries(Object.entries(sources).map(([k,url])=>[k,url.startsWith('/api/asset-files/')?'/native/assets/world/'+url.split('/').at(-1)+'.png':/\/(motion-[ab]-v1|camp-axe-v1|camp-workshop)\.png$/.test(url)?url.replace(/\.png$/,'.webp'):url]));
   const r=await createWebWorld(canvas.current!,(ctx,atlas,imgs,w)=>drawWorldEditor(ctx,atlas,imgs,w,view),local(editorEntryArtwork(layout)),{sources:local(EDITOR_ENTRY_IMAGES)});
   dispose=()=>r.dispose();if(!alive){dispose();return}void r.loadImages(editorTerrainDetail(layout.terrainImage));setReady('Ready');
   let last=0;const draw=(now:number)=>{if(!alive)return;world.current.tick+=last?Math.min(4,(now-last)/1000*60):0;last=now;r.draw(world.current);setStatus(`Day ${world.current.round} · ${itemCount(world.current,'berries')} berries · ${itemCount(world.current,'apple')} apples`);frame=requestAnimationFrame(draw)};frame=requestAnimationFrame(draw);
  }catch(e){setReady(String(e))}})();return()=>{alive=false;cancelAnimationFrame(frame);dispose()};
 },[]);
 return <div className="camp-studio" data-mode="play" style={{position:'fixed',inset:0,background:'#354c32'}}>
  <canvas ref={canvas} style={{width:'100%',height:'100%'}}/>
  {ready==='Ready'&&<FieldKitHUD world={world} controller={controller} input={input} enabled mobile sprinting={false} onSprint={()=>{}} onHeld={()=>{}} onDodge={()=>{}} onTool={()=>{}} onMove={()=>{}} onPause={()=>{}} bagOpen={bag} onBag={setBag} mapOpen={false} onMap={()=>{}}/>}
  {controls&&<div style={{position:'absolute',bottom:8,left:150,zIndex:2000,display:'flex',gap:5,flexWrap:'wrap',maxWidth:600,background:'#102018e6',padding:7,color:'#f3e6c3',font:'12px Arial'}}>
   <button onClick={()=>setPlant(0)}>Berry bush</button><button onClick={()=>setPlant(1)}>Apple tree</button>
   <button onClick={()=>{world.current.round++;world.current.tick+=60}}>Next dawn</button>
   <button onClick={()=>{for(const k of Object.keys(world.current.gear!.bag))world.current.gear!.bag[k as keyof typeof world.current.gear.bag]=0;setItemCount(world.current,'berries',0);setItemCount(world.current,'apple',0);setItemCount(world.current,'scrap',120)}}>Full pack</button>
   <button onClick={()=>setItemCount(world.current,'scrap',0)}>Clear scrap</button>
   <button onClick={()=>setControls(false)}>Hide test controls</button>
   <output aria-label="Foraging inventory">{ready} · {status} · {FORAGE_ART[kind].name}</output>
  </div>}
 </div>;
}
createRoot(document.getElementById('root')!).render(<QA/>);
