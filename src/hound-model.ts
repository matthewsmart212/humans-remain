import type {Vec,Direction} from './survival-engine';
/** Seconds/world pixels. One committed rush, not a homing projectile. */
export const HOUND={body:20,stride:26,charge:.42,track:.2,lead:.4,flight:.42,height:58,pounceMin:130,trigger:400,range:480,overshoot:48,contact:37,pounceDamage:28,cooldown:3.1,recovery:.62,skid:.14,skidDistance:24,
 biteTrigger:82,biteReach:100,biteHalfArc:Math.PI*.31,biteWindup:.19,biteStrike:.16,biteContact:.045,biteRecovery:.25,biteCooldown:.95,biteDamage:15,stagger:.3,maxActive:2,exposedMultiplier:1.25} as const;
export type HoundPhase='stalk'|'charge'|'pounce'|'bite-windup'|'bite'|'recover'|'stagger';
export type HoundState={phase:HoundPhase;since:number;direction:Direction;angle:number;resolved:boolean;last?:'pounce'|'bite';pounce?:{from:Vec;to:Vec};biteAt?:number;recovery?:number;sample?:Vec&{at:number};velocity?:Vec};
export const houndActive=(h?:HoundState)=>!!h&&['charge','pounce','bite-windup','bite'].includes(h.phase);
