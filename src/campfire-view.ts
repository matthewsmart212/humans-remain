import type {World} from './survival-engine';
import {FOOD_RECIPES,type FoodSpecies} from './food-items';
import {BAG_IMAGES} from './backpack';
import {kitchen,feedFire,queueFood,cancelCooking,committedFuel,FIRE_CAPACITY,LOG_BURN_SECONDS,KITCHEN_QUEUE} from './camp-kitchen';
import {itemCount,canCarryCount,packWeight} from './expedition-inventory';
import {durationLabel} from './camp-station-view';
import {PROVISIONS,huntersMealCount,canPackHuntersMeal,canPrepareHuntersMeal,prepareHuntersMeal} from './food-provisions';

export const FIRE_FOOD_ART={carp:{raw:BAG_IMAGES.carpRaw,cooked:BAG_IMAGES.carpMeal},pike:{raw:BAG_IMAGES.pikeRaw,cooked:BAG_IMAGES.pikeMeal},fish:{raw:BAG_IMAGES.fishRaw,cooked:BAG_IMAGES.fishMeal},chicken:{raw:BAG_IMAGES.raw,cooked:BAG_IMAGES.meal},rabbit:{raw:BAG_IMAGES.rabbitRaw,cooked:BAG_IMAGES.rabbitMeal},venison:{raw:BAG_IMAGES.venisonRaw,cooked:BAG_IMAGES.venisonMeal}};
export const FIRE_SPECIES:FoodSpecies[]=['chicken','rabbit','venison','fish','carp','pike'];
export function campfireView(w:World){
 const k=kitchen(w),fuel=w.camp.hearth.fuel,burning=fuel>0,incoming=!!k.logs?.length,logs=itemCount(w,'pallets')+w.stock.pallets;
 const spitFull=k.queue.length>=KITCHEN_QUEUE,hasFuelRoom=committedFuel(w)<=FIRE_CAPACITY-LOG_BURN_SECONDS;
 const food=FIRE_SPECIES.map(species=>{const r=FOOD_RECIPES[species],count=itemCount(w,r.raw);return{species,name:r.name,...FIRE_FOOD_ART[species],count,seconds:r.seconds,food:r.food,health:r.health,actionLabel:!count?'NONE IN PACK':spitFull?'SPIT FULL':`COOK · ${r.seconds}s`,canCook:count>0&&!spitFull,cook:()=>queueFood(w,species)}});
 const preparedCount=huntersMealCount(w),canPrepare=canPrepareHuntersMeal(w);
 const preparedMeal={id:'huntersMeal' as const,name:PROVISIONS.huntersMeal.name,image:PROVISIONS.huntersMeal.image,count:preparedCount,ingredientLabel:'1 cooked meat + 2 berries',food:PROVISIONS.huntersMeal.food,healthOverTime:PROVISIONS.huntersMeal.healOverTime,duration:PROVISIONS.huntersMeal.duration,canPrepare,actionLabel:!preparedCount?'NEED INGREDIENTS':!canPackHuntersMeal(w)?'PACK FULL':canPrepare?'PREPARE':'WAIT',prepare:()=>prepareHuntersMeal(w)};
 return{fuel:fuel/FIRE_CAPACITY,fuelMax:FIRE_CAPACITY,queueMax:KITCHEN_QUEUE,time:durationLabel(fuel),burning,low:burning&&fuel<45,incoming,logs,storedLogs:w.stock.pallets,packLogs:itemCount(w,'pallets'),weight:packWeight(w).toFixed(1),
  state:incoming&&!burning?'LIGHTING':!burning?'FIRE OUT':fuel<45?'LOW FIRE':'CAMPFIRE',
  canStoke:logs>0&&hasFuelRoom,woodLabel:!logs?'CHOP A TREE':!hasFuelRoom?'FIRE FULL':'+1:30',stoke:()=>feedFire(w),
  grillLabel:k.queue.length?(burning?'ROASTING':'ON THE SPIT'):'ON THE SPIT',grillHint:k.queue.length>1?`${k.queue.length-1} waiting · tap to return`:k.queue.length?'Tap to return raw':'Tap raw food below',
  hint:!burning&&!incoming?(logs?'Add a log to light the fire.':'Chop a tree and bring back its logs.'):incoming?'Wood on the way…':'Cooked food hops onto the ground. Close this menu and collect it.',
  jobs:Array.from({length:KITCHEN_QUEUE},(_,i)=>{const j=k.queue[i];return j?{id:j.id,species:j.species,image:FIRE_FOOD_ART[j.species].raw,cooked:FIRE_FOOD_ART[j.species].cooked,name:FOOD_RECIPES[j.species].name,progress:1-j.remaining/FOOD_RECIPES[j.species].seconds,active:i===0&&burning,label:i?'WAIT':!burning?'NO HEAT':`${Math.ceil(j.remaining)}s`,canReturn:canCarryCount(w,FOOD_RECIPES[j.species].raw,1)>0,remove:()=>cancelCooking(w,j.id)}:null}),
  food,preparedMeal,
 };
}
