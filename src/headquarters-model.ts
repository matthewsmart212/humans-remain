import {campRepairSite} from './camp-repair-site';
import {buildingRestored,buildingNeedsRepair,buildingHp,buildingMaxHp,campBuildingArt} from './camp-restoration';
import type {World} from './survival-engine';
import {ASSET_BY_ID} from './world-assets';
import {GARDEN_ART,GARDEN_IDS} from './camp-garden-art';
import {FURNACE_ID} from './ironworks-data';
import {FORGE_RECIPES,craftCategory,FURNACE_UPGRADE_COST,type MaterialCost} from './forge-recipes';
import {GEAR,gear,type GearKind} from './player-gear';
import {recipeUnlocked,headquartersBench,headquartersDock,RESTORE_FURNACE_COST,FORTIFY_COST} from './run-progression';
import {blueprintFound,blueprintLearned,type HQBlueprintId} from './headquarters-plans';
import {furnaceDock} from './camp-furnace';
import {smithyDock,SMITHY_IMAGE} from './camp-smithy';
import {warehouseDock,WAREHOUSE_ID,WAREHOUSE_ART} from './warehouse';
import {campAccessLevel} from './camp-levels';

export const HQ_MAP='/survival/headquarters-menu-v1/camp-plan.webp';
export const HQ_PAPER='/survival/headquarters-menu-v1/parchment.webp';
export const HQ_BENCH_ART='/survival/hq-furniture-v2/exploration-bench.webp';
export type HQTab='camp'|'plans'|'journal';
export type HQCategory='buildings'|'tools'|'weapons'|'food'|'defences';
export type HQBuildingId='headquarters'|'treatment'|'garden'|'workshop'|'furnace'|'bunker'|'warehouse'|'well'|'fire';
export type HQArt={image:string;clip?:[number,number,number,number];overlay?:string};
export type HQBuilding={id:HQBuildingId;name:string;short:string;group:string;assetId:string;purpose:string;hint:string;preview?:boolean;position:[number,number,number,number]};
export const HQ_BUILDINGS:readonly HQBuilding[]=[
 {id:'headquarters',name:'Headquarters',short:'Headquarters',group:'CAMP PLANNING',assetId:'base_shelter_t1',purpose:'Camp plans, discoveries and defences.',hint:'Repairs restore headquarters and the perimeter.',position:[50,16,34,31]},
 {id:'treatment',name:'Treatment centre',short:'Treatment',group:'CARE & RECOVERY',assetId:'base_medical_t2',purpose:'A sheltered place for medical supplies and recovery.',hint:'Treatment facilities are a future camp addition.',preview:true,position:[15,28,28,32]},
 {id:'garden',name:'Garden',short:'Garden',group:'FOOD PRODUCTION',assetId:'art_camp_garden_broken',purpose:'Farming and garden repairs are not playable yet.',hint:'Explore the planned vegetable patch, raised beds and greenhouse appearances.',preview:true,position:[15,57,26,25]},
 {id:'workshop',name:'Camp workshop',short:'Workshop',group:'TOOLS & WEAPONS',assetId:'base_workshop_t1',purpose:'Craft tools, blades, spears, bows and arrows.',hint:'Craft at the workshop using backpack and camp materials.',position:[84,29,30,34]},
 {id:'furnace',name:'Camp furnace',short:'Furnace',group:'METALWORKING',assetId:FURNACE_ID,purpose:'Smelt ore and recycle scrap into iron ingots.',hint:'Unlocked at Camp level 2. Repair at its existing site with your hammer.',position:[84,62,24,31]},
 {id:'bunker',name:'Bunker',short:'Bunker',group:'UNDERGROUND',assetId:'misc_2dd09bb8-883b-42e3-b765-c2a1c735b016',purpose:'A passage to the underground shelter.',hint:'Enter through the hatch. The camp remains exposed during a raid.',position:[24,83,27,24]},
 {id:'warehouse',name:'Warehouse',short:'Warehouse',group:'CAMP SUPPLIES',assetId:WAREHOUSE_ID,purpose:'Store wood, stone and scrap for camp crafting.',hint:'Shared materials are available at camp workstations.',position:[56,86,27,25]},
 {id:'well',name:'Oak-canopy well',short:'Well',group:'FRESH WATER',assetId:'base_well_t1',purpose:'Fresh water for the survivor.',hint:'Drink at the well to restore thirst.',position:[85,88,19,22]},
 {id:'fire',name:'Camp bonfire',short:'Bonfire',group:'COOKING & WARMTH',assetId:'base_hearth_t1',purpose:'Cook meat and keep the fire burning with logs.',hint:'Meals and fuel are managed beside the fire.',position:[51,53,18,31]},
];
export const HQ_CATEGORIES:readonly {id:HQCategory;label:string;image:string}[]=[
 {id:'buildings',label:'Buildings',image:HQ_BENCH_ART},
 {id:'tools',label:'Tools',image:GEAR.axe.image},
 {id:'weapons',label:'Weapons',image:GEAR.metalSpear.image},
 {id:'food',label:'Survival',image:'/survival/chicken-food-v1/cooked-chicken.webp'},
 {id:'defences',label:'Defences',image:'/survival/ui-backpack-v1/scrap.png'},
];
export const buildingFor=(id:HQBuildingId)=>HQ_BUILDINGS.find(b=>b.id===id)!;
export function buildingPlacement(w:World,b:HQBuilding){return w.layout?.items.find(p=>b.id==='garden'?GARDEN_IDS.has(p.assetId):p.assetId===b.assetId)}
export function gardenTier(w:World){return GARDEN_ART.find(a=>a.id===buildingPlacement(w,buildingFor('garden'))?.assetId)?.tier??0}
export function buildingArt(w:World,b:HQBuilding):HQArt{
 const replacement=campBuildingArt(w,buildingPlacement(w,b)?.assetId??b.assetId);if(replacement)return {image:replacement.roof??replacement.image};
 if(b.id==='garden')return gardenArt(gardenTier(w));
 if(b.id==='workshop')return{image:SMITHY_IMAGE};
 if(b.id==='warehouse')return{image:WAREHOUSE_ART.empty};
 const p=buildingPlacement(w,b),a=ASSET_BY_ID.get(p?.assetId??b.assetId);
 return{image:a?.image??HQ_BENCH_ART,overlay:b.id==='headquarters'?a?.roof:undefined};
}
export const gardenArt=(tier:number):HQArt=>({image:GARDEN_ART[Math.max(0,Math.min(3,tier))].image,clip:tier===3?[.06,.18,.88,.72]:[.06,.31,.88,.59]});
export function buildingStatus(w:World,b:HQBuilding){
 if(!buildingPlacement(w,b))return 'Not in camp';
 if(!buildingRestored(w,b.id))return 'Broken';
 if(buildingHp(w,b.id)<buildingMaxHp(w,b.id))return 'Damaged';
 if(b.preview)return w.progression?.restoredBuildings?'Structure repaired':'Artwork preview';
 if(b.id==='furnace')return w.progression&&!w.progression.furnaceRestored?'Broken':'Working';
 if(b.id==='treatment')return 'Design preview';
 if(b.id==='headquarters'&&w.progression&&w.progression.hqHp<w.progression.hqMax)return 'Damaged';
 return b.id==='bunker'?'Accessible':'Working';
}
export function markBuilding(w:World,id:HQBuildingId){
 const b=buildingFor(id),p=buildingPlacement(w,b);if(!p||w.scene)return false;
 const point=id!=='headquarters'&&buildingNeedsRepair(w,id)?campRepairSite(w,id)??{x:p.x,y:p.y}:id==='headquarters'?(()=>{const bench=headquartersBench(w);return bench?headquartersDock(bench):{x:p.x,y:p.y}})():id==='furnace'?furnaceDock(p):id==='workshop'?smithyDock(p):id==='warehouse'?warehouseDock(p):{x:p.x,y:p.y};
 w.waypoint={x:point.x,y:point.y,sceneId:'camp'};return true;
}
export type HQPlan={id:string;title:string;name:string;category:HQCategory;building:HQBuildingId;tier:number;art:HQArt;description:string;benefit:string;hint:string;preview?:boolean;learn?:HQBlueprintId;gearId?:GearKind;cost?:MaterialCost};
export function headquartersPlans(w:World):HQPlan[]{
 const art=(id:HQBuildingId)=>buildingArt(w,buildingFor(id));
 const buildings:HQPlan[]=[
  ...[1,2,3].map(tier=>({id:`gardening-${tier}`,title:'Garden',name:['','Vegetable patch','Raised beds','Greenhouse'][tier],category:'buildings' as const,building:'garden' as const,tier,art:gardenArt(tier),description:['','Two growing beds.','Four raised growing beds.','Six sheltered growing beds.'][tier],benefit:['','A small start for home-grown food.','More growing space in the same camp lot.','Shelter and a rain tank for the garden.'][tier],hint:'Artwork preview · farming and repairs are not available yet.',preview:true})),
  {id:'metalworking',title:'Furnace',name:'Furnace',category:'buildings',building:'furnace',tier:1,art:art('furnace'),description:'Smelt ore and recycle scrap into iron ingots.',benefit:'Repair the existing furnace with your hammer to enable metal equipment.',hint:'Repair on site with your hammer after unlocking Camp level 2.',learn:'metalworking',cost:RESTORE_FURNACE_COST},
  {id:'furnace-bellows',title:'Improved bellows',name:'Furnace upgrade',category:'buildings',building:'furnace',tier:2,art:art('furnace'),description:'Faster smelting and larger batches.',benefit:'25% faster · 6 queued batches · 12 ingot storage.',hint:'Fit the upgrade at the restored furnace.',cost:FURNACE_UPGRADE_COST},
  {id:'shelter',title:'Headquarters',name:'Headquarters',category:'buildings',building:'headquarters',tier:1,art:art('headquarters'),description:'Upgrade your camp and unlock new plans.',benefit:'Camp progression, plans and journal.',hint:'Upgrade at headquarters using resources.'},
  {id:'workshop',title:'Workshop',name:'Workshop',category:'buildings',building:'workshop',tier:1,art:art('workshop'),description:'Wooden tools and simple weapons.',benefit:'Axes, pickaxes, knives, spears and swords.',hint:'Craft equipment at the workshop.'},
  {id:'treatment',title:'Field medicine',name:'Treatment centre',category:'food',building:'treatment',tier:1,art:art('treatment'),description:'A sheltered space for care and supplies.',benefit:'A future place for treatment and recovery.',hint:'Design preview · treatment is not available yet.',preview:true},
  {id:'well',title:'Well',name:'Well',category:'buildings',building:'well',tier:1,art:art('well'),description:'A reliable source of drinking water.',benefit:'Restore thirst beside the well.',hint:'Already available in camp.'},
  {id:'warehouse',title:'Warehouse',name:'Warehouse',category:'buildings',building:'warehouse',tier:1,art:art('warehouse'),description:'Shared wood, stone and scrap stores.',benefit:'Camp workstations draw from these supplies.',hint:'Move materials at the warehouse.'},
  {id:'bunker',title:'Bunker',name:'Bunker',category:'buildings',building:'bunker',tier:1,art:art('bunker'),description:'A passage beneath the camp.',benefit:'Enter through the hatch to explore underground.',hint:'The camp can still be attacked while you are below.'},
  {id:'cooking',title:'Camp cooking',name:'Camp bonfire',category:'food',building:'fire',tier:1,art:art('fire'),description:'Cook chicken, rabbit and venison.',benefit:'Log fuel, a cooking queue and meals to collect.',hint:'Cooking is managed beside the fire.'},
  {id:'reinforced-camp',title:'Camp defences',name:'Reinforced defences',category:'defences',building:'headquarters',tier:2,art:art('headquarters'),description:'Stronger protection against night attacks.',benefit:'Increases camp defence from 120 to 220.',hint:'Unlocked at Camp level 2.',learn:'reinforced-camp',cost:FORTIFY_COST},
 ];
 for(const plan of buildings){if(w.progression?.restoredBuildings&&(plan.id==='gardening-1'||plan.id==='treatment')){plan.preview=false;plan.art=art(plan.building);plan.description=plan.building==='garden'?'Restore the abandoned vegetable patch. Planting and harvesting are coming later.':'Repair the damaged medical tent. Medical treatment is coming later.';plan.hint='Restore this structure at its existing camp site.';}}
 return [...buildings,...FORGE_RECIPES.map(r=>({id:`equipment-${r.id}`,title:r.name,name:r.name,category:(craftCategory(r.id)==='tools'?'tools':'weapons') as HQCategory,building:'workshop' as const,tier:r.id.startsWith('wooden')?1:2,art:{image:GEAR[r.id].image},description:r.id==='arrows'?'A bundle of ten steel-tipped arrows.':`${GEAR[r.id].damage} ${r.id.includes('Pickaxe')?'rock damage':'damage'} · ${GEAR[r.id].weight} kg`,benefit:r.id==='metalPickaxe'?'Mines iron-veined deposits.':r.id==='bow'?'Ranged hunting. Each shot uses one arrow.':'Craft at the camp workshop.',hint:recipeUnlocked(w,r.id)?'Recipe available at the workshop.':'Requires a restored furnace.',gearId:r.id,cost:r.cost}))];
}
export function planStatus(w:World,p:HQPlan){
 if(p.preview)return 'Artwork preview';
 if(campAccessLevel(w)<planCampLevel(p))return 'Requires Camp level '+planCampLevel(p);
 if(!p.gearId&&!buildingRestored(w,p.building))return 'Repair needed';
 if(p.gearId)return recipeUnlocked(w,p.gearId)?'Recipe learned':'Furnace required';
 if(p.learn){if(!blueprintLearned(w,p.learn))return blueprintFound(w,p.learn)?'Plan found · ready to learn':'Plan not found';if(p.building==='furnace')return w.progression&&!w.progression.furnaceRestored?'Repair needed':'Working';return w.progression?.fortified?'Reinforced':'Plan learned';}
 if(p.id==='furnace-bellows')return w.progression&&!w.progression.furnaceRestored?'Furnace required':(w.ironworks?.stations[buildingPlacement(w,buildingFor('furnace'))?.id??'']?.level??1)>=2?'Upgrade fitted':'Upgrade available';
 return p.gearId?'Recipe learned':'Working';
}
export const planCampLevel=(p:HQPlan):1|2=>p.building==='furnace'||p.id==='reinforced-camp'||!!p.gearId&&p.tier>=2?2:1;
/** The catalogue contains building families; their named stages live in the inspector. */
export function cataloguePlans(w:World){return headquartersPlans(w).filter(p=>p.id!=='furnace-bellows'&&(!p.preview||p.building!=='garden'||p.tier===1));}
/** Keep the available catalogue together, retaining familiar order within each level. */
export function orderedCataloguePlans(w:World){
 const priority=['workshop','well','equipment-woodenAxe','metalworking','equipment-scrapKnife','equipment-metalPickaxe'];
 const rank=(p:HQPlan)=>{const n=priority.indexOf(p.id);return n<0?100:n};
 const level=campAccessLevel(w);
 return cataloguePlans(w).filter(p=>!p.preview).sort((a,b)=>Number(planCampLevel(a)>level)-Number(planCampLevel(b)>level)||planCampLevel(a)-planCampLevel(b)||rank(a)-rank(b));
}
export function planForBuilding(w:World,id:HQBuildingId){return headquartersPlans(w).find(p=>p.building===id)!.id}
export function plansForBuilding(w:World,id:HQBuildingId){return headquartersPlans(w).filter(p=>p.building===id&&!p.gearId)}
export function equipmentInventory(w:World,id:GearKind){const g=gear(w);return{pack:g.bag[id]??0,stored:g.chest[id]??0}}
export function discoveries(w:World){
 const p=w.progression,entries:{id:string;title:string;body:string;image:string}[]=[];
 if(!p||p.briefed)entries.push({id:'camp',title:'The old camp',body:'A planning bench, useful workstations and unfinished places to restore.',image:HQ_BENCH_ART});
 if(p&&campAccessLevel(w)>=2)entries.push({id:'camp-expanded',title:'A working camp',body:'Headquarters has access to metalworking plans. Restoring the furnace enables metal equipment at the workshop.',image:HQ_BENCH_ART});
 if(p?.repairPart)entries.push({id:'bellows',title:'Recovered furnace bellows',body:'The salvaged bellows came with smelting notes for the camp furnace.',image:'/survival/camp-craft-v2/furnace-idle.webp'});
 if(p?.furnaceRestored)entries.push({id:'furnace',title:'Metalworking restored',body:'Ore and scrap can now become iron ingots at the furnace.',image:'/survival/ironworks-v1/iron-ingot.png'});
 if(p?.metalCrafted)entries.push({id:'metal',title:'Working with metal',body:'A forged weapon revealed how metal fittings can reinforce the perimeter.',image:GEAR.metalSpear.image});
 if(p?.fortified)entries.push({id:'fortified',title:'A stronger perimeter',body:'The camp defences have been reinforced.',image:'/survival/ui-backpack-v1/scrap.png'});
 return entries;
}
