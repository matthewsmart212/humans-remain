import {PICKAXE_GEAR} from './pickaxes';
import {atHeadquartersChest,gear,AXE_GEAR,transferAxe,type AxeKind} from './player-gear';
import type {World} from './survival-engine';
import {FOOD_RECIPES,type FoodSpecies} from './food-items';
import {kitchen,feedFire,queueFood,collectFood,cancelCooking,FIRE_CAPACITY,LOG_BURN_SECONDS,KITCHEN_QUEUE,KITCHEN_RACK} from './camp-kitchen';
import {PACK_CAPACITY,packWeight,weightLabel,INVENTORY_KINDS,ITEM_RULES,itemCount,storedCount,canCarryCount} from './expedition-inventory';
import {storeItem,withdrawItem} from './camp-storage';
import {PROVISIONS,canPrepareHuntersMeal,prepareHuntersMeal} from './food-provisions';
export type StationButton={label:string;disabled:boolean;primary?:boolean;run:()=>boolean|number};
export type StationRow={id:string;title:string;detail:string;progress?:number;buttons:StationButton[]};
export type StationSection={title:string;empty?:string;rows:StationRow[]};
export const durationLabel=(seconds:number)=>`${Math.floor(Math.ceil(seconds)/60)}:${String(Math.ceil(seconds)%60).padStart(2,'0')}`;
export function campStationView(w:World){
 const weight=packWeight(w),pack=`${weightLabel(weight)} / ${PACK_CAPACITY} kg`,k=kitchen(w);
 if(w.stationPanel==='storage')return{
  title:'Camp stores',eyebrow:'UNLOAD · PREPARE · EXPLORE',status:pack,detail:'All camp chests share these supplies. Store heavy materials and take only what you need.',progress:Math.min(1,weight/PACK_CAPACITY),
  buttons:[{label:'Store all materials',disabled:!(['ironOre','ironIngot','stone','pallets','scrap','fuel'] as const).some(kind=>itemCount(w,kind)),primary:true,run:()=>['ironOre','ironIngot','stone','pallets','scrap','fuel'].reduce((n,kind)=>n+storeItem(w,kind as 'ironOre'|'ironIngot'|'stone'|'pallets'|'scrap'|'fuel','all'),0)}],
  sections:[...(atHeadquartersChest(w)?[{title:'Mining tools',rows:(["woodenPickaxe","metalPickaxe"] as const).map(id=>({id,title:PICKAXE_GEAR[id].name,detail:`Pack ${gear(w).bag[id]??0} · Chest ${gear(w).chest[id]??0} · ${PICKAXE_GEAR[id].damage} rock damage · ${PICKAXE_GEAR[id].weight} kg`,buttons:[{label:'Take pickaxe',disabled:!gear(w).chest[id]||weight+PICKAXE_GEAR[id].weight>PACK_CAPACITY,run:()=>transferAxe(w,id,true)},{label:'Store pickaxe',disabled:!gear(w).bag[id],run:()=>transferAxe(w,id,false)}]}))}]:[]),...(atHeadquartersChest(w)?[{title:'Headquarters tools',rows:(['woodenAxe','axe'] as AxeKind[]).map(id=>({id,title:AXE_GEAR[id].name,detail:`Pack ${gear(w).bag[id]} · Chest ${gear(w).chest[id]} · ${AXE_GEAR[id].damage} / ${AXE_GEAR[id].returnDamage} damage · ${AXE_GEAR[id].weight} kg`,buttons:[{label:'Take axe',disabled:!gear(w).chest[id]||weight+AXE_GEAR[id].weight>PACK_CAPACITY,run:()=>transferAxe(w,id,true)},{label:'Store axe',disabled:!gear(w).bag[id],run:()=>transferAxe(w,id,false)}]}))}]:[]),{title:'Backpack ⇄ Camp',empty:'Your camp stores are empty.',rows:INVENTORY_KINDS.filter(kind=>itemCount(w,kind)||storedCount(w,kind)).map(kind=>({id:kind,title:ITEM_RULES[kind].name,detail:`Pack ${itemCount(w,kind)} · Stored ${storedCount(w,kind)} · ${ITEM_RULES[kind].weight} kg each`,buttons:[
   {label:'Store 1',disabled:!itemCount(w,kind),run:()=>storeItem(w,kind,1)},
   {label:'Store all',disabled:!itemCount(w,kind),run:()=>storeItem(w,kind,'all')},
   {label:'Take 1',disabled:!canCarryCount(w,kind,storedCount(w,kind)),run:()=>withdrawItem(w,kind,1)},
   {label:'Take max',disabled:!canCarryCount(w,kind,storedCount(w,kind)),run:()=>withdrawItem(w,kind,'all')},
  ]}))}] as StationSection[],
 };
 const burning=w.camp.hearth.fuel>0,rackFull=k.rack.length>=KITCHEN_RACK;
 return{
  title:'Cooking fire',eyebrow:'TEND THE FIRE · STOCK UP',status:burning?`${durationLabel(w.camp.hearth.fuel)} of fire remaining`:'Fire out · Add a log to relight',detail:`1 log = 90 seconds · ${itemCount(w,'pallets')} in pack / ${w.stock.pallets} stored · ${pack}`,progress:w.camp.hearth.fuel/FIRE_CAPACITY,
  buttons:[{label:'Add log · +1:30',disabled:(!itemCount(w,'pallets')&&!w.stock.pallets)||w.camp.hearth.fuel>FIRE_CAPACITY-LOG_BURN_SECONDS,primary:true,run:()=>feedFire(w)},
   {label:`Collect meals · ${k.rack.length}/${KITCHEN_RACK}`,disabled:!k.rack.some(species=>canCarryCount(w,FOOD_RECIPES[species].cooked,1)),run:()=>collectFood(w)}],
  sections:[
   {title:`Cooking queue · ${k.queue.length}/${KITCHEN_QUEUE}`,empty:'Choose a recipe below. Finished meals stay on the rack until collected.',rows:k.queue.map((job,i)=>({id:String(job.id),title:`${i===0?'On the fire':'Waiting'} · ${FOOD_RECIPES[job.species].name}`,detail:i===0?`${!burning?'Paused · Needs wood':rackFull?'Paused · Collect meals':`${Math.ceil(job.remaining)}s remaining`}`:`${FOOD_RECIPES[job.species].seconds}s cooking time`,progress:i===0?1-job.remaining/FOOD_RECIPES[job.species].seconds:undefined,buttons:[{label:'Return raw',disabled:!canCarryCount(w,FOOD_RECIPES[job.species].raw,1),run:()=>cancelCooking(w,job.id)}]}))},
   {title:'Recipes',rows:[...(Object.keys(FOOD_RECIPES) as FoodSpecies[]).map(species=>{const r=FOOD_RECIPES[species];return{id:species,title:r.name,detail:`${itemCount(w,r.raw)} raw · ${r.seconds}s · +${r.food} food / +${r.health} health`,buttons:[{label:'Queue 1',disabled:!itemCount(w,r.raw)||k.queue.length>=KITCHEN_QUEUE,run:()=>queueFood(w,species)}]}}),{id:'huntersMeal',title:PROVISIONS.huntersMeal.name,detail:`1 cooked meat + 2 berries · +${PROVISIONS.huntersMeal.food} food · +${PROVISIONS.huntersMeal.healOverTime} health over ${PROVISIONS.huntersMeal.duration}s`,buttons:[{label:'Prepare meal',disabled:!canPrepareHuntersMeal(w),run:()=>prepareHuntersMeal(w)}]}]},
   {title:`Ready to pack · ${k.rack.length}/${KITCHEN_RACK}`,empty:'The rack keeps cooked food safe, even after the fire goes out.',rows:(Object.keys(FOOD_RECIPES) as FoodSpecies[]).flatMap(species=>{const n=k.rack.filter(s=>s===species).length;return n?[{id:`ready-${species}`,title:`${n} × ${FOOD_RECIPES[species].name}`,detail:`${ITEM_RULES[FOOD_RECIPES[species].cooked].weight} kg each`,buttons:[]}]:[]})},
  ] as StationSection[],
 };
}
