// Development-only fixture: the production component and model with an isolated run.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import snapshot from '../native/assets/world-snapshot.json';
import {installImportedArt} from '../src/imported-art';
import {prepareAuthoredWorld} from '../src/authored-world';
import {createCampPlaySession} from '../src/studio-play';
import {CAMP_REPAIRS,CAMP_BUILDING_IDS} from '../src/camp-restoration';
import type {BuiltCampLevel} from '../src/camp-levels';
import {headquartersBench,headquartersDock,openHeadquarters} from '../src/run-progression';
import {setStoredCount} from '../src/expedition-inventory';
import type {ArtworkRecord} from '../src/artwork-model';
import type {WorldLayout} from '../src/world-layout';
import HeadquartersPanel from '../src/HeadquartersPanel';
import HeadquartersContent from '../src/HeadquartersContent';
import {headquartersMenuSource} from '../src/headquarters-image-sources';
import '../src/styles.css';
import '../src/world-editor.css';
import '../src/studio.css';
import '../src/game-play.css';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/barlow/600.css';
installImportedArt(snapshot.records as ArtworkRecord[]);
const w=createCampPlaySession(prepareAuthoredWorld(snapshot.layout as WorldLayout),undefined,'survival');
Object.assign(w.player,headquartersDock(headquartersBench(w)!));openHeadquarters(w);
const run=new URLSearchParams(location.search).get('run');
const level=Number(new URLSearchParams(location.search).get('level')??(run==='damaged'||run==='metal'?4:run==='expanded'?2:0));
if(level>=1&&level<=4){
 const state=w.progression!;
 state.campLevel=level as BuiltCampLevel;
 state.restoredBuildings=['headquarters'];
 for(const id of CAMP_BUILDING_IDS){
  if(id!=='headquarters'&&(CAMP_REPAIRS[id].level<level||run==='ready'&&CAMP_REPAIRS[id].level===level))state.restoredBuildings.push(id);
 }
 state.furnaceRestored=state.restoredBuildings.includes('furnace');
 if(run==='damaged')Object.assign(state,{hqHp:120,defence:40});
}
if(run==='damaged-start')w.progression!.defence=50;
for(const [id,n] of Object.entries({pallets:20,stone:10,scrap:6,ironIngot:4}))setStoredCount(w,id as any,n);
if(run==='missing')setStoredCount(w,'stone',2);
if(run==='empty'||run==='damaged-start')for(const id of ['pallets','stone','scrap','ironIngot'])setStoredCount(w,id as any,0);
const viewport=new URLSearchParams(location.search).get('viewport')?.split('x').map(Number);
function QA(){const [,refresh]=useState(0),[open,setOpen]=useState(true);return open&&viewport?.length===2?<div className="headquarters-full-menu" style={{width:viewport[0],height:viewport[1],display:'flex',margin:8}}><HeadquartersContent world={w} width={viewport[0]} height={viewport[1]} source={headquartersMenuSource} onClose={()=>setOpen(false)} onChange={()=>refresh(n=>n+1)}/></div>:open?<div className="world-editor camp-studio" data-mode="play"><HeadquartersPanel world={w} onClose={()=>setOpen(false)} onChange={()=>refresh(n=>n+1)}/></div>:<button style={{margin:30,padding:15}} onClick={()=>{openHeadquarters(w);setOpen(true)}}>Open headquarters</button>}
createRoot(document.getElementById('root')!).render(<QA/>);
