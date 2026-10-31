// Development-only exercise of the actual map, HUD, tool attachment and mining simulation.
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import snapshot from '../native/assets/world-snapshot.json';
import {installImportedArt} from '../src/imported-art';
import {prepareAuthoredWorld} from '../src/authored-world';
import {createWorld,worldBlocked,attack,stepAxe,movePlayer,facing,type World,type Direction} from '../src/survival-engine';
import {MINEABLE_ROCKS,nearbyMineableRock} from '../src/rock-mining';
import {gear} from '../src/player-gear';
import {selectQuickItem,type QuickItem} from '../src/quick-items';
import {FieldKitController} from '../src/field-kit';
import FieldKitHUD from '../src/FieldKitHUD';
import {itemCount} from '../src/expedition-inventory';
import type {ArtworkRecord} from '../src/artwork-model';
import type {WorldLayout} from '../src/world-layout';
import '@fontsource/barlow-condensed/800.css';import '@fontsource/barlow/600.css';
import '../src/styles.css';import '../src/world-editor.css';import '../src/game-play.css';
installImportedArt(snapshot.records as ArtworkRecord[]);
const layout=prepareAuthoredWorld(snapshot.layout as WorldLayout),rocks=layout.items.filter(p=>MINEABLE_ROCKS.has(p.assetId));
const view={x:0,y:0,zoom:1,follow:true,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true,hideFoliage:false};
function QA(){
 const world=useRef<World>(createWorld(layout)),canvas=useRef<HTMLCanvasElement>(null),controller=useMemo(()=>new FieldKitController(),[]),input=useRef({x:0,y:0}),held=useRef(false),rockId=useRef('');
 const [ready,setReady]=useState('Loading woodland…'),[bag,setBag]=useState(false),[status,setStatus]=useState(''),[controls,setControls]=useState(true);
 const reset=()=>{
  const w=createWorld(layout);w.enemies=[];w.animals=[];w.loot=[];w.breakables=[];w.editorPreview=true;w.combatTest=true;w.survivalEnabled=true;
  for(const k of Object.keys(gear(w).bag))gear(w).bag[k as keyof typeof w.gear.bag]=0;
  gear(w).bag.woodenPickaxe=1;gear(w).bag.metalPickaxe=1;
  const p=rocks[0];rockId.current=p.id;
  for(let i=0;i<24;i++){const a=Math.PI/2+i*Math.PI/12;Object.assign(w.player,{x:p.x+Math.cos(a)*180,y:p.y+Math.sin(a)*180,direction:facing(-Math.cos(a),-Math.sin(a))});if(!worldBlocked(w,w.player.x,w.player.y,19)&&nearbyMineableRock(w)?.placement.id===p.id)break}
  world.current=w;controller.reset();held.current=false;selectQuickItem(w,'woodenPickaxe');
 };
 useEffect(()=>{
  reset();let alive=true,frame=0,dispose=()=>{};
  (async()=>{try{
   const [{createWebWorld},{EDITOR_ENTRY_IMAGES,EDITOR_MOVEMENT_IMAGES,editorEntryArtwork,editorTerrainDetail},{drawWorldEditor}]=await Promise.all([import('../src/skia-web'),import('../src/editor-image-sources'),import('../src/placed-world-renderer')]);
   const local=(sources:Record<string,string>)=>Object.fromEntries(Object.entries(sources).map(([k,url])=>[k,url.startsWith('/api/asset-files/')?'/native/assets/world/'+url.split('/').at(-1)+'.png':/\/(motion-[ab]-v1|camp-axe-v1|camp-workshop)\.png$/.test(url)?url.replace(/\.png$/,'.webp'):url]));
   const r=await createWebWorld(canvas.current!,(ctx,atlas,imgs,w)=>drawWorldEditor(ctx,atlas,imgs,w,view),local(editorEntryArtwork(layout)),{sources:local(EDITOR_ENTRY_IMAGES)});
   dispose=()=>r.dispose();if(!alive){dispose();return}void r.loadImages({...local(EDITOR_MOVEMENT_IMAGES),...editorTerrainDetail(layout.terrainImage)});setReady('Ready');
   let last=0,acc=0;const draw=(now:number)=>{if(!alive)return;acc+=last?Math.min(.1,(now-last)/1000):0;last=now;const w=world.current;while(acc>=1/60){w.tick++;movePlayer(w,input.current,false);if(held.current)attack(w,true);stepAxe(w);acc-=1/60}r.draw(w);const p=layout.items.find(p=>p.id===rockId.current)!;setStatus(`Rock ${w.rockMining?.[p.id]?.hp??MINEABLE_ROCKS.get(p.assetId)!.hp} · Stone in pack ${itemCount(w,'stone')} · Stone on ground ${w.loot.filter(l=>l.kind==='stone').reduce((n,l)=>n+l.amount,0)} · ${w.player.equipped??'fists'}`);frame=requestAnimationFrame(draw)};frame=requestAnimationFrame(draw);
  }catch(e){setReady(String(e))}})();return()=>{alive=false;cancelAnimationFrame(frame);dispose()};
 },[]);
 const equip=(id:QuickItem)=>{controller.release();held.current=false;selectQuickItem(world.current,id)};
 return <div className="camp-studio" data-mode="play" style={{position:'fixed',inset:0,background:'#354c32'}}>
  <canvas ref={canvas} style={{width:'100%',height:'100%'}}/>
  {ready==='Ready'&&<FieldKitHUD world={world} controller={controller} input={input} enabled mobile sprinting={false} onSprint={()=>{}} onHeld={v=>{held.current=v}} onDodge={()=>{}} onTool={()=>{}} onMove={()=>{}} onPause={()=>{}} bagOpen={bag} onBag={setBag} mapOpen={false} onMap={()=>{}}/>}
  {controls&&<div style={{position:'absolute',bottom:8,left:150,zIndex:2000,display:'flex',gap:5,flexWrap:'wrap',maxWidth:620,background:'#102018e6',padding:7,color:'#f3e6c3',font:'12px Arial'}}>
   <button onClick={()=>equip('woodenPickaxe')}>Wooden pickaxe</button><button onClick={()=>equip('metalPickaxe')}>Metal pickaxe</button><button onClick={()=>equip('fists')}>Fists</button><button onClick={reset}>Reset boulder</button>
   <button onClick={()=>{view.hideFoliage=!view.hideFoliage}}>Toggle foliage</button><button onClick={()=>setControls(false)}>Hide test controls</button>
   <label>Facing <select aria-label="Facing" onChange={e=>{world.current.player.direction=e.target.value as Direction}} defaultValue="up">{['up','up-right','right','down-right','down','down-left','left','up-left'].map(d=><option key={d}>{d}</option>)}</select></label>
   <output aria-label="Mining inventory">{ready} · {status}</output>
  </div>}
 </div>;
}
createRoot(document.getElementById('root')!).render(<QA/>);
