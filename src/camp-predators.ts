import {seedCampChickens} from './camp-chickens';
import type {AnimalSteering} from './animal-motion';
import {timeOf,worldBlocked,type Vec,type World} from './survival-engine';
import {predatorFrame,type PredatorKind} from './predator-art';
import {visiblePlacements} from './layout-views';
import {placementContains} from './world-layout';
import {ASSET_BY_ID} from './world-assets';
import {TREE_ART} from './tree-chopping';
import {stepBoarHunt,boarFrame,BOAR_HUNT,BOAR_ATTACKS,type BoarHunt} from './boar-hunt';
import {stepWolfHunt,wolfFrame,WOLF_HUNT,WOLF_ATTACKS,type WolfHunt} from './wolf-hunt';

export type PredatorMotion=AnimalSteering&{kind:PredatorKind;home:Vec;target:Vec;seed:number;distance:number;state:'idle'|'walk'|'pursue'|'warn'|'attack'|'recover'|'return'|'circle'|'search';since:number;until:number;thinkAt:number;readyAt:number;engaged:boolean;angle:number;wolf?:WolfHunt;boar?:BoarHunt;contactAt?:number;seenAt?:number;hitAt?:number;deadAt?:number;reactedHitAt?:number};
export const PREDATOR_RULES={
 boar:{health:BOAR_HUNT.health,notice:BOAR_HUNT.notice,range:BOAR_ATTACKS.charge.trigger,warning:BOAR_ATTACKS.charge.warning,duration:BOAR_ATTACKS.charge.duration,speed:BOAR_ATTACKS.charge.speed,pursue:BOAR_HUNT.pursue,damage:BOAR_ATTACKS.charge.damage,reach:BOAR_ATTACKS.charge.reach,recovery:BOAR_ATTACKS.charge.recovery,cooldown:3.1,meat:3},
 wolf:{health:WOLF_HUNT.health,notice:WOLF_HUNT.notice,range:WOLF_ATTACKS.lunge.trigger,warning:WOLF_ATTACKS.lunge.warning,duration:WOLF_ATTACKS.lunge.duration,speed:WOLF_ATTACKS.lunge.speed,pursue:WOLF_HUNT.pursue,damage:WOLF_ATTACKS.lunge.damage,reach:WOLF_ATTACKS.lunge.reach,recovery:WOLF_ATTACKS.lunge.recovery,cooldown:3.6,meat:2},
} as const;
/** Four session-only animals in separate clearings beyond the camp wildlife. */
export function seedCampPredators(w:World){
 if(w.scene||w.animals.some(a=>a.predator))return;
 seedCampChickens(w);
 const homes=w.animals.filter(a=>a.chicken).map(a=>a.chicken!.home);if(!homes.length)return;
 const center={x:homes.reduce((s,p)=>s+p.x,0)/homes.length,y:homes.reduce((s,p)=>s+p.y,0)/homes.length};
 for(let i=0;i<4;i++){
  const near=homes[[1,4,6,9][i]%homes.length],angle=Math.atan2(near.y-center.y,near.x-center.x);let home:Vec|undefined,cover=Infinity;
  for(let n=0;n<80;n++){
   const theta=angle+[0,.15,-.15,.3,-.3,.45,-.45,.6][n%8],r=550+Math.floor(n/8)*45,p={x:near.x+Math.cos(theta)*r,y:near.y+Math.sin(theta)*r};
   if(!worldBlocked(w,p.x,p.y,28)&&Math.hypot(p.x-w.player.x,p.y-w.player.y)>650&&!w.animals.some(a=>Math.hypot(p.x-a.x,p.y-a.y)<170)){
    const score=w.layout?visiblePlacements(w.layout,{x:p.x-70,y:p.y-150,width:140,height:170}).filter(q=>q.y>=p.y-10&&(ASSET_BY_ID.get(q.assetId)?.foliage||TREE_ART.has(q.assetId))).reduce((n,q)=>n+[[0,-80],[-35,-45],[35,-45],[0,-10]].filter(([dx,dy])=>placementContains(q,p.x+dx,p.y+dy)).length,0):0;
    if(score<cover){home=p;cover=score}if(!score)break;
   }
  }
  if(!home)continue;
  const kind:PredatorKind=i<2?'boar':'wolf',t=timeOf(w),hp=PREDATOR_RULES[kind].health;
  w.animals.push({...home,id:w.serial++,home:i,hp,maxHp:hp,moving:false,right:false,flashUntil:0,predator:{kind,home:{...home},target:{...home},seed:701+i,direction:'down-left',distance:0,state:'idle',since:t,until:t+2+i*.6,thinkAt:t,readyAt:t+1,engaged:false,angle:0}});
 }
}
/** Share the path-search budget between species, even in a mixed encounter. */
export function stepCampPredators(w:World,seconds:number){
 const navigation={remaining:1};
 for(const a of w.animals){
  if(!a.predator)continue;
  if(a.predator.kind==='wolf')stepWolfHunt(w,a,seconds,navigation);
  else stepBoarHunt(w,a,seconds,navigation);
 }
}
export function predatorAnimalFrame(w:World,a:World['animals'][number]){
 const m=a.predator!,t=timeOf(w);
 if(a.hp<=0)return predatorFrame(m.kind,'death',t-(m.deadAt??t));
 return m.kind==='wolf'?wolfFrame(w,a):boarFrame(w,a);
}
