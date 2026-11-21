import {campRepairSite} from './camp-repair-site';
import {CAMP_REPAIRS,buildingRestored,buildingNeedsRepair,campBuildingArt} from './camp-restoration';
import type {World} from './survival-engine';
import {ASSET_BY_ID} from './world-assets';
import {GARDEN_ART,GARDEN_IDS} from './camp-garden-art';
import {FURNACE_ID} from './ironworks-data';
import type {MaterialCost} from './forge-recipes';
import {GEAR} from './player-gear';
import {RESTORE_FURNACE_COST,FORTIFY_COST} from './run-progression';
import {type HQBlueprintId} from './headquarters-plans';
import {WAREHOUSE_ID,WAREHOUSE_ART} from './warehouse';
import {campAccessLevel,type CampLevel} from './camp-levels';

export const HQ_MAP='/hq-art/camp-table.webp';
export const HQ_PAPER='/survival/headquarters-menu-v1/parchment.webp';
export const HQ_BENCH_ART='/survival/hq-furniture-v2/exploration-bench.webp';
export type HQTab='camp'|'buildings'|'crafting';
export type HQCategory='buildings'|'food'|'defences';
export type HQBuildingId='headquarters'|'treatment'|'garden'|'workshop'|'furnace'|'bunker'|'warehouse'|'well'|'fire';
export type HQArt={image:string;clip?:[number,number,number,number];overlay?:string};
export type HQBuilding={id:HQBuildingId;name:string;short:string;group:string;assetId:string;purpose:string;hint:string;preview?:boolean;position:[number,number,number,number]};
export const HQ_BUILDINGS:readonly HQBuilding[]=[
 {id:'headquarters',name:'Headquarters',short:'Headquarters',group:'CAMP PLANNING',assetId:'base_shelter_t1',purpose:'Camp upgrades, repairs and defences.',hint:'Repairs restore headquarters and the perimeter.',position:[50,16,34,31]},
 {id:'treatment',name:'Treatment centre',short:'Treatment',group:'CARE & RECOVERY',assetId:'base_medical_t2',purpose:'Rest to recover up to 20 health over 20 seconds.',hint:'Use the restored treatment centre to recover health.',position:[15,28,28,32]},
 {id:'garden',name:'Vegetable patch',short:'Vegetable patch',group:'FOOD PRODUCTION',assetId:'art_camp_garden_broken',purpose:'Grow potatoes and carrots in four garden beds.',hint:'Repair the vegetable patch, then plant a potato or carrot in an empty bed.',position:[15,57,26,25]},
 {id:'workshop',name:'Camp workshop',short:'Workshop',group:'TOOLS & WEAPONS',assetId:'base_workshop_t1',purpose:'Craft tools, blades, spears, bows and arrows.',hint:'Craft at the workshop using backpack and camp materials.',position:[84,29,30,34]},
 {id:'furnace',name:'Camp furnace',short:'Furnace',group:'METALWORKING',assetId:FURNACE_ID,purpose:'Smelt ore and recycle scrap into iron ingots.',hint:'Repair at its existing site with your hammer.',position:[84,62,24,31]},
 {id:'bunker',name:'Bunker',short:'Bunker',group:'UNDERGROUND',assetId:'misc_2dd09bb8-883b-42e3-b765-c2a1c735b016',purpose:'A passage to the underground shelter.',hint:'Enter through the hatch. The camp remains exposed during a raid.',position:[24,83,27,24]},
 {id:'warehouse',name:'Warehouse',short:'Warehouse',group:'CAMP SUPPLIES',assetId:WAREHOUSE_ID,purpose:'Store wood, stone and scrap for camp crafting.',hint:'Shared materials are available at camp workstations.',position:[56,86,27,25]},
 {id:'well',name:'Oak-canopy well',short:'Well',group:'FRESH WATER',assetId:'base_well_t1',purpose:'Fresh water for the survivor.',hint:'Drink at the well to restore thirst.',position:[85,88,19,22]},
 {id:'fire',name:'Campfire',short:'Campfire',group:'COOKING & WARMTH',assetId:'base_hearth_t1',purpose:'Cook meat and keep the fire burning with logs.',hint:'Meals and fuel are managed beside the fire.',position:[51,53,18,31]},
];
export const HQ_CATEGORIES:readonly {id:HQCategory;label:string;image:string}[]=[
 {id:'buildings',label:'Buildings',image:HQ_BENCH_ART},
 {id:'food',label:'Survival',image:'/survival/chicken-food-v1/cooked-chicken.webp'},
 {id:'defences',label:'Defences',image:'/survival/ui-backpack-v1/scrap.png'},
];
export const buildingFor=(id:HQBuildingId)=>HQ_BUILDINGS.find(b=>b.id===id)!;
export function buildingPlacement(w:World,b:HQBuilding){return w.layout?.items.find(p=>b.id==='garden'?GARDEN_IDS.has(p.assetId):p.assetId===b.assetId)}
export function gardenTier(w:World){return GARDEN_ART.find(a=>a.id===buildingPlacement(w,buildingFor('garden'))?.assetId)?.tier??0}
export function buildingArt(w:World,b:HQBuilding):HQArt{
 const replacement=campBuildingArt(w,buildingPlacement(w,b)?.assetId??b.assetId);
 if(b.id==='garden'){
  const art=gardenArt(gardenTier(w));return replacement?{...art,image:replacement.image}:art;
 }
 if(replacement)return {image:replacement.image,overlay:replacement.roof};
 if(b.id==='warehouse')return{image:WAREHOUSE_ART.empty};
 const p=buildingPlacement(w,b),a=ASSET_BY_ID.get(p?.assetId??b.assetId);
 return{image:a?.image??HQ_BENCH_ART,overlay:b.id==='headquarters'?a?.roof:undefined};
}
export const gardenArt=(tier:number):HQArt=>({image:GARDEN_ART[Math.max(0,Math.min(GARDEN_ART.length-1,tier))].image,clip:[0,.16,1,.75]});
export function buildingStatus(w:World,b:HQBuilding){
 if(!buildingPlacement(w,b))return 'Site missing';
 if(!w.creativeMode&&campAccessLevel(w)<CAMP_REPAIRS[b.id].level)return 'Camp level '+CAMP_REPAIRS[b.id].level;
 if(!buildingRestored(w,b.id))return 'Needs repair';
 if(buildingNeedsRepair(w,b.id))return 'Damaged';
 return 'In service';
}
export function markBuilding(w:World,id:HQBuildingId){
 const site=campRepairSite(w,id);if(!site)return false;
 w.waypoint={x:site.x,y:site.y,sceneId:'camp'};return true;
}
export type HQPlan={id:string;title:string;name:string;category:HQCategory;building:HQBuildingId;tier:number;art:HQArt;description:string;benefit:string;hint:string;preview?:boolean;learn?:HQBlueprintId;cost?:MaterialCost};
export function headquartersPlans(w:World):HQPlan[]{
 const art=(id:HQBuildingId)=>buildingArt(w,buildingFor(id));
 return [
  {id:'gardening-1',title:'Vegetable patch',name:'Vegetable patch',category:'buildings',building:'garden',tier:1,art:art('garden'),description:'Grow potatoes and carrots in the reclaimed beds.',benefit:'Grow food in four camp beds.',hint:'Plant a potato or carrot in an empty bed.'},
  {id:'metalworking',title:'Furnace',name:'Furnace',category:'buildings',building:'furnace',tier:1,art:art('furnace'),description:'Smelt ore and recycle scrap into iron ingots.',benefit:'Repair the existing furnace with your hammer to enable metal equipment.',hint:'Repair on site with your hammer.',learn:'metalworking',cost:RESTORE_FURNACE_COST},
  {id:'shelter',title:'Headquarters',name:'Headquarters',category:'buildings',building:'headquarters',tier:1,art:art('headquarters'),description:'Upgrade your camp and unlock new plans.',benefit:'Camp progression, buildings and crafting.',hint:'Upgrade at headquarters using resources.'},
  {id:'workshop',title:'Workshop',name:'Workshop',category:'buildings',building:'workshop',tier:1,art:art('workshop'),description:'Craft tools and weapons. A working furnace unlocks metal equipment.',benefit:'Axes, pickaxes, knives, spears and swords.',hint:'Craft equipment at the workshop.'},
  {id:'treatment',title:'Treatment centre',name:'Treatment centre',category:'food',building:'treatment',tier:1,art:art('treatment'),description:'Rest to recover up to 20 health over 20 seconds.',benefit:'Recover up to 20 health over 20 seconds.',hint:'Rest at the restored treatment centre.'},
  {id:'well',title:'Well',name:'Well',category:'buildings',building:'well',tier:1,art:art('well'),description:'A reliable source of drinking water.',benefit:'Restore thirst beside the well.',hint:'Drink at the well to restore thirst.'},
  {id:'warehouse',title:'Warehouse',name:'Warehouse',category:'buildings',building:'warehouse',tier:1,art:art('warehouse'),description:'Shared wood, stone and scrap stores.',benefit:'Camp workstations draw from these supplies.',hint:'Move materials at the warehouse.'},
  {id:'bunker',title:'Bunker',name:'Bunker',category:'buildings',building:'bunker',tier:1,art:art('bunker'),description:'A passage beneath the camp.',benefit:'Enter through the hatch to explore underground.',hint:'The camp can still be attacked while you are below.'},
  {id:'cooking',title:'Campfire',name:'Campfire',category:'food',building:'fire',tier:1,art:art('fire'),description:'Cook chicken, rabbit and venison.',benefit:'Log fuel, a cooking queue and meals to collect.',hint:'Cooking is managed beside the fire.'},
  {id:'reinforced-camp',title:'Camp defences',name:'Reinforced defences',category:'defences',building:'headquarters',tier:2,art:art('headquarters'),description:'Stronger protection against night attacks.',benefit:'Increases camp defence from 120 to 220.',hint:'Unlocked at Camp level 2.',learn:'reinforced-camp',cost:FORTIFY_COST},
 ];
}
export function planStatus(w:World,p:HQPlan){
 if(!w.creativeMode&&campAccessLevel(w)<planCampLevel(p))return 'Requires Camp level '+planCampLevel(p);
 if(p.id==='reinforced-camp')return w.progression?.fortified?'Reinforced':'Upgrade available';
 return buildingStatus(w,buildingFor(p.building));
}
export const planCampLevel=(p:HQPlan):CampLevel=>p.id==='reinforced-camp'?2:Math.max(1,CAMP_REPAIRS[p.building].level) as CampLevel;
export function cataloguePlans(w:World){return headquartersPlans(w)}
export function orderedCataloguePlans(w:World){
 return cataloguePlans(w).sort((a,b)=>planCampLevel(a)-planCampLevel(b)||a.title.localeCompare(b.title));
}
export function planForBuilding(w:World,id:HQBuildingId){return headquartersPlans(w).find(p=>p.building===id)!.id}
export function plansForBuilding(w:World,id:HQBuildingId){return headquartersPlans(w).filter(p=>p.building===id)}
export function discoveries(w:World){
 const p=w.progression,entries:{id:string;title:string;body:string;image:string}[]=[];
 if(!p||p.briefed)entries.push({id:'camp',title:'The old camp',body:'A central planning table, useful workstations and unfinished places to restore.',image:HQ_BENCH_ART});
 if(p&&campAccessLevel(w)>=2)entries.push({id:'camp-expanded',title:'A working camp',body:'The warehouse and vegetable patch are available to repair.',image:HQ_BENCH_ART});
 if(p?.furnaceRestored)entries.push({id:'furnace',title:'Metalworking restored',body:'Ore and scrap can now become iron ingots at the furnace.',image:'/survival/ironworks-v1/iron-ingot.png'});
 if(p?.metalCrafted)entries.push({id:'metal',title:'Working with metal',body:'A forged weapon revealed how metal fittings can reinforce the perimeter.',image:GEAR.metalSpear.image});
 if(p?.fortified)entries.push({id:'fortified',title:'A stronger perimeter',body:'The camp defences have been reinforced.',image:'/survival/ui-backpack-v1/scrap.png'});
 return entries;
}
