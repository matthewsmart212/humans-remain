import {STEP,timeOf,distance,facing,lineClear,worldBlocked,moveBody,damagePlayer,DIRECTION_ANGLES,type World,type Enemy,type Vec} from './survival-engine';
import {BRUTE,bruteActive,type BrutePhase,type BruteState} from './brute-model';
import {releaseBruteGrab} from './brute-control';
import {bruteHand,bruteGrip} from './brute-sprites';
import {COMBAT_DODGE,angleDelta} from './combat-model';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function initBrute(e:Enemy,t:number):BruteState{return e.brute??(e.brute={phase:'stalk',since:t,direction:e.motion?.direction??'down',angle:e.motion?.angle??0,next:'smash',resolved:false,poise:0,poiseAt:-10,step:0})}
function phase(e:Enemy,next:BrutePhase,t:number){const b=e.brute!;b.phase=next;b.since=t;b.resolved=false;if(e.motion){e.motion.phase=next==='stalk'?'chase':next==='stagger'?'stagger':next.endsWith('windup')?'windup':['airborne','hook-out','crush','melee-strike'].includes(next)?'strike':'recover';e.motion.since=t;e.motion.direction=b.direction;e.motion.angle=b.angle;e.motion.resolved=false}}
function fx(w:World,e:Enemy,type:'brute-windup'|'brute-slam'|'brute-hook'|'brute-catch'|'brute-crush'|'brute-step',extra:Partial<World['effects'][number]>={}){w.effects.push({x:e.x,y:e.y,id:w.serial++,born:timeOf(w),type,label:'',enemyKind:'iron-brute',direction:e.brute!.direction,angle:e.brute!.angle,...extra})}
function evading(w:World){return !!w.dodge&&timeOf(w)-w.dodge.started<COMBAT_DODGE.invulnerable}
function evade(w:World){if(w.combatStats)w.combatStats.evades++;w.effects.push({x:w.player.x,y:w.player.y,id:w.serial++,born:timeOf(w),type:'evade',label:'EVADE'})}
function finish(w:World,e:Enemy,t:number){if(w.bruteGrab?.enemyId===e.id)releaseBruteGrab(w);const b=e.brute!;b.hook=undefined;b.jump=undefined;b.recovery=BRUTE.recovery;phase(e,'slam-recover',t)}
function samplePlayer(w:World,b:BruteState){
 const p=w.player,t=timeOf(w),old=b.sample,dt=old?t-old.at:0;b.sample={x:p.x,y:p.y,at:t};
 if(!old||dt<=0||dt>.1){b.velocity={x:0,y:0};return}
 const dx=(p.x-old.x)/dt,dy=(p.y-old.y)/dt;
 if(w.bruteGrab||Math.hypot(dx,dy)>520){b.velocity={x:0,y:0};return}
 b.velocity={x:(b.velocity?.x??0)*.4+dx*.6,y:(b.velocity?.y??0)*.4+dy*.6};
}
function lead(w:World,b:BruteState,seconds:number){return{x:w.player.x+(b.velocity?.x??0)*seconds,y:w.player.y+(b.velocity?.y??0)*seconds}}
function aimHook(w:World,e:Enemy){const b=e.brute!,hand=bruteHand(e,9),flight=Math.min(.24,Math.hypot(w.player.x-hand.x,w.player.y-hand.y-BRUTE.hookHeight)/BRUTE.hookSpeed);b.aim=lead(w,b,BRUTE.hookWindup-BRUTE.hookTrack+flight);b.direction=facing(b.aim.x-e.x,b.aim.y-e.y);b.angle=Math.atan2(b.aim.y-e.y,b.aim.x-e.x)}
export function bruteLanding(w:World,e:Enemy,target:Vec){
 const d=distance(e,target),k=Math.min(1,BRUTE.jumpRange/Math.max(1,d)),to={x:e.x+(target.x-e.x)*k,y:e.y+(target.y-e.y)*k};
 // A leap may not bypass an authored wall, water or unloaded terrain.
 const n=Math.max(1,Math.ceil(distance(e,to)/8));for(let i=0;i<=n;i++)if(worldBlocked(w,e.x+(to.x-e.x)*i/n,e.y+(to.y-e.y)*i/n,BRUTE.body))return;
 return to;
}
function capture(w:World,e:Enemy){
 const b=e.brute!,t=timeOf(w),p=w.player;w.bruteGrab={enemyId:e.id,since:t,escape:0,lastEscapeAt:-10,lift:0};b.pullDistance=distance(e,p);
 w.dodge=undefined;w.axeSwing=undefined;w.spearThrust=undefined;w.swordThrust=undefined;w.bowShot=undefined;w.attackUntil=0;w.attackQueuedUntil=undefined;w.stationPanel=undefined;
 p.moving=false;p.sprinting=false;p.walkBlend=0;p.runBlend=0;p.direction=facing(-Math.cos(b.angle),-Math.sin(b.angle));
 damagePlayer(w,BRUTE.catchDamage,false,e);if(p.hp<=0){finish(w,e,t);return}phase(e,'pull',t);fx(w,e,'brute-catch',{x:p.x,y:p.y});w.notice='GRABBED · TAP BREAK FREE';w.noticeUntil=t+2;
}
/** Owns attacks; false delegates distant stalking to the shared pathfinder. */
export function stepIronBrute(w:World,e:Enemy){
 const t=timeOf(w),p=w.player,b=initBrute(e,t),d=distance(e,p);e.moving=false;
 samplePlayer(w,b);
 if(p.downedUntil||p.hp<=0||w.phase==='over'){if(w.bruteGrab?.enemyId===e.id)releaseBruteGrab(w,'',false);b.hook=undefined;b.jump=undefined;phase(e,'stalk',t);return true}
 const age=t-b.since;
 if(b.phase==='melee-windup'){if(age>=BRUTE.meleeWindup)phase(e,'melee-strike',b.since+BRUTE.meleeWindup);return true}
 if(b.phase==='melee-strike'){
  if(!b.resolved&&age>=BRUTE.meleeContact){b.resolved=true;const hits=d<=BRUTE.meleeReach&&Math.abs(angleDelta(Math.atan2(p.y-e.y,p.x-e.x),b.angle))<=BRUTE.meleeHalfArc&&lineClear(e,p,w);let landed=false;if(hits){if(evading(w))evade(w);else if(damagePlayer(w,BRUTE.meleeDamage,false,e)){landed=true;moveBody(w,p,Math.cos(b.angle)*18,Math.sin(b.angle)*18)}}fx(w,e,'brute-slam',{x:e.x+Math.cos(b.angle)*65,y:e.y+Math.sin(b.angle)*65,radius:62,amount:landed?1:0})}
  if(age>=BRUTE.meleeStrike){b.recovery=BRUTE.meleeRecovery;phase(e,'slam-recover',t)}return true;
 }
 if(b.phase==='stagger'){if(age>=BRUTE.stagger){b.recovery=BRUTE.recovery;phase(e,'slam-recover',t-BRUTE.recovery+.3)}return true}
 if(b.phase==='jump-windup'){
  if(age<BRUTE.jumpTrack&&b.jump){const landing=bruteLanding(w,e,lead(w,b,BRUTE.jumpLead));if(landing){b.jump.to=landing;b.angle=Math.atan2(landing.y-e.y,landing.x-e.x);b.direction=facing(landing.x-e.x,landing.y-e.y)}}
  if(age>=BRUTE.windup){phase(e,'airborne',b.since+BRUTE.windup)}return true;
 }
 if(b.phase==='airborne'){
  const jump=b.jump;if(!jump){finish(w,e,t);return true}const progress=clamp(age/BRUTE.flight),desired={x:jump.from.x+(jump.to.x-jump.from.x)*progress,y:jump.from.y+(jump.to.y-jump.from.y)*progress};
  moveBody(w,e,desired.x-e.x,desired.y-e.y,BRUTE.body);
  if(distance(e,desired)>5){fx(w,e,'brute-slam',{amount:0,radius:BRUTE.smashRadius*.5,heavy:true});finish(w,e,t);return true}
  if(age>=BRUTE.flight){
   if(!b.resolved){b.resolved=true;const inBlast=distance(e,p)<=BRUTE.smashRadius&&lineClear(e,p,w);if(inBlast){if(evading(w))evade(w);else if(damagePlayer(w,Math.round(BRUTE.smashDamage*(1-.25*distance(e,p)/BRUTE.smashRadius)),false,e)){const a=Math.atan2(p.y-e.y,p.x-e.x);moveBody(w,p,Math.cos(a)*34,Math.sin(a)*34)}}fx(w,e,'brute-slam',{radius:BRUTE.smashRadius,amount:1,heavy:true});if(d<700&&!w.weather?.reducedMotion)w.shakeUntil=Math.max(w.shakeUntil,t+.32)}
   b.jump=undefined;b.recovery=BRUTE.recovery;phase(e,'slam-recover',t);
  }return true;
 }
 if(b.phase==='hook-windup'){
  if(age<BRUTE.hookTrack)aimHook(w,e);
  if(age>=BRUTE.hookWindup){const hand=bruteHand(e,9),from={x:hand.x,y:hand.y+BRUTE.hookHeight},aim=b.aim??p;b.angle=Math.atan2(aim.y-from.y,aim.x-from.x);b.hook={from,head:{...from},travelled:0};phase(e,'hook-out',t);fx(w,e,'brute-hook')}
  return true;
 }
 if(b.phase==='hook-out'){
  const hook=b.hook;if(!hook){finish(w,e,t);return true}const travel=Math.min(BRUTE.hookSpeed*STEP,BRUTE.hookRange-hook.travelled),steps=Math.max(1,Math.ceil(travel/6));
  if(!lineClear(hook.from,hook.head,w)){phase(e,'hook-return',t);return true}
  for(let i=0;i<steps;i++){
   const next={x:hook.head.x+Math.cos(b.angle)*travel/steps,y:hook.head.y+Math.sin(b.angle)*travel/steps};
   if(worldBlocked(w,next.x,next.y,BRUTE.hookRadius)){phase(e,'hook-return',t);return true}hook.head=next;hook.travelled+=travel/steps;
   if(distance(hook.head,p)<=BRUTE.hookRadius+18&&lineClear(hook.head,p,w)&&!w.bruteGrab&&t>=(w.bruteEscapeUntil??0)){
    if(evading(w)){evade(w);phase(e,'hook-return',t);return true}capture(w,e);return true;
   }
  }
  if(hook.travelled>=BRUTE.hookRange-.01)phase(e,'hook-return',t);return true;
 }
 if(b.phase==='hook-return'){
  const hook=b.hook;if(!hook){finish(w,e,t);return true}const hand=bruteHand(e,9),target={x:hand.x,y:hand.y+BRUTE.hookHeight},gap=distance(hook.head,target),step=BRUTE.hookReturn*STEP;
  if(gap<=step){finish(w,e,t);return true}hook.head.x+=(target.x-hook.head.x)/gap*step;hook.head.y+=(target.y-hook.head.y)/gap*step;return true;
 }
 if(b.phase==='pull'){
  if(w.bruteGrab?.enemyId!==e.id){finish(w,e,t);return true}
  const goal={x:e.x+Math.cos(b.angle)*BRUTE.gripDistance,y:e.y+Math.sin(b.angle)*BRUTE.gripDistance},gap=distance(p,goal),before={x:p.x,y:p.y},step=Math.min(gap,BRUTE.pullSpeed*STEP);
  if(!lineClear(e,p,w)||worldBlocked(w,goal.x,goal.y,19)){releaseBruteGrab(w,'CABLE BROKEN');finish(w,e,t);return true}
  if(gap>2)moveBody(w,p,(goal.x-p.x)/gap*step,(goal.y-p.y)/gap*step);
  w.bruteGrab.lift=28*clamp(1-distance(p,goal)/Math.max(1,(b.pullDistance??d)-BRUTE.gripDistance));
  if((gap>8&&distance(before,p)<step*.25)||age>=BRUTE.pullTimeout){releaseBruteGrab(w,'CABLE BROKEN');finish(w,e,t);return true}
  if(distance(p,goal)<4){phase(e,'hold',t);w.bruteGrab.lift=28}return true;
 }
 if(b.phase==='hold'){
  if(w.bruteGrab?.enemyId!==e.id){finish(w,e,t);return true}if(age>=BRUTE.hold)phase(e,'crush',t);return true;
 }
 if(b.phase==='crush'){
  if(w.bruteGrab?.enemyId!==e.id){finish(w,e,t);return true}
  if(!b.resolved&&age>=BRUTE.crushContact){b.resolved=true;damagePlayer(w,BRUTE.crushDamage,false,e);fx(w,e,'brute-crush',{...bruteGrip(e),amount:BRUTE.crushDamage});if(!w.weather?.reducedMotion)w.shakeUntil=Math.max(w.shakeUntil,t+.26)}
  if(age>=BRUTE.crush)phase(e,'release',t);return true;
 }
 if(b.phase==='release'){
  if(w.bruteGrab?.enemyId===e.id)w.bruteGrab.lift=28*(1-clamp(age/BRUTE.release));
  if(age>=BRUTE.release){releaseBruteGrab(w);finish(w,e,t)}return true;
 }
 if(b.phase==='slam-recover'){if(age<(b.recovery??BRUTE.recovery))return true;phase(e,'stalk',t)}
 // Synchronise facing after shared, distance-driven stalking.
 if(e.motion){b.direction=e.motion.direction;b.angle=e.motion.angle}
 const footstep=Math.floor((e.walkDistance??0)/BRUTE.stride);if(footstep>b.step){b.step=footstep;fx(w,e,'brute-step')}
 const admitted=w.enemies.filter(other=>other!==e&&other.hp>0&&other.kind==='iron-brute'&&bruteActive(other.brute)).length<BRUTE.maxSpecial;
 if(d<=BRUTE.meleeTrigger&&t>=(b.meleeAt??e.attackAt)&&admitted&&!w.bruteGrab&&lineClear(e,p,w)){
  b.direction=facing(p.x-e.x,p.y-e.y);b.angle=Math.atan2(p.y-e.y,p.x-e.x);b.last='melee';b.meleeAt=t+BRUTE.meleeCooldown;phase(e,'melee-windup',t);fx(w,e,'brute-windup',{amount:.5});return true;
 }
 if(t>=e.attackAt&&admitted&&!w.bruteGrab&&lineClear(e,p,w)){
  const landing=d<=BRUTE.jumpTrigger?bruteLanding(w,e,lead(w,b,BRUTE.jumpLead)):undefined,hook=d>=BRUTE.hookMin&&d<=BRUTE.hookRange&&(b.next==='grab'||d>BRUTE.jumpTrigger||!landing);
  b.direction=facing(p.x-e.x,p.y-e.y);b.angle=Math.atan2(p.y-e.y,p.x-e.x);
  if(hook){aimHook(w,e);b.poise=0;b.last='grab';phase(e,'hook-windup',t);b.next='smash';e.attackAt=t+BRUTE.cooldown;fx(w,e,'brute-windup',{amount:0});return true}
  if(landing){b.jump={from:{x:e.x,y:e.y},to:landing};b.poise=0;b.last='smash';phase(e,'jump-windup',t);b.next='grab';e.attackAt=t+BRUTE.cooldown;fx(w,e,'brute-windup',{amount:1});return true}
 }
 if(d<90)return true;
 return false;
}
