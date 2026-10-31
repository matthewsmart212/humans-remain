import {angleDelta} from './combat-model';
import {DIRECTION_ANGLES,facing,moveBody,worldBlocked,type Direction,type Vec,type World} from './survival-engine';

export type AnimalSteering={
 direction:Direction;turnCandidate?:Direction;turnSince?:number;turnDistance?:number;facingAt?:number;lastFacingSampleAt?:number;
 escapeAngle?:number;escapeUntil?:number;escapeSide?:number;escapeGoal?:Vec;escapeLeash?:number;escapeCalmAt?:number;
 avoidAngle?:number;avoidUntil?:number;avoidRetryAt?:number;
};
type Motion=AnimalSteering&{home:Vec;seed:number};
const FACING_MARGIN=8*Math.PI/180;
/** Intentional attacks may commit a view immediately. Ordinary locomotion
 * must confirm every change, including reversals and collision restarts. */
export function commitAnimalFacing(m:AnimalSteering,direction:Direction,t:number){
 m.direction=direction;m.facingAt=t;m.turnCandidate=undefined;m.turnSince=undefined;m.turnDistance=0;
}
export function updateAnimalFacing(m:AnimalSteering,dx:number,dy:number,t:number,wasMoving:boolean){
 const distance=Math.hypot(dx,dy);if(distance<.08)return;
 if(m.lastFacingSampleAt!==undefined&&t-m.lastFacingSampleAt>.1){m.turnCandidate=undefined;m.turnDistance=0}
 m.lastFacingSampleAt=t;
 const next=facing(dx,dy);
 if(m.facingAt===undefined){m.facingAt=t;if(!wasMoving){commitAnimalFacing(m,next,t);return}}
 if(next===m.direction||Math.abs(angleDelta(Math.atan2(dy,dx),DIRECTION_ANGLES[m.direction]))<=Math.PI/8+FACING_MARGIN){m.turnCandidate=undefined;m.turnDistance=0;return}
 if(m.turnCandidate!==next){m.turnCandidate=next;m.turnSince=t;m.turnDistance=distance;return}
 m.turnDistance=(m.turnDistance||0)+distance;
 const sharp=Math.abs(angleDelta(DIRECTION_ANGLES[next],DIRECTION_ANGLES[m.direction]))>Math.PI/4+.001;
 if(t-(m.turnSince??t)+1e-9<(sharp?.2:.16)||t-m.facingAt+1e-9<.26||(m.turnDistance||0)<2)return;
 commitAnimalFacing(m,next,t);
}

export const ANIMAL_ESCAPE_SECONDS=2;
export function animalTravelLeash(m:AnimalSteering,homeLeash:number,t:number){return t<(m.escapeCalmAt??0)?Math.max(homeLeash,m.escapeLeash||0):homeLeash}
/** Hold a full escape leg rather than rebuilding it every think tick.
 * A persistent tangent side prevents left/right ping-pong at the home leash. */
export function animalEscapeTarget(a:Vec,m:Motion,player:Vec,leash:number,lead:number,t:number):Vec{
 const distance=lead*3.8;m.escapeLeash=leash+distance;m.escapeCalmAt=t+4;
 if(t>=(m.escapeUntil??0)||m.escapeAngle===undefined||!m.escapeGoal){
  let dx=a.x-player.x,dy=a.y-player.y,d=Math.hypot(dx,dy);
  if(d<1){dx=Math.cos(DIRECTION_ANGLES[m.direction]);dy=Math.sin(DIRECTION_ANGLES[m.direction]);d=1}
  dx/=d;dy/=d;
  const hx=a.x-m.home.x,hy=a.y-m.home.y,h=Math.hypot(hx,hy);
  const travelLeash=m.escapeLeash;
  if(h>travelLeash-80&&hx*dx+hy*dy>0){
   m.escapeSide??=Math.abs(hx*dy-hy*dx)>1?(hx*dy-hy*dx>0?1:-1):m.seed%2?1:-1;
   const side=m.escapeSide;dx=-hy/h*side-hx/h*.4;dy=hx/h*side-hy/h*.4;
  }
  m.escapeAngle=Math.atan2(dy,dx);m.escapeUntil=t+ANIMAL_ESCAPE_SECONDS+(m.seed%3)*.15;
  const target={x:a.x+Math.cos(m.escapeAngle)*distance,y:a.y+Math.sin(m.escapeAngle)*distance},tx=target.x-m.home.x,ty=target.y-m.home.y,targetDistance=Math.hypot(tx,ty);
  if(targetDistance>travelLeash){target.x=m.home.x+tx/targetDistance*travelLeash;target.y=m.home.y+ty/targetDistance*travelLeash}
  m.escapeGoal=target;
 }
 return m.escapeGoal;
}

/** Collision recovery is local and bounded: probe only after poor progress,
 * commit one clear detour, then return to the target. No path grid or timers. */
export function moveAnimal(w:World,a:Vec,m:Motion,dx:number,dy:number,step:number,radius:number,leash:number,t:number){
 const x=a.x,y=a.y,homeDistance=Math.hypot(x-m.home.x,y-m.home.y);
 if(m.avoidAngle!==undefined&&m.avoidUntil!==undefined&&t>=m.avoidUntil){
  // Keep rounding the obstacle until the original route is actually clear;
  // a timer alone must not steer straight back into the same trunk or rock.
  const distance=Math.hypot(dx,dy),look=Math.min(96,distance),probes=Math.ceil(look/14);
  let clear=true;
  for(let i=1;i<=probes;i++)if(worldBlocked(w,x+dx/distance*look*i/probes,y+dy/distance*look*i/probes,radius)){clear=false;break}
  if(clear){m.avoidAngle=undefined;m.avoidUntil=undefined}else m.avoidUntil=t+.2;
 }
 const angle=t<(m.avoidUntil??0)&&m.avoidAngle!==undefined?m.avoidAngle:Math.atan2(dy,dx);
 if(t<(m.avoidRetryAt??0))return 0;
 const move=(heading:number)=>{
  let nx=x+Math.cos(heading)*step,ny=y+Math.sin(heading)*step;
  const hx=nx-m.home.x,hy=ny-m.home.y,h=Math.hypot(hx,hy);
  if(h>leash&&homeDistance<=leash+.01){nx=m.home.x+hx/h*leash;ny=m.home.y+hy/h*leash}
  else if(homeDistance>leash&&h>homeDistance)return 0;
  moveBody(w,a,nx-x,ny-y,radius);
  if(Math.hypot(a.x-m.home.x,a.y-m.home.y)>Math.max(leash,homeDistance)+.01){a.x=x;a.y=y}
  return Math.hypot(a.x-x,a.y-y);
 };
 let moved=move(angle);
 if(moved>=Math.max(.12,step*.2))return moved;
 // Undo a tiny failed slide before choosing the next course. Do not advance
 // the animation or facing from subpixel collision noise.
 a.x=x;a.y=y;
 const side=m.escapeSide??(m.seed%2?1:-1),probe=42;
 for(const turn of [side*Math.PI/4,side*Math.PI/2,side*Math.PI*3/4,-side*Math.PI/4,-side*Math.PI/2,-side*Math.PI*3/4,Math.PI]){
  const candidate=angle+turn,c=Math.cos(candidate),s=Math.sin(candidate);
  let clear=true;
  for(const fraction of [1/3,2/3,1]){const px=x+c*probe*fraction,py=y+s*probe*fraction;if(Math.hypot(px-m.home.x,py-m.home.y)>Math.max(leash,homeDistance)||worldBlocked(w,px,py,radius)){clear=false;break}}
  if(!clear)continue;
  m.avoidAngle=candidate;m.avoidUntil=t+.9;m.avoidRetryAt=undefined;
  moved=move(candidate);if(moved>=Math.max(.12,step*.2))return moved;
  a.x=x;a.y=y;break;
 }
 // A genuinely enclosed animal rests briefly instead of repeatedly restarting.
 m.avoidUntil=undefined;m.avoidRetryAt=t+.3;return 0;
}
