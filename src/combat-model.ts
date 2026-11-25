import {BRUTE} from './brute-model';
import {HOUND} from './hound-model';
import type {Direction,World} from './survival-engine';

/** Shared by simulation, sprite selection and the ground warning. Seconds and
 * world pixels only — never display frames or the device's refresh rate. */
export const WALKER_ATTACK={windup:.294,strike:.18,contact:.055,recovery:.42,trigger:82,reach:106,halfArc:Math.PI*.30,stagger:.26} as const;
/** Bare hands glance off armour without cancelling a committed punch. */
export const WALKER_ARMOUR={fistDamageMultiplier:.35,fistPush:2} as const;
export const COMBAT_DODGE={duration:.24,invulnerable:.18,cooldown:1.65,speed:650} as const;
export type WalkerMotion={
 phase:'chase'|'windup'|'strike'|'recover'|'stagger'|'arming';
 since:number;
 direction:Direction;
 angle:number;
 resolved:boolean;
 hitAt:number;
 hitAngle:number;
 healthFrom:number;
};
export type CombatStats={landed:number;damageDealt:number;damageTaken:number;dodges:number;evades:number;interrupts:number};
export const emptyCombatStats=():CombatStats=>({landed:0,damageDealt:0,damageTaken:0,dodges:0,evades:0,interrupts:0});
export const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

/** Field controls and in-world conversations yield to the same danger. */
export function nearbyCombatThreat(w:World){
 const p=w.player;
 return w.enemies.some(e=>e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<(e.kind==='iron-brute'?BRUTE.hookRange+80:e.kind==='scrap-hound'?HOUND.trigger+80:280))
  ||w.animals.some(a=>a.hp>0&&(a.deer?.retaliation||a.predator?.engaged)&&Math.hypot(a.x-p.x,a.y-p.y)<500);
}
