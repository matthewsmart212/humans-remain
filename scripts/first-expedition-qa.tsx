import {buildingAttackSite} from '../src/building-attack-site';
import {damageBuilding} from '../src/building-damage';
import {spawnCombatEnemyAt} from '../src/studio-combat';
import {campRepairSite} from '../src/camp-repair-site';
import {placementBounds,placementPoint} from '../src/world-layout';
import {REPAIR_HAMMER_IMAGES} from '../src/repair-hammer';
// Development-only exercise using the real authored map, gameplay and UI. Never bundled into production.
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import snapshot from '../native/assets/world-snapshot.json';
import {installImportedArt} from '../src/imported-art';
import {prepareAuthoredWorld} from '../src/authored-world';
import {createCampPlaySession,stepCampPlaySession} from '../src/studio-play';
import {headquartersBench,headquartersDock,openHeadquarters,restoreCampBuilding} from '../src/run-progression';
import {buildingMaxHp} from '../src/camp-restoration';
import {furnaces,furnaceDock,openFurnace} from '../src/camp-furnace';
import {smithies,smithyDock,openSmithy} from '../src/camp-smithy';
import {setStoredCount,itemCount,storedCount} from '../src/expedition-inventory';
import {FieldKitController} from '../src/field-kit';
import FieldKitHUD from '../src/FieldKitHUD';
import GamePlayMenu from '../src/GamePlayMenu';
import {SceneTravel} from '../src/scene-travel';
import {encodeRun,decodeRun} from '../src/run-save';
import {RUNNER_CYCLE_SOURCES} from '../src/runner-cycles';
import lossless from '../server/lossless-artwork-redirects.json';
import roads from '../server/retired-road-redirects.json';
import calm from '../server/calm-river-redirects.json';
import features from '../server/river-features-redirects.json';
import quality from '../server/river-quality-redirects.json';
import type {ArtworkRecord} from '../src/artwork-model';
import type {WorldLayout} from '../src/world-layout';
import type {World} from '../src/survival-engine';
import '@fontsource/barlow-condensed/800.css';import '@fontsource/barlow/600.css';
import '../src/styles.css';import '../src/world-editor.css';import '../src/game-play.css';
installImportedArt(snapshot.records as ArtworkRecord[]);
const layout=prepareAuthoredWorld(snapshot.layout as WorldLayout),view={x:0,y:0,zoom:1,follow:true,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true,hideFoliage:false};
const redirects={...lossless,...roads,...calm,...features,...quality} as Record<string,string>;
const local=(sources:Record<string,string>)=>Object.fromEntries(Object.entries(sources).map(([key,path])=>{let url=path;for(let i=0;redirects[url]&&i<8;i++)url=redirects[url];return[key,url.startsWith('/api/asset-files/')?'/native/assets/world/'+url.split('/').at(-1)+'.png':url]}));
function QA(){
 const world=useRef<World>(null!),travel=useRef<SceneTravel>(null!),canvas=useRef<HTMLCanvasElement>(null),input=useRef({x:0,y:0}),held=useRef(false),running=useRef(false),controller=useMemo(()=>new FieldKitController(),[]);
 const[ready,setReady]=useState('Loading…'),[bag,setBag]=useState(false),[paused,setPaused]=useState(false),[controls,setControls]=useState(true),[status,setStatus]=useState(''),[,refresh]=useState(0);
 const bind=(w:World)=>{travel.current?.dispose();world.current=w;travel.current=new SceneTravel(w,{pin(){},prepare:async()=>{},ready:()=>true},next=>world.current=next);controller.reset()};
 const visit=(kind:'hq'|'furnace'|'cache'|'smithy')=>{view.follow=true;const w=world.current;w.stationPanel=undefined;w.player.hurtUntil=0;held.current=false;input.current={x:0,y:0};if(kind==='hq'){Object.assign(w.player,headquartersDock(headquartersBench(w)!));openHeadquarters(w)}else if(kind==='furnace'){const p=furnaces(w.layout)[0];Object.assign(w.player,furnaceDock(p));openFurnace(w,p.id)}else if(kind==='smithy'){const p=smithies(w.layout)[0];Object.assign(w.player,smithyDock(p));openSmithy(w,p.id)}else Object.assign(w.player,w.progression!.cache);refresh(n=>n+1)};
 const visitRepair=(id:'workshop'|'well'|'furnace'|'stairs')=>{view.follow=true;const w=world.current;w.stationPanel=undefined;w.player.hurtUntil=0;controller.reset();held.current=false;input.current={x:0,y:0};if(id==='stairs'){const p=w.layout!.items.find(p=>p.assetId==='base_shelter_t1')!,b=placementBounds(p),[x,y]=placementPoint(p,b.x+b.width*.5,b.y+b.height*.96);Object.assign(w.player,{x,y})}else{const site=campRepairSite(w,id)!;Object.assign(w.player,{x:site.x,y:site.y})}refresh(n=>n+1)};
 const reset=()=>{running.current=false;bind(createCampPlaySession(layout,undefined,'survival'));setPaused(false);visit('hq')};
 const repairPreset=(id:'fire'|'headquarters'|'well',broken=false)=>{
  running.current=false;const w=createCampPlaySession(layout,undefined,'survival');bind(w);setBag(false);setPaused(false);held.current=false;input.current={x:0,y:0};
  for(const kind of ['pallets','stone','scrap'] as const)setStoredCount(w,kind,80);
  Object.assign(w.player,headquartersDock(headquartersBench(w)!));openHeadquarters(w);
  if(!restoreCampBuilding(w,'headquarters'))throw new Error('QA could not restore headquarters');
  w.stationPanel=undefined;w.player.equipped='repairHammer';w.player.hurtUntil=0;
  if(id==='headquarters')damageBuilding(w,id,w.progression!.defence+Math.round(w.progression!.hqMax*.4));
  else{
   const site=campRepairSite(w,id)!;Object.assign(w.player,{x:site.x,y:site.y});
   if(!broken){if(!restoreCampBuilding(w,id))throw new Error('QA could not restore '+id);damageBuilding(w,id,Math.round(buildingMaxHp(w,id)*.4))}
  }
  w.thirst=65;w.enemies=[];w.notice='';w.noticeUntil=0;w.repairCheckpoint=false;
  view.follow=true;view.x=w.player.x;view.y=w.player.y;view.zoom=1;running.current=true;
  setStatus((broken?'Broken ':'Damaged ')+(id==='fire'?'campfire':id==='headquarters'?'HQ':'well')+' · Hammer equipped · Clock running');refresh(n=>n+1);
 };
 const save=()=>{const text=encodeRun(travel.current);if(text){localStorage.setItem('safety-last-qa-only',text);const saved=decodeRun(text).worlds[0][1];setStatus('Saved camp level '+saved.progression!.campLevel+' · logs '+(itemCount(saved,'pallets')+storedCount(saved,'pallets'))+' · workshop HP '+(saved.progression!.buildingHp?.workshop??180))}};
 const load=async()=>{const text=localStorage.getItem('safety-last-qa-only');if(!text)return;await travel.current.restore(decodeRun(text));setStatus('QA save restored');refresh(n=>n+1)};
 useEffect(()=>{reset();let alive=true,frame=0,dispose=()=>{};void(async()=>{try{
  const[{createWebWorld},{EDITOR_ENTRY_IMAGES,editorEntryArtwork,RAID_IMAGE_SOURCES},{drawWorldEditor}]=await Promise.all([import('../src/skia-web'),import('../src/editor-image-sources'),import('../src/placed-world-renderer')]);
  const r=await createWebWorld(canvas.current!,(ctx,atlas,imgs,w)=>drawWorldEditor(ctx,atlas,imgs,w,view),local(editorEntryArtwork(layout)),{sources:local(EDITOR_ENTRY_IMAGES)});dispose=()=>r.dispose();if(!alive){dispose();return}void r.loadImages(local({...RUNNER_CYCLE_SOURCES,...REPAIR_HAMMER_IMAGES,...RAID_IMAGE_SOURCES})).catch(()=>{});setReady('Ready');let last=0,acc=0;
  const draw=(now:number)=>{if(!alive)return;acc+=last&&running.current?Math.min(.1,(now-last)/1000):0;last=now;while(acc>=1/60){stepCampPlaySession(world.current,input.current,false,held.current);travel.current.tick(1/60);if(world.current.repairCheckpoint){world.current.repairCheckpoint=false;save()}acc-=1/60}r.draw(world.current);frame=requestAnimationFrame(draw)};frame=requestAnimationFrame(draw);
 }catch(e){setReady(String(e))}})();return()=>{alive=false;cancelAnimationFrame(frame);dispose()};},[]);
 return <div className="camp-studio" data-mode="play" style={{position:'fixed',inset:0,background:'#354c32'}}><canvas ref={canvas} style={{width:'100%',height:'100%'}}/>
 {ready==='Ready'&&<><FieldKitHUD world={world} controller={controller} input={input} enabled={!paused} mobile sprinting={false} onSprint={()=>{}} onHeld={v=>held.current=v} onDodge={()=>{}} onTool={()=>{}} onMove={()=>{}} onPause={()=>{running.current=false;save();setPaused(true)}} onCheckpoint={save} bagOpen={bag} onBag={setBag} mapOpen={false} onMap={()=>{}}/><GamePlayMenu hideButton paused={paused} fullscreen={false} survival={!!world.current.progression} onPause={()=>setPaused(true)} onResume={()=>{setPaused(false);running.current=true}} onRestart={reset} onExit={()=>setPaused(false)} onExpand={()=>{}} onSandbox={()=>{save();bind(createCampPlaySession(layout));setPaused(false)}} onContinue={()=>void load()}/></>}
 {controls&&<div style={{position:'absolute',bottom:2,left:90,zIndex:2000,display:'flex',gap:4,flexWrap:'wrap',maxWidth:'calc(100% - 180px)',background:'#0d231ee8',padding:5,color:'#f0dfb8',font:'10px Arial'}}>{ready==='Ready'&&<><button onClick={()=>repairPreset('fire')}>Damaged campfire + hammer</button><button onClick={()=>repairPreset('headquarters')}>Damaged HQ + hammer</button><button onClick={()=>repairPreset('well')}>Damaged well + hammer</button><button onClick={()=>repairPreset('fire',true)}>Broken campfire + hammer</button><button onClick={()=>{running.current=false;setStatus('Clock paused')}}>Pause test clock</button><button onClick={()=>visit('hq')}>HQ bench</button><button onClick={()=>visitRepair('stairs')}>HQ stairs</button><button onClick={()=>visitRepair('workshop')}>Workshop repair site</button><button onClick={()=>visitRepair('well')}>Well repair site</button><button onClick={()=>visitRepair('furnace')}>Furnace repair site</button><button onClick={()=>visit('cache')}>Salvage cache</button><button onClick={()=>visit('furnace')}>Damaged furnace</button><button onClick={()=>visit('smithy')}>Smithy</button><button onClick={()=>{for(const [id,n]of [['pallets',15],['stone',10],['scrap',15]]as const)setStoredCount(world.current,id,n);refresh(n=>n+1)}}>Gather repair supplies</button><button onClick={()=>{world.current.stationPanel=undefined;world.current.phase='night';world.current.phaseLeft=60;running.current=true;refresh(n=>n+1)}}>Test raid</button><button onClick={()=>{running.current=!running.current;setStatus(running.current?'Clock running':'Clock paused')}}>Toggle clock</button><button onClick={()=>{running.current=false;for(let n=0;n<120;n++){stepCampPlaySession(world.current,{x:0,y:0},false,false);if(world.current.repairCheckpoint){world.current.repairCheckpoint=false;save()}}refresh(n=>n+1)}}>Advance 2 seconds</button><button onClick={()=>{damageBuilding(world.current,'workshop',70);refresh(n=>n+1)}}>Damage workshop</button><button onClick={()=>{damageBuilding(world.current,'workshop',999);refresh(n=>n+1)}}>Break workshop</button><button onClick={()=>{const w=world.current,site=campRepairSite(w,'workshop')!;w.stationPanel=undefined;w.player.x=site.x;w.player.y=site.y+330;const e=spawnCombatEnemyAt(w,'scrap-walker',{x:site.x,y:site.y+60});if(e){e.siegeNight=1;e.attackAt=0}running.current=true;refresh(n=>n+1)}}>Watch workshop raid</button><button onClick={()=>{const w=world.current,site=buildingAttackSite(w,'headquarters')!;w.stationPanel=undefined;controller.release();w.enemies=[];w.player.x=site.x+450;w.player.y=site.y+100;w.phase='night';w.phaseLeft=90;w.progression!.siege={night:w.round,spawned:3,nextAt:Infinity,ended:0};view.follow=false;view.x=site.x;view.y=site.y;view.zoom=.75;const e=spawnCombatEnemyAt(w,'scrap-walker',{...w.progression!.camp});if(e){e.siegeNight=1;e.attackAt=0}running.current=true;refresh(n=>n+1)}}>Watch HQ table raid</button><button onClick={()=>{world.current.enemies=[];running.current=false;refresh(n=>n+1)}}>Clear test robots</button><button onClick={save}>Save test</button><button onClick={()=>void load()}>Load test</button><button onClick={reset}>Reset exercise</button></>}<button onClick={()=>setControls(false)}>Hide QA controls</button><output>{ready} · {status}</output></div>}
 </div>;
}
createRoot(document.getElementById('root')!).render(<QA/>);
