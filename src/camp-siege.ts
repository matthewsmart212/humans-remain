import {campBuildingPlacements} from './camp-restoration';
import {buildingAttackSite} from './building-attack-site';
import {walkerFistOffset} from './walker-sprites';
import {damageBuilding} from './building-damage';
import {stepScrapBomber} from './scrap-bomber';
import {initHound,resetHound} from './hound-ai';
import {combatEnemyBody,ENEMY_TYPES} from './enemy-types';
import {RUN_NIGHT_SECONDS} from './survival-cycle';
import {type World,type Enemy,worldBlocked,pathTo,moveBody,lineClear,distance,facing,timeOf,STEP} from './survival-engine';
import {spawnCombatEnemyAt} from './studio-combat';
import {COMBAT_ENEMY_LIMIT,type EnemyKind} from './enemy-types';
import {releaseBruteGrab} from './brute-control';

export const NIGHT_WAVES:readonly (readonly EnemyKind[])[]=[
 ['scrap-walker','scrap-walker','scrap-walker'],
 ['scrap-walker','scrap-hound','scrap-walker','scrap-walker'],
 ['scrap-walker','scrap-bomber','scrap-walker','scrap-hound','scrap-walker'],
];
export function wavePlan(night:number){return NIGHT_WAVES[Math.min(NIGHT_WAVES.length-1,Math.max(0,night-1))]}
const hasRoute=(w:World,a:{x:number;y:number},b:{x:number;y:number})=>{const route=pathTo(a,b,w,3500,23);return route.length&&distance(route.at(-1)!,b)<100};
function spawnWaveEnemy(w:World,kind:EnemyKind){
 const p=w.progression!,target=buildingAttackSite(w,'headquarters')??p.camp;
 // Render-stream readiness must not stop camp defence when the player travels away.
 const navigation={...w,outdoorReady:undefined};
 for(const radius of [650,850,1050])for(let i=0;i<24;i++){
  const angle=Math.PI*.25+(i+p.siege.spawned*7)*Math.PI/12,pos={x:p.camp.x+Math.cos(angle)*radius,y:p.camp.y+Math.sin(angle)*radius};
  if(worldBlocked(navigation,pos.x,pos.y,30)||w.enemies.some(e=>e.hp>0&&distance(e,pos)<90)||!hasRoute(navigation,pos,target))continue;
  const e=spawnCombatEnemyAt(w,kind,pos);if(!e)return false;e.siegeNight=w.round;
  // Early raids use worn robots. Sandbox enemies keep their full existing stats.
  e.hp=e.maxHp=kind==='scrap-walker'?(w.round===1?72:96):kind==='scrap-hound'?84:64;
  if(e.motion)e.motion.healthFrom=e.hp;return true;
 }
 return false;
}
export const damageCamp=(w:World,amount:number)=>damageBuilding(w,'headquarters',amount);

/** Cache a reachable facility per robot. Re-evaluate after destruction or a blocked route. */
function chooseBuilding(w:World,e:Enemy){
 const candidates=campBuildingPlacements(w.layout).flatMap(({id})=>{const site=buildingAttackSite(w,id);return site?[site]:[]}).sort((a,b)=>distance(e,a)-distance(e,b));
 for(const site of candidates){
  const route=pathTo(e,site,w,3500,combatEnemyBody(e.kind));
  if(distance(e,site)<site.reach&&lineClear(e,site,w)||route.length&&distance(route.at(-1)!,site)<site.reach&&lineClear(route.at(-1)!,site,w)){
   e.siegeBuilding=site.id;e.path=route;return site;
  }
 }
 e.siegeBuilding=undefined;e.path=[];return undefined;
}
function siegePose(e:Enemy,phase:'chase'|'windup'|'strike'|'recover',t:number){
 if(e.motion){e.motion.phase=phase;e.motion.since=t;}
 if(e.kind==='scrap-hound'){
  const h=initHound(e,t);h.phase=phase==='chase'?'stalk':phase==='windup'?'bite-windup':phase==='strike'?'bite':'recover';h.since=t;h.last='bite';h.pounce=undefined;
  h.direction=e.motion?.direction??'down';h.angle=e.motion?.angle??0;
 }
}
/** Every night-raid robot can attack a facility; nearby survivors still draw aggro. */
export function stepSiegeWalker(w:World,e:Enemy,away=false){
 const p=w.progression;if(!p||w.scene||!e.siegeNight||e.hp<=0||w.phase==='over')return false;
 if(e.kind==='scrap-bomber'&&e.bomber)return stepScrapBomber(w,e,away);
 const t=timeOf(w),nearPlayer=!away&&distance(e,w.player)<260&&lineClear(e,w.player,w),recentHit=t-(e.motion?.hitAt??-100)<2.5;
 if(nearPlayer||!away&&recentHit){if(e.siegeTarget){e.siegeTarget=false;e.siegeBuilding=undefined;e.path=[];e.repathAt=0;e.attackAt=t+.5;resetHound(w,e);siegePose(e,'recover',t)}return false}
 if(!e.siegeTarget){e.siegeTarget=true;e.path=[];e.siegeBuilding=undefined;e.repathAt=0;siegePose(e,'chase',t)}
 const navigation={...w,outdoorReady:undefined};e.moving=false;
 if(e.motion&&e.motion.phase==='stagger'&&t-e.motion.since<.25)return true;
 let site=e.siegeBuilding?buildingAttackSite(w,e.siegeBuilding):undefined;
 if(!site){if(t<e.repathAt)return true;site=chooseBuilding(navigation,e);e.repathAt=t+1.6+(e.id%5)*.1;if(!site)return true;siegePose(e,'chase',t)}
 if(distance(e,site)<site.reach&&lineClear(e,site,navigation)){
  if(!e.motion)return true;
  e.motion.direction=facing(site.impact.x-e.x,site.impact.y-e.y);e.motion.angle=Math.atan2(site.impact.y-e.y,site.impact.x-e.x);
  if(e.kind==='scrap-bomber'){
   if(t>=e.attackAt){e.bomber={armedAt:t,beep:0};e.motion.phase='arming';e.motion.since=t;w.effects.push({x:e.x,y:e.y,id:w.serial++,born:t,type:'bomber-beep',label:'',amount:0})}return true;
  }
  if(e.motion.phase==='windup'&&t-e.motion.since>=.4){
   siegePose(e,'strike',t);const amount=e.kind==='scrap-hound'?18:14;damageBuilding(w,e.siegeBuilding!,amount);e.attackAt=t+(e.kind==='scrap-hound'?2:1.7);
   const fist=walkerFistOffset(e.motion.direction,5),impact=e.kind==='scrap-walker'?{x:e.x+fist.x,y:e.y+fist.y}:{x:site.impact.x,y:site.impact.y+50};
   w.effects.push({...impact,id:w.serial++,born:t,type:e.kind==='scrap-hound'?'hound-contact':'enemy-strike',label:'',direction:e.motion.direction,angle:e.motion.angle,enemyKind:e.kind,amount});
  }else if(e.motion.phase==='strike'&&t-e.motion.since>.3)siegePose(e,'recover',t);
  else if(e.motion.phase!=='windup'&&t>=e.attackAt)siegePose(e,'windup',t);
  return true;
 }
 if(t>=e.repathAt){e.path=pathTo(e,site,navigation,3500,combatEnemyBody(e.kind));e.repathAt=t+1.6+(e.id%5)*.1;if(!e.path.length){e.siegeBuilding=undefined;return true}}
 if(e.path[0]&&distance(e,e.path[0])<20)e.path.shift();const target=e.path[0];if(!target)return true;
 const before={x:e.x,y:e.y},len=distance(e,target)||1,speed=e.kind==='scrap-walker'?150:ENEMY_TYPES[e.kind!].speed;
 moveBody(navigation,e,(target.x-e.x)/len*speed*STEP,(target.y-e.y)/len*speed*STEP,combatEnemyBody(e.kind));
 const moved=distance(before,e);e.moving=moved>.01;e.walkDistance=(e.walkDistance??0)+moved;
 if(e.motion&&e.moving){e.motion.direction=facing(e.x-before.x,e.y-before.y);e.motion.angle=Math.atan2(e.y-before.y,e.x-before.x);siegePose(e,'chase',t)}return true;
}
export function stepCampSiege(w:World,away=false){
 const p=w.progression;if(!p||w.phase==='over')return;const s=p.siege,t=timeOf(w);
 if(w.phase==='day'){
  if(s.night>s.ended){s.ended=s.night;releaseBruteGrab(w,'',false);w.enemies=w.enemies.filter(e=>!e.siegeNight);w.notice=`Night ${s.ended} survived`;w.noticeUntil=t+5}
  if(w.survived>=3&&p.metalCrafted&&!p.completed){p.completed=true}return;
 }
 if(s.night!==w.round){s.night=w.round;s.spawned=0;s.nextAt=t+RUN_NIGHT_SECONDS*.05}
 const plan=wavePlan(w.round);
 if(s.spawned<plan.length&&t>=s.nextAt&&w.enemies.filter(e=>e.hp>0).length<COMBAT_ENEMY_LIMIT){if(spawnWaveEnemy(w,plan[s.spawned]))s.spawned++;s.nextAt=t+RUN_NIGHT_SECONDS*(7/60)}
 if(away){for(const enemy of w.enemies)stepSiegeWalker(w,enemy,true);w.enemies=w.enemies.filter(e=>!e.bomber?.detonated)}
}
