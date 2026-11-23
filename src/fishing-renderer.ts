import {fishingRenderState} from './fishing';
import type {FishingRenderState} from './fishing-types';
import {drawFishingFishAt} from './fishing-water-life';
import {riverWaterContains} from './river-collision';
import {timeOf,type Direction,type World} from './survival-engine';
import type {WeaponPoint,WeaponView} from './weapon-grip';

type Point={x:number;y:number};
type RoundedContext=CanvasRenderingContext2D&{strokeRounded?:()=>void};
export type FishingRodRig={hand:WeaponPoint;butt:Point;tip:Point;reel:Point;points:Point[];angle:number;behind:boolean;mirror:boolean};
const TAU=Math.PI*2,clamp=(n:number)=>Math.max(0,Math.min(1,n));
const directions:Record<Direction,Point>={down:{x:0,y:1},'down-right':{x:.707,y:.707},right:{x:1,y:0},'up-right':{x:.707,y:-.707},up:{x:0,y:-1},'up-left':{x:-.707,y:-.707},left:{x:-1,y:0},'down-left':{x:-.707,y:.707}};
const stroke=(ctx:RoundedContext)=>ctx.strokeRounded?ctx.strokeRounded():ctx.stroke();
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const active=(s:FishingRenderState)=>s.phase!=='equipped'&&s.phase!=='ready'&&s.phase!=='caught'&&s.phase!=='escaped';

/** The same endpoint drives the airborne float and the line, on both renderers. */
export function fishingFloatPosition(w:World,s:FishingRenderState){
 const p=s.bobber??s.target;if(!p)return;
 let x=p.x,y=p.y,height=0;
 if(s.phase==='casting'){
  const t=clamp(s.phaseProgress),direction=directions[s.direction];
  x=lerp(w.player.x+direction.x*22,p.x,t);y=lerp(w.player.y+direction.y*14,p.y,t);
  height=(1-t)*45+Math.sin(t*Math.PI)*96;
 }
 if(s.phase==='landing'){
  const t=clamp((s.phaseProgress-.52)/.48),direction=directions[s.direction];
  x=lerp(p.x,w.player.x+direction.x*24,t*.88);y=lerp(p.y,w.player.y-40,t);
  height=Math.sin(t*Math.PI)*19;
 }
 const now=w.weather?.reducedMotion?0:timeOf(w);
 const bob=s.phase==='bite'?Math.sin(s.age*19)*1.6+Math.max(0,Math.sin(s.age*16))*2.3:s.phase==='waiting'?Math.sin(now*2.7)*.65:0;
 return {x,y:y-height+bob,waterY:p.y,height};
}

/** A shared three-dimensional-looking rod projected into the painted world.
 * No image, canvas, shader or readback is allocated during animation. */
export function fishingRodRig(w:World,s:FishingRenderState,hand:WeaponPoint,view:WeaponView,mirror=false):FishingRodRig{
 const now=w.weather?.reducedMotion?0:timeOf(w),fishing=active(s),dir=directions[s.direction];
 let dx=dir.x*(mirror?-1:1)*128,dy=dir.y*92-70;
 if(view==='down'){dx=55;dy=27}
 if(view==='up')dx=17;
 if(!fishing){dx=view==='up'||view==='up-right'?31:43;dy=-131}
 const charge=s.phase==='aiming'?clamp(s.charge):s.phase==='casting'?1-clamp(s.phaseProgress*2.7):0;
 if(charge){dx=lerp(dx,-24,charge*.84);dy=lerp(dy,-139,charge)}
 if(s.phase==='reeling'){dx*=1-s.tension*.12;dy-=11+s.tension*15}
 if(s.phase==='landing'){dx*=1-s.phaseProgress*.32;dy-=s.phaseProgress*48}
 const length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
 const bend=fishing?(s.phase==='reeling'?clamp(s.tension)*31:s.phase==='bite'?8+Math.sin(s.age*15)*4:2):1;
 const tremor=w.weather?.reducedMotion?0:s.phase==='reeling'?Math.sin(now*19)*s.tension*.8:Math.sin(now*2.1)*.22;
 const points:Point[]=[];
 for(let i=0;i<=20;i++){
  const t=i/20;
  points.push({x:hand[0]+dx*t,y:hand[1]+dy*t-4*t*(1-t)*bend+t*t*bend*.72+t*t*t*tremor});
 }
 const butt={x:hand[0]-ux*20,y:hand[1]-uy*20},reel={x:hand[0]-ux*9-uy*5,y:hand[1]-uy*9+ux*5};
 return {hand,butt,tip:points[20],points,reel,angle:Math.atan2(dy,dx),behind:!fishing&&(view==='up'||view==='up-right'),mirror};
}

function polyline(ctx:CanvasRenderingContext2D,points:readonly Point[]){
 ctx.beginPath();for(let i=0;i<points.length;i++){const p=points[i];i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)}
}

/** Draw before the rod so the linen always leaves the final tip guide. */
export function drawFishingLine(ctx:CanvasRenderingContext2D,w:World,s:FishingRenderState,rig:FishingRodRig){
 const float=fishingFloatPosition(w,s);if(!s.lineVisible||!float)return;
 const end={x:(float.x-w.player.x)*(rig.mirror?-1:1),y:float.y-w.player.y-2};
 const length=Math.hypot(end.x-rig.tip.x,end.y-rig.tip.y);
 const taut=s.phase==='reeling'||s.phase==='landing',sag=taut?Math.max(1.5,7*(1-s.tension)):Math.min(34,6+length*.055);
 const points:Point[]=[];
 for(let i=0;i<=24;i++){const t=i/24;points.push({x:lerp(rig.tip.x,end.x,t),y:lerp(rig.tip.y,end.y,t)+4*t*(1-t)*sag})}
 ctx.save();polyline(ctx,points);ctx.strokeStyle='#183f37';ctx.globalAlpha*=.45;ctx.lineWidth=1.8;stroke(ctx);
 ctx.globalAlpha*=1.72;ctx.strokeStyle='#d4ceb0';ctx.lineWidth=.68;stroke(ctx);ctx.restore();
}

/** Tapered ash shaft, bound cork grip, small brass reel and individual guides. */
export function drawFishingRod(ctx:CanvasRenderingContext2D,w:World,s:FishingRenderState,rig:FishingRodRig){
 const {hand,butt,points,reel}=rig,ux=Math.cos(rig.angle),uy=Math.sin(rig.angle);
 ctx.save();
 // Individual tapered sections retain detail at device resolution without
 // an outlined vector silhouette or a stretched flat inventory illustration.
 for(let pass=0;pass<3;pass++)for(let i=0;i<points.length-1;i++){
  const t=i/(points.length-1),a=points[i],b=points[i+1];
  ctx.strokeStyle=pass===0?'#352a1c':pass===1?'#987045':'#c3a16b';
  ctx.lineWidth=pass===0?4.05*(1-t)+.65:pass===1?2.7*(1-t)+.38:.65*(1-t)+.16;
  const offset=pass===2?-.65*(1-t):0;
  ctx.beginPath();ctx.moveTo(a.x+uy*offset,a.y-ux*offset);ctx.lineTo(b.x+uy*offset,b.y-ux*offset);stroke(ctx);
 }
 ctx.strokeStyle='#30291e';ctx.lineWidth=7.2;ctx.beginPath();ctx.moveTo(butt.x,butt.y);ctx.lineTo(hand[0]+ux*5,hand[1]+uy*5);stroke(ctx);
 ctx.strokeStyle='#8e704d';ctx.lineWidth=5.1;stroke(ctx);
 ctx.strokeStyle='#c5a273';ctx.lineWidth=.7;ctx.beginPath();
 for(let i=0;i<8;i++){
  const d=-17+i*2.8,x=hand[0]+ux*d,y=hand[1]+uy*d;
  ctx.moveTo(x-uy*2.35-ux*.4,y+ux*2.35-uy*.4);ctx.lineTo(x+uy*2.35+ux*.7,y-ux*2.35+uy*.7);
 }ctx.stroke();
 // Warm binding bands and subdued metal eyes follow the actual bent shaft.
 for(const index of [5,10,15,19]){
  const p=points[index],next=points[Math.min(20,index+1)],a=Math.atan2(next.y-p.y,next.x-p.x),nx=-Math.sin(a),ny=Math.cos(a);
  ctx.strokeStyle='#4b3d28';ctx.lineWidth=index===5?2.3:1.65;ctx.beginPath();ctx.moveTo(p.x-nx*1.1,p.y-ny*1.1);ctx.lineTo(p.x+nx*1.1,p.y+ny*1.1);ctx.stroke();
  ctx.strokeStyle='#b4ac87';ctx.lineWidth=.55;ctx.beginPath();ctx.ellipse(p.x+nx*1.5,p.y+ny*1.5,index<15?1.75:1.15,.92,0,0,TAU);ctx.stroke();
 }
 ctx.strokeStyle='#332d22';ctx.lineWidth=2.1;ctx.beginPath();ctx.moveTo(hand[0]-ux*7,hand[1]-uy*7);ctx.lineTo(reel.x,reel.y);stroke(ctx);
 ctx.fillStyle='#392f24';ctx.beginPath();ctx.ellipse(reel.x,reel.y,5.7,5.2,0,0,TAU);ctx.fill();
 ctx.fillStyle='#a88a50';ctx.beginPath();ctx.ellipse(reel.x-.35,reel.y-.5,4.5,4.1,0,0,TAU);ctx.fill();
 ctx.fillStyle='#4a584b';ctx.beginPath();ctx.ellipse(reel.x,reel.y,2.9,2.6,0,0,TAU);ctx.fill();
 ctx.strokeStyle='#d3bc87';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(reel.x-.2,reel.y-.3,3.3,Math.PI*1.05,Math.PI*1.75);ctx.stroke();
 const crank=s.holding&&!w.weather?.reducedMotion?timeOf(w)*13:.65,cx=reel.x+Math.cos(crank)*5.3,cy=reel.y+Math.sin(crank)*4.4;
 ctx.strokeStyle='#b8a471';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(reel.x,reel.y);ctx.lineTo(cx,cy);ctx.stroke();
 ctx.fillStyle='#463a29';ctx.beginPath();ctx.ellipse(cx,cy,1.65,1.45,0,0,TAU);ctx.fill();
 ctx.restore();
}

function ring(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,alpha:number){
 ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle='#c2cdb4';ctx.lineWidth=.85;
 ctx.beginPath();for(let arc=0;arc<2;arc++)for(let i=0;i<=12;i++){
  const angle=(.10+arc+i/12*.78)*Math.PI,px=x+Math.cos(angle)*r,py=y+Math.sin(angle)*r*.43;
  i?ctx.lineTo(px,py):ctx.moveTo(px,py);
 }ctx.stroke();ctx.restore();
}

function floatBody(ctx:CanvasRenderingContext2D,x:number,y:number,dip:number){
 ctx.save();ctx.translate(x,y+dip);
 ctx.strokeStyle='#2d3328';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(0,3);stroke(ctx);
 ctx.fillStyle='#6b3423';ctx.beginPath();ctx.ellipse(0,-3.5,3.1,5.1,0,0,TAU);ctx.fill();
 ctx.fillStyle='#d8c8a1';ctx.beginPath();ctx.ellipse(-.1,-4.4,2.35,3.5,0,0,TAU);ctx.fill();
 ctx.fillStyle='#a14c30';ctx.beginPath();ctx.ellipse(-.1,-7,2.15,2,0,0,TAU);ctx.fill();
 ctx.fillStyle='#ebd7ad';ctx.beginPath();ctx.ellipse(-.9,-5.7,.65,1.6,0,0,TAU);ctx.fill();
 ctx.restore();
}

/** Active fish and the float remain under the pier artwork, just like ambient
 * fish. Water checks prevent effects ever spilling onto boards or shoreline. */
export function drawFishingWaterAction(ctx:CanvasRenderingContext2D,w:World,s=fishingRenderState(w)){
 if(!s||s.phase==='equipped'||s.phase==='ready'||s.phase==='aiming'||s.phase==='caught')return;
 const reduced=!!w.weather?.reducedMotion,now=reduced?0:timeOf(w),float=fishingFloatPosition(w,s);
 if(s.fish&&riverWaterContains(s.fish.x,s.fish.y,8)&&!(s.phase==='landing'&&s.phaseProgress>.52)){
  const struggle=s.phase==='escaped'?2.2:s.phase==='reeling'?1.8+s.tension:s.phase==='bite'?1.35:.8;
  drawFishingFishAt(ctx,s.fish,now,reduced,struggle,s.phase==='reeling'?.88:.45);
  if(!reduced&&(s.phase==='reeling'||s.phase==='bite')){
   for(let i=0;i<2;i++){const p=(s.age*1.6+i*.5)%1;ring(ctx,s.fish.x,s.fish.y,9+p*24,(1-p)*.25)}
  }
 }
 if(!s.bobberVisible||!float)return;
 const onWater=riverWaterContains(float.x,float.waterY,14);
 if(onWater&&float.height<1){
  ctx.save();ctx.fillStyle='#183c32';ctx.globalAlpha*=.24;ctx.beginPath();ctx.ellipse(float.x,float.waterY+1,5,2,0,0,TAU);ctx.fill();ctx.restore();
  if(!reduced){
   const period=s.phase==='bite'?.55:1.8;
   for(let i=0;i<2;i++){const p=(s.age/period+i*.5)%1;ring(ctx,float.x,float.waterY,4+p*(s.phase==='bite'?20:15),(1-p)*.24)}
   // Landing impact is brief and stays at the cast target, never at the fish.
   if(s.phase==='waiting'&&s.age<.6)ring(ctx,float.x,float.waterY,7+s.age*39,(1-s.age/.6)*.35);
  }
 }
 if(s.phase!=='casting'||float.height<1)floatBody(ctx,float.x,float.y,0);
}

/** An airborne float/catch belongs in the actor pass, above the pier boards. */
export function drawFishingAirborneTackle(ctx:CanvasRenderingContext2D,w:World,s:FishingRenderState,mirror:boolean){
 if(s.phase==='casting'&&s.bobberVisible){
  const float=fishingFloatPosition(w,s);
  if(float&&float.height>=1)floatBody(ctx,(float.x-w.player.x)*(mirror?-1:1),float.y-w.player.y,0);
  return;
 }
 if(s.phase!=='landing'||s.phaseProgress<=.52||!s.fish)return;
 const float=fishingFloatPosition(w,s);if(!float)return;
 const p={...s.fish,x:(float.x-w.player.x)*(mirror?-1:1),y:float.y-w.player.y+13,angle:-Math.PI/2+Math.sin(s.age*17)*.13};
 drawFishingFishAt(ctx,p,w.weather?.reducedMotion?0:timeOf(w),!!w.weather?.reducedMotion,1.5,1,true);
}
