import {packAttackAvailable} from './wildlife-pack';
import {commitAnimalFacing,moveAnimal,updateAnimalFacing} from './animal-motion';
import {damagePlayer,facing,moveBody,pathTo,timeOf,type Animal,type Vec,type World} from './survival-engine';
import {routeClear,clearSight,type PredatorNavigationBudget} from './predator-navigation';
import {predatorFrame} from './predator-art';
import type {PredatorMotion} from './camp-predators';

export const WOLF_HUNT={health:144,notice:460,pursue:335,trackRange:1100,forgetAfter:9,escapeAfter:2,stagger:.18,staggerCooldown:1.7} as const;
export const WOLF_ATTACKS={
 bite:{trigger:105,warning:.32,commit:.12,duration:.18,contact:.06,speed:100,reach:84,damage:12,recovery:.38,gap:.18},
 lunge:{trigger:260,warning:.5,commit:.18,duration:.42,contact:0,speed:620,reach:56,damage:18,recovery:.65,gap:.18},
} as const;
export type WolfAttack=keyof typeof WOLF_ATTACKS;
export type WolfHunt={attack:WolfAttack;resolved:boolean;visible:boolean;lungeReadyAt:number;staggerReadyAt:number;flinchUntil:number;lastSeen?:Vec;lastSeenAt:number;farSince?:number;path:Vec[];routeAt:number;side:number;strikes:number;lastStepAt:number};
export type WolfNavigationBudget=PredatorNavigationBudget;
const BODY=22;
const change=(m:PredatorMotion,state:PredatorMotion['state'],t:number)=>{if(m.state!==state){m.state=state;m.since=t}};
function resetSteering(m:PredatorMotion){m.avoidAngle=undefined;m.avoidUntil=undefined;m.avoidRetryAt=undefined}
function finish(m:PredatorMotion,h:WolfHunt,t:number,contact=false){
 const spec=WOLF_ATTACKS[h.attack];change(m,'recover',t);m.contactAt=contact?t:undefined;
 m.until=t+spec.recovery;m.readyAt=m.until+spec.gap;h.strikes++;h.side*=-1;resetSteering(m);
}
function disengage(m:PredatorMotion,h:WolfHunt,t:number){
 m.engaged=false;change(m,'return',t);m.target={...m.home};m.contactAt=undefined;
 h.path=[];h.lastSeen=undefined;h.farSince=undefined;h.resolved=true;h.visible=false;h.flinchUntil=0;resetSteering(m);
}
function warn(m:PredatorMotion,h:WolfHunt,kind:WolfAttack,a:Animal,p:Vec,t:number){
 h.attack=kind;h.resolved=false;m.contactAt=undefined;change(m,'warn',t);
 m.angle=Math.atan2(p.y-a.y,p.x-a.x);commitAnimalFacing(m,facing(p.x-a.x,p.y-a.y),t);resetSteering(m);
 if(kind==='lunge')h.lungeReadyAt=t+3.6;
}
/** Wolves remember their quarry, not a circle around their spawn. Navigation
 * is bounded to one 512-node search per tick, cached for at least 0.9 seconds. */
export function stepWolfHunt(w:World,a:Animal,seconds:number,budget:WolfNavigationBudget){
 const m=a.predator!,t=timeOf(w),p=w.player,near=Math.hypot(p.x-a.x,p.y-a.y),wasMoving=a.moving;
 const h=m.wolf??(m.wolf={attack:'lunge',resolved:false,visible:false,lungeReadyAt:0,staggerReadyAt:0,flinchUntil:0,lastSeenAt:-Infinity,path:[],routeAt:0,side:m.seed%2?1:-1,strikes:0,lastStepAt:t});
 a.moving=false;
 if(a.hp<=0){m.engaged=false;return}
 // Returning from an inactive scene always gets a fresh tell.
 if(t-h.lastStepAt>.25){disengage(m,h,t);m.readyAt=t+.6}
 h.lastStepAt=t;
 if(p.hp<=0||p.downedUntil){disengage(m,h,t);return}
 if(near>1800){disengage(m,h,t);return}
 const freshHit=m.hitAt!==undefined&&m.hitAt!==m.reactedHitAt;
 if(freshHit){
  m.reactedHitAt=m.hitAt;m.engaged=true;h.lastSeen={x:p.x,y:p.y};h.lastSeenAt=t;h.farSince=undefined;
  const damage=(a.healthFrom??a.hp)-a.hp,earlyTell=m.state==='warn'&&t-m.since<.16;
  // Damage always lands. Only a spaced heavy hit, before commitment or during
  // an opening, can stagger; taps never restart the entire attack cooldown.
  if(damage>=32&&t>=h.staggerReadyAt&&(earlyTell||!['warn','attack'].includes(m.state))){
   h.staggerReadyAt=t+WOLF_HUNT.staggerCooldown;h.flinchUntil=t+WOLF_HUNT.stagger;
   if(m.state!=='recover'){change(m,'recover',t);m.contactAt=undefined;m.until=t+WOLF_HUNT.stagger;m.readyAt=t+.24}
   else m.until=Math.max(m.until,h.flinchUntil);
   h.resolved=true;resetSteering(m);
  }
 }
 if(t>=m.thinkAt){
  m.thinkAt=t+.1;
  const visible=near<(m.engaged?WOLF_HUNT.trackRange:WOLF_HUNT.notice)&&clearSight(w,a,p);
  h.visible=visible;
  if(visible){m.engaged=true;h.lastSeen={x:p.x,y:p.y};h.lastSeenAt=t;h.farSince=undefined}
  if(m.engaged){
   if(near>WOLF_HUNT.trackRange)h.farSince??=t;else h.farSince=undefined;
   if(t-h.lastSeenAt>WOLF_HUNT.forgetAfter||(h.farSince!==undefined&&t-h.farSince>WOLF_HUNT.escapeAfter))disengage(m,h,t);
  }
  if(m.engaged&&h.lastSeen){
   const target=h.lastSeen;
   if(routeClear(w,a,target)){h.path=[];m.target={...target};resetSteering(m)}
   else if(t>=h.routeAt&&budget.remaining>0){h.path=pathTo(a,target,w,512);h.routeAt=t+.9+(m.seed%3)*.07;budget.remaining--;resetSteering(m)}
  }
 }
 if(!m.engaged){
  const homeDistance=Math.hypot(a.x-m.home.x,a.y-m.home.y);
  if(m.state==='return'||homeDistance>220){change(m,'return',t);m.target={...m.home};if(homeDistance<12){change(m,'idle',t);m.until=t+2}}
  else if(t>=m.until){const angle=(m.seed+Math.floor(t/3))*2.399963;change(m,Math.sin(t+m.seed)>.1?'walk':'idle',t);m.until=t+3.4;m.target={x:m.home.x+Math.cos(angle)*150,y:m.home.y+Math.sin(angle)*150}}
  if(m.state==='idle')return;
  travel(m.target,m.state==='return'?180:58,false);return;
 }
 if(t<h.flinchUntil)return;
 if(m.state==='warn'){
  const spec=WOLF_ATTACKS[h.attack],age=t-m.since;
  // A short locked final tell leaves a real sidestep window; no homing lunge.
  if(age<spec.warning-spec.commit&&h.visible)m.angle=Math.atan2(p.y-a.y,p.x-a.x);
  updateAnimalFacing(m,Math.cos(m.angle),Math.sin(m.angle),t,false);
  if(age+1e-9>=spec.warning){commitAnimalFacing(m,facing(Math.cos(m.angle),Math.sin(m.angle)),t);change(m,'attack',t)}
  return;
 }
 if(m.state==='attack'){
  const spec=WOLF_ATTACKS[h.attack],age=t-m.since,dx=Math.cos(m.angle),dy=Math.sin(m.angle),before={x:a.x,y:a.y};
  if(age>=spec.duration){finish(m,h,t);return}
  // The bite is a small grounded step; only the lunge covers a long distance.
  moveBody(w,a,dx*spec.speed*seconds,dy*spec.speed*seconds,BODY);
  const moved=Math.hypot(a.x-before.x,a.y-before.y);a.moving=moved>.01;m.distance+=moved;
  const px=p.x-a.x,py=p.y-a.y,d=Math.hypot(px,py);
  if(!h.resolved&&age+1e-9>=spec.contact){
   const touches=d<=spec.reach&&(d<1||(px*dx+py*dy)/d>Math.cos(Math.PI*.34))&&clearSight(w,a,p);
   if(touches){
    h.resolved=true;
    if(damagePlayer(w,spec.damage,false,a))moveBody(w,p,dx*(h.attack==='bite'?10:22),dy*(h.attack==='bite'?10:22),19);
    else if(w.dodge&&w.combatStats)w.combatStats.evades++;
    finish(m,h,t,true);return;
   }
   if(h.attack==='bite')h.resolved=true;
  }
  if(h.attack==='lunge'&&moved<.01)finish(m,h,t);
  return;
 }
 if(m.state==='recover'&&t<m.until)return;
 const sight=h.visible;
 const packTurn=packAttackAvailable(w,a);
 if(t>=m.readyAt&&sight&&packTurn){
  if(near<=WOLF_ATTACKS.bite.trigger){warn(m,h,'bite',a,p,t);return}
  if(near<=WOLF_ATTACKS.lunge.trigger&&t>=h.lungeReadyAt){warn(m,h,'lunge',a,p,t);return}
 }
 if(!sight&&h.lastSeen&&Math.hypot(a.x-h.lastSeen.x,a.y-h.lastSeen.y)<45){
  change(m,'search',t);const angle=(t-h.lastSeenAt)*.9+h.side;
  travel({x:h.lastSeen.x+Math.cos(angle)*70,y:h.lastSeen.y+Math.sin(angle)*70},120,false);return;
 }
 if(sight&&near<190&&(t<m.readyAt||!packTurn)){
  // A short lateral reset keeps the wolf facing its quarry instead of turning
  // its back and walking home after every attack.
  change(m,'circle',t);const dx=(a.x-p.x)/(near||1),dy=(a.y-p.y)/(near||1),radial=Math.max(-.6,Math.min(.6,(100-near)/100));
  travel({x:a.x+(dx*radial-dy*h.side)*90,y:a.y+(dy*radial+dx*h.side)*90},190,true);return;
 }
 change(m,'pursue',t);
 while(h.path.length&&Math.hypot(h.path[0].x-a.x,h.path[0].y-a.y)<22)h.path.shift();
 travel(h.path[0]||h.lastSeen||p,WOLF_HUNT.pursue,false);
 function travel(target:Vec,speed:number,facePlayer:boolean){
  const dx=target.x-a.x,dy=target.y-a.y,d=Math.hypot(dx,dy);if(d<4)return;
  const x=a.x,y=a.y,moved=moveAnimal(w,a,m,dx,dy,Math.min(d,speed*seconds),BODY,Infinity,t);
  if(moved>.01){a.moving=true;m.distance+=moved;updateAnimalFacing(m,facePlayer?p.x-a.x:a.x-x,facePlayer?p.y-a.y:a.y-y,t,wasMoving);a.right=a.x>x}
 }
}
export function wolfFrame(w:World,a:Animal){
 const m=a.predator!,h=m.wolf,t=timeOf(w),age=t-m.since;
 if(!h)return predatorFrame('wolf','idle',age);
 if(t<h.flinchUntil)return predatorFrame('wolf','hit',WOLF_HUNT.stagger-(h.flinchUntil-t));
 if(m.state==='warn')return h.attack==='bite'?(age<.1?10:11):predatorFrame('wolf','warning',age);
 if(m.state==='attack')return h.attack==='bite'?(age<WOLF_ATTACKS.bite.contact?10:15):13+Math.min(2,Math.floor(age/.1));
 if(m.state==='recover'){
  const contactAge=m.contactAt===undefined?Infinity:t-m.contactAt;
  if(contactAge<.12)return h.attack==='bite'?15:14;
  if(contactAge<.24)return 15;
  return age<.45?16:17;
 }
 if(a.moving)return predatorFrame('wolf',m.state==='pursue'?'run':'walk',m.distance/(m.state==='pursue'?350:140));
 return predatorFrame('wolf',m.engaged?'warning':'idle',age);
}
