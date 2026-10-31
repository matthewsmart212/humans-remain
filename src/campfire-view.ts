import type {World} from './survival-engine';
import {FOOD_RECIPES,type FoodSpecies} from './food-items';
import {BAG_IMAGES} from './backpack';
import {kitchen,feedFire,queueFood,collectFood,cancelCooking,committedFuel,FIRE_CAPACITY,LOG_BURN_SECONDS,KITCHEN_QUEUE,KITCHEN_RACK} from './camp-kitchen';
import {itemCount,canCarryCount,packWeight} from './expedition-inventory';
import {durationLabel} from './camp-station-view';
import {PROVISIONS,huntersMealCount,canPackHuntersMeal,canPrepareHuntersMeal,prepareHuntersMeal} from './food-provisions';

export const FIRE_FOOD_ART={chicken:{raw:BAG_IMAGES.raw,cooked:BAG_IMAGES.meal},rabbit:{raw:BAG_IMAGES.rabbitRaw,cooked:BAG_IMAGES.rabbitMeal},venison:{raw:BAG_IMAGES.venisonRaw,cooked:BAG_IMAGES.venisonMeal}};
export const FIRE_SPECIES:FoodSpecies[]=['chicken','rabbit','venison'];
export function campfireView(w:World){
 const k=kitchen(w),fuel=w.camp.hearth.fuel,burning=fuel>0,incoming=!!k.logs?.length,full=k.rack.length>=KITCHEN_RACK,logs=itemCount(w,'pallets')+w.stock.pallets;
 const spitFull=k.queue.length>=KITCHEN_QUEUE,hasFuelRoom=committedFuel(w)<=FIRE_CAPACITY-LOG_BURN_SECONDS;
 const food=FIRE_SPECIES.map(species=>{const r=FOOD_RECIPES[species],count=itemCount(w,r.raw),ready=k.rack.filter(s=>s===species).length;return{species,name:r.name,...FIRE_FOOD_ART[species],count,ready,seconds:r.seconds,food:r.food,health:r.health,actionLabel:!count?'NONE IN PACK':spitFull?'SPIT FULL':`COOK · ${r.seconds}s`,canCook:count>0&&!spitFull,canTake:ready>0&&canCarryCount(w,r.cooked,1)>0,cook:()=>queueFood(w,species),take:()=>collectFood(w,species)}});
 const preparedCount=huntersMealCount(w),canPrepare=canPrepareHuntersMeal(w);
 const preparedMeal={id:'huntersMeal' as const,name:PROVISIONS.huntersMeal.name,image:PROVISIONS.huntersMeal.image,count:preparedCount,ingredientLabel:'1 cooked meat + 2 berries',food:PROVISIONS.huntersMeal.food,healthOverTime:PROVISIONS.huntersMeal.healOverTime,duration:PROVISIONS.huntersMeal.duration,canPrepare,actionLabel:!preparedCount?'NEED INGREDIENTS':!canPackHuntersMeal(w)?'PACK FULL':canPrepare?'PREPARE':'WAIT',prepare:()=>prepareHuntersMeal(w)};
 return{fuel:fuel/FIRE_CAPACITY,fuelMax:FIRE_CAPACITY,queueMax:KITCHEN_QUEUE,rackMax:KITCHEN_RACK,time:durationLabel(fuel),burning,low:burning&&fuel<45,incoming,logs,storedLogs:w.stock.pallets,packLogs:itemCount(w,'pallets'),weight:packWeight(w).toFixed(1),
  state:incoming&&!burning?'LIGHTING':!burning?'FIRE OUT':fuel<45?'LOW FIRE':'CAMPFIRE',
  canStoke:logs>0&&hasFuelRoom,woodLabel:!logs?'CHOP A TREE':!hasFuelRoom?'FIRE FULL':'+1:30',stoke:()=>feedFire(w),
  grillLabel:k.queue.length?(burning&&!full?'ROASTING':'ON THE SPIT'):'ON THE SPIT',grillHint:k.queue.length>1?`${k.queue.length-1} waiting · tap to return`:k.queue.length?'Tap to return raw':'Tap raw meat below',
  hint:!burning&&!incoming?(logs?'Add a log to light the fire.':'Chop a tree and bring back its logs.'):k.rack.length&&!food.some(f=>f.canTake)?'Pack full. Store supplies to take your meals.':full?'Take a meal to make room on the rack.':!food.some(f=>f.count)&&!k.queue.length&&!k.rack.length?'Hunt wildlife. Bring the raw meat back here.':incoming?'Wood on the way…':k.rack.length?'Food is ready. Tap a meal to take it.':'Tap wood to fuel. Tap raw meat to cook.',
  jobs:Array.from({length:KITCHEN_QUEUE},(_,i)=>{const j=k.queue[i];return j?{id:j.id,species:j.species,image:FIRE_FOOD_ART[j.species].raw,cooked:FIRE_FOOD_ART[j.species].cooked,name:FOOD_RECIPES[j.species].name,progress:1-j.remaining/FOOD_RECIPES[j.species].seconds,active:i===0&&burning&&!full,label:i?'WAIT':!burning?'NO HEAT':full?'RACK FULL':`${Math.ceil(j.remaining)}s`,canReturn:canCarryCount(w,FOOD_RECIPES[j.species].raw,1)>0,remove:()=>cancelCooking(w,j.id)}:null}),
  food,preparedMeal,ready:k.rack.length,canCollect:food.some(f=>f.canTake),collect:()=>collectFood(w),
 };
}
