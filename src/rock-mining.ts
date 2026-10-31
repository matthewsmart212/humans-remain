import {isPickaxe,PICKAXE_GEAR} from './pickaxes';
import {hasGear} from './player-gear';
import {ORE_BONUS_CHANCE} from './ironworks-data';
import {visiblePlacements} from './layout-views';
import {placementBodies,placementBounds,placementPoint,type Placement} from './world-layout';
import {lineClear,worldBlocked,timeOf,type World,type Vec} from './survival-engine';
import {chooseInteractionFocus} from './interaction-focus';

import {MINEABLE_ROCKS} from './mining-rocks';
export {MINEABLE_ROCKS} from './mining-rocks';
export type RockMiningState={hp:number;hitAt:number;contact:Vec;ore?:number;brokenAt?:number};
export type MiningTarget={placement:Placement;point:Vec;distance:number;hp:number;maxHp:number;stone:number;ore:number;metalOnly:boolean};
/** One fixed roll per boulder per run, independent of hit count, tool tier and serial allocations. */
export function bonusIronOre(w:World,id:string){
 let n=(w.miningSeed??0x19341)>>>0;for(let i=0;i<id.length;i++)n=Math.imul(n^id.charCodeAt(i),16777619)>>>0;
 n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);n=(n^(n>>>16))>>>0;
 return n/0x100000000<ORE_BONUS_CHANCE?1:0;
}
export const canMineRock=(w:World,target:MiningTarget)=>isPickaxe(w.player.equipped)&&hasGear(w,w.player.equipped)&&(!target.metalOnly||w.player.equipped==='metalPickaxe');
const segmentPoint=(a:Vec,b:Vec,p:Vec)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return{x:a.x+dx*t,y:a.y+dy*t}};

/** Use the traced ground footprint, including rotated/flipped rocks, rather than their tall painted bounds. */
export function rockContact(p:Placement,origin:Vec){
 const points:Vec[]=[];
 for(const c of placementBodies(p)){
  if(c.shape==='rect')points.push({x:Math.max(c.x-c.hw,Math.min(c.x+c.hw,origin.x)),y:Math.max(c.y-c.hh,Math.min(c.y+c.hh,origin.y))});
  else if(c.shape==='polygon')for(let i=0;i<c.points.length;i++){const a=c.points[i],b=c.points[(i+1)%c.points.length];points.push(segmentPoint({x:a[0],y:a[1]},{x:b[0],y:b[1]},origin))}
  else if(c.shape==='segment'){const q=segmentPoint(c,{x:c.ex,y:c.ey},origin),d=Math.hypot(origin.x-q.x,origin.y-q.y)||1;points.push({x:q.x+(origin.x-q.x)/d*c.r,y:q.y+(origin.y-q.y)/d*c.r})}
 }
 return points.sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y))[0]??{x:p.x,y:p.y};
}
export function nearbyMineableRock(w:World,angle?:number,reach=140):MiningTarget|null{
 if(!w.layout||w.scene)return null;
 const candidates:MiningTarget[]=[];
 for(const p of visiblePlacements(w.layout,{x:w.player.x-reach-450,y:w.player.y-reach-450,width:2*(reach+450),height:2*(reach+450)})){
  const spec=MINEABLE_ROCKS.get(p.assetId);if(!spec||p.solid===false||w.rockMining?.[p.id]?.hp===0)continue;
  const point=rockContact(p,w.player),dx=point.x-w.player.x,dy=point.y-w.player.y,distance=Math.hypot(dx,dy);
  if(distance>reach||angle!==undefined&&Math.cos(Math.atan2(dy,dx)-angle)<Math.cos(Math.PI*.34))continue;
  const ratio=Math.max(0,distance-9)/(distance||1),near={x:w.player.x+dx*ratio,y:w.player.y+dy*ratio};
  if(!lineClear(w.player,near,w))continue;
  candidates.push({placement:p,point,distance,hp:w.rockMining?.[p.id]?.hp??spec.hp,maxHp:spec.hp,stone:spec.stone,ore:spec.ore??0,metalOnly:!!spec.metalOnly});
 }
 return chooseInteractionFocus(w,candidates.map(value=>({id:`rock:${value.placement.id}`,...value.point,available:canMineRock(w,value),value})));
}
/** A contact resolves once. Damage and yield cannot be supplied by another weapon or repeated on depleted nodes. */
export function mineRock(w:World,angle:number){
 const tool=w.player.equipped;
 if(!isPickaxe(tool)||!hasGear(w,tool)||w.phase==='over'||w.player.hp<=0||w.player.downedUntil||w.stationPanel||w.dodge)return false;
 const target=nearbyMineableRock(w,angle);if(!target||!canMineRock(w,target))return false;
 const {placement:p}=target,t=timeOf(w),hp=Math.max(0,target.hp-PICKAXE_GEAR[tool].damage);
 const ore=w.rockMining?.[p.id]?.ore??(target.ore||bonusIronOre(w,p.id));
 (w.rockMining??={})[p.id]={hp,hitAt:t,contact:target.point,ore,...(hp===0?{brokenAt:t}:{})};
 w.effects.push({...target.point,id:w.serial++,type:'hit',born:t,label:hp===0?(ore?'IRON ORE':'STONE'):String(PICKAXE_GEAR[tool].damage)});
 if(!w.weather?.reducedMotion)w.shakeUntil=Math.max(w.shakeUntil,t+.07);
 if(!hp){
  // Only this run's collision is opened. The authored placement and editor stay intact.
  const ignored=w.minedRockColliders??=new Set<string>();for(const c of placementBodies(p))ignored.add(c.id);
  for(const [index,kind,amount]of [[0,'stone',target.stone],[1,'ironOre',ore]] as const){
   if(!amount)continue;let drop={x:w.player.x,y:w.player.y};
   for(let i=0;i<24;i++){const a=Math.atan2(w.player.y-p.y,w.player.x-p.x)+(i+index*4)*Math.PI/6,r=48+Math.floor(i/12)*28,q={x:w.player.x+Math.cos(a)*r,y:w.player.y+Math.sin(a)*r};if(!worldBlocked(w,q.x,q.y,12)&&lineClear(w.player,q,w)&&!w.loot.some(l=>Math.hypot(l.x-q.x,l.y-q.y)<28)){drop=q;break}}
   w.loot.push({...drop,id:w.serial++,kind,amount,sourceRockId:p.id,flight:{from:target.point,born:t,lands:t+.45+index*.08}});
  }
  w.notice=`Boulder broken · ${target.stone} stone${ore?` + ${ore} iron ore`:''}`;w.noticeUntil=t+2.5;
 }
 return true;
}

/** Reuse the original painted rock for every damage state; cracks and chips are local, cached-art drawing. */
export function drawMineableRock(ctx:CanvasRenderingContext2D,image:HTMLImageElement,w:World,p:Placement,crop:readonly number[]){
 const spec=MINEABLE_ROCKS.get(p.assetId);if(!spec)return false;
 const b=placementBounds(p),state=w.rockMining?.[p.id],age=state?timeOf(w)-state.hitAt:Infinity;
 ctx.save();
 if(state?.hp===0){
  for(const [dx,dy,s]of [[-.23,-.06,.30],[.15,-.01,.24],[.02,-.16,.20]] as const){const width=b.width*s,height=b.height*s*.62;ctx.drawImage(image,...crop as [number,number,number,number],p.x+dx*b.width-width/2,p.y+dy*b.height-height,width,height)}
 }else{
  if(age<.18&&!w.weather?.reducedMotion)ctx.translate(Math.sin(age*90)*(1-age/.18)*2,0);
  ctx.drawImage(image,...crop as [number,number,number,number],b.x,b.y,b.width,b.height);
  if(state){
   ctx.strokeStyle='#2c2c24';ctx.lineWidth=Math.max(1.5,b.width*.012);ctx.lineJoin='round';
   const lines=[[[.47,.28],[.43,.47],[.55,.58],[.46,.77]],[[.43,.47],[.26,.53],[.2,.66]],[[.55,.58],[.7,.48],[.77,.57]]];
   for(const line of lines.slice(0,state.hp<spec.hp*.5?3:2)){ctx.beginPath();line.forEach(([x,y],i)=>i?ctx.lineTo(b.x+b.width*x,b.y+b.height*y):ctx.moveTo(b.x+b.width*x,b.y+b.height*y));ctx.stroke()}
  }
 }
 if(state&&age<.38&&!w.weather?.reducedMotion){
  // Convert the world contact into this placement's unrotated drawing coordinates.
  const point=placementPoint(p,state.contact.x,state.contact.y,true);
  for(let i=0;i<7;i++){const a=i*2.399,r=12+age*90,x=point[0]+Math.cos(a)*r,y=point[1]+Math.sin(a)*r*.35-age*80+age*age*190;ctx.globalAlpha=1-age/.38;ctx.fillStyle=i%2?'#bab09a':'#746e60';ctx.fillRect(x,y,3+(i%3),3+(i%2))}
 }
 ctx.restore();return true;
}
