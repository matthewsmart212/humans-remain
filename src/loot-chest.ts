import {withinActionReach,type World} from './survival-engine';
import {hitCollider,type Collider} from './camp-collision';
import {ABANDONED_CAMP_LATCH,CAMP_CHEST_OPEN_TICKS} from './abandoned-camp-art';
import {placedLootChestId} from './chest-animation';
import {layoutViews} from './layout-views';
import {placementArtPoint} from './world-layout';
import {PROVISIONS,isProvision} from './food-provisions-data';
import {PACK_CAPACITY,packWeight,canCarryCount,addInventory} from './expedition-inventory';
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
const ABANDONED_CAMP_REWARDS=[
 {kind:'beans',amount:2,...PROVISIONS.beans},
 {kind:'energyBar',amount:1,...PROVISIONS.energyBar},
] as const;
export const lootChestRewards=(id=LOOT_CHEST_ID)=>id===LOOT_CHEST_ID?LOOT_CHEST_REWARDS:ABANDONED_CAMP_REWARDS;
export const lootChestName=(id=LOOT_CHEST_ID)=>id===LOOT_CHEST_ID?'Loot chest':'Wooden chest';
export type LootChestRewardKind=ReturnType<typeof lootChestRewards>[number]['kind'];
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
export function lootChestRemaining(w:ChestWorld,id=LOOT_CHEST_ID){
 const contents=lootChestContents(w,id);
 return lootChestRewards(id).reduce((sum,reward)=>sum+(contents[reward.kind]??0),0);
}
export function lootChestFrame(w:ChestWorld,id=LOOT_CHEST_ID){
 const state=w.lootChests?.[id];if(!state)return 0;
 const elapsed=Math.max(0,w.tick-state.openedAt);
 return Math.min(LOOT_CHEST_FRAMES-1,Math.floor(elapsed/LOOT_CHEST_OPEN_TICKS*(LOOT_CHEST_FRAMES-1)+.001));
}
// Ground contacts of the stationary case and skids, in rendered world units
// relative to the chest anchor. The raised lid and earth decal have no feet.
const caseFoot={
 id:LOOT_CHEST_ID,shape:'polygon',x:0,y:-15,hw:84,hh:16,
 points:[[-82,-16],[-67,-30],[80,-30],[83,-18],[68,0],[43,1],[-78,1]],
} satisfies Collider;
export function lootChestBlocked(w:ChestWorld,x:number,y:number,r:number){
 const chest=campLootChest(w);
 if(!chest)return false;
 const dx=x-chest.x,dy=y-chest.y;
 if(Math.abs(dx-caseFoot.x)>caseFoot.hw+r||Math.abs(dy-caseFoot.y)>caseFoot.hh+r)return false;
 return hitCollider(caseFoot,dx,dy,r);
}
type ChestLatch={id:string;x:number;y:number};
function accessibleLootChest(w:World,id?:string):ChestLatch|null{
 const camp=campLootChest(w);
 const latches=layoutViews(w.layout).lootCamps.map(p=>({
  id:placedLootChestId(p.id),...placementArtPoint(p,...ABANDONED_CAMP_LATCH),
 }));
 if(camp)latches.push({...camp,y:camp.y+28});
 let nearest:ChestLatch|null=null,bestDistance=Infinity;
 for(const latch of latches){
  if(id!==undefined&&id!==latch.id)continue;
  const distance=Math.hypot(w.player.x-latch.x,w.player.y-latch.y);
  if(distance<bestDistance&&withinActionReach(w,latch)){nearest=latch;bestDistance=distance}
 }
 return nearest;
}
export const lootChestInMenuRange=(w:World,id=w.lootChestId??LOOT_CHEST_ID)=>!!accessibleLootChest(w,id);
export const nearbyLootChest=(w:World)=>w.rareCacheMenuAt===undefined?accessibleLootChest(w):null;
const revealTicks=(id:string)=>id===LOOT_CHEST_ID?LOOT_CHEST_OPEN_TICKS+LOOT_CHEST_REVEAL_HOLD_TICKS:CAMP_CHEST_OPEN_TICKS+12;
function showChestContents(w:World,id:string){
 w.lootChests![id].menuShown=true;
 w.lootChestId=id;
 w.rareCacheMenuAt=undefined;
 w.stationPanel='rare-cache';
}
/** The wooden lid opens directly. Let the player see it before presenting loot. */
export function openLootChest(w:World,id=LOOT_CHEST_ID){
 const p=nearbyLootChest(w);
 if(!p||p.id!==id||w.phase==='over'||w.player.hp<=0||w.player.downedUntil||w.stationPanel)return false;
 w.lootChestId=id;
 const state=(w.lootChests??={})[id]??={
  openedAt:w.tick,menuShown:false,rewardVersion:2,
  contents:Object.fromEntries(lootChestRewards(id).map(reward=>[reward.kind,reward.amount])),
 };
 const readyAt=state.openedAt+revealTicks(id);
 if(!state.menuShown&&w.tick<readyAt){
  w.rareCacheMenuAt=readyAt;
  w.notice='LOOT CHEST · OPENING';w.noticeUntil=readyAt/60;
 }else showChestContents(w,id);
 return true;
}
/** The reveal deadline comes from saved state, including a save made while opening. */
export function stepLootChest(w:World){
 if(!w.lootChests||w.phase==='over'||w.player.hp<=0||w.player.downedUntil){w.rareCacheMenuAt=undefined;return}
 if(w.rareCacheMenuAt!==undefined&&w.tick<w.rareCacheMenuAt)return;
 w.rareCacheMenuAt=undefined;
 if(w.stationPanel)return;
 for(const id in w.lootChests){
  const state=w.lootChests[id];
  if(!state.menuShown&&w.tick>=state.openedAt+revealTicks(id)&&lootChestInMenuRange(w,id)){
   showChestContents(w,id);return;
  }
 }
}
/** Transfer supplies through the existing backpack weight limit. */
export function canCarryLootChestReward(w:World,kind:LootChestRewardKind,requested=1){
 const remaining=lootChestContents(w,w.lootChestId)[kind]??0;
 if(!Number.isFinite(requested)||requested<=0||remaining<=0)return 0;
 const count=Math.min(remaining,Math.floor(requested));
 if(isProvision(kind))return canCarryCount(w,kind,count);
 return Math.max(0,w.creativeMode?count:Math.min(count,Math.floor((PACK_CAPACITY-packWeight(w)+1e-7)/GEAR[kind].weight)));
}
export function takeLootChestReward(w:World,kind:LootChestRewardKind,requested=Number.MAX_SAFE_INTEGER){
 const state=w.lootChests?.[w.lootChestId??LOOT_CHEST_ID];
 if(!state||w.stationPanel!=='rare-cache'||w.phase==='over'||w.player.hp<=0||w.player.downedUntil||!lootChestInMenuRange(w))return 0;
 const count=canCarryLootChestReward(w,kind,requested);
 if(!count)return 0;
 if(isProvision(kind))addInventory(w,kind,count);
 else{
  const bag=gear(w).bag;bag[kind]=(bag[kind]??0)+count;
 }
 state.contents![kind]=(state.contents![kind]??0)-count;
 if(kind==='repairHammer')w.tools.hammer=true;
 return count;
}
export function takeAllLootChestRewards(w:World){
 let taken=0;
 for(const reward of lootChestRewards(w.lootChestId))taken+=takeLootChestReward(w,reward.kind);
 return taken;
}
