import type {World} from './survival-engine';
import {addInventory,canCarryCount,type InventoryKind} from './expedition-inventory';

/** A test cache above the campfire. Rewards remain INSIDE, never spawn as ground loot. */
export const LOOT_CHEST_ID='campfire-cache-01';
export const LOOT_CHEST_ATLAS='/survival/loot-chest-v1/open-atlas.webp';
export const LOOT_CHEST_IMAGE_KEY='lootChestAtlas';
export const LOOT_CHEST_FRAMES=6;
export const LOOT_CHEST_OPEN_TICKS=42;
/** Show the last pose briefly before presenting the loot menu. */
export const LOOT_CHEST_REVEAL_HOLD_TICKS=8;
export const LOOT_CHEST_REWARDS=[
 {kind:'scrap',name:'Metal scrap',amount:8,artId:'scrap',imageKey:'cacheScrap',description:'Reclaimed crafting material'},
 {kind:'ironIngot',name:'Iron ingots',amount:2,artId:'ironIngot',imageKey:'cacheIngot',description:'Refined metal for upgrades'},
 {kind:'pallets',name:'Logs',amount:4,artId:'logs',imageKey:'cacheLogs',description:'Fuel and camp repairs'},
 {kind:'energyBar',name:'Energy bars',amount:2,artId:'energyBar',imageKey:'cacheEnergy',description:'Emergency expedition rations'},
] as const;
export type LootChestRewardKind=typeof LOOT_CHEST_REWARDS[number]['kind'];
export type LootChestContents=Partial<Record<LootChestRewardKind,number>>;
export type LootChestState=Record<string,{openedAt:number;contents?:LootChestContents;menuShown?:boolean}>;
type ChestWorld=Pick<World,'layout'|'scene'|'camp'|'player'|'lootChests'|'tick'|'phase'|'stationPanel'|'rareCacheMenuAt'>;
export function campLootChest(w:ChestWorld){
 if(!w.layout||w.scene||w.camp.hearth.x<0||w.camp.hearth.y<0)return null;
 return {id:LOOT_CHEST_ID,x:w.camp.hearth.x,y:w.camp.hearth.y-285};
}
export const lootChestOpened=(w:ChestWorld,id=LOOT_CHEST_ID)=>w.lootChests?.[id]!==undefined;
export const lootChestContents=(w:ChestWorld,id=LOOT_CHEST_ID):LootChestContents=>w.lootChests?.[id]?.contents??{};
export const lootChestRemaining=(w:ChestWorld,id=LOOT_CHEST_ID)=>LOOT_CHEST_REWARDS.reduce((sum,reward)=>sum+(lootChestContents(w,id)[reward.kind]??0),0);
export function lootChestFrame(w:ChestWorld,id=LOOT_CHEST_ID){
 const state=w.lootChests?.[id];if(!state)return 0;
 const elapsed=Math.max(0,w.tick-state.openedAt);
 return Math.min(LOOT_CHEST_FRAMES-1,Math.floor(elapsed/LOOT_CHEST_OPEN_TICKS*(LOOT_CHEST_FRAMES-1)+.001));
}
export function lootChestBlocked(w:ChestWorld,x:number,y:number,r:number){
 const p=campLootChest(w);return !!p&&Math.abs(x-p.x)<49+r&&Math.abs(y-(p.y-5))<21+r;
}
export function lootChestInMenuRange(w:ChestWorld){const p=campLootChest(w);return !!p&&Math.hypot(w.player.x-p.x,w.player.y-p.y)<215}
export function nearbyLootChest(w:ChestWorld){
 const p=campLootChest(w);
 return p&&w.rareCacheMenuAt===undefined&&Math.hypot(w.player.x-p.x,w.player.y-p.y)<150?p:null;
}
/** Initiate the reveal once; the panel appears after the 42-tick opening animation. */
export function openLootChest(w:World,id=LOOT_CHEST_ID){
 const p=nearbyLootChest(w);
 if(!p||p.id!==id||w.phase==='over'||w.player.hp<=0||w.player.downedUntil||w.stationPanel)return false;
 if(!lootChestOpened(w,id)){
  (w.lootChests??={})[id]={
   openedAt:w.tick,
   menuShown:false,
   contents:Object.fromEntries(LOOT_CHEST_REWARDS.map(reward=>[reward.kind,reward.amount])) as LootChestContents,
  };
  w.rareCacheMenuAt=w.tick+LOOT_CHEST_OPEN_TICKS+LOOT_CHEST_REVEAL_HOLD_TICKS;
  w.notice='LOOT CHEST · OPENING';w.noticeUntil=w.tick/60+1.8;
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
/** Take only what fits; the remainder stays inside for another visit. */
export function takeLootChestReward(w:World,kind:LootChestRewardKind,requested=Number.MAX_SAFE_INTEGER){
 const state=w.lootChests?.[LOOT_CHEST_ID];
 if(!state||w.stationPanel!=='rare-cache'||w.phase==='over'||w.player.hp<=0||w.player.downedUntil)return 0;
 const remaining=state.contents?.[kind]??0;
 if(remaining<=0||!Number.isFinite(requested)||requested<=0)return 0;
 const amount=Math.min(remaining,Math.floor(requested),canCarryCount(w,kind as InventoryKind,remaining));
 if(!amount)return 0;
 const taken=addInventory(w,kind as InventoryKind,amount);
 state.contents![kind]=remaining-taken;
 return taken;
}
export function takeAllLootChestRewards(w:World){
 let taken=0;
 for(const reward of LOOT_CHEST_REWARDS)taken+=takeLootChestReward(w,reward.kind);
 return taken;
}
