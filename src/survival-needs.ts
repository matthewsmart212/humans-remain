/** Shared, fixed-step survival balance. Rates use real gameplay seconds. */
export const SURVIVAL_BALANCE={
 sprintPerSecond:5,recoveryPerSecond:14,recoveryDelay:1.1,exhaustionRelease:25,
 foodPerRecoveredStamina:.025,foodPerSecond:.05,waterPerSecond:.075,sprintWaterPerSecond:.065,
 healthPerSecond:.4,healthRecoveryDelay:10,healthyNeeds:35,
 foodPerRecoveredHealth:.12,waterPerRecoveredHealth:.06,
 starvationDamagePerSecond:.35,dehydrationDamagePerSecond:.6,
} as const;
export type SurvivalCondition={lastStaminaUse:number;healthRecoveryAt:number;exhausted:boolean;pendingDamage?:number;mealRecovery?:{remaining:number;rate:number}};
type Vitals={phase?:string;hunger:number;thirst:number;survival?:SurvivalCondition;player:{hp:number;stamina:number;sprinting:boolean;downedUntil:number;hurtUntil:number}};
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
function condition(w:Vitals):SurvivalCondition{return w.survival??=( {lastStaminaUse:-1e9,healthRecoveryAt:0,exhausted:false} )}
/** Prepared meals recover health using gameplay time, never an animation timer. */
export function startMealRecovery(w:Vitals,amount:number,seconds:number){
 if(amount<=0||seconds<=0||w.phase==='over'||w.player.hp<=0||w.player.downedUntil)return;
 const state=condition(w),remaining=Math.min(100-w.player.hp,(state.mealRecovery?.remaining??0)+amount);
 if(remaining>0)state.mealRecovery={remaining,rate:amount/seconds};
}
/** Only sprinting spends stamina; keep its recovery delay in one place. */
export function spendStamina(w:Vitals,amount:number,now:number){
 if(w.player.stamina+1e-8<amount)return false;
 w.player.stamina=clamp(w.player.stamina-amount);
 const state=condition(w);state.lastStaminaUse=now;state.healthRecoveryAt=now+SURVIVAL_BALANCE.healthRecoveryDelay;
 if(w.player.stamina<.001)state.exhausted=true;
 return true;
}
export function canSprint(w:Vitals){return w.player.stamina>0&&!w.survival?.exhausted}
export function spendSprintStamina(w:Vitals,dt:number,now:number){return spendStamina(w,Math.min(w.player.stamina,SURVIVAL_BALANCE.sprintPerSecond*dt),now)}
/** Called once per simulation step. The caller owns damage/downed handling. */
export function stepSurvivalNeeds(w:Vitals,dt:number,now:number){
 if(dt<=0||w.phase==='over'||w.player.hp<=0||w.player.downedUntil)return 0;
 const p=w.player,state=condition(w),b=SURVIVAL_BALANCE;
 if(state.mealRecovery){
  const recovery=state.mealRecovery,restored=Math.min(100-p.hp,recovery.remaining,recovery.rate*dt);
  p.hp=clamp(p.hp+restored);recovery.remaining-=restored;
  if(recovery.remaining<1e-7||p.hp>=100)delete state.mealRecovery;
 }
 w.hunger=clamp(w.hunger-b.foodPerSecond*dt);
 w.thirst=clamp(w.thirst-(b.waterPerSecond+(p.sprinting?b.sprintWaterPerSecond:0))*dt);
 if(p.hurtUntil>now)state.healthRecoveryAt=now+b.healthRecoveryDelay;
 if(!p.sprinting&&now-state.lastStaminaUse>=b.recoveryDelay){
  const nutrition=w.hunger<=0?.35:w.hunger<20?.65:1,hydration=w.thirst<=0?.5:w.thirst<20?.75:1;
  const restored=Math.min(100-p.stamina,b.recoveryPerSecond*nutrition*hydration*dt);
  p.stamina=clamp(p.stamina+restored);w.hunger=clamp(w.hunger-restored*b.foodPerRecoveredStamina);
 }
 if(p.stamina>=b.exhaustionRelease)state.exhausted=false;
 if(!p.sprinting&&now>=state.healthRecoveryAt&&now-state.lastStaminaUse>=b.recoveryDelay&&w.hunger>=b.healthyNeeds&&w.thirst>=b.healthyNeeds){
  const restored=Math.min(100-p.hp,b.healthPerSecond*dt);
  p.hp=clamp(p.hp+restored);w.hunger=clamp(w.hunger-restored*b.foodPerRecoveredHealth);w.thirst=clamp(w.thirst-restored*b.waterPerRecoveredHealth);
 }
 return ((w.hunger<=0?b.starvationDamagePerSecond:0)+(w.thirst<=0?b.dehydrationDamagePerSecond:0))*dt;
}
export function survivalWarning(w:Vitals){
 if(w.thirst<=0)return'Dehydrated · Health is falling';
 if(w.hunger<=0)return'Starving · Health is falling';
 if(w.thirst<=20)return'Low water';
 if(w.hunger<=20)return'Low food';
 if(w.survival?.exhausted)return'Out of breath';
 return'';
}
/** Ignore sub-percent simulation drift so a double tap cannot waste a meal. */
export const mealWouldHelp=(w:{hunger:number;player:{hp:number}})=>w.hunger<=99||w.player.hp<=99;
