import {buildingRestored} from './camp-restoration';
import {bomberLights} from './bomber-renderer';
import {furnaceLights} from './furnace-renderer';
import {torchBeam,type TorchBeam} from './torch';
import type {World} from './survival-engine';
import {RUN_DAY_SECONDS,RUN_NIGHT_SECONDS} from './survival-cycle';
import {ASSET_BY_ID,type WorldAsset} from './world-assets';
import {placementBounds,placementPoint,type WorldLayout,type Placement} from './world-layout';

import {MAX_NIGHT_LIGHTS,type TimeOfDay,type CampLight,type LightViewport} from './lighting-model';
export {MAX_NIGHT_LIGHTS,type TimeOfDay,type CampLight,type LightViewport} from './lighting-model';
export const NIGHT_FADE_SECONDS=.7;
const NO_LIGHTS:CampLight[]=[],PREFERENCE='camp-studio-time-of-day';
export function readTimeOfDay():TimeOfDay{try{return localStorage.getItem(PREFERENCE)==='night'?'night':'day'}catch{return'day'}}
export function rememberTimeOfDay(value:TimeOfDay){try{localStorage.setItem(PREFERENCE,value)}catch{/* The preview also works with storage disabled. */}}
export function setWorldTimeOfDay(world:World,value:TimeOfDay,immediate=false){
 const previous=world.phase==='night'?1:0;world.phase=value;
 if(world.cycle){world.phaseLeft=value==='night'?RUN_NIGHT_SECONDS:RUN_DAY_SECONDS;world.cycle.warning=false}
 world.nightAmount=immediate?(value==='night'?1:0):world.nightAmount??previous;
}
/** Visual time, separate from simulation: preview fades also work while paused. */
export function stepCampLighting(world:World,dt:number){
 if(world.cycle)return;
 const target=world.phase==='night'?1:0,amount=world.nightAmount??target,step=Math.max(0,Math.min(.1,dt))/NIGHT_FADE_SECONDS;
 world.nightAmount=target>amount?Math.min(target,amount+step):Math.max(target,amount-step);
}
export function nightStrength(world:World){
 if(world.scene?.lighting==='baked')return 0;
 const amount=Math.max(0,Math.min(1,world.nightAmount??(world.phase==='night'?1:0)));
 return amount*amount*(3-2*amount);
}
/** Shared with the sprite renderer, so an unlit fire can never cast light. */
export const placedFireLit=(world:World,placement:Placement)=>buildingRestored(world,'fire')&&placement.role==='hearth'&&world.camp.hearth.fuel>0;
const geometry=new WeakMap<WorldLayout,{sources:{placement:Placement;asset:WorldAsset|undefined}[];lights:CampLight[]}>();
export function campLights(world:World):CampLight[]{
 const layout=world.layout,forge=furnaceLights(world);if(!layout||!buildingRestored(world,'fire')||world.camp.hearth.fuel<=0)return forge.length?forge:NO_LIGHTS;
 let entry=geometry.get(layout);
 if(!entry||entry.sources.some(s=>ASSET_BY_ID.get(s.placement.assetId)!==s.asset)){
  const sources=layout.items.filter(p=>p.role==='hearth').map(placement=>({placement,asset:ASSET_BY_ID.get(placement.assetId)}));
  const lights=sources.flatMap(({placement:p,asset})=>{
   if(!asset)return[];
   const b=placementBounds(p),[x,y]=placementPoint(p,b.x+b.width*.5,b.y+b.height*.72);
   return[{x,y,radius:Math.max(200,b.width*5),strength:1}];
  });
  entry={sources,lights};geometry.set(layout,entry);
 }
 return forge.length?[...entry.lights,...forge]:entry.lights;
}
/** Cull off-screen lights, then apply a fixed GPU budget to unusually dense maps. */
export function visibleCampLights(lights:CampLight[],view:LightViewport):CampLight[]{
 const visible=lights.filter(l=>l.x+l.radius>=view.x&&l.x-l.radius<=view.x+view.width&&l.y+l.radius>=view.y&&l.y-l.radius<=view.y+view.height);
 if(visible.length<=MAX_NIGHT_LIGHTS)return visible;
 const cx=view.x+view.width/2,cy=view.y+view.height/2;
 return visible.sort((a,b)=>Math.hypot(a.x-cx,a.y-cy)/a.radius-Math.hypot(b.x-cx,b.y-cy)/b.radius).slice(0,MAX_NIGHT_LIGHTS);
}
export type CampLightingContext=CanvasRenderingContext2D&{drawNightLighting:(lights:CampLight[],amount:number,viewport:LightViewport,torch?:TorchBeam,warningLights?:CampLight[])=>void};
export function drawCampLighting(ctx:CanvasRenderingContext2D,world:World,view:LightViewport){
 const amount=nightStrength(world),torch=torchBeam(world);if(amount<=0&&!torch)return;
 const lights=campLights(world);
 // Ordinary camps retain one world-space lightmap across the entire camera
 // journey. Only unusually dense maps need a smaller visible-light budget.
 (ctx as CampLightingContext).drawNightLighting(lights.length<=MAX_NIGHT_LIGHTS?lights:visibleCampLights(lights,view),amount,view,torch,bomberLights(world));
}
