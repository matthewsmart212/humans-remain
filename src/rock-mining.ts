import {placementContact as rockContact} from './placement-contact';
export {rockContact};
import {isPickaxe,PICKAXE_GEAR} from './pickaxes';
import {hasGear} from './player-gear';
import {ORE_BONUS_CHANCE} from './ironworks-data';
import {visiblePlacements} from './layout-views';
import {placementBodies,placementBounds,placementPoint,type Placement} from './world-layout';
import {lineClear,worldBlocked,timeOf,type World,type Vec} from './survival-engine';
import {chooseInteractionFocus} from './interaction-focus';

import {drawRockFace,rockMaterials} from './rock-surface';
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
export function nearbyMineableRock(w:World,angle?:number,reach=76):MiningTarget|null{
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


type RockBounds = ReturnType<typeof placementBounds>;
type RockPoint = readonly [number, number];

function fillFace(ctx:CanvasRenderingContext2D, points:readonly RockPoint[], color:string) {
 ctx.beginPath();
 ctx.moveTo(...points[0]);
 for (let i=1; i<points.length; i++) ctx.lineTo(...points[i]);
 ctx.closePath();
 ctx.fillStyle=color;
 ctx.fill();
}

// Narrow, tapered clefts and a light-catching lip expose fresh material under the weathered face.
const split:RockPoint[]=[[.35,.34],[.43,.44],[.414,.50],[.52,.567],[.504,.64],[.56,.735],[.489,.646],[.502,.578],[.397,.511],[.417,.45]];
const splitLip:RockPoint[]=[[.349,.342],[.418,.449],[.398,.511],[.495,.575],[.389,.514],[.41,.451]];
const leftBranch:RockPoint[]=[[.409,.509],[.349,.533],[.313,.509],[.259,.552],[.314,.522],[.349,.547]];
const rightBranch:RockPoint[]=[[.501,.637],[.57,.604],[.6,.536],[.671,.51],[.611,.547],[.58,.618]];

function drawFracture(ctx:CanvasRenderingContext2D, b:RockBounds, damage:number, iron:boolean) {
 ctx.save();
 ctx.translate(b.x,b.y);
 ctx.scale(b.width,b.height);
 // The split lengthens toward the base as the boulder loses strength.
 const length=.48+damage*.52;
 ctx.translate(.42*(1-length),.51*(1-length));
 ctx.scale(length,length);
 fillFace(ctx,split,'rgba(41,34,28,.85)');
 fillFace(ctx,splitLip,iron?'rgba(213,167,119,.78)':'rgba(211,199,167,.69)');
 if(damage>=.35) fillFace(ctx,leftBranch,'rgba(48,39,32,.75)');
 if(damage>=.65) fillFace(ctx,rightBranch,'rgba(45,37,31,.83)');
 ctx.restore();
}

// Offset into separate areas of the original painted surface for each broken fragment.
const rubble = [
 {x:.08,y:-.22,width:.22,height:.18,u:.49,v:.47,flip:false},
 {x:-.20,y:-.11,width:.32,height:.24,u:.39,v:.58,flip:true},
 {x:.245,y:-.035,width:.23,height:.15,u:.48,v:.62,flip:false},
 {x:-.035,y:.015,width:.16,height:.105,u:.52,v:.60,flip:false},
 {x:-.29,y:.038,width:.084,height:.063,u:.42,v:.44,flip:true},
];
const shard:RockPoint[]=[[-.51,-.40],[-.19,-.92],[.21,-1],[.49,-.65],[.39,-.21],[.10,0],[-.34,-.13]];
const cleavedEdge:RockPoint[]=[[-.51,-.40],[-.19,-.24],[.20,-.34],[.49,-.65],[.39,-.21],[.1,0],[-.34,-.13]];

function drawRubble(ctx:CanvasRenderingContext2D, image:HTMLImageElement, crop:readonly number[], p:Placement, b:RockBounds, iron:boolean) {
 const [sx,sy,sw,sh]=crop;
 for(const piece of rubble) {
  ctx.save();
  ctx.translate(p.x+piece.x*b.width,p.y+piece.y*b.height);
  ctx.scale(piece.width*b.width*(piece.flip?-1:1),piece.height*b.height);
  ctx.beginPath();
  ctx.ellipse(.03,-.06,.55,.18,0,0,Math.PI*2);
  ctx.fillStyle='rgba(32,32,24,.24)';
  ctx.fill();
  fillFace(ctx,shard,iron?'#665445':'#716b59');
  ctx.clip();
  ctx.drawImage(image,sx+(piece.u-.07)*sw,sy+(piece.v-.07)*sh,.14*sw,.14*sh,-.52,-1,1.04,1.01);
  fillFace(ctx,cleavedEdge,iron?'rgba(60,41,31,.55)':'rgba(52,49,38,.49)');
  ctx.restore();
 }
}

const chipFaces:RockPoint[]=[[-1,-.25],[-.35,-.62],[1,-.10],[.32,.57],[-.61,.34]];
const stoneChips=['#c2b99e','#827d6b','#a49d85'];
const ironChips=['#c5b8a5','#986744','#7e817b'];

function drawChips(ctx:CanvasRenderingContext2D, p:Placement, contact:Vec, age:number, iron:boolean) {
 const [cx,cy]=placementPoint(p,contact.x,contact.y,true);
 const colors=iron?ironChips:stoneChips;
 const opacity=ctx.globalAlpha;
 for(let i=0;i<7;i++){
  const angle=i*2.399, speed=38+(i%4)*16, lift=64+(i%3)*20;
  ctx.save();
  ctx.globalAlpha=opacity*(1-Math.pow(age/.42,2));
  ctx.translate(cx+Math.cos(angle)*speed*age*p.scale,cy+(Math.sin(angle)*speed*.42*age-lift*age+220*age*age)*p.scale);
  ctx.rotate(angle+age*(i%2?5:-4));
  const size=(2+(i%3))*p.scale;
  ctx.scale(size,size);
  fillFace(ctx,chipFaces,colors[i%3]);
  ctx.restore();
 }
}

export function drawMineableRock(ctx:CanvasRenderingContext2D,image:HTMLImageElement,w:World,p:Placement,crop:readonly number[]){
 const spec=MINEABLE_ROCKS.get(p.assetId);
 if(!spec)return false;
 const b=placementBounds(p),state=w.rockMining?.[p.id];
 const age=state?Math.max(0,timeOf(w)-state.hitAt):Infinity;
 const motion=!w.weather?.reducedMotion,iron=!!spec.metalOnly;
 if(state?.hp===0){
  drawRubble(ctx,image,crop,p,b,iron);
 }else{
  ctx.save();
  if(motion&&age<.18)ctx.translate(Math.sin(age*90)*(1-age/.18)*2*p.scale,0);
  drawRockFace(ctx,image,crop,b,rockMaterials.get(p.assetId)!);
  if(state)drawFracture(ctx,b,1-state.hp/spec.hp,iron);
  ctx.restore();
 }
 if(state&&motion&&age<.42)drawChips(ctx,p,state.contact,age,iron);
 return true;
}
