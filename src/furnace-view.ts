import {IRONWORKS_IMAGES,SMELT_RECIPES,FURNACE_LOG_SECONDS} from './ironworks-data';
import {FURNACE_UPGRADE_COST} from './forge-recipes';
import {ITEM_RULES,itemCount,storedCount,packLoad,canCarryCount} from './expedition-inventory';
import {furnaceState,furnaceRules,furnaceAccess,materialTotal,canPayMaterials,addFurnaceLog,queueSmelt,cancelSmelt,collectIngots,upgradeFurnace} from './camp-furnace';
import type {World} from './survival-engine';

import {FORGE_MATERIAL_ART,recipeIngredients as ingredients} from './craft-material-view';
export function furnaceView(w:World){
 if(!w.furnaceId)return null;
 const f=furnaceState(w,w.furnaceId),rule=furnaceRules(f),access=furnaceAccess(w),load=packLoad(w),canTake=access&&canCarryCount(w,'ironIngot',f.ready)>0;
 const state=!f.queue.length?(f.ready?'INGOTS READY':'FURNACE IDLE'):f.ready>=rule.rack?'OUTPUT FULL':f.fuel<1e-8?'NEEDS WOOD':'SMELTING IRON';
 const queueFull=f.queue.length>=rule.queue;
 return{level:f.level,state,burning:state==='SMELTING IRON',image:IRONWORKS_IMAGES.campFurnace,fuel:Math.ceil(f.fuel),fuelMax:rule.fuel,fuelRatio:f.fuel/rule.fuel,heatLabel:`1 log = ${FURNACE_LOG_SECONDS}s of smelting`,queueSize:f.queue.length,queueMax:rule.queue,ready:f.ready,rackMax:rule.rack,canTake,
  canFuel:access&&materialTotal(w,'pallets')>0&&f.fuel<=rule.fuel-FURNACE_LOG_SECONDS+1e-7,logs:materialTotal(w,'pallets'),feed:()=>addFurnaceLog(w),collect:()=>collectIngots(w),
  sources:(['ironOre','scrap','ironIngot','pallets'] as const).map(id=>({id,name:ITEM_RULES[id].name,image:FORGE_MATERIAL_ART[id],bag:itemCount(w,id),camp:storedCount(w,id)})),
  recipes:(Object.keys(SMELT_RECIPES) as (keyof typeof SMELT_RECIPES)[]).map(id=>{const r=SMELT_RECIPES[id],available=materialTotal(w,r.input);return{id,name:r.name,image:FORGE_MATERIAL_ART[r.input],cost:`${r.count} ${ITEM_RULES[r.input].name.toLowerCase()}`,seconds:r.seconds/rule.rate,available,canQueue:access&&!queueFull&&available>=r.count,label:queueFull?'Queue full':available<r.count?`Need ${r.count-available} ${id==='ore'?'ore':'scrap'}`:'Queue 1 ingot',queue:()=>queueSmelt(w,id)}}),
  jobs:f.queue.map((job,i)=>({id:job.id,name:SMELT_RECIPES[job.recipe].name,image:FORGE_MATERIAL_ART[SMELT_RECIPES[job.recipe].input],label:i?'WAITING':state==='SMELTING IRON'?`${Math.ceil(job.remaining/rule.rate)}s`:state==='NEEDS WOOD'?'ADD WOOD':'TAKE INGOTS',progress:1-job.remaining/SMELT_RECIPES[job.recipe].seconds,canCancel:access,cancel:()=>cancelSmelt(w,job.id)})),
  upgrade:{complete:f.level===2,ingredients:ingredients(w,FURNACE_UPGRADE_COST),canUpgrade:access&&f.level===1&&canPayMaterials(w,FURNACE_UPGRADE_COST),run:()=>upgradeFurnace(w)},weight:load.weight,loadLabel:load.label,
  hint:state==='OUTPUT FULL'?'Take finished ingots to make room for the next batch.':state==='NEEDS WOOD'?'Add a log to continue. Queued materials are kept safe.':'Uses materials from your backpack first, then camp stores. Collect finished ingots, then craft equipment at the smithy beside the furnace.',
 };
}
