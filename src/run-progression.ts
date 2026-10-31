import {atCampRepairSite,campRepairSite} from './camp-repair-site';
export {atCampRepairSite,campRepairSite};
import {CAMP_BUILDING_IDS,CAMP_REPAIRS,campBuildingId,buildingRestored,buildingEstablished,buildingHp,buildingMaxHp,buildingNeedsRepair,type CampBuildingId} from './camp-restoration';
import {blueprintFound,blueprintLearned,learnedBlueprints,type HQBlueprintId} from './headquarters-plans';
import type {World,Vec} from './survival-engine';
import {worldBlocked,lineClear,pathTo,timeOf,facing} from './survival-engine';
import {placementBounds,placementPoint,newPlacement,type Placement,type WorldLayout} from './world-layout';
import {GEAR,hasGear,type GearKind,type PlayerGear} from './player-gear';
import {setItemCount,setStoredCount,INVENTORY_KINDS} from './expedition-inventory';
import {canPayMaterials,payMaterials,materialTotal} from './camp-materials';
import type {MaterialCost} from './forge-recipes';
import {campAccessLevel,campFacilities,CAMP_EXPANSION_COST,type CampLevel} from './camp-levels';

export const HQ_BENCH='art_camp_planning_board',REPAIR_CACHE='expedition-repair-cache';
export const RESTORE_FURNACE_COST:MaterialCost=CAMP_REPAIRS.furnace.cost;
export const REPAIR_CAMP_COST:MaterialCost={pallets:2,stone:1};
export const FORTIFY_COST:MaterialCost={pallets:5,stone:4,ironIngot:2};
export type RunProgression={
 version:1;buildingHp?:Partial<Record<CampBuildingId,number>>;starterRepairHammer?:boolean;starterPickaxe?:boolean;restoredBuildings?:CampBuildingId[];campLevel?:CampLevel;blueprints?:HQBlueprintId[];briefed:boolean;repairPart:boolean;furnaceRestored:boolean;metalCrafted:boolean;fortified:boolean;
 trackedObjective?:'shelter'|'metalworking'|'defences';ingotsSmelted?:number;craftedMetalPickaxe?:boolean;
 camp:Vec;cache:Vec;hqHp:number;hqMax:number;defence:number;defenceMax:number;lastHit:number;
 siege:{night:number;spawned:number;nextAt:number;ended:number};completed:boolean;
};
const benches=new WeakMap<WorldLayout,Placement[]>();
export function headquartersBench(w:World){if(!w.layout||w.scene)return undefined;let items=benches.get(w.layout);if(!items){items=w.layout.items.filter(p=>p.assetId===HQ_BENCH);benches.set(w.layout,items)}return items[0]}
export function headquartersDock(p:Placement){const b=placementBounds(p),[x,y]=placementPoint(p,b.x+b.width*.5,b.y+b.height+25*p.scale);return{x,y}}
export function nearbyHeadquarters(w:World){const p=headquartersBench(w);if(!p)return null;const dock=headquartersDock(p);return Math.hypot(w.player.x-dock.x,w.player.y-dock.y)<155&&lineClear(w.player,dock,w)?{placement:p,...dock}:null}
export function openHeadquarters(w:World){if(!nearbyHeadquarters(w)||w.phase==='over'||w.player.hp<=0||w.player.downedUntil)return false;if(w.progression)w.progression.briefed=true;w.stationPanel='headquarters';return true}
export const hasMetalworking=(w:World)=>!w.progression||campAccessLevel(w)>=2&&buildingRestored(w,'furnace');
export const recipeUnlocked=(w:World,id:GearKind)=>buildingRestored(w,'headquarters')&&buildingRestored(w,'workshop')&&(hasMetalworking(w)||['woodenAxe','woodenPickaxe','woodenKnife','woodenSpear','woodenSword'].includes(id));
export function starterGear():PlayerGear{const empty=()=>Object.fromEntries(Object.keys(GEAR).map(id=>[id,0])) as PlayerGear['bag'];const bag=empty();bag.woodenAxe=1;bag.woodenPickaxe=1;bag.repairHammer=1;return{bag,chest:empty()}}
function openGround(w:World,origin:Vec,radii:number[],prefer=Math.PI/3){
 for(const radius of radii)for(let i=0;i<32;i++){const a=prefer+(i%2?-1:1)*Math.ceil(i/2)*Math.PI/16,p={x:origin.x+Math.cos(a)*radius,y:origin.y+Math.sin(a)*radius};if(worldBlocked(w,p.x,p.y,75))continue;const route=pathTo(origin,p,w,6000,23);if(route.length&&Math.hypot(route.at(-1)!.x-p.x,route.at(-1)!.y-p.y)<100)return p}
 return {...origin,x:origin.x+130};
}
export function startExpedition(w:World){
 w.gear=starterGear();w.player.equipped='woodenAxe';w.tools={bat:false,hammer:true,torch:true};
 for(const kind of INVENTORY_KINDS){setItemCount(w,kind,0);setStoredCount(w,kind,0)}
 setItemCount(w,'beans',2);setItemCount(w,'berries',4);
 const hq=w.layout?.items.find(p=>p.assetId==='base_shelter_t1'||p.assetId==='base_headquarters_t1'||p.id==='4d468bcc-83b9-4bb7-af01-da4b69a67d9a');
 const dock=hq?(()=>{const b=placementBounds(hq),[x,y]=placementPoint(hq,b.x+b.width*.5,b.y+b.height+80);return{x,y}})():{...w.layout!.spawn};
 const camp=openGround(w,dock,[0,80,160,240,320]),cache=openGround(w,w.layout!.spawn,[1800,1500,1200,900]);
 w.progression={version:1,starterRepairHammer:true,starterPickaxe:true,campLevel:0,restoredBuildings:[],trackedObjective:'shelter',blueprints:[],briefed:false,repairPart:false,furnaceRestored:false,metalCrafted:false,fortified:false,camp,cache,hqHp:240,hqMax:240,defence:120,defenceMax:120,lastHit:-100,siege:{night:0,spawned:0,nextAt:0,ended:0},completed:false};
 // The cache belongs to this run only; the authored editor layout is untouched.
 const p={...newPlacement('art_hq_storage_chest',cache.x,cache.y),id:REPAIR_CACHE,scale:.65,solid:false,role:'prop' as const,locked:true};
 w.layout={...w.layout!,items:[...w.layout!.items,p]};
 w.camp.hearth.fuel=0;w.fire={cookUntil:0,ready:false,queue:[],rack:[],updatedAt:w.tick/60};
 w.notice='';w.noticeUntil=0;
}
export function nearRepairCache(w:World){const p=w.progression;return !!p&&!w.scene&&Math.hypot(w.player.x-p.cache.x,w.player.y-p.cache.y)<145&&lineClear(w.player,p.cache,w)}
export function recoverRepairPart(w:World){const p=w.progression;if(!p||p.repairPart||!nearRepairCache(w)||w.phase==='over'||w.player.hp<=0)return false;p.repairPart=true;w.notice='Furnace bellows and smelting notes recovered';w.noticeUntil=w.tick/60+5;return true}
/** HQ construction uses the authored site; it never moves the survivor or layout. */
export function furnaceBuildStatus(w:World,fromHeadquarters=false){
 if(!w.progression||w.progression.furnaceRestored)return 'Already built';
 if(fromHeadquarters)return 'Repair with a hammer at the furnace';
 return buildingRepairStatus(w,'furnace');
}
export function restoreFurnace(w:World,fromHeadquarters=false){
 return !fromHeadquarters&&restoreCampBuilding(w,'furnace');
}
export function campExpansionStatus(w:World){
 if(campAccessLevel(w)>=2)return 'Camp level 2 unlocked';
 if(campAccessLevel(w)===0)return 'Repair headquarters first';
 if(!w.progression||w.stationPanel!=='headquarters'||!nearbyHeadquarters(w)||w.phase==='over'||w.player.hp<=0||w.player.downedUntil)return 'Visit headquarters';
 if(w.phase==='night')return 'Expand at dawn';
 const ready=campFacilities(w);
 if(!ready.workshop)return buildingRestored(w,'workshop')?'Workshop not in camp':'Repair the workshop first';
 if(!ready.warehouse)return buildingRestored(w,'warehouse')?'Warehouse not in camp':'Repair the warehouse first';
 return canPayMaterials(w,CAMP_EXPANSION_COST)?'Ready':'Need expansion materials';
}
export function expandCamp(w:World){
 if(campExpansionStatus(w)!=='Ready'||!payMaterials(w,CAMP_EXPANSION_COST))return false;
 w.progression!.campLevel=2;
 w.notice='Camp level 2 · New building and equipment plans unlocked';w.noticeUntil=w.tick/60+4;
 return true;
}
export function campWorkStatus(w:World,fortify=false){if(campAccessLevel(w)===0)return 'Repair headquarters first';const p=w.progression;if(!p||w.stationPanel!=='headquarters'||!nearbyHeadquarters(w)||w.phase==='over'||w.player.hp<=0||w.player.downedUntil)return 'Visit headquarters';if(w.phase==='night')return 'Available at dawn';if(fortify&&p.fortified)return 'Already reinforced';if(fortify&&!blueprintLearned(w,'reinforced-camp'))return 'Requires Camp level 2';if(!fortify&&p.hqHp>=p.hqMax&&p.defence>=p.defenceMax)return 'Camp is fully repaired';return canPayMaterials(w,fortify?FORTIFY_COST:REPAIR_CAMP_COST)?'Ready':'Gather materials'}
export function repairCamp(w:World,fortify=false){if(campWorkStatus(w,fortify)!=='Ready'||!payMaterials(w,fortify?FORTIFY_COST:REPAIR_CAMP_COST))return false;const p=w.progression!;if(fortify){p.fortified=true;p.defenceMax=220;p.defence=220}else{p.hqHp=Math.min(p.hqMax,p.hqHp+70);p.defence=Math.min(p.defenceMax,p.defence+65)}w.notice=fortify?'Camp defences reinforced':'Camp repaired';w.noticeUntil=w.tick/60+3;return true}
export function learnBlueprint(w:World,id:HQBlueprintId){
 if(!w.progression||campAccessLevel(w)<2||w.stationPanel!=='headquarters'||!nearbyHeadquarters(w)||w.phase==='over'||w.player.hp<=0||w.player.downedUntil||!blueprintFound(w,id)||blueprintLearned(w,id))return false;
 w.progression.blueprints=[...learnedBlueprints(w),id];
 w.notice=id==='metalworking'?'Metalworking blueprint learned':'Camp reinforcement blueprint learned';w.noticeUntil=w.tick/60+3;return true;
}
export function trackCamp(w:World){if(!w.progression)return false;w.waypoint={...w.progression.camp,sceneId:'camp'};return true}
export const costRows=(w:World,cost:MaterialCost)=>Object.entries(cost).map(([id,needed])=>({id,name:({pallets:'Logs',stone:'Stone',scrap:'Scrap',ironIngot:'Iron ingots'} as Record<string,string>)[id]??id,needed:needed!,have:materialTotal(w,id as keyof MaterialCost)}));

/** Resource costs scale with damage; abandoned ruins retain their original cost. */
export function buildingRepairCost(w:World,id:CampBuildingId):MaterialCost{
 if(w.buildingRepair?.id===id)return w.buildingRepair.cost;
 if(id==='headquarters'&&buildingEstablished(w,id))return REPAIR_CAMP_COST;
 const missing=buildingEstablished(w,id)?1-buildingHp(w,id)/buildingMaxHp(w,id):1;
 return Object.fromEntries(Object.entries(CAMP_REPAIRS[id].cost).map(([kind,n])=>[kind,Math.max(1,Math.ceil(n!*missing))]));
}
export function buildingRepairStatus(w:World,id:CampBuildingId){
 if(!buildingNeedsRepair(w,id))return 'Already repaired';
 if(id!=='headquarters'&&campAccessLevel(w)<CAMP_REPAIRS[id].level)return campAccessLevel(w)===0?'Repair headquarters first':'Requires Camp level '+CAMP_REPAIRS[id].level;
 if(!w.progression||w.phase==='over'||w.player.hp<=0||w.player.downedUntil||w.scene)return 'Unavailable';
 if(id==='headquarters'){
  if(!nearbyHeadquarters(w))return 'Visit headquarters';
  if(!w.layout?.items.some(p=>campBuildingId(p.assetId)===id))return 'Building site not in camp';
  // The initial restoration remains a menu confirmation. An established HQ
  // also supports its dedicated, instant Repair action beside the plans button.
  if(w.stationPanel!=='headquarters'){
   if(!buildingEstablished(w,id))return 'Visit headquarters';
   if(w.stationPanel)return 'Close the menu to repair on site';
   if(!hasGear(w,'repairHammer'))return 'Repair hammer needed';
   if(w.player.equipped!=='repairHammer')return 'Equip repair hammer';
   if(w.buildingRepair||w.bruteGrab||w.player.hurtUntil>timeOf(w)||w.dodge||w.axeSwing||w.bowShot||w.spearThrust||w.swordThrust)return 'Finish your current action';
  }
 }else{
  if(!campRepairSite(w,id))return 'Building site not in camp';
  if(w.stationPanel)return 'Close the menu to repair on site';
  if(!atCampRepairSite(w,id))return 'Visit the building';
  if(!hasGear(w,'repairHammer'))return 'Repair hammer needed';
  if(w.player.equipped!=='repairHammer'&&w.stationPanel!=='headquarters')return 'Equip repair hammer';
  if(w.dodge||w.axeSwing||w.bowShot||w.spearThrust||w.swordThrust)return 'Finish your current action';
 }
 return canPayMaterials(w,buildingRepairCost(w,id))?'Ready':'Need repair materials';
}
/** Atomic completion: instant HQ confirmation, or a completed on-site hammer job. */
export function restoreCampBuilding(w:World,id:CampBuildingId){
 if(buildingRepairStatus(w,id)!=='Ready'||!payMaterials(w,buildingRepairCost(w,id)))return false;
 const p=w.progression!,initial=!buildingEstablished(w,id);
 if(p.restoredBuildings===undefined)p.restoredBuildings=CAMP_BUILDING_IDS.filter(building=>buildingEstablished(w,building));
 if(!p.restoredBuildings.includes(id))p.restoredBuildings.push(id);
 if(id==='headquarters'){if(initial)p.campLevel=1;p.hqHp=p.hqMax;p.defence=p.defenceMax;w.waypoint=undefined;}
 else{
  (p.buildingHp??={})[id]=buildingMaxHp(w,id);
  const site=campRepairSite(w,id)!;w.player.direction=facing(site.placement.x-w.player.x,site.placement.y-w.player.y);
  w.repairHammerUntil=timeOf(w)+.55;
  if(w.waypoint&&Math.hypot(w.waypoint.x-site.x,w.waypoint.y-site.y)<180)w.waypoint=undefined;
 }
 if(id==='furnace')p.furnaceRestored=true;
 w.repairCheckpoint=true;
 w.notice=id==='headquarters'&&initial?'Camp level 1 unlocked':CAMP_REPAIRS[id].name+' repaired';
 w.noticeUntil=timeOf(w)+2;return true;
}
