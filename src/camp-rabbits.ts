import {seedCampChickens,updateChickenFacing,type ChickenMotion} from './camp-chickens';
import {timeOf,worldBlocked,type World} from './survival-engine';

import {animalEscapeTarget,animalTravelLeash,moveAnimal} from './animal-motion';

export type RabbitMotion=ChickenMotion&{hop:number};
export const RABBIT_COUNT=8,RABBIT_LEASH=280;
const random=(seed:number)=>{const n=Math.sin(seed*183.3+71.9)*43758.5453;return n-Math.floor(n)};
/** Spawn small, separated groups outside the camp's authored perimeter. */
export function seedCampRabbits(w:World){
 if(w.scene||w.animals.some(a=>a.rabbit))return;
 seedCampChickens(w);
 const homes=w.animals.filter(a=>a.chicken).map(a=>a.chicken!.home);
 const center={x:homes.reduce((n,p)=>n+p.x,0)/(homes.length||1),y:homes.reduce((n,p)=>n+p.y,0)/(homes.length||1)};
 for(let i=0;i<RABBIT_COUNT&&homes.length;i++){
  const near=homes[i%homes.length],outward=Math.atan2(near.y-center.y,near.x-center.x);let home:{x:number;y:number}|undefined;
  for(let attempt=0;attempt<32;attempt++){
   const angle=outward+[0,.3,-.3,.6,-.6,.9,-.9,1.2,-1.2][attempt%9],radius=100+Math.floor(attempt/9)*35,p={x:near.x+Math.cos(angle)*radius,y:near.y+Math.sin(angle)*radius};
   if(!worldBlocked(w,p.x,p.y,20)&&!w.animals.some(a=>Math.hypot(a.x-p.x,a.y-p.y)<85)){home=p;break}
  }
  if(!home)continue;
  const t=timeOf(w);w.animals.push({...home,id:w.serial++,home:i,hp:32,maxHp:32,moving:false,right:false,flashUntil:0,rabbit:{home:{...home},direction:i%2?'down-left':'down-right',distance:0,hop:0,state:'idle',since:t,until:t+.7+random(i+1),thinkAt:t,target:{...home},seed:i+103,cycle:0}});
 }
}
export function stepCampRabbits(w:World,seconds:number){
 const t=timeOf(w);
 for(const a of w.animals){
  const m=a.rabbit;if(!m||a.hp<=0)continue;
  const near=Math.hypot(a.x-w.player.x,a.y-w.player.y);
  if(near>1800){a.moving=false;continue}
  if(t>=m.thinkAt){
   m.thinkAt=t+.1;
   if((near<185||t<(a.wildlife?.alertUntil??0))&&!w.player.downedUntil){
    if(m.state!=='run')m.since=t;m.state='run';
    m.target=animalEscapeTarget(a,m,w.player,RABBIT_LEASH,185,t);
    m.until=Math.max(t+1.35,m.escapeUntil??0);
   }else if(t>=m.until){
    const n=random(m.seed*31+ ++m.cycle);m.state=n<.28?'run':n<.66?'walk':n<.91?'peck':'idle';m.since=t;
    m.until=t+(m.state==='run'||m.state==='walk'?1.1+n:1.2+n*1.5);
    if(m.state==='walk'||m.state==='run'){const angle=random(m.seed*59+m.cycle)*Math.PI*2,r=80+random(m.seed+m.cycle*7)*150;m.target={x:m.home.x+Math.cos(angle)*r,y:m.home.y+Math.sin(angle)*r}}
   }
  }
  const wasMoving=a.moving;a.moving=false;
  if(m.hitAt!==undefined&&t-m.hitAt<.21)continue;
  if(m.state!=='walk'&&m.state!=='run')continue;
  const dx=m.target.x-a.x,dy=m.target.y-a.y,d=Math.hypot(dx,dy);
  if(d<6){m.state='idle';m.since=t;m.until=t+.5;continue}
  const running=m.state==='run',step=Math.min(d,(running?215:72)*seconds),x=a.x,y=a.y;
  const moved=moveAnimal(w,a,m,dx,dy,step,12,animalTravelLeash(m,RABBIT_LEASH,t),t);
  if(moved>.01){a.moving=true;m.distance+=moved;m.hop+=moved/(running?76:48);updateChickenFacing(m,a.x-x,a.y-y,t,wasMoving);a.right=a.x>x}
  else{m.state='idle';m.since=t;m.until=t+.55}
 }
}
export function rabbitFrame(w:World,a:World['animals'][number]){
 const m=a.rabbit!,t=timeOf(w);
 if(a.hp<=0)return t-(m.deadAt??t)<.18?14:15;
 if(m.hitAt!==undefined&&t-m.hitAt<.21)return t-m.hitAt<.09?12:13;
 if(a.moving)return (m.state==='run'?4:0)+Math.floor(m.hop*4)%4;
 if(m.state==='peck'){const age=(t-m.since)%1.6;return age<.25?8:age<.45?10:age<1.1?11:age<1.3?10:8}
 return (t-m.since)%3.7>3.54?9:8;
}
