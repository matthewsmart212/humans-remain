import type {World} from './survival-engine';

/** The test chest is deliberately separate from authored building placement. */
export const LOOT_CHEST_ID='campfire-cache-01';
export const LOOT_CHEST_ATLAS='/survival/loot-chest-v1/open-atlas.webp';
export const LOOT_CHEST_IMAGE_KEY='lootChestAtlas';
export const LOOT_CHEST_FRAMES=6;
export const LOOT_CHEST_OPEN_TICKS=42;
export type LootChestState=Record<string,{openedAt:number}>;
type ChestWorld=Pick<World,'layout'|'scene'|'camp'|'player'|'lootChests'|'tick'|'loot'|'serial'|'notice'|'noticeUntil'|'phase'>;
export function campLootChest(w:ChestWorld){
 if(!w.layout||w.scene||w.camp.hearth.x<0||w.camp.hearth.y<0)return null;
 return {id:LOOT_CHEST_ID,x:w.camp.hearth.x,y:w.camp.hearth.y-285};
}
export const lootChestOpened=(w:ChestWorld,id=LOOT_CHEST_ID)=>w.lootChests?.[id]!==undefined;
export function lootChestFrame(w:ChestWorld,id=LOOT_CHEST_ID){
 const state=w.lootChests?.[id];if(!state)return 0;
 const elapsed=Math.max(0,w.tick-state.openedAt);
 return Math.min(LOOT_CHEST_FRAMES-1,Math.floor(elapsed/LOOT_CHEST_OPEN_TICKS*(LOOT_CHEST_FRAMES-1)+.001));
}
export function lootChestBlocked(w:ChestWorld,x:number,y:number,r:number){
 const p=campLootChest(w);return !!p&&Math.abs(x-p.x)<49+r&&Math.abs(y-(p.y-5))<21+r;
}
export function nearbyLootChest(w:ChestWorld){
 const p=campLootChest(w);return p&&!lootChestOpened(w,p.id)&&Math.hypot(w.player.x-p.x,w.player.y-p.y)<150?p:null;
}
/** One reward drop per run: the opened flag and uncollected pickups save naturally. */
export function openLootChest(w:World,id=LOOT_CHEST_ID){
 const p=nearbyLootChest(w);
 if(!p||p.id!==id||w.phase==='over'||w.player.hp<=0||w.player.downedUntil||w.stationPanel)return false;
 (w.lootChests??={})[p.id]={openedAt:w.tick};
 const born=w.tick/60;
 const rewards=[
  {kind:'scrap' as const,amount:8,dx:-67,dy:49},
  {kind:'ironIngot' as const,amount:2,dx:-23,dy:75},
  {kind:'pallets' as const,amount:4,dx:31,dy:76},
  {kind:'energyBar' as const,amount:2,dx:73,dy:52},
 ];
 for(const reward of rewards)w.loot.push({
  x:p.x+reward.dx,y:p.y+reward.dy,id:w.serial++,kind:reward.kind,amount:reward.amount,
  flight:{from:{x:p.x,y:p.y-32},born,lands:born+.75},
 });
 w.notice='RARE CACHE OPENED · Collect your supplies';w.noticeUntil=born+3.5;
 return true;
}
