// Local design/play exercise. Real authored world, panels, resource rules and renderer; no cloud writes.
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import snapshot from '../native/assets/world-snapshot.json';
import {installImportedArt} from '../src/imported-art';
import {prepareAuthoredWorld} from '../src/authored-world';
import {createWorld,worldBlocked,facing,attack,movePlayer,stepAxe,stepBonfireCooking,type World} from '../src/survival-engine';
import {FURNACE_ID,IRON_BOULDER_ID} from '../src/ironworks-data';
import {furnaceDock,furnaceState,openFurnace} from '../src/camp-furnace';
import {nearbyMineableRock,bonusIronOre} from '../src/rock-mining';
import {MINEABLE_ROCKS} from '../src/mining-rocks';
import {gear} from '../src/player-gear';
import {selectQuickItem,type QuickItem} from '../src/quick-items';
import {FieldKitController} from '../src/field-kit';
import FieldKitHUD from '../src/FieldKitHUD';
import {itemCount,setStoredCount} from '../src/expedition-inventory';
import {RUNNER_CYCLE_SOURCES} from '../src/runner-cycles';
import lossless from '../server/lossless-artwork-redirects.json';
import roads from '../server/retired-road-redirects.json';
import calm from '../server/calm-river-redirects.json';
import features from '../server/river-features-redirects.json';
import quality from '../server/river-quality-redirects.json';
import type {ArtworkRecord} from '../src/artwork-model';
import type {WorldLayout,Placement} from '../src/world-layout';
import '@fontsource/barlow-condensed/800.css';import '@fontsource/barlow/600.css';
import '../src/styles.css';import '../src/world-editor.css';import '../src/game-play.css';
installImportedArt(snapshot.records as ArtworkRecord[]);
const layout=prepareAuthoredWorld(snapshot.layout as WorldLayout),furnace=layout.items.find(p=>p.assetId===FURNACE_ID)!;
const view={x:0,y:0,zoom:1,follow:true,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true,hideFoliage:false};
const redirects={...lossless,...roads,...calm,...features,...quality} as Record<string,string>;
const local=(sources:Record<string,string>)=>Object.fromEntries(Object.entries(sources).map(([key,path])=>{let url=path;for(let i=0;redirects[url]&&i<8;i++)url=redirects[url];return[key,url.startsWith('/api/asset-files/')?'/native/assets/world/'+url.split('/').at(-1)+'.png':url]}));
function QA(){
 const world=useRef<World>(createWorld(layout)),canvas=useRef<HTMLCanvasElement>(null),controller=useMemo(()=>new FieldKitController(),[]),input=useRef({x:0,y:0}),held=useRef(false);
 const[ready,setReady]=useState('Loading ironworks…'),[bag,setBag]=useState(false),[status,setStatus]=useState(''),[controls,setControls]=useState(true);
 const home=()=>{const w=world.current,d=furnaceDock(furnace);input.current={x:0,y:0};Object.assign(w.player,{x:d.x,y:d.y+75,direction:'up'});controller.reset();held.current=false;w.stationPanel=undefined;openFurnace(w,furnace.id)};
 const reset=()=>{const w=createWorld(layout);w.enemies=[];w.animals=[];w.loot=[];w.breakables=[];w.editorPreview=true;w.combatTest=true;w.survivalEnabled=true;w.miningSeed=12345;w.notice='';w.noticeUntil=0;for(const k of Object.keys(gear(w).bag))gear(w).bag[k as keyof typeof w.gear.bag]=0;gear(w).bag.woodenPickaxe=1;gear(w).bag.metalPickaxe=1;for(const [kind,n]of [['ironOre',4],['scrap',6],['pallets',8],['stone',8]] as const)setStoredCount(w,kind,n);world.current=w;home()};
 const visit=(p:Placement)=>{const w=world.current;controller.reset();held.current=false;w.stationPanel=undefined;input.current={x:0,y:0};for(let i=0;i<32;i++){const a=Math.PI/2+i*Math.PI/16;Object.assign(w.player,{x:p.x+Math.cos(a)*165,y:p.y+Math.sin(a)*165,direction:facing(-Math.cos(a),-Math.sin(a))});if(!worldBlocked(w,w.player.x,w.player.y,19)&&nearbyMineableRock(w)?.placement.id===p.id)break}selectQuickItem(w,'metalPickaxe')};
 useEffect(()=>{reset();let alive=true,frame=0,dispose=()=>{};(async()=>{try{
  const[{createWebWorld},{EDITOR_ENTRY_IMAGES,editorEntryArtwork},{drawWorldEditor}]=await Promise.all([import('../src/skia-web'),import('../src/editor-image-sources'),import('../src/placed-world-renderer')]);
  const r=await createWebWorld(canvas.current!,(ctx,atlas,imgs,w)=>drawWorldEditor(ctx,atlas,imgs,w,view),local(editorEntryArtwork(layout)),{sources:local(EDITOR_ENTRY_IMAGES)});dispose=()=>r.dispose();if(!alive){dispose();return}void r.loadImages(local(RUNNER_CYCLE_SOURCES)).catch(e=>setReady(String(e)));setReady('Ready');
  let last=0,acc=0;const draw=(now:number)=>{if(!alive)return;acc+=last?Math.min(.1,(now-last)/1000):0;last=now;const w=world.current;while(acc>=1/60){w.tick++;movePlayer(w,input.current,false);if(held.current)attack(w,true);stepAxe(w);stepBonfireCooking(w);w.effects=w.effects.filter(e=>w.tick/60-e.born<1.2);acc-=1/60}r.draw(w);const f=furnaceState(w,furnace.id);setStatus(`Ready ingots ${f.ready} · Queue ${f.queue.length} · Pack ore ${itemCount(w,'ironOre')} · Pack ingots ${itemCount(w,'ironIngot')} · Tool ${w.player.equipped??'fists'}`);frame=requestAnimationFrame(draw)};frame=requestAnimationFrame(draw);
 }catch(e){setReady(String(e))}})();return()=>{alive=false;cancelAnimationFrame(frame);dispose()};},[]);
 const equip=(id:QuickItem)=>{controller.release();held.current=false;selectQuickItem(world.current,id)};
 return <div className="camp-studio" data-mode="play" style={{position:'fixed',inset:0,background:'#354c32'}}><canvas ref={canvas} style={{width:'100%',height:'100%'}}/>
 {ready==='Ready'&&<FieldKitHUD world={world} controller={controller} input={input} enabled mobile sprinting={false} onSprint={()=>{}} onHeld={v=>{held.current=v}} onDodge={()=>{}} onTool={()=>{}} onMove={()=>{}} onPause={()=>{}} bagOpen={bag} onBag={setBag} mapOpen={false} onMap={()=>{}}/>}
 {controls&&<div style={{position:'absolute',bottom:2,left:90,zIndex:2000,display:'flex',gap:5,flexWrap:'wrap',maxWidth:1000,background:'#0d231ee8',padding:5,color:'#f0dfb8',font:'11px Arial'}}>
 <button onClick={home}>Camp furnace</button><button onClick={()=>visit(layout.items.find(p=>p.assetId===IRON_BOULDER_ID)!)}>Iron deposit</button><button onClick={()=>visit(layout.items.find(p=>MINEABLE_ROCKS.has(p.assetId)&&p.assetId!==IRON_BOULDER_ID&&bonusIronOre(world.current,p.id))!)}>Bonus ore rock</button>
 <button onClick={()=>equip('woodenPickaxe')}>Wooden pickaxe</button><button onClick={()=>equip('metalPickaxe')}>Metal pickaxe</button><button onClick={()=>{world.current.tick+=1200;stepBonfireCooking(world.current)}}>Advance 20 seconds</button><button onClick={reset}>Reset exercise</button><button onClick={()=>setControls(false)}>Hide test controls</button><output aria-label="Ironworks inventory">{ready} · {status}</output></div>}
 </div>;
}
createRoot(document.getElementById('root')!).render(<QA/>);
