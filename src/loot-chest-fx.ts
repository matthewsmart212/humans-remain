import {LOOT_CHEST_ID,lootChestFrame,lootChestOpened,lootChestRemaining} from './loot-chest';
import type {World} from './survival-engine';

export type LootChestFx={time:number;open:number;charge:number;burst:number;revealAge:number;power:number;reduced:boolean;empty:boolean};
export const LOOT_CHEST_BURST_TICK=36; // First sprite with an actual gap under the lid.
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
/** One clock for the light, particles and sprite, including restored/co-op state.
 * Sampling an unopened chest never invents an opening, even late in a run. */
export function lootChestFx(w:World):LootChestFx{
 const opened=lootChestOpened(w),age=opened?Math.max(0,w.tick-w.lootChests![LOOT_CHEST_ID].openedAt):0;
 const reduced=!!w.weather?.reducedMotion,empty=opened&&lootChestRemaining(w)===0;
 const revealAge=opened?age-LOOT_CHEST_BURST_TICK:-1;
 return{
  time:reduced?0:w.tick/60,
  open:opened?clamp((lootChestFrame(w)-2)/7):0,
  charge:!reduced&&opened?(age<LOOT_CHEST_BURST_TICK?Math.sin(age/LOOT_CHEST_BURST_TICK*Math.PI*.5)**2:Math.exp(-revealAge/14)):0,
  // One smooth flash as the seal breaks; never loop it on an opened save.
  burst:!reduced&&revealAge>=0?Math.exp(-revealAge/19)*clamp(revealAge/5):0,
  revealAge:reduced?-1:revealAge,
  power:empty?.26:1,
  reduced,empty,
 };
}
