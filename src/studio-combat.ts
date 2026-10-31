import {stepSiegeWalker} from './camp-siege';
import {stepScrapBomber} from './scrap-bomber';
import {stepSkitter} from './skitter-ai';
import {stepIronBrute,initBrute} from './brute-ai';
import {BRUTE} from './brute-model';
import {stepScrapHound,initHound,resetHound} from './hound-ai';
import {releaseBruteGrab} from './brute-control';
import {DIRECTION_ANGLES,STEP,timeOf,worldBlocked,moveBody,lineClear,pathTo,damagePlayer,distance,facing,type World,type Vec} from './survival-engine';
import {COMBAT_ENEMY_LIMIT,ENEMY_TYPES,combatEnemyBody,type EnemyKind} from './enemy-types';
import {WALKER_ATTACK,COMBAT_DODGE,angleDelta} from './combat-model';
import {walkerFistOffset} from './walker-sprites';
export type SpawnView={x:number;y:number;width:number;height:number};
const BODY=18;
const clearRoute=(w:World,a:Vec,b:Vec,r=BODY)=>{const steps=Math.ceil(distance(a,b)/12);for(let i=1;i<=steps;i++)if(worldBlocked(w,a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps,r))return false;return true};

/** Runtime entities only. Never change placements, asset records or saved data. */
export function spawnCombatEnemies(w:World,kind:EnemyKind,requested:number,view?:SpawnView){
 const spec=ENEMY_TYPES[kind],active=w.enemies.filter(e=>e.hp>0).length;
 if(!w.combatTest||!spec)return{spawned:0,message:'Start Play to spawn enemies.'};
 if(active>=COMBAT_ENEMY_LIMIT)return{spawned:0,message:`Limit reached: ${COMBAT_ENEMY_LIMIT} enemies. Clear some before spawning more.`};
 const count=Math.min(COMBAT_ENEMY_LIMIT-active,Math.max(0,Math.min(5,Math.floor(requested)||0)));
 let spawned=0;const angle=DIRECTION_ANGLES[w.player.direction],t=timeOf(w),body=combatEnemyBody(kind);
 for(const radius of [200,260,330,410,170]){
  for(let i=0;i<24&&spawned<count;i++){
   const turn=(i%2?-1:1)*Math.ceil(i/2)*Math.PI/12,a=angle+turn;
   const p={x:w.player.x+Math.cos(a)*radius,y:w.player.y+Math.sin(a)*radius};
   if(view&&(p.x<view.x+60||p.x>view.x+view.width-60||p.y<view.y+125||p.y>view.y+view.height-45))continue;
   if(worldBlocked(w,p.x,p.y,body+4)||!clearRoute(w,p,w.player,body)||w.enemies.some(e=>distance(e,p)<(kind==='iron-brute'||e.kind==='iron-brute'?112:76)))continue;
   if(spawnCombatEnemyAt(w,kind,p,.2*spawned))spawned++;
  }
  if(spawned===count)break;
 }
 return{spawned,message:spawned?`${spawned} ${spec.name}${spawned===1?'':'s'} spawned nearby.${spawned<count?' No more clear space in view.':''}`:'No clear ground nearby in view. Move to an open area or use Player to centre the camera.'};
}
export function spawnCombatEnemyAt(w:World,kind:EnemyKind,p:Vec,repathDelay=.2){
 if(w.enemies.filter(e=>e.hp>0).length>=COMBAT_ENEMY_LIMIT)return null;
 const spec=ENEMY_TYPES[kind],t=timeOf(w),heading=Math.atan2(w.player.y-p.y,w.player.x-p.x);
 const e:World['enemies'][number]={...p,kind,id:w.serial++,hp:spec.health,maxHp:spec.health,spawnedAt:t,attackAt:t+(kind==='iron-brute'?.55:1),path:[],repathAt:t+repathDelay,flashUntil:0,moving:false,walkDistance:0,faceRight:p.x<w.player.x,motion:{phase:'chase',since:t,direction:facing(Math.cos(heading),Math.sin(heading)),angle:heading,resolved:false,hitAt:-10,hitAngle:0,healthFrom:spec.health}};
 w.enemies.push(e);if(kind==='iron-brute')initBrute(e,t);if(kind==='scrap-hound')initHound(e,t);return e;
}
export function clearCombatEnemies(w:World){if(!w.combatTest)return;releaseBruteGrab(w,'',false);w.enemies=[];w.effects=w.effects.filter(e=>!e.type.startsWith('hound-')&&!['hit','kill','damage','enemy-strike','evade','bomber-blast','bomber-beep','walker-windup','skitter-charge','skitter-laser','brute-windup','brute-slam','brute-hook','brute-catch','brute-crush','brute-release','brute-step'].includes(e.type))}
export function restoreCombatHealth(w:World){
 if(!w.combatTest)return;
 releaseBruteGrab(w);for(const e of w.enemies)resetHound(w,e,1.5);w.effects=w.effects.filter(e=>!e.type.startsWith('hound-'));for(const e of w.enemies)if(e.brute){e.brute.phase='slam-recover';e.brute.since=timeOf(w);e.brute.hook=undefined;e.brute.jump=undefined;e.brute.recovery=BRUTE.recovery;e.brute.meleeAt=timeOf(w)+1.5;e.attackAt=Math.max(e.attackAt,timeOf(w)+1.5)}
 Object.assign(w.player,{hp:100,stamina:100,downedUntil:0,hurtUntil:timeOf(w)+2,revive:0});
 w.bowShot=undefined;w.bowArrows=[];
 w.axeSwing=undefined;w.spearThrust=undefined;w.swordThrust=undefined;w.attackQueuedUntil=undefined;w.dodge=undefined;w.dodgeReady=0;w.attackUntil=0;w.attackReady=timeOf(w);w.notice='';w.noticeUntil=0;
}

/** Direct pursuit is cheap. When obstructed, stagger bounded path searches:
 * at most one per simulation tick, never re-search every frame when trapped. */
export function stepCombatEnemies(w:World){
 if(!w.combatTest)return;
 const t=timeOf(w),p=w.player;let routed=false;
 // At most two committed attackers. The rest continue approaching/separating
 // rather than synchronising a twelve-enemy burst on one simulation tick.
 let committed=w.enemies.filter(e=>e.hp>0&&e.kind!=='skitter'&&e.kind!=='iron-brute'&&e.kind!=='scrap-hound'&&(e.motion?.phase==='windup'||e.motion?.phase==='strike')).length;
 for(const e of w.enemies){
  e.moving=false;if(e.hp<=0)continue;
  if(stepSiegeWalker(w,e))continue;
  const spec=ENEMY_TYPES[e.kind||'scrap-walker'],d=distance(e,p);
  const motion=e.motion??(e.motion={phase:'chase',since:t,direction:facing(p.x-e.x,p.y-e.y),angle:Math.atan2(p.y-e.y,p.x-e.x),resolved:false,hitAt:-10,hitAngle:0,healthFrom:e.hp});
  if(e.kind==='scrap-bomber'&&stepScrapBomber(w,e))continue;
  if(e.kind==='skitter'&&stepSkitter(w,e))continue;
  if(e.kind==='iron-brute'&&stepIronBrute(w,e))continue;
  if(e.kind==='scrap-hound'&&stepScrapHound(w,e))continue;
  if(p.downedUntil){motion.phase='chase';continue}
  if(motion.phase==='stagger'){
   if(t-motion.since>=WALKER_ATTACK.stagger){motion.phase='recover';motion.since=t-WALKER_ATTACK.recovery+.18}
   continue;
  }
  if(motion.phase==='windup'){
   if(t-motion.since>=WALKER_ATTACK.windup){motion.phase='strike';motion.since+=WALKER_ATTACK.windup;motion.resolved=false}
   else continue;
  }
  if(motion.phase==='strike'){
   if(!motion.resolved&&t-motion.since>=WALKER_ATTACK.contact){
    motion.resolved=true;
    const inArc=d<=WALKER_ATTACK.reach&&Math.abs(angleDelta(Math.atan2(p.y-e.y,p.x-e.x),motion.angle))<=WALKER_ATTACK.halfArc&&lineClear(e,p,w);
    let landed=false;
    if(inArc){
     if(w.dodge&&t-w.dodge.started<COMBAT_DODGE.invulnerable){if(w.combatStats)w.combatStats.evades++;w.effects.push({x:p.x,y:p.y,id:w.serial++,born:t,type:'evade',label:'EVADE'})}
     else if(damagePlayer(w,spec.damage,false,e)){landed=true;moveBody(w,p,Math.cos(motion.angle)*16,Math.sin(motion.angle)*16)}
    }
    const fist=walkerFistOffset(motion.direction,5);
    w.effects.push({x:e.x+fist.x,y:e.y+fist.y,type:'enemy-strike',label:'',id:w.serial++,born:t,angle:motion.angle,enemyKind:e.kind,direction:motion.direction,amount:landed?spec.damage:0});
   }
   if(t-motion.since>=WALKER_ATTACK.strike){motion.phase='recover';motion.since+=WALKER_ATTACK.strike;committed--}
   continue;
  }
  if(motion.phase==='recover'){
   if(t-motion.since>=WALKER_ATTACK.recovery){motion.phase='chase';motion.since=t}
   else continue;
  }
  if(e.kind!=='scrap-bomber'&&e.kind!=='skitter'&&e.kind!=='iron-brute'&&e.kind!=='scrap-hound'&&d<WALKER_ATTACK.trigger&&lineClear(e,p,w)){
   if(t>=e.attackAt&&committed<2){
    motion.phase='windup';motion.since=t;motion.angle=Math.atan2(p.y-e.y,p.x-e.x);motion.direction=facing(p.x-e.x,p.y-e.y);motion.resolved=false;
    w.effects.push({x:e.x,y:e.y,id:w.serial++,born:t,type:'walker-windup',label:'',enemyKind:e.kind,direction:motion.direction,angle:motion.angle});
    e.attackAt=t+Math.max(spec.attackSeconds,WALKER_ATTACK.windup+WALKER_ATTACK.strike+WALKER_ATTACK.recovery)+.12+(e.id%3)*.065;committed++;
   }
   continue;
  }
  let next:Vec|undefined;
  if(clearRoute(w,e,p,combatEnemyBody(e.kind))){e.path=[];next=p}
  else{
   if(!routed&&t>=e.repathAt){e.path=pathTo(e,p,w,768,Math.max(21,combatEnemyBody(e.kind)));e.repathAt=t+.85+(e.id%5)*.07;routed=true}
   if(e.path[0]&&distance(e,e.path[0])<12)e.path.shift();next=e.path[0];
  }
  if(!next)continue;
  const before={x:e.x,y:e.y},length=distance(e,next)||1;
  let dx=(next.x-e.x)/length,dy=(next.y-e.y)/length;
  // Light separation keeps a test group from collapsing into one sprite.
  for(const other of w.enemies){if(other===e||other.hp<=0)continue;const gap=distance(e,other);if(gap>0&&gap<42){dx+=(e.x-other.x)/gap*(42-gap)/42;dy+=(e.y-other.y)/gap*(42-gap)/42}}
  const m=Math.max(1,Math.hypot(dx,dy));moveBody(w,e,dx/m*spec.speed*STEP,dy/m*spec.speed*STEP,combatEnemyBody(e.kind));
  const travelled=distance(e,before);e.moving=travelled>.01;e.walkDistance=(e.walkDistance||0)+travelled;
  if(e.moving){const angle=Math.atan2(e.y-before.y,e.x-before.x);if(Math.abs(angleDelta(angle,DIRECTION_ANGLES[motion.direction]))>Math.PI/8+.065)motion.direction=facing(e.x-before.x,e.y-before.y);motion.angle=angle;e.faceRight=e.x>before.x}
 }
 w.enemies=w.enemies.filter(e=>!e.bomber?.detonated);
}
