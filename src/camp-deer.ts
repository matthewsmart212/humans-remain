import {seedCampChickens,updateChickenFacing,type ChickenMotion} from './camp-chickens';
import {damagePlayer,facing,lineClear,moveBody,timeOf,worldBlocked,type World} from './survival-engine';
import {visiblePlacements} from './layout-views';
import {placementContains} from './world-layout';
import {ASSET_BY_ID} from './world-assets';
import {TREE_ART} from './tree-chopping';
import {animalEscapeTarget,animalTravelLeash,moveAnimal,commitAnimalFacing} from './animal-motion';

export type DeerKind='doe'|'stag';
export type DeerMotion=ChickenMotion&{kind:DeerKind;stride:number;reactedHitAt?:number;fightReady?:number;fleeUntil?:number;retaliation?:{phase:'warn'|'charge';since:number;angle:number}};
export const DEER_COUNT=6,DEER_LEASH=400;
export const DEER_HEALTH={doe:64,stag:96} as const;
export const STAG_ATTACK={windup:.55,duration:1,speed:560,reach:54,damage:12,cooldown:4.5,retreat:2.2} as const;
const random=(seed:number)=>{const n=Math.sin(seed*183.3+71.9)*43758.5453;return n-Math.floor(n)};
function canopyCover(w:World,p:{x:number;y:number}){
 if(!w.layout)return 0;
 return visiblePlacements(w.layout,{x:p.x-55,y:p.y-140,width:110,height:150}).filter(q=>q.y>=p.y-10&&(ASSET_BY_ID.get(q.assetId)?.foliage||TREE_ART.has(q.assetId))).reduce((score,q)=>score+[[0,-90],[-25,-45],[25,-45],[0,-10]].filter(([dx,dy])=>placementContains(q,p.x+dx,p.y+dy)).length,0);
}
/** Small pairs in clearings beyond the camp perimeter; never edit the draft. */
export function seedCampDeer(w:World){
 if(w.scene||w.animals.some(a=>a.deer))return;
 seedCampChickens(w);
 const homes=w.animals.filter(a=>a.chicken).map(a=>a.chicken!.home);
 const center={x:homes.reduce((n,p)=>n+p.x,0)/(homes.length||1),y:homes.reduce((n,p)=>n+p.y,0)/(homes.length||1)};
 for(let i=0;i<DEER_COUNT&&homes.length;i++){
  const near=homes[Math.floor(i/2)*3%homes.length],outward=Math.atan2(near.y-center.y,near.x-center.x);let home:{x:number;y:number}|undefined,cover=Infinity;
  for(let attempt=0;attempt<64;attempt++){
   const angle=outward+(i%2?.35:-.15)+[0,.2,-.2,.4,-.4,.7,-.7,1][attempt%8],radius=260+Math.floor(attempt/8)*40,p={x:near.x+Math.cos(angle)*radius,y:near.y+Math.sin(angle)*radius};
   if(!worldBlocked(w,p.x,p.y,26)&&!w.animals.some(a=>Math.hypot(a.x-p.x,a.y-p.y)<100)){
    const score=canopyCover(w,p);if(score<cover){home=p;cover=score}if(!score)break;
   }
  }
  if(!home)continue;
  const t=timeOf(w),kind:DeerKind=i%2?'stag':'doe';
  w.animals.push({...home,id:w.serial++,home:i,hp:DEER_HEALTH[kind],maxHp:DEER_HEALTH[kind],moving:false,right:false,flashUntil:0,deer:{kind,home:{...home},direction:i%2?'down-left':'down-right',distance:0,stride:0,state:'idle',since:t,until:t+.8+random(i+201),thinkAt:t,target:{...home},seed:i+203,cycle:0}});
 }
}
export function stepCampDeer(w:World,seconds:number){
 const t=timeOf(w);
 for(const a of w.animals){
  const m=a.deer;if(!m)continue;if(a.hp<=0){m.retaliation=undefined;continue}
  const near=Math.hypot(a.x-w.player.x,a.y-w.player.y);
  if(near>1800){a.moving=false;m.retaliation=undefined;m.reactedHitAt=m.hitAt;continue}
  if(m.hitAt!==undefined&&m.hitAt!==m.reactedHitAt){
   m.reactedHitAt=m.hitAt;
   if(m.kind==='stag'&&!m.retaliation&&t-m.hitAt<.5&&t>=(m.fightReady??0)&&!w.player.downedUntil&&w.player.hp>0){
    const angle=Math.atan2(w.player.y-a.y,w.player.x-a.x);
    m.retaliation={phase:'warn',since:t,angle};m.fightReady=t+STAG_ATTACK.cooldown;
    commitAnimalFacing(m,facing(Math.cos(angle),Math.sin(angle)),t);m.state='idle';m.since=t;a.moving=false;
   }
  }
  if(m.retaliation){
   const attack=m.retaliation,retreat=()=>{m.retaliation=undefined;m.escapeGoal=undefined;m.escapeAngle=undefined;m.escapeUntil=undefined;m.avoidAngle=undefined;m.avoidUntil=undefined;m.avoidRetryAt=undefined;m.fleeUntil=t+STAG_ATTACK.retreat;m.state='run';m.since=t;m.until=m.fleeUntil;m.thinkAt=t;a.moving=false};
   a.moving=false;
   if(w.player.downedUntil||w.player.hp<=0){retreat();continue}
   if(attack.phase==='warn'){
    // Face the actual attacker while preparing. Lock the course at launch,
    // rather than charging a position they left half a second earlier.
    attack.angle=Math.atan2(w.player.y-a.y,w.player.x-a.x);
    updateChickenFacing(m,Math.cos(attack.angle),Math.sin(attack.angle),t,false);
    if(t-attack.since<STAG_ATTACK.windup)continue;
    commitAnimalFacing(m,facing(Math.cos(attack.angle),Math.sin(attack.angle)),t);
    attack.phase='charge';attack.since=t;m.state='run';m.since=t;
   }
   if(t-attack.since>=STAG_ATTACK.duration){retreat();continue}
   // Committed direction: a sidestep can evade it. Never home or hit through walls.
   const x=a.x,y=a.y,dx=Math.cos(attack.angle),dy=Math.sin(attack.angle);
   moveBody(w,a,dx*STAG_ATTACK.speed*seconds,dy*STAG_ATTACK.speed*seconds,20);
   const moved=Math.hypot(a.x-x,a.y-y);a.moving=moved>.01;m.distance+=moved;m.stride+=moved/130;
   const px=w.player.x-a.x,py=w.player.y-a.y,d=Math.hypot(px,py);
   if(d<STAG_ATTACK.reach&&(d<1||(px*dx+py*dy)/d>Math.cos(Math.PI*.4))&&lineClear(a,w.player,w)){
    if(damagePlayer(w,STAG_ATTACK.damage,false,a))moveBody(w,w.player,dx*24,dy*24,19);
    retreat();continue;
   }
   if(moved<.01)retreat();
   continue;
  }
  if(t>=m.thinkAt){
   m.thinkAt=t+.1;
   if((near<(w.player.sprinting?245:180)||t<(m.fleeUntil??0)||t<(a.wildlife?.alertUntil??0)||m.hitAt!==undefined&&t-m.hitAt<1.3)&&!w.player.downedUntil){
    if(m.state!=='run')m.since=t;m.state='run';
    m.target=animalEscapeTarget(a,m,w.player,DEER_LEASH,190,t);
    m.until=Math.max(t+1.6,m.escapeUntil??0);
   }else if(t>=m.until){
    const n=random(m.seed*31+ ++m.cycle);m.state=n<.15?'run':n<.55?'walk':n<.9?'peck':'idle';m.since=t;
    m.until=t+(m.state==='run'||m.state==='walk'?1.8+n*2:1.8+n*2.5);
    if(m.state==='walk'||m.state==='run'){const angle=random(m.seed*59+m.cycle)*Math.PI*2,r=90+random(m.seed+m.cycle*7)*230;m.target={x:m.home.x+Math.cos(angle)*r,y:m.home.y+Math.sin(angle)*r}}
   }
  }
  const wasMoving=a.moving;a.moving=false;
  if(m.hitAt!==undefined&&t-m.hitAt<.21)continue;
  if(m.state!=='walk'&&m.state!=='run')continue;
  const dx=m.target.x-a.x,dy=m.target.y-a.y,d=Math.hypot(dx,dy);
  if(d<6){m.state='idle';m.since=t;m.until=t+.5;continue}
  const running=m.state==='run',step=Math.min(d,(running?275:78)*seconds),x=a.x,y=a.y;
  const moved=moveAnimal(w,a,m,dx,dy,step,20,animalTravelLeash(m,DEER_LEASH,t),t);
  if(moved>.01){a.moving=true;m.distance+=moved;m.stride+=moved/(running?130:85);updateChickenFacing(m,a.x-x,a.y-y,t,wasMoving);a.right=a.x>x}
  else{m.state='idle';m.since=t;m.until=t+.35}
 }
}
export function deerFrame(w:World,a:World['animals'][number]){
 const m=a.deer!,t=timeOf(w);
 if(a.hp<=0)return t-(m.deadAt??t)<.18?14:15;
 if(m.hitAt!==undefined&&t-m.hitAt<.21)return t-m.hitAt<.09?12:13;
 if(m.retaliation?.phase==='warn')return t-m.retaliation.since<.32?10:11;
 if(a.moving)return (m.state==='run'?4:0)+Math.floor(m.stride*4)%4;
 if(m.state==='peck'){const age=(t-m.since)%2.4;return age<.3?8:age<.55?10:age<1.8?11:age<2.1?10:8}
 return (t-m.since)%4.1>3.94?9:8;
}
