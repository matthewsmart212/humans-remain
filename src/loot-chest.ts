import {withinActionReach,type World} from './survival-engine';
import {PACK_CAPACITY,packWeight} from './expedition-inventory';
import {GEAR,gear} from './player-gear';

/** A test cache above the campfire. Rewards remain INSIDE, never spawn as ground loot. */
export const LOOT_CHEST_ID='campfire-cache-01';
export const LOOT_CHEST_ATLAS='/survival/loot-chest-v5/reclamation-case.webp';
export const LOOT_CHEST_IMAGE_KEY='lootChestAtlas';
export const LOOT_CHEST_GROUND='/survival/loot-chest-v4/ground-contact.webp';
export const LOOT_CHEST_GROUND_KEY='lootChestGround';
export const LOOT_CHEST_IMAGES={[LOOT_CHEST_IMAGE_KEY]:LOOT_CHEST_ATLAS,[LOOT_CHEST_GROUND_KEY]:LOOT_CHEST_GROUND};
export const LOOT_CHEST_FRAMES=10;
// Shared timing for the hinge animation and opening effects.
export const LOOT_CHEST_OPEN_SPEED=2;
export const LOOT_CHEST_OPEN_TICKS=108/LOOT_CHEST_OPEN_SPEED;
/** Show the fully open lid before presenting the contents. */
export const LOOT_CHEST_REVEAL_HOLD_TICKS=18/LOOT_CHEST_OPEN_SPEED;
export const LOOT_CHEST_REWARDS=[
 {kind:'repairHammer',name:'Repair hammer',amount:1,artId:'repairHammer',description:'Repair broken camp buildings'},
 {kind:'woodenAxe',name:'Wooden axe',amount:1,artId:'woodenAxe',description:'Gather timber from trees'},
 {kind:'woodenPickaxe',name:'Wooden pickaxe',amount:1,artId:'woodenPickaxe',description:'Mine rocks and basic ore'},
] as const;
export type LootChestRewardKind=typeof LOOT_CHEST_REWARDS[number]['kind'];
export type LootChestContents=Partial<Record<LootChestRewardKind,number>>;
export type LootChestState=Record<string,{openedAt:number;contents?:LootChestContents;menuShown?:boolean;rewardVersion?:2}>;
type ChestWorld=Pick<World,'layout'|'scene'|'camp'|'player'|'lootChests'|'tick'|'phase'|'stationPanel'|'rareCacheMenuAt'>;
export function campLootChest(w:ChestWorld){
 if(!w.layout||w.scene||w.camp.hearth.x<0||w.camp.hearth.y<0)return null;
 return {id:LOOT_CHEST_ID,x:w.camp.hearth.x,y:w.camp.hearth.y-285};
}
export const lootChestOpened=(w:ChestWorld,id=LOOT_CHEST_ID)=>w.lootChests?.[id]!==undefined;
/** Convert previously unclaimed resources to the new starter tools once. */
export function lootChestContents(w:ChestWorld,id=LOOT_CHEST_ID):LootChestContents{
 const state=w.lootChests?.[id];if(!state)return {};
 if(state.rewardVersion===2)return state.contents??{};
 const old=state.contents as Record<string,number>|undefined;
 const legacy=['scrap','ironIngot','pallets','energyBar'];
 if(old&&legacy.some(key=>key in old)){
  const unclaimed=legacy.some(key=>(old[key]??0)>0);
  state.contents=Object.fromEntries(LOOT_CHEST_REWARDS.map(reward=>[reward.kind,unclaimed?1:0])) as LootChestContents;
 }else if(!old)state.contents={};
 state.rewardVersion=2;return state.contents??{};
}
export const lootChestRemaining=(w:ChestWorld,id=LOOT_CHEST_ID)=>LOOT_CHEST_REWARDS.reduce((sum,reward)=>sum+(lootChestContents(w,id)[reward.kind]??0),0);
export function lootChestFrame(w:ChestWorld,id=LOOT_CHEST_ID){
 const state=w.lootChests?.[id];if(!state)return 0;
 const elapsed=Math.max(0,w.tick-state.openedAt);
 return Math.min(LOOT_CHEST_FRAMES-1,Math.floor(elapsed/LOOT_CHEST_OPEN_TICKS*(LOOT_CHEST_FRAMES-1)+.001));
}
export function lootChestBlocked(w:ChestWorld,x:number,y:number,r:number){
 const p=campLootChest(w);return !!p&&Math.abs(x-p.x)<49+r&&Math.abs(y-(p.y-5))<21+r;
}
function accessibleLootChest(w:World){
 const p=campLootChest(w);
 if(!p)return null;
 const latch={x:p.x,y:p.y+28};
 return withinActionReach(w,latch)?{id:p.id,...latch}:null;
}
export const lootChestInMenuRange=(w:World)=>!!accessibleLootChest(w);
export const nearbyLootChest=(w:World)=>w.rareCacheMenuAt===undefined?accessibleLootChest(w):null;
/** Initiate the reveal once; the panel appears after the full opening animation. */
export function openLootChest(w:World,id=LOOT_CHEST_ID){
 const p=nearbyLootChest(w);
 if(!p||p.id!==id||w.phase==='over'||w.player.hp<=0||w.player.downedUntil||w.stationPanel)return false;
 if(!lootChestOpened(w,id)){
  (w.lootChests??={})[id]={
   openedAt:w.tick,
   menuShown:false,
   rewardVersion:2,
   contents:Object.fromEntries(LOOT_CHEST_REWARDS.map(reward=>[reward.kind,reward.amount])) as LootChestContents,
  };
  w.rareCacheMenuAt=w.tick+LOOT_CHEST_OPEN_TICKS+LOOT_CHEST_REVEAL_HOLD_TICKS;
  w.notice='LOOT CHEST · OPENING';w.noticeUntil=(w.tick+LOOT_CHEST_OPEN_TICKS)/60;
 }else{
  w.lootChests![id].menuShown=true;
  w.rareCacheMenuAt=undefined;
  w.stationPanel='rare-cache';
 }
 return true;
}
/** Runs with the shared simulation so web and native reveal the menu together. */
export function stepLootChest(w:World){
 const state=w.lootChests?.[LOOT_CHEST_ID];
 if(!state||state.menuShown){w.rareCacheMenuAt=undefined;return}
 if(w.phase==='over'||w.scene){w.rareCacheMenuAt=undefined;return}
 // The opening deadline is derived from saved chest state, not a transient timer.
 const readyAt=state.openedAt+LOOT_CHEST_OPEN_TICKS+LOOT_CHEST_REVEAL_HOLD_TICKS;
 if(w.tick<readyAt)return;
 w.rareCacheMenuAt=undefined;
 // If the player left during the reveal, present it when they return.
 if(w.stationPanel||!lootChestInMenuRange(w))return;
 state.menuShown=true;
 w.stationPanel='rare-cache';
}
/** Transfer gear through the existing backpack weight limit. */
export function canCarryLootChestReward(w:World,kind:LootChestRewardKind,requested=1){
 const remaining=lootChestContents(w)[kind]??0;
 if(!Number.isFinite(requested)||requested<=0||remaining<=0)return 0;
 const count=Math.min(remaining,Math.floor(requested));
 return Math.max(0,w.creativeMode?count:Math.min(count,Math.floor((PACK_CAPACITY-packWeight(w)+1e-7)/GEAR[kind].weight)));
}
export function takeLootChestReward(w:World,kind:LootChestRewardKind,requested=Number.MAX_SAFE_INTEGER){
 const state=w.lootChests?.[LOOT_CHEST_ID];
 if(!state||w.stationPanel!=='rare-cache'||w.phase==='over'||w.player.hp<=0||w.player.downedUntil||!lootChestInMenuRange(w))return 0;
 const count=canCarryLootChestReward(w,kind,requested);
 if(!count)return 0;
 const bag=gear(w).bag;bag[kind]=(bag[kind]??0)+count;
 state.contents![kind]=(state.contents![kind]??0)-count;
 if(kind==='repairHammer')w.tools.hammer=true;
 return count;
}
export function takeAllLootChestRewards(w:World){
 let taken=0;
 for(const reward of LOOT_CHEST_REWARDS)taken+=takeLootChestReward(w,reward.kind);
 return taken;
}
