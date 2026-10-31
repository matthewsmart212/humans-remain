import {isPickaxe} from './pickaxes';
import {isProvision} from './food-provisions-data';
import {isKnife,isSpear,isSword,KNIFE_COOLDOWN} from './player-gear';
import {facing,timeOf,type World} from './survival-engine';
import {axeProfile} from './axe-combat';
import {SPEAR_THRUST} from './spear-combat';
import {SWORD_THRUST} from './sword-combat';

// Distance, not global time: slow movement slows the gait and a blocked worker
// cannot keep marching. Dedicated planted art is never a frozen walking frame.
export const MELEE_ANIMATION_SECONDS=.36;
export function workerAnimation(w:World){
 const p=w.player,t=timeOf(w);
 if(p.equipped==='repairHammer'&&w.buildingRepair?.held&&!p.downedUntil)return {direction:p.direction,pose:(t-w.buildingRepair.started)%.65<.35?'punch' as const:'idle' as const};
 if(p.equipped==='repairHammer'&&!p.downedUntil&&t<(w.repairHammerUntil??0))return {direction:p.direction,pose:'punch' as const};
 if(w.bowShot&&!p.downedUntil)return {direction:w.bowShot.direction,pose:'idle' as const};
 if(w.swordThrust&&!p.downedUntil){const age=t-w.swordThrust.started;return {direction:facing(Math.cos(w.swordThrust.angle),Math.sin(w.swordThrust.angle)),pose:age>=SWORD_THRUST.extend&&age<SWORD_THRUST.retract?'punch' as const:p.moving?'walk' as const:'idle' as const}}
 if(w.spearThrust&&!p.downedUntil){const age=t-w.spearThrust.started;return {direction:facing(Math.cos(w.spearThrust.angle),Math.sin(w.spearThrust.angle)),pose:age>=SPEAR_THRUST.extend&&age<SPEAR_THRUST.retract?'punch' as const:'idle' as const}}
 if(w.axeSwing&&!p.downedUntil){const elapsed=t-w.axeSwing.started,spec=axeProfile(w.axeSwing);return {direction:facing(Math.cos(w.axeSwing.angle),Math.sin(w.axeSwing.angle)),pose:elapsed<.11||elapsed>spec.duration-.09?'idle' as const:'punch' as const}}
 const elapsed=t-(w.attackReady-(isKnife(p.equipped)?KNIFE_COOLDOWN:.52));
 if(!isPickaxe(p.equipped)&&!isProvision(p.equipped)&&p.equipped!=='bow'&&!isSword(p.equipped)&&!isSpear(p.equipped)&&p.equipped!=='repairHammer'&&p.equipped!=='torch'&&p.equipped!=='woodenAxe'&&p.equipped!=='axe'&&p.equipped!=='meal'&&p.equipped!=='rabbitMeal'&&p.equipped!=='venisonMeal'&&!p.downedUntil&&w.attackReady>0&&elapsed>=0&&elapsed<(isKnife(p.equipped) ? .22 : MELEE_ANIMATION_SECONDS)){
  return {direction:facing(Math.cos(w.attackAngle),Math.sin(w.attackAngle)),
   pose:elapsed>=.035&&elapsed<.23?'punch' as const:'idle' as const};
 }
 return {direction:p.direction,pose:p.moving?(p.sprinting?'run' as const:'walk' as const):'idle' as const};
}
