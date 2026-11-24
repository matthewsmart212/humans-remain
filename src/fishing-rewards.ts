import {addInventoryBatch,canAddInventoryBatch,ITEM_RULES,type InventoryReward} from './expedition-inventory';
import type {FishingCatch} from './fishing-types';
import type {World} from './survival-engine';

/** New catches provide more meals at the two visible size milestones. */
export function fishingPortions(species:FishingCatch['species'],kg:number){
 if(species==='drone')return 1;
 return Number.isFinite(kg)&&kg>=2.75?3:Number.isFinite(kg)&&kg>=1.25?2:1;
}

/** Missing portions belong to a V1 catch and must retain its original single award. */
export function fishingCatchRewards(c:FishingCatch):InventoryReward[]{
 const count=c.portions===undefined?1:c.portions;
 if(!Number.isInteger(count)||count<1||count>3)return[];
 if(c.species==='drone')return[{kind:'scrap',count:6},{kind:'ironOre',count:2}];
 const kind=c.species==='perch'?'rawFish':c.species==='carp'?'rawCarp':c.species==='pike'?'rawPike':undefined;
 return kind?[{kind,count}]:[];
}

export function fishingCatchRewardWeight(c:FishingCatch){
 return fishingCatchRewards(c).reduce((weight,reward)=>weight+ITEM_RULES[reward.kind].weight*reward.count,0);
}

export function fishingCatchRewardLabel(c:FishingCatch){
 const rewards=fishingCatchRewards(c);
 if(!rewards.length)return'Catch unavailable';
 if(c.species==='drone')return'6 scrap + 2 iron ore';
 const count=rewards[0].count;
 return`${count} raw ${c.species} ${count===1?'portion':'portions'}`;
}

export function canKeepFishingCatch(w:World,c:FishingCatch){
 return w.fishing?.pendingCatch===c&&w.phase!=='over'&&w.player.hp>0&&!w.player.downedUntil
  &&canAddInventoryBatch(w,fishingCatchRewards(c));
}

/** Consuming the pending catch makes a repeated KEEP a no-op, including mixed salvage. */
export function keepFishingCatch(w:World,c:FishingCatch){
 if(!canKeepFishingCatch(w,c)||!addInventoryBatch(w,fishingCatchRewards(c)))return false;
 delete w.fishing!.pendingCatch;
 return true;
}
