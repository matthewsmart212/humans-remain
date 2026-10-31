import {PROVISIONS,isProvision,type ProvisionId} from './food-provisions-data';
import {expeditionKit,itemCount,takeInventory,setItemCount,packWeight,PACK_CAPACITY,ITEM_RULES} from './expedition-inventory';
import {SURVIVAL_BALANCE,startMealRecovery} from './survival-needs';
import {campAction,timeOf,type World} from './survival-engine';
export {PROVISION_IDS,PROVISIONS,isProvision,type ProvisionId,type ProvisionCounts,type ProvisionDefinition} from './food-provisions-data';
export {provisionCounts} from './expedition-inventory';

export function provisionWouldHelp(w:World,id:ProvisionId){
 const f=PROVISIONS[id],pending=w.survival?.mealRecovery?.remaining??0;
 return (f.food>0&&w.hunger<=99)||(f.water>0&&w.thirst<=99)||(f.stamina>0&&w.player.stamina<=99)||(f.healOverTime>0&&w.player.hp+pending<=99);
}
function canHandleFood(w:World){
 const t=timeOf(w);
 return w.phase!=='over'&&w.player.hp>0&&!w.player.downedUntil&&!w.axeSwing&&!w.spearThrust&&!w.swordThrust&&!w.bowShot&&!w.dodge&&w.attackUntil<=t&&w.player.hurtUntil<=t;
}
export function canConsumeProvision(w:World,id:ProvisionId){
 return canHandleFood(w)&&timeOf(w)>=expeditionKit(w).mealReadyAt&&itemCount(w,id)>0&&provisionWouldHelp(w,id);
}
export function consumeProvision(w:World,id:ProvisionId){
 if(!canConsumeProvision(w,id)||!takeInventory(w,id,1))return false;
 const food=PROVISIONS[id],t=timeOf(w),p=w.player;
 w.hunger=Math.min(100,w.hunger+food.food);w.thirst=Math.min(100,w.thirst+food.water);p.stamina=Math.min(100,p.stamina+food.stamina);
 if(p.stamina>=SURVIVAL_BALANCE.exhaustionRelease&&w.survival)w.survival.exhausted=false;
 if(food.healOverTime)startMealRecovery(w,food.healOverTime,food.duration);
 expeditionKit(w).mealReadyAt=t+food.cooldown;
 w.notice=`Ate ${food.name.toLowerCase()}`;w.noticeUntil=t+2;
 return true;
}
export function heldProvision(w:World):ProvisionId|null{const held=w.player.equipped;return isProvision(held)&&itemCount(w,held)>0?held:null}

export const HUNTERS_MEAL_INGREDIENTS={cookedVenison:1,berries:2} as const;
export function huntersMealCount(w:World){return Math.min(itemCount(w,'cookedVenison'),Math.floor(itemCount(w,'berries')/2))}
export function canPackHuntersMeal(w:World){return packWeight(w)-ITEM_RULES.cookedVenison.weight-2*PROVISIONS.berries.weight+PROVISIONS.huntersMeal.weight<=PACK_CAPACITY+1e-7}
export function canPrepareHuntersMeal(w:World){
 if(!canHandleFood(w)||campAction(w)!=='cook'||huntersMealCount(w)<1)return false;
 return canPackHuntersMeal(w);
}
/** Check the whole recipe before changing any count; packing cannot lose ingredients. */
export function prepareHuntersMeal(w:World){
 if(!canPrepareHuntersMeal(w))return false;
 setItemCount(w,'cookedVenison',itemCount(w,'cookedVenison')-1);
 setItemCount(w,'berries',itemCount(w,'berries')-2);
 setItemCount(w,'huntersMeal',itemCount(w,'huntersMeal')+1);
 w.notice='Hunter’s meal prepared';w.noticeUntil=timeOf(w)+2.5;
 return true;
}
