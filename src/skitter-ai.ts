import {STEP,timeOf,distance,facing,lineClear,worldBlocked,moveBody,damagePlayer,type World,type Enemy,type Vec} from './survival-engine';
import {COMBAT_DODGE,angleDelta} from './combat-model';
import {ENEMY_TYPES} from './enemy-types';
import {SKITTER_LASER as L} from './skitter-model';
import {skitterEmitter} from './skitter-sprites';

/** Cast in ground space, projecting the visible eye beam at chest height. */
export function skitterRay(w:World,e:Enemy,angle:number,frame=4){
 const eye=skitterEmitter(e,frame),start={x:eye.x,y:eye.y+L.height};let length=0;
 for(let d=4;d<=L.range;d+=4){if(worldBlocked(w,start.x+Math.cos(angle)*d,start.y+Math.sin(angle)*d,2))break;length=d}
 return {start,length,end:{x:start.x+Math.cos(angle)*length,y:start.y+Math.sin(angle)*length}};
}
const face=(e:Enemy,dx:number,dy:number)=>{const m=e.motion!;const a=Math.atan2(dy,dx);if(Math.abs(angleDelta(a,m.angle))>Math.PI/8+.05)m.direction=facing(dx,dy);m.angle=a};
function aim(w:World,e:Enemy){
 const m=e.motion!,p=w.player;m.direction=facing(p.x-e.x,p.y-e.y);
 const eye=skitterEmitter(e,4);m.angle=Math.atan2(p.y-(eye.y+L.height),p.x-eye.x);
}
/** Owns ranged combat and strafing; false delegates distant/blocked pursuit to
 * the existing bounded pathfinder. No independent timers or projectile queue. */
export function stepSkitter(w:World,e:Enemy){
 const m=e.motion!,t=timeOf(w),p=w.player,d=distance(e,p);e.moving=false;
 if(p.downedUntil){m.phase='chase';return true}
 if(m.phase==='stagger'){if(t-m.since>=L.stagger){m.phase='recover';m.since=t-L.recovery+.12}return true}
 if(m.phase==='windup'){
  if(t-m.since<L.charge-L.lock)aim(w,e);
  if(t-m.since<L.charge)return true;
  m.phase='strike';m.since+=L.charge;m.resolved=false;
 }
 if(m.phase==='strike'){
  if(!m.resolved){
   m.resolved=true;const ray=skitterRay(w,e,m.angle,5),dx=p.x-ray.start.x,dy=p.y-ray.start.y,along=dx*Math.cos(m.angle)+dy*Math.sin(m.angle),across=Math.abs(dx*Math.sin(m.angle)-dy*Math.cos(m.angle));
   let landed=false;const inBeam=along>=0&&along<=ray.length&&across<=L.playerRadius+L.width/2&&lineClear(ray.start,p,w);
   if(inBeam){if(w.dodge&&t-w.dodge.started<COMBAT_DODGE.invulnerable){if(w.combatStats)w.combatStats.evades++;w.effects.push({x:p.x,y:p.y,id:w.serial++,born:t,type:'evade',label:'EVADE'})}else landed=damagePlayer(w,ENEMY_TYPES.skitter.damage,false,e)}
   // Stop the visible beam at a hit; a dodge lets the beam continue past.
   const end=landed?{x:ray.start.x+Math.cos(m.angle)*along,y:ray.start.y+Math.sin(m.angle)*along}:ray.end;
   w.effects.push({x:ray.start.x,y:ray.start.y-L.height,beamEnd:{x:end.x,y:end.y-L.height},id:w.serial++,born:t,type:'skitter-laser',label:'',enemyKind:'skitter',angle:m.angle,amount:landed?ENEMY_TYPES.skitter.damage:0});
  }
  if(t-m.since>=L.fire){m.phase='recover';m.since+=L.fire}return true;
 }
 if(m.phase==='recover'){if(t-m.since<L.recovery)return true;m.phase='chase';m.since=t}
 if(d>L.trigger||!lineClear(e,p,w))return false;
 if(t>=e.attackAt&&w.enemies.filter(other=>other.hp>0&&other.kind==='skitter'&&['windup','strike'].includes(other.motion?.phase??'')).length<L.maxCharging){
  m.phase='windup';m.since=t;m.resolved=false;aim(w,e);e.attackAt=t+ENEMY_TYPES.skitter.attackSeconds+(e.id%4)*.11;
  w.effects.push({x:e.x,y:e.y,id:w.serial++,born:t,type:'skitter-charge',label:'',enemyKind:'skitter'});return true;
 }
 // Small evasive sidesteps while recharging. Collision always wins over retreat.
 const a=Math.atan2(p.y-e.y,p.x-e.x),side=e.id%2?1:-1,away=d<L.retreat?-1:d>L.preferred?1:0;
 let dx=Math.cos(a)*away-Math.sin(a)*side*.45,dy=Math.sin(a)*away+Math.cos(a)*side*.45;
 for(const other of w.enemies){const gap=distance(e,other);if(other!==e&&other.hp>0&&gap>0&&gap<52){dx+=(e.x-other.x)/gap*(52-gap)/26;dy+=(e.y-other.y)/gap*(52-gap)/26}}
 const before:Vec={x:e.x,y:e.y},n=Math.max(1,Math.hypot(dx,dy)),speed=ENEMY_TYPES.skitter.speed*(away?.7:.45);moveBody(w,e,dx/n*speed*STEP,dy/n*speed*STEP,14);
 const moved=distance(before,e);e.moving=moved>.01;e.walkDistance=(e.walkDistance||0)+moved;if(e.moving)face(e,e.x-before.x,e.y-before.y);return true;
}
