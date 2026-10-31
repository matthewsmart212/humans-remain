import plan from './camp-perimeter-layout.json';
import {usesPaintedHomeTerrain} from './terrain-art';
import {placementBodies} from './world-layout';
import {colliderBounds,hitCollider} from './camp-collision';
import {timeOf,worldBlocked,type Direction,type World} from './survival-engine';
import {animalEscapeTarget,animalTravelLeash,moveAnimal,updateAnimalFacing as updateChickenFacing,type AnimalSteering} from './animal-motion';
export {updateAnimalFacing as updateChickenFacing} from './animal-motion';

export type ChickenMotion=AnimalSteering&{home:{x:number;y:number};direction:Direction;turnCandidate?:Direction;turnSince?:number;distance:number;state:'idle'|'walk'|'run'|'peck';since:number;until:number;thinkAt:number;target:{x:number;y:number};seed:number;cycle:number;deadAt?:number;hitAt?:number};
const wallIds=new Set(plan.placements.filter(p=>!p.id.startsWith('camp-original-gate-')).map(p=>p.id));
const random=(seed:number)=>{const n=Math.sin(seed*127.1+311.7)*43758.5453;return n-Math.floor(n)};
export const CHICKEN_COUNT=10,CHICKEN_LEASH=180;
/** Session entities only: the authored editor layout remains untouched. */
export function seedCampChickens(w:World){
 if(w.scene||!w.layout||!usesPaintedHomeTerrain(w.layout.terrainImage)||w.animals.some(a=>a.chicken))return;
 const walls=w.layout.items.filter(p=>wallIds.has(p.id)).flatMap(p=>placementBodies(p));
 if(walls.length<3)return;
 const boxes=walls.map(colliderBounds),left=Math.min(...boxes.map(b=>b.left)),right=Math.max(...boxes.map(b=>b.right)),top=Math.min(...boxes.map(b=>b.top)),bottom=Math.max(...boxes.map(b=>b.bottom));
 const center={x:(left+right)/2,y:(top+bottom)/2},rx=(right-left)/2,ry=(bottom-top)/2;
 const limit=Math.hypot(right-left,bottom-top);
 for(let i=0;i<CHICKEN_COUNT;i++){
  let home:{x:number;y:number}|undefined;
  for(const jitter of [0,.055,-.055,.11,-.11,.18,-.18]){
   const angle=-Math.PI*.8+i*Math.PI*2/CHICKEN_COUNT+jitter,dx=Math.cos(angle),dy=Math.sin(angle);
   let outer=0;
   for(let r=80;r<limit;r+=16)if(walls.some(b=>hitCollider(b,center.x+dx*r,center.y+dy*r,12)))outer=r;
   if(!outer)outer=1/Math.sqrt((dx/rx)**2+(dy/ry)**2);
   for(let offset=110;offset<=350;offset+=30){
    const p={x:center.x+dx*(outer+offset),y:center.y+dy*(outer+offset)};
    if(!worldBlocked(w,p.x,p.y,22)&&!w.animals.some(a=>Math.hypot(a.x-p.x,a.y-p.y)<100)){home=p;break}
   }
   if(home)break;
  }
  if(!home)continue;
  const t=timeOf(w),seed=i+1;
  w.animals.push({...home,id:w.serial++,home:i,hp:32,maxHp:32,moving:false,right:false,flashUntil:0,chicken:{home:{...home},direction:i%2?'down-left':'down-right',distance:0,state:'idle',since:t,until:t+.35+random(seed)*1.2,thinkAt:t,target:{...home},seed,cycle:0}});
 }
}

/** Decisions are throttled to 10Hz. Visible movement uses the same fixed tick
 * and collision/substep path as the player; no React state or timers per bird. */
export function stepCampChickens(w:World,seconds:number){
 const t=timeOf(w);
 for(const a of w.animals){
  const m=a.chicken;if(!m||a.hp<=0)continue;
  const near=Math.hypot(a.x-w.player.x,a.y-w.player.y);
  if(near>1800){a.moving=false;continue}
  if(t>=m.thinkAt){
   m.thinkAt=t+.1;
   if((near<160||t<(a.wildlife?.alertUntil??0))&&!w.player.downedUntil){
    if(m.state!=='run')m.since=t;
    m.state='run';
    m.target=animalEscapeTarget(a,m,w.player,CHICKEN_LEASH,140,t);
    m.until=Math.max(t+1.1,m.escapeUntil??0);
   }else if(t>=m.until){
    const n=random(m.seed*31+ ++m.cycle);
    m.state=n<.45?'run':n<.8?'walk':n<.93?'peck':'idle';m.since=t;
    m.until=t+(m.state==='run'||m.state==='walk'?1.4+n:.6+n*.8);
    if(m.state==='walk'||m.state==='run'){const angle=random(m.seed*59+m.cycle)*Math.PI*2,r=65+random(m.seed+m.cycle*7)*95;m.target={x:m.home.x+Math.cos(angle)*r,y:m.home.y+Math.sin(angle)*r}}
   }
  }
  const wasMoving=a.moving;a.moving=false;
  if(m.hitAt!==undefined&&t-m.hitAt<.21)continue;
  if(m.state!=='walk'&&m.state!=='run')continue;
  const dx=m.target.x-a.x,dy=m.target.y-a.y,d=Math.hypot(dx,dy);
  if(d<5){m.state='idle';m.since=t;m.until=t+.35;continue}
  const step=Math.min(d,(m.state==='run'?165:48)*seconds),x=a.x,y=a.y;
  const moved=moveAnimal(w,a,m,dx,dy,step,12,animalTravelLeash(m,CHICKEN_LEASH,t),t);
  if(moved>.01){a.moving=true;m.distance+=moved;updateChickenFacing(m,a.x-x,a.y-y,t,wasMoving);a.right=a.x>x}
  else{m.state='idle';m.since=t;m.until=t+.7}
 }
}

export function chickenFrame(w:World,a:World['animals'][number]){
 const m=a.chicken!,t=timeOf(w);
 if(a.hp<=0){const age=t-(m.deadAt??t);return age<.08?12:age<.2?13:age<.34?14:15}
 if(m.hitAt!==undefined&&t-m.hitAt<.21)return t-m.hitAt<.09?12:13;
 if(a.moving)return (m.state==='run'?4:0)+Math.floor(m.distance/(m.state==='run'?48:34)*4)%4;
 if(m.state==='peck'){const age=(t-m.since)%1.3;return age<.18?8:age<.3?10:age<.43?11:age<.55?10:8}
 return (t-m.since)%4.7>4.58?9:8;
}
