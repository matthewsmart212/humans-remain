import {STEP,timeOf,distance,facing,lineClear,worldBlocked,moveBody,damagePlayer,type World,type Enemy,type Vec} from './survival-engine';
import {HOUND as H,houndActive,type HoundPhase,type HoundState} from './hound-model';
import {COMBAT_DODGE,angleDelta} from './combat-model';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function initHound(e:Enemy,t:number):HoundState{return e.hound??(e.hound={phase:'stalk',since:t,direction:e.motion?.direction??'down',angle:e.motion?.angle??0,resolved:false,biteAt:e.attackAt})}
function phase(e:Enemy,next:HoundPhase,t:number){const h=e.hound!;h.phase=next;h.since=t;h.resolved=false;e.moving=false;if(e.motion)Object.assign(e.motion,{phase:next==='stalk'?'chase':next==='charge'||next==='bite-windup'?'windup':next==='pounce'||next==='bite'?'strike':next==='stagger'?'stagger':'recover',since:t,direction:h.direction,angle:h.angle,resolved:false})}
function fx(w:World,e:Enemy,type:'hound-charge'|'hound-launch'|'hound-contact'|'hound-land',extra:Partial<World['effects'][number]>={}){w.effects.push({x:e.x,y:e.y,id:w.serial++,born:timeOf(w),type,label:'',enemyKind:'scrap-hound',direction:e.hound!.direction,angle:e.hound!.angle,...extra})}
function recover(w:World,e:Enemy,full=true){const h=e.hound!;h.pounce=undefined;h.recovery=full?H.recovery:H.biteRecovery;phase(e,'recover',timeOf(w))}
function sample(w:World,h:HoundState){const t=timeOf(w),old=h.sample,dt=old?t-old.at:0;h.sample={x:w.player.x,y:w.player.y,at:t};if(!old||dt<=0||dt>.1||w.bruteGrab){h.velocity={x:0,y:0};return}const vx=(w.player.x-old.x)/dt,vy=(w.player.y-old.y)/dt;if(Math.hypot(vx,vy)>520){h.velocity={x:0,y:0};return}h.velocity={x:(h.velocity?.x??0)*.35+vx*.65,y:(h.velocity?.y??0)*.35+vy*.65}}
function target(w:World,h:HoundState){return{x:w.player.x+(h.velocity?.x??0)*H.lead,y:w.player.y+(h.velocity?.y??0)*H.lead}}
export function houndRouteClear(w:World,from:Vec,to:Vec){const n=Math.max(1,Math.ceil(distance(from,to)/6));for(let i=0;i<=n;i++)if(worldBlocked(w,from.x+(to.x-from.x)*i/n,from.y+(to.y-from.y)*i/n,H.body))return false;return true}
export function houndPounceTarget(w:World,e:Enemy,aim:Vec){const d=distance(e,aim);if(d<1)return;const reach=Math.min(H.range,d+H.overshoot),to={x:e.x+(aim.x-e.x)/d*reach,y:e.y+(aim.y-e.y)/d*reach};return houndRouteClear(w,e,to)?to:undefined}
function contact(w:World,e:Enemy,damage:number){const h=e.hound!,t=timeOf(w);if(h.resolved||distance(e,w.player)>H.contact||!lineClear(e,w.player,w))return;h.resolved=true;
 if(w.dodge&&t-w.dodge.started<COMBAT_DODGE.invulnerable){if(w.combatStats)w.combatStats.evades++;w.effects.push({x:w.player.x,y:w.player.y,id:w.serial++,born:t,type:'evade',label:'EVADE'});return}
 if(damagePlayer(w,damage,false,e)){fx(w,e,'hound-contact',{x:w.player.x,y:w.player.y,amount:damage,heavy:true});moveBody(w,w.player,Math.cos(h.angle)*22,Math.sin(h.angle)*22)}
}
/** Cancel stale local attacks on healing/travel, with arrival grace. */
export function resetHound(w:World,e:Enemy,grace=.75){if(!e.hound)return;const h=e.hound;h.pounce=undefined;h.sample=undefined;h.velocity=undefined;h.biteAt=timeOf(w)+grace;e.attackAt=Math.max(e.attackAt,timeOf(w)+grace);h.last=undefined;phase(e,'stalk',timeOf(w))}
/** Weapons can break its charge. A launched pounce remains committed through
 * nonlethal hits; fists cannot keep its servo drive permanently staggered. */
export function hitHound(w:World,e:Enemy,impact:'weapon'|'fists'){
 const h=e.hound;if(!h||h.phase==='pounce'||impact==='fists')return false;const interrupted=h.phase==='charge'||h.phase==='bite-windup';h.pounce=undefined;h.last=undefined;phase(e,'stagger',timeOf(w));h.biteAt=Math.max(h.biteAt??0,timeOf(w)+H.stagger+.25);e.attackAt=Math.max(e.attackAt,timeOf(w)+H.stagger+.3);return interrupted;
}
/** Owns bite/pounce/vent recovery. False uses the bounded shared pathfinder. */
export function stepScrapHound(w:World,e:Enemy){
 const t=timeOf(w),p=w.player,h=initHound(e,t),d=distance(e,p);e.moving=false;sample(w,h);let age=t-h.since;
 if(p.hp<=0||p.downedUntil||w.phase==='over'){resetHound(w,e);return true}
 if(h.phase==='stagger'){if(age>=H.stagger){h.recovery=.14;phase(e,'recover',t)}return true}
 if(h.phase==='charge'){
  if(age<H.track){const to=houndPounceTarget(w,e,target(w,h));if(to){h.pounce={from:{x:e.x,y:e.y},to};h.angle=Math.atan2(to.y-e.y,to.x-e.x);h.direction=facing(to.x-e.x,to.y-e.y);if(e.motion)Object.assign(e.motion,{angle:h.angle,direction:h.direction})}}
  if(age>=H.charge){if(!h.pounce||!houndRouteClear(w,e,h.pounce.to)){recover(w,e);return true}h.pounce.from={x:e.x,y:e.y};phase(e,'pounce',h.since+H.charge);fx(w,e,'hound-launch')}
  return true;
 }
 if(h.phase==='pounce'){
  const jump=h.pounce;if(!jump){recover(w,e);return true}const u=clamp(age/H.flight),to={x:jump.from.x+(jump.to.x-jump.from.x)*u,y:jump.from.y+(jump.to.y-jump.from.y)*u},n=Math.max(1,Math.ceil(distance(e,to)/6)),start={x:e.x,y:e.y};
  for(let i=1;i<=n;i++){const next={x:start.x+(to.x-start.x)*i/n,y:start.y+(to.y-start.y)*i/n};if(worldBlocked(w,next.x,next.y,H.body)){fx(w,e,'hound-land',{amount:0});recover(w,e);return true}const before={x:e.x,y:e.y};moveBody(w,e,next.x-e.x,next.y-e.y,H.body);if(distance(e,next)>2){fx(w,e,'hound-land',{amount:0});recover(w,e);return true}e.walkDistance=(e.walkDistance??0)+distance(before,e);contact(w,e,H.pounceDamage)}
  if(age>=H.flight){fx(w,e,'hound-land',{amount:h.resolved?1:0});recover(w,e)}return true;
 }
 if(h.phase==='bite-windup'){if(age>=H.biteWindup)phase(e,'bite',h.since+H.biteWindup);return true}
 if(h.phase==='bite'){
  if(!h.resolved&&age>=H.biteContact){h.resolved=true;const hits=d<=H.biteReach&&Math.abs(angleDelta(Math.atan2(p.y-e.y,p.x-e.x),h.angle))<=H.biteHalfArc&&lineClear(e,p,w);let amount=0;
   if(hits){if(w.dodge&&t-w.dodge.started<COMBAT_DODGE.invulnerable){if(w.combatStats)w.combatStats.evades++;w.effects.push({x:p.x,y:p.y,id:w.serial++,born:t,type:'evade',label:'EVADE'})}else if(damagePlayer(w,H.biteDamage,false,e))amount=H.biteDamage}
   fx(w,e,'hound-contact',{x:e.x+Math.cos(h.angle)*48,y:e.y+Math.sin(h.angle)*48,amount});
  }
  if(age>=H.biteStrike)recover(w,e,false);return true;
 }
 if(h.phase==='recover'){
  if(h.last==='pounce'&&age<H.skid&&!w.bruteGrab){const step=H.skidDistance/H.skid*STEP*(1-clamp(age/H.skid));moveBody(w,e,Math.cos(h.angle)*step,Math.sin(h.angle)*step,H.body)}
  if(age<(h.recovery??H.recovery))return true;h.last=undefined;phase(e,'stalk',t);
 }
 if(e.motion){h.direction=e.motion.direction;h.angle=e.motion.angle}
 const admitted=w.enemies.filter(other=>other!==e&&other.hp>0&&other.kind==='scrap-hound'&&houndActive(other.hound)).length<H.maxActive;
 if(admitted&&!w.bruteGrab&&lineClear(e,p,w)){
  if(d<=H.biteTrigger&&t>=(h.biteAt??e.attackAt)){h.direction=facing(p.x-e.x,p.y-e.y);h.angle=Math.atan2(p.y-e.y,p.x-e.x);h.biteAt=t+H.biteCooldown;h.last='bite';phase(e,'bite-windup',t);return true}
  if(d>=H.pounceMin&&d<=H.trigger&&t>=e.attackAt){const to=houndPounceTarget(w,e,target(w,h));if(to){h.pounce={from:{x:e.x,y:e.y},to};h.direction=facing(to.x-e.x,to.y-e.y);h.angle=Math.atan2(to.y-e.y,to.x-e.x);h.last='pounce';phase(e,'charge',t);e.attackAt=t+H.cooldown+(e.id%3)*.08;fx(w,e,'hound-charge');return true}}
 }
 if(d<64)return true;
 return false;
}
