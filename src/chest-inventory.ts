import {provisionCounts} from './food-provisions';
import {backpackItems,type BagItemId} from './backpack';
import {gear,isGear,GEAR,atHeadquartersChest,transferAxe} from './player-gear';
import {itemCount,storedCount,canCarryCount,packWeight,PACK_CAPACITY} from './expedition-inventory';
import {storeItem,withdrawItem} from './camp-storage';
import {atStorage} from './station-access';
import type {World} from './survival-engine';
export type ChestSide='chest'|'pack';
const RESOURCE_IDS={ironOre:'ironOre',ironIngot:'ironIngot',stone:'stone',berries:'berries',apple:'apple',potato:'potato',beans:'beans',energyBar:'energyBar',huntersMeal:'huntersMeal',raw:'rawMeat',meal:'cookedMeat',rabbitRaw:'rawRabbit',rabbitMeal:'cookedRabbit',venisonRaw:'rawVenison',venisonMeal:'cookedVenison',logs:'pallets',scrap:'scrap',fuel:'fuel'} as const;
export function chestItemCount(w:World,id:BagItemId,side:ChestSide){
 if(isGear(id))return gear(w)[side==='pack'?'bag':'chest'][id]??0;
 return side==='pack'?itemCount(w,RESOURCE_IDS[id]):storedCount(w,RESOURCE_IDS[id]);
}
/** Share the bag's artwork, descriptions and stats without changing inventory. */
export function chestItems(w:World,side:ChestSide){
 const count=(id:BagItemId)=>chestItemCount(w,id,side);
 return backpackItems({axes:side==='pack'?gear(w).bag:atHeadquartersChest(w)?gear(w).chest:{axe:0,woodenAxe:0},selected:'fists',downed:!!w.player.downedUntil,raw:count('raw'),cooked:count('meal'),rawRabbit:count('rabbitRaw'),cookedRabbit:count('rabbitMeal'),rawVenison:count('venisonRaw'),cookedVenison:count('venisonMeal'),ironOre:count('ironOre'),ironIngot:count('ironIngot'),stone:count('stone'),logs:count('logs'),scrap:count('scrap'),fuel:count('fuel'),mealCooldown:0,health:w.player.hp,hunger:w.hunger,thirst:w.thirst,stamina:w.player.stamina,provisions:{...provisionCounts(w,side==='pack'?'bag':'chest')}});
}
export function chestTransferLimit(w:World,id:BagItemId,side:ChestSide){
 if(!atStorage(w)||w.phase==='over'||w.player.hp<=0||w.player.downedUntil)return 0;
 const count=chestItemCount(w,id,side);
 if(id==='arrows')return atHeadquartersChest(w)&&!w.axeSwing&&!w.spearThrust&&!w.swordThrust&&!w.bowShot&&!w.dodge?(side==='pack'?count:Math.min(count,Math.max(0,Math.floor((PACK_CAPACITY-packWeight(w)+1e-8)/GEAR.arrows.weight)))):0;
 if(isGear(id))return atHeadquartersChest(w)&&!w.axeSwing&&!w.spearThrust&&!w.swordThrust&&!w.bowShot&&!w.dodge&&(side==='pack'||packWeight(w)+GEAR[id].weight<=PACK_CAPACITY)?Math.min(1,count):0;
 return side==='pack'?count:canCarryCount(w,RESOURCE_IDS[id],count);
}
export function moveChestItem(w:World,id:BagItemId,side:ChestSide,quantity:number|'all'){
 if(quantity!=='all'&&(!Number.isSafeInteger(quantity)||quantity<1))return 0;
 if(!chestTransferLimit(w,id,side))return 0;
 if(id==='arrows'){const amount=Math.min(chestTransferLimit(w,id,side),quantity==='all'?Infinity:quantity);return transferAxe(w,id,side==='chest',amount)?amount:0}
 if(isGear(id))return transferAxe(w,id,side==='chest')?1:0;
 return side==='chest'?withdrawItem(w,RESOURCE_IDS[id],quantity):storeItem(w,RESOURCE_IDS[id],quantity);
}
