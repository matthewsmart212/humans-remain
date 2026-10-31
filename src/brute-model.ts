import type {Vec,Direction} from './survival-engine';
/** World units and simulation seconds. Rendering follows these same clocks. */
export const BRUTE={body:32,stride:40,windup:.36,jumpTrack:.22,jumpLead:.14,flight:.38,jumpHeight:92,jumpRange:310,jumpTrigger:340,smashRadius:160,smashDamage:34,recovery:.48,cooldown:2.25,
 meleeTrigger:110,meleeReach:126,meleeHalfArc:Math.PI*.35,meleeWindup:.22,meleeStrike:.17,meleeContact:.045,meleeRecovery:.3,meleeCooldown:.9,meleeDamage:18,
 hookWindup:.4,hookTrack:.27,hookRange:480,hookMin:105,hookSpeed:1550,hookRadius:13,hookReturn:1600,hookHeight:65,catchDamage:6,
 pullSpeed:700,pullTimeout:1.2,gripDistance:74,hold:.92,crush:.4,crushContact:.16,crushDamage:38,release:.24,
 escapeTaps:4,escapeDebounce:.14,escapeImmunity:2.5,fistMultiplier:.2,weaponMultiplier:.8,exposedMultiplier:1.25,poise:60,poiseWindow:1,stagger:.62,maxSpecial:1} as const;
export type BrutePhase='stalk'|'melee-windup'|'melee-strike'|'jump-windup'|'airborne'|'slam-recover'|'hook-windup'|'hook-out'|'hook-return'|'pull'|'hold'|'crush'|'release'|'stagger';
export type BruteState={phase:BrutePhase;since:number;direction:Direction;angle:number;next:'smash'|'grab';last?:'smash'|'grab'|'melee';recovery?:number;meleeAt?:number;sample?:Vec&{at:number};velocity?:Vec;resolved:boolean;poise:number;poiseAt:number;step:number;jump?:{from:Vec;to:Vec};aim?:Vec;hook?:{from:Vec;head:Vec;travelled:number};pullDistance?:number};
export type BruteGrab={enemyId:number;since:number;escape:number;lastEscapeAt:number;lift:number};
export const bruteActive=(b?:BruteState)=>!!b&&!['stalk','slam-recover','release','stagger'].includes(b.phase);
export const bruteCarrying=(b?:BruteState)=>!!b&&['hold','crush','release'].includes(b.phase);
export const bruteExposed=(b?:BruteState)=>!!b&&['slam-recover','release','stagger'].includes(b.phase);
