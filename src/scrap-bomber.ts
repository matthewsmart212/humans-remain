import {damageBuilding} from './building-damage';
import {campBuildingPlacements} from './camp-restoration';
import {buildingAttackSite} from './building-attack-site';
import {distance,lineClear,timeOf,damagePlayer,moveBody,facing,type Enemy,type World} from './survival-engine';
import {BOMBER_ATTACK,bomberPulsePhase} from './bomber-model';

/** True while the bomber owns this tick; otherwise use shared pursuit. */
export function stepScrapBomber(w:World,e:Enemy,away=false){
 const t=timeOf(w),p=w.player,b=e.bomber;
 if(b){
  e.moving=false;
  if(b.detonated)return true;
  const age=t-b.armedAt;
  if(age>=BOMBER_ATTACK.fuse){
   // Resolve once at the planted position. Destroying it earlier never reaches here.
   b.detonated=true;e.hp=0;
   w.effects.push({x:e.x,y:e.y,id:w.serial++,born:t,type:'bomber-blast',label:'',radius:BOMBER_ATTACK.radius,enemyKind:'scrap-bomber'});
   if(w.progression&&!w.scene){
    const targets=campBuildingPlacements(w.layout).flatMap(({id})=>{const site=buildingAttackSite(w,id);return site?[site]:[]});
    for(const site of targets){const gap=distance(e,site);if(gap<=BOMBER_ATTACK.radius&&lineClear(e,site,{...w,outdoorReady:undefined}))damageBuilding(w,site.id,Math.round(BOMBER_ATTACK.damage*(1-.45*gap/BOMBER_ATTACK.radius)))}
   }
   const d=away?Infinity:distance(e,p);
   if(d<=BOMBER_ATTACK.radius&&lineClear(e,p,w)){
    const damage=Math.round(BOMBER_ATTACK.damage*(1-.45*d/BOMBER_ATTACK.radius));
    if(damagePlayer(w,damage,false,e)){
     const angle=Math.atan2(p.y-e.y,p.x-e.x);
     moveBody(w,p,Math.cos(angle)*24,Math.sin(angle)*24,19);
    }
   }
   if(d<650&&!w.weather?.reducedMotion)w.shakeUntil=Math.max(w.shakeUntil,t+.22);
   return true;
  }
  const beep=Math.floor(bomberPulsePhase(age));
  if(beep>b.beep){b.beep=beep;w.effects.push({x:e.x,y:e.y,id:w.serial++,born:t,type:'bomber-beep',label:'',amount:age/BOMBER_ATTACK.fuse})}
  return true;
 }
 if(p.downedUntil||distance(e,p)>BOMBER_ATTACK.trigger||!lineClear(e,p,w))return false;
 // Limit simultaneous fuses, but do not stop a fuse after the player retreats.
 if(t<e.attackAt||w.enemies.filter(other=>other.hp>0&&other.bomber&&!other.bomber.detonated).length>=BOMBER_ATTACK.maxArming)return true;
 e.moving=false;e.bomber={armedAt:t,beep:0};
 const angle=Math.atan2(p.y-e.y,p.x-e.x);
 if(e.motion)Object.assign(e.motion,{phase:'arming',since:t,angle,direction:facing(p.x-e.x,p.y-e.y)});
 w.effects.push({x:e.x,y:e.y,id:w.serial++,born:t,type:'bomber-beep',label:'',amount:0});
 return true;
}
