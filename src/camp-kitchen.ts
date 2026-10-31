import {buildingRestored} from './camp-restoration';
import {FOOD_RECIPES,type FoodSpecies} from './food-items';
import {addInventory,takeInventory,itemCount,expeditionKit} from './expedition-inventory';
import {campAction,timeOf,type World,type Vec} from './survival-engine';
export const FIRE_CAPACITY=480,LOG_BURN_SECONDS=90,KITCHEN_QUEUE=4,KITCHEN_RACK=6;
export const LOG_FLIGHT_SECONDS=.55;
export type CookingJob={id:number;species:FoodSpecies;remaining:number};
export type KitchenState={species?:FoodSpecies;cookUntil:number;ready:boolean;thrown?:{from:Vec;born:number;species?:FoodSpecies};queue?:CookingJob[];rack?:FoodSpecies[];updatedAt?:number;logs?:{from:Vec;born:number;lands:number}[];flaredAt?:number;taken?:{species:FoodSpecies;to:Vec;born:number}[]};
export function kitchen(w:World){w.fire.queue??=[];w.fire.rack??=[];return w.fire as KitchenState&{queue:CookingJob[];rack:FoodSpecies[]}}
export const committedFuel=(w:World)=>w.camp.hearth.fuel+(w.fire.logs?.length??0)*LOG_BURN_SECONDS;
export function feedFire(w:World){
 stepKitchen(w);if(w.phase==='over'||w.player.hp<=0||w.player.downedUntil)return false;
 if(campAction(w)!=='cook'||committedFuel(w)>FIRE_CAPACITY-LOG_BURN_SECONDS)return false;
 if(itemCount(w,'pallets')>0)takeInventory(w,'pallets',1);else if(w.stock.pallets>0)w.stock.pallets--;else return false;
 const t=timeOf(w);(w.fire.logs??=[]).push({from:{x:w.player.x,y:w.player.y-42},born:t,lands:t+LOG_FLIGHT_SECONDS});return true;
}
export function queueFood(w:World,species:FoodSpecies){
 stepKitchen(w);const k=kitchen(w);if(w.phase==='over'||w.player.hp<=0||w.player.downedUntil||campAction(w)!=='cook'||k.queue.length>=KITCHEN_QUEUE||!takeInventory(w,FOOD_RECIPES[species].raw,1))return false;
 k.queue.push({id:w.serial++,species,remaining:FOOD_RECIPES[species].seconds});k.species=k.queue[0].species;k.thrown={species,from:{x:w.player.x,y:w.player.y-32},born:timeOf(w)};return true;
}
export function collectFood(w:World,only?:FoodSpecies){
 stepKitchen(w);if(w.phase==='over'||w.player.hp<=0||w.player.downedUntil||campAction(w)!=='cook')return 0;const k=kitchen(w);let collected=0;
 k.rack=k.rack.filter(species=>{if(only&&(species!==only||collected))return true;if(addInventory(w,FOOD_RECIPES[species].cooked,1)){collected++;(k.taken??=[]).push({species,to:{x:w.player.x,y:w.player.y-35},born:timeOf(w)});return false}return true});k.ready=k.rack.length>0;return collected;
}
export function cancelCooking(w:World,id:number){
 stepKitchen(w);if(w.phase==='over'||w.player.hp<=0||w.player.downedUntil||campAction(w)!=='cook')return false;const k=kitchen(w),job=k.queue.find(j=>j.id===id);if(!job||!addInventory(w,FOOD_RECIPES[job.species].raw,1))return false;
 k.queue=k.queue.filter(j=>j.id!==id);return true;
}
/** Gameplay time advances the fire, including time spent inside the bunker.
 * Finished meals stay on a bounded rack. Cold fires preserve queued food. */
export function stepKitchen(w:World){
 if(!buildingRestored(w,'fire')){w.fire.updatedAt=timeOf(w);return;}
 const t=timeOf(w),k=kitchen(w),readyBefore=k.rack.length,fuelBefore=w.camp.hearth.fuel;let cursor=k.updatedAt??0;k.updatedAt=t;
 const advance=(elapsed:number)=>{let heat=Math.min(w.camp.hearth.fuel,elapsed);w.camp.hearth.fuel=Math.max(0,w.camp.hearth.fuel-elapsed);
  while(heat>1e-8&&k.queue.length&&k.rack.length<KITCHEN_RACK){
   const job=k.queue[0],used=Math.min(job.remaining,heat);job.remaining-=used;heat-=used;
   if(job.remaining<1e-7){k.rack.push(job.species);k.queue.shift()}else break;
  }
 };
 // A log is paid for on throwing, but becomes heat only when it lands. Replay
 // each landing chronologically so long frames and interior travel conserve fuel.
 for(const log of k.logs??[]){if(log.lands>t)continue;advance(Math.max(0,log.lands-cursor));cursor=Math.max(cursor,log.lands);w.camp.hearth.fuel=Math.min(FIRE_CAPACITY,w.camp.hearth.fuel+LOG_BURN_SECONDS);k.flaredAt=log.lands}
 k.logs=k.logs?.filter(log=>log.lands>t);advance(Math.max(0,t-cursor));
 if(fuelBefore>0&&w.camp.hearth.fuel===0&&!k.logs?.length&&w.stationPanel!=='fire'&&Math.hypot(w.player.x-w.camp.hearth.x,w.player.y-w.camp.hearth.y)<500){w.notice='Fire out · Add wood';w.noticeUntil=t+3}
 if(k.rack.length>readyBefore&&w.stationPanel!=='fire'&&Math.hypot(w.player.x-w.camp.hearth.x,w.player.y-w.camp.hearth.y)<500){w.notice=`${k.rack.length} meal${k.rack.length===1?'':'s'} ready · Collect at the fire`;w.noticeUntil=t+3}
 k.species=k.queue[0]?.species??k.species;k.cookUntil=k.queue.length?t+k.queue[0].remaining:0;k.ready=k.rack.length>0;
 if(k.thrown&&t-k.thrown.born>.5)k.thrown=undefined;
 k.taken=k.taken?.filter(meal=>t-meal.born<.6);
}
export function eatMeal(w:World,species:FoodSpecies){
 const t=timeOf(w),kit=expeditionKit(w),recipe=FOOD_RECIPES[species];
 if(t<kit.mealReadyAt||w.axeSwing||w.dodge||w.player.hurtUntil>t||w.hunger>99&&w.player.hp>99||!takeInventory(w,recipe.cooked,1))return false;
 w.hunger=Math.min(100,w.hunger+recipe.food);w.player.hp=Math.min(100,w.player.hp+recipe.health);kit.mealReadyAt=t+8;return true;
}
