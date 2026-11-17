import {chestHinge,CHEST_DEPTH_SCALE} from './loot-chest-rig';
import {LOOT_CHEST_ID,LOOT_CHEST_OPEN_TICKS,LOOT_CHEST_OPEN_SPEED,lootChestFrame,lootChestOpened,lootChestRemaining} from './loot-chest';
import type {World} from './survival-engine';

// Reflected light follows the continuous inner face of the hinged lid.
export type LootChestLid=readonly [top:number,bottom:number,leftTop:number,rightTop:number,leftBottom:number,rightBottom:number];
export type LootChestFx={time:number;frame:number;lid:LootChestLid;open:number;charge:number;burst:number;revealAge:number;power:number;reduced:boolean;empty:boolean};
export const LOOT_CHEST_BURST_TICK=LOOT_CHEST_OPEN_TICKS/3; // First sprite with an actual gap under the lid.
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
/** One clock for the light, particles and sprite, including restored/co-op state.
 * Sampling an unopened chest never invents an opening, even late in a run. */
export function lootChestFx(w:World):LootChestFx{
 const opened=lootChestOpened(w),age=opened?Math.max(0,w.tick-w.lootChests![LOOT_CHEST_ID].openedAt):0;
 const reduced=!!w.weather?.reducedMotion,empty=opened&&lootChestRemaining(w)===0;
 const frame=lootChestFrame(w),hinge=chestHinge(w);
 const lid:LootChestLid=[hinge.front+10,hinge.back-2,-hinge.frontWidth+10,hinge.frontWidth-10,-hinge.backWidth+9,hinge.backWidth-9];
 // Opening particles and bloom use the animation clock too. Ambient shimmer
 // keeps normal game time, while the reveal follows the faster moving lid.
 const revealAge=opened?(age-LOOT_CHEST_BURST_TICK)*LOOT_CHEST_OPEN_SPEED:-1;
 return{
  time:reduced?0:w.tick/60,
  frame,lid,
  open:hinge.inside?clamp((hinge.back-hinge.front)/(75*CHEST_DEPTH_SCALE)):0,
  charge:!reduced&&opened?(age<LOOT_CHEST_BURST_TICK?Math.sin(age/LOOT_CHEST_BURST_TICK*Math.PI*.5)**2:Math.exp(-revealAge/14)):0,
  // One smooth flash as the seal breaks; never loop it on an opened save.
  burst:!reduced&&revealAge>=0?Math.exp(-revealAge/19)*clamp(revealAge/5):0,
  revealAge:reduced?-1:revealAge,
  power:empty?.26:1,
  reduced,empty,
 };
}
