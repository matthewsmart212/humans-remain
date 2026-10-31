// Development-only inspection of the real authored camp and shared web/native renderer.
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import snapshot from '../native/assets/world-snapshot.json';
import {installImportedArt} from '../src/imported-art';
import {prepareAuthoredWorld} from '../src/authored-world';
import {createWorld,worldBlocked,type World} from '../src/survival-engine';
import {FORAGE_ART} from '../src/forage-art';
import {nearbyForage} from '../src/foraging';
import {FieldKitController} from '../src/field-kit';
import FieldKitHUD from '../src/FieldKitHUD';
import {warehouseDock,WAREHOUSE_ID} from '../src/warehouse';
import {placementPoint} from '../src/world-layout';
import {stepBonfireCooking} from '../src/survival-engine';
import {furnaceDock,furnaceState} from '../src/camp-furnace';
import {smithyDock,SMITHY_ID} from '../src/camp-smithy';
import {setStoredCount,setItemCount} from '../src/expedition-inventory';
import {gear} from '../src/player-gear';
import {FURNACE_ID} from '../src/ironworks-data';
import type {EditorView} from '../src/placed-world-renderer';
import type {ArtworkRecord} from '../src/artwork-model';
import type {WorldLayout} from '../src/world-layout';
import lossless from '../server/lossless-artwork-redirects.json';
import roads from '../server/retired-road-redirects.json';
import calm from '../server/calm-river-redirects.json';
import features from '../server/river-features-redirects.json';
import quality from '../server/river-quality-redirects.json';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/barlow/600.css';
import '../src/styles.css';import '../src/world-editor.css';import '../src/game-play.css';
installImportedArt(snapshot.records as ArtworkRecord[]);
const layout=prepareAuthoredWorld(snapshot.layout as WorldLayout),scene=new URLSearchParams(location.search).get('scene')??'hidden';
const view:EditorView={x:1780,y:560,zoom:scene==='camp'?.78:1,follow:scene!=='camp',grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true,hideFoliage:false};
const redirects={...lossless,...roads,...calm,...features,...quality} as Record<string,string>;
const local=(sources:Record<string,string>)=>Object.fromEntries(Object.entries(sources).map(([key,path])=>{let url=path;for(let i=0;redirects[url]&&i<8;i++)url=redirects[url];return[key,url.startsWith('/api/asset-files/')?'/native/assets/world/'+url.split('/').at(-1)+'.png':url]}));
function makeWorld(){
 const w=createWorld(layout);w.enemies=[];w.animals=[];w.loot=[];w.breakables=[];w.editorPreview=true;w.combatTest=true;w.notice='';w.noticeUntil=0;
 if(['fire','fire-empty','furnace','storage','warehouse','backpack'].includes(scene)){
  const at=(point:{x:number;y:number},offset=50)=>Object.assign(w.player,{x:point.x,y:point.y+offset,direction:'up'});
  setStoredCount(w,'pallets',12);setStoredCount(w,'ironIngot',8);setStoredCount(w,'scrap',9);setStoredCount(w,'stone',12);setItemCount(w,'stone',3);setItemCount(w,'pallets',3);setItemCount(w,'scrap',3);
  if(scene==='fire'||scene==='fire-empty'||scene==='backpack'){at(w.camp.hearth,65);w.camp.hearth.fuel=scene==='fire-empty'?23:160;if(scene!=='fire-empty'){w.bag.rawMeat=2;w.bag.rawRabbit=2;w.fire.rack=['chicken']}else{setItemCount(w,'pallets',0);setStoredCount(w,'pallets',0)}if(scene!=='backpack')w.stationPanel='fire'}
  if(scene==='furnace'){const p=layout.items.find(p=>p.assetId===FURNACE_ID)!;at(furnaceDock(p),60);const f=furnaceState(w,p.id);f.fuel=80;f.ready=2;f.queue=[{id:900,recipe:'ore',remaining:20}];w.furnaceId=p.id;w.stationPanel='furnace';setStoredCount(w,'ironOre',6)}
  if(scene==='storage'){const p=layout.items.find(p=>p.assetId==='art_hq_storage_chest')!,[x,y]=placementPoint(p,p.x,p.y+22*p.scale);at({x,y},45);w.stationPanel='storage'}
  if(scene==='warehouse'){const p=layout.items.find(p=>p.assetId===WAREHOUSE_ID)!;at(warehouseDock(p),45);w.stationPanel='warehouse'}
 }else if(scene.startsWith('smithy')){
  const p=layout.items.find(p=>p.assetId===SMITHY_ID)!,dock=smithyDock(p);Object.assign(w.player,{x:dock.x,y:dock.y+55,direction:'up'});
  for(const id of Object.keys(gear(w).bag))gear(w).bag[id as keyof ReturnType<typeof gear>['bag']]=0;
  if(scene!=='smithy-poor'){setStoredCount(w,'pallets',20);setStoredCount(w,'ironIngot',20)}
  if(scene==='smithy-full')setItemCount(w,'fuel',300);
 }else if(scene==='camp'){
  const p=layout.items.find(p=>p.assetId===FURNACE_ID)!,dock=furnaceDock(p);Object.assign(w.player,{x:dock.x,y:dock.y+70,direction:'up'});
  const f=furnaceState(w,p.id);f.fuel=90;f.queue=[{id:900,recipe:'ore',remaining:20}];
 }else{
  const p=layout.items.find(p=>p.assetId===FORAGE_ART[0].id)!;
  for(let i=0;i<16;i++){const a=i*Math.PI/8;Object.assign(w.player,{x:p.x+Math.cos(a)*90,y:p.y+Math.sin(a)*90,direction:'up'});if(!worldBlocked(w,w.player.x,w.player.y,19)&&nearbyForage(w)?.placement.id===p.id)break}
  if(scene==='hidden'||scene==='night'){
   Object.assign(w.player,{x:p.x+85,y:p.y+18,direction:'left'});
   w.loot=[{id:9901,x:p.x+12,y:p.y-10,kind:'scrap',amount:4,salvageVariant:0},{id:9902,x:p.x-72,y:p.y+26,kind:'pallets',appearance:'logs',amount:3},{id:9903,x:p.x+60,y:p.y-120,kind:'rawMeat',amount:1}];
  }
  if(scene==='empty')w.forage={[p.id]:{remaining:0,regrowRound:w.round+2,pickedAt:-10,picked:1,to:w.player}};
  if(scene==='night')w.nightAmount=1;
 }
 return w;
}
function QA(){
 const world=useRef<World>(makeWorld()),canvas=useRef<HTMLCanvasElement>(null),controller=useMemo(()=>new FieldKitController(),[]),input=useRef({x:0,y:0}),[ready,setReady]=useState(false),[error,setError]=useState(''),[bag,setBag]=useState(scene==='backpack');
 useEffect(()=>{let live=true,frame=0,dispose=()=>{};void(async()=>{try{
  const[{createWebWorld},{EDITOR_ENTRY_IMAGES,editorEntryArtwork},{drawWorldEditor}]=await Promise.all([import('../src/skia-web'),import('../src/editor-image-sources'),import('../src/placed-world-renderer')]);
  const renderer=await createWebWorld(canvas.current!,(ctx,atlas,imgs,w)=>drawWorldEditor(ctx,atlas,imgs,w,view),local(editorEntryArtwork(layout)),{sources:local(EDITOR_ENTRY_IMAGES)});dispose=()=>renderer.dispose();if(!live){dispose();return}setReady(true);
  // Station QA does not need a full authored-world redraw at 60 fps.
  let last=0;const draw=(now:number)=>{if(!live)return;if(last&&now-last<125){frame=requestAnimationFrame(draw);return}if(scene!=='backpack'){world.current.tick+=last?Math.min(4,(now-last)/1000*60):0;stepBonfireCooking(world.current)}last=now;renderer.draw(world.current);frame=requestAnimationFrame(draw)};frame=requestAnimationFrame(draw);
 }catch(e){setError(String(e))}})();return()=>{live=false;cancelAnimationFrame(frame);dispose()}},[]);
 return <div className="camp-studio" data-mode="play" style={{position:'fixed',inset:0,background:'#354c32'}}><canvas ref={canvas} style={{width:'100%',height:'100%'}}/>{ready&&<FieldKitHUD world={world} controller={controller} input={input} enabled mobile sprinting={false} onSprint={()=>{}} onHeld={()=>{}} onDodge={()=>{}} onTool={()=>{}} onMove={()=>{}} onPause={()=>{}} bagOpen={bag} onBag={setBag} mapOpen={false} onMap={()=>{}}/>}{error&&<output style={{position:'absolute',top:80,left:15,color:'white'}}>{error}</output>}</div>;
}
createRoot(document.getElementById('root')!).render(<QA/>);
