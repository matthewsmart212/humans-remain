import {buildingRestored} from './camp-restoration';
import {hasMetalworking} from './run-progression';
import {FURNACE_ID,FURNACE_RULES,FURNACE_LOG_SECONDS,SMELT_RECIPES,type SmeltRecipe} from './ironworks-data';
import {FURNACE_UPGRADE_COST} from './forge-recipes';
import {storedCount,setStoredCount,addInventory} from './expedition-inventory';
import {payMaterials} from './camp-materials';
export {materialTotal,canPayMaterials} from './camp-materials';
import {placementBounds,placementPoint,type WorldLayout,type Placement} from './world-layout';
import {lineClear,timeOf,type World} from './survival-engine';

export type SmeltingJob={id:number;recipe:SmeltRecipe;remaining:number};
export type FurnaceState={level:1|2;fuel:number;queue:SmeltingJob[];ready:number;updatedAt:number};
export type IronworksState={stations:Record<string,FurnaceState>};
const cache=new WeakMap<WorldLayout,Placement[]>();
export function furnaces(layout?:WorldLayout){if(!layout)return[];let list=cache.get(layout);if(!list){list=layout.items.filter(p=>p.assetId===FURNACE_ID);cache.set(layout,list)}return list}
export function furnaceDock(p:Placement){const b=placementBounds(p),[x,y]=placementPoint(p,b.x+b.width*.72,b.y+b.height*.96);return{x,y}}
export function nearbyFurnace(w:World){
 if(w.scene)return null;let nearest:{placement:Placement;x:number;y:number}|null=null,best=145;
 for(const p of furnaces(w.layout)){const dock=furnaceDock(p),d=Math.hypot(w.player.x-dock.x,w.player.y-dock.y);if(d<best&&lineClear(w.player,dock,w)){best=d;nearest={placement:p,...dock}}}return nearest;
}
export function furnaceState(w:World,id:string):FurnaceState{
 const stations=(w.ironworks??={stations:Object.create(null)}).stations;
 if(!Object.hasOwn(stations,id))stations[id]={level:1,fuel:0,queue:[],ready:0,updatedAt:timeOf(w)};
 return stations[id];
}
export const furnaceRules=(f:FurnaceState)=>FURNACE_RULES[f.level];
export const furnaceWorking=(f?:FurnaceState)=>!!f&&f.fuel>0&&f.queue.length>0&&f.ready<furnaceRules(f).rack;
export function openFurnace(w:World,id:string){
 if(!buildingRestored(w,'headquarters')||w.phase==='over'||w.player.hp<=0||w.player.downedUntil||w.axeSwing||w.spearThrust||w.swordThrust||w.bowShot||w.dodge||nearbyFurnace(w)?.placement.id!==id)return false;
 furnaceState(w,id);w.furnaceId=id;w.stationPanel='furnace';return true;
}
export function furnaceAccess(w:World){
 return hasMetalworking(w)&&w.stationPanel==='furnace'&&!!w.furnaceId&&w.phase!=='over'&&w.player.hp>0&&!w.player.downedUntil&&!w.dodge&&!w.axeSwing&&!w.spearThrust&&!w.swordThrust&&!w.bowShot&&w.player.hurtUntil<=timeOf(w)&&nearbyFurnace(w)?.placement.id===w.furnaceId;
}
export function stepFurnaces(w:World){
 const t=timeOf(w);
 if(!hasMetalworking(w)){for(const f of Object.values(w.ironworks?.stations??{}))f.updatedAt=t;return;}
 for(const f of Object.values(w.ironworks?.stations??{})){
  let elapsed=Math.max(0,t-f.updatedAt);f.updatedAt=t;const rule=furnaceRules(f);
  // Banked heat is spent only while a batch can advance. Full output and idle time never burn logs.
  while(elapsed>1e-8&&f.fuel>1e-8&&f.queue.length&&f.ready<rule.rack){
   const job=f.queue[0],used=Math.min(elapsed,f.fuel,job.remaining/rule.rate);job.remaining=Math.max(0,job.remaining-used*rule.rate);elapsed-=used;f.fuel=Math.max(0,f.fuel-used);
   if(job.remaining<=1e-7){f.queue.shift();f.ready++;if(w.progression)w.progression.ingotsSmelted=(w.progression.ingotsSmelted??0)+1}else break;
  }
  if(f.fuel<1e-8)f.fuel=0;
 }
}
export function addFurnaceLog(w:World){
 stepFurnaces(w);if(!furnaceAccess(w))return false;const f=furnaceState(w,w.furnaceId!);
 if(f.fuel>furnaceRules(f).fuel-FURNACE_LOG_SECONDS+1e-7||!payMaterials(w,{pallets:1}))return false;
 f.fuel=Math.min(furnaceRules(f).fuel,f.fuel+FURNACE_LOG_SECONDS);return true;
}
export function queueSmelt(w:World,recipe:SmeltRecipe){
 stepFurnaces(w);if(!furnaceAccess(w)||!Object.hasOwn(SMELT_RECIPES,recipe))return false;
 const f=furnaceState(w,w.furnaceId!),r=SMELT_RECIPES[recipe];
 if(f.queue.length>=furnaceRules(f).queue||!payMaterials(w,{[r.input]:r.count}))return false;
 f.queue.push({id:w.serial++,recipe,remaining:r.seconds});return true;
}
export function cancelSmelt(w:World,id:number){
 stepFurnaces(w);if(!furnaceAccess(w))return false;const f=furnaceState(w,w.furnaceId!),job=f.queue.find(j=>j.id===id);if(!job)return false;
 const r=SMELT_RECIPES[job.recipe];setStoredCount(w,r.input,storedCount(w,r.input)+r.count);f.queue=f.queue.filter(j=>j.id!==id);return true;
}
export function collectIngots(w:World){
 stepFurnaces(w);if(!furnaceAccess(w))return 0;const f=furnaceState(w,w.furnaceId!),n=addInventory(w,'ironIngot',f.ready);f.ready-=n;return n;
}
export function upgradeFurnace(w:World){
 stepFurnaces(w);if(!furnaceAccess(w))return false;const f=furnaceState(w,w.furnaceId!);
 if(f.level!==1||!payMaterials(w,FURNACE_UPGRADE_COST))return false;f.level=2;return true;
}
export function furnaceRevision(w:World){return Object.entries(w.ironworks?.stations??{}).map(([id,f])=>[id,f.level,Math.ceil(f.fuel*2),f.ready,f.queue.map(j=>[j.id,j.recipe,Math.ceil(j.remaining*2)])])}
