import {LOOT_CHEST_ID,lootChestFrame,lootChestOpened,lootChestRemaining} from './loot-chest';
import type {World} from './survival-engine';

// Top/bottom and left/right edges of the inside face, measured in each actual
// atlas pose. A raised lid catches the light instead of hiding the whole beam.
export type LootChestLid=readonly [top:number,bottom:number,leftTop:number,rightTop:number,leftBottom:number,rightBottom:number];
const sourceLids:readonly LootChestLid[]=[
 [0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],
 [167,181,70,379,88,381],
 [143,174,69,374,94,391],
 [111,170,60,374,98,394],
 [101,170,78,372,103,390],
 [74,168,100,363,111,385],
 [56,168,99,369,101,373],
 [56,168,99,369,101,373],
];
const lids=sourceLids.map(([top,bottom,leftTop,rightTop,leftBottom,rightBottom])=>[
 top*213/390-178,bottom*213/390-178,
 leftTop*240/440-120,rightTop*240/440-120,
 leftBottom*240/440-120,rightBottom*240/440-120,
] as const);
export type LootChestFx={time:number;frame:number;lid:LootChestLid;open:number;charge:number;burst:number;revealAge:number;power:number;reduced:boolean;empty:boolean};
export const LOOT_CHEST_BURST_TICK=36; // First sprite with an actual gap under the lid.
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
/** One clock for the light, particles and sprite, including restored/co-op state.
 * Sampling an unopened chest never invents an opening, even late in a run. */
export function lootChestFx(w:World):LootChestFx{
 const opened=lootChestOpened(w),age=opened?Math.max(0,w.tick-w.lootChests![LOOT_CHEST_ID].openedAt):0;
 const reduced=!!w.weather?.reducedMotion,empty=opened&&lootChestRemaining(w)===0;
 const frame=lootChestFrame(w);
 const revealAge=opened?age-LOOT_CHEST_BURST_TICK:-1;
 return{
  time:reduced?0:w.tick/60,
  frame,lid:lids[frame],
  open:opened?clamp((frame-2)/7):0,
  charge:!reduced&&opened?(age<LOOT_CHEST_BURST_TICK?Math.sin(age/LOOT_CHEST_BURST_TICK*Math.PI*.5)**2:Math.exp(-revealAge/14)):0,
  // One smooth flash as the seal breaks; never loop it on an opened save.
  burst:!reduced&&revealAge>=0?Math.exp(-revealAge/19)*clamp(revealAge/5):0,
  revealAge:reduced?-1:revealAge,
  power:empty?.26:1,
  reduced,empty,
 };
}
