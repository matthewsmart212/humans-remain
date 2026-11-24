import {fishingRenderState} from './fishing';
import type {FishingRenderState,FishingVisualFish} from './fishing-types';
import {drawFishingFishAt} from './fishing-water-life';
import {riverWaterContains} from './river-collision';
import {timeOf,type Direction,type World} from './survival-engine';
import type {WeaponPoint,WeaponView} from './weapon-grip';

type Point={x:number;y:number};
type RoundedContext=CanvasRenderingContext2D&{strokeRounded?:()=>void};
export type FishingRodRig={hand:WeaponPoint;butt:Point;tip:Point;reel:Point;points:Point[];angle:number;behind:boolean;mirror:boolean};
const TAU=Math.PI*2,clamp=(n:number)=>Math.max(0,Math.min(1,n));
const SIDES=[-1,1] as const,GUIDES=[5,10,15,19] as const;
const directions:Record<Direction,Point>={down:{x:0,y:1},'down-right':{x:.707,y:.707},right:{x:1,y:0},'up-right':{x:.707,y:-.707},up:{x:0,y:-1},'up-left':{x:-.707,y:-.707},left:{x:-1,y:0},'down-left':{x:-.707,y:.707}};
const stroke=(ctx:RoundedContext)=>ctx.strokeRounded?ctx.strokeRounded():ctx.stroke();
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const active=(s:FishingRenderState)=>s.phase!=='equipped'&&s.phase!=='ready'&&s.phase!=='caught'&&s.phase!=='escaped';
type FloatPoint=Point&{waterY:number;height:number;dip:number};
type DrawingCache={rig:FishingRodRig;float:FloatPoint;aim:Point[];waterFish:FishingVisualFish;airFish:FishingVisualFish;aftermathFish:FishingVisualFish};
const geometry=new WeakMap<World,DrawingCache>();
function drawing(w:World){
 let value=geometry.get(w);if(value)return value;
 const points=Array.from({length:21},()=>({x:0,y:0}));
 const fish=():FishingVisualFish=>({x:0,y:0,angle:0,size:1,variant:0});
 value={rig:{hand:[0,0],butt:{x:0,y:0},tip:points[20],reel:{x:0,y:0},points,angle:0,behind:false,mirror:false},float:{x:0,y:0,waterY:0,height:0,dip:0},aim:Array.from({length:33},()=>({x:0,y:0})),waterFish:fish(),airFish:fish(),aftermathFish:fish()};
 geometry.set(w,value);return value;
}
function castPoint(w:World,s:FishingRenderState,t:number,out:Point){
 const end=s.aimPreview??s.target??s.bobber;if(!end)return out;
 const dir=directions[s.direction],distance=Math.hypot(end.x-w.player.x,end.y-w.player.y),lift=Math.max(60,Math.min(110,distance*.27));
 out.x=lerp(w.player.x+dir.x*22,end.x,t);
 out.y=lerp(w.player.y+dir.y*14,end.y,t)-(1-t)*45-Math.sin(t*Math.PI)*lift;
 return out;
}

/** Preview and airborne float use exactly the same chosen world point and
 * sampled flight curve. The bounded geometry is reused for this world. */
export function fishingAimCurve(w:World,s:FishingRenderState){
 const points=drawing(w).aim;for(let i=0;i<points.length;i++)castPoint(w,s,i/(points.length-1),points[i]);return points;
}

/** The same endpoint drives the airborne float and the line, on both renderers. */
export function fishingFloatPosition(w:World,s:FishingRenderState){
 const p=s.bobber??s.target;if(!p)return;
 let x=p.x,y=p.y,height=0,dip=0;
 if(s.phase==='casting'){
  const t=clamp(s.phaseProgress),point=castPoint(w,s,t,drawing(w).float),direction=directions[s.direction];
  x=point.x;y=point.y;const groundY=lerp(w.player.y+direction.y*14,p.y,t);height=groundY-y;
 }
 if(s.phase==='landing'){
  const t=clamp((s.phaseProgress-.52)/.48),direction=directions[s.direction];
  x=lerp(p.x,w.player.x+direction.x*24,t*.88);y=lerp(p.y,w.player.y-40,t);
  height=Math.sin(t*Math.PI)*22;y-=height;
 }
 const now=w.weather?.reducedMotion?0:timeOf(w);
 if(s.phase==='nibble')dip=clamp(s.nibbleAmount??0)*.27;
 else if(s.phase==='bite')dip=.82+(w.weather?.reducedMotion?0:Math.sin(s.age*9)*.06);
 const bob=w.weather?.reducedMotion?0:s.phase==='waiting'?Math.sin(now*2.7)*.65:0;
 return Object.assign(drawing(w).float,{x,y:y+bob+dip*7,waterY:p.y,height,dip});
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
 const bend=fishing?(s.phase==='reeling'?clamp(s.tension)*31:s.phase==='bite'?10:s.phase==='nibble'?(s.nibbleAmount??0)*3.5:2):1;
 const tremor=w.weather?.reducedMotion?0:s.phase==='reeling'?Math.sin(now*(s.fightBehavior==='surge'?24:13))*s.tension*(s.fightBehavior==='surge'?1.15:.45):Math.sin(now*2.1)*.22;
 const rig=drawing(w).rig,points=rig.points;
 for(let i=0;i<=20;i++){
  const t=i/20;
  points[i].x=hand[0]+dx*t;points[i].y=hand[1]+dy*t-4*t*(1-t)*bend+t*t*bend*.72+t*t*t*tremor;
 }
 rig.butt.x=hand[0]-ux*20;rig.butt.y=hand[1]-uy*20;rig.reel.x=hand[0]-ux*9-uy*5;rig.reel.y=hand[1]-uy*9+ux*5;
 rig.hand=hand;rig.angle=Math.atan2(dy,dx);rig.behind=!fishing&&(view==='up'||view==='up-right');rig.mirror=mirror;return rig;
}

/** Intent overlay is drawn in the actor pass, so an invalid aim onto a deck
 * or bank is still visible. It never changes the lake painting or collision. */
export function drawFishingAim(ctx:CanvasRenderingContext2D,w:World,s:FishingRenderState,mirror=false){
 if(s.phase!=='aiming'||!(s.aimPreview??s.target))return;
 const end=s.aimPreview??s.target!,valid=s.aimValid!==false,sign=mirror?-1:1,points=fishingAimCurve(w,s),reduced=!!w.weather?.reducedMotion;
 const accent=valid?'#f1dfaa':'#e99573',x=(end.x-w.player.x)*sign,y=end.y-w.player.y;
 ctx.save();ctx.strokeStyle='#15362d';ctx.globalAlpha*=.68;ctx.lineWidth=3.4;
 ctx.beginPath();for(let i=0;i<points.length;i++){const p=points[i];i?ctx.lineTo((p.x-w.player.x)*sign,p.y-w.player.y):ctx.moveTo((p.x-w.player.x)*sign,p.y-w.player.y)}stroke(ctx);
 ctx.globalAlpha*=1.35;ctx.strokeStyle=accent;ctx.lineWidth=1.45;ctx.beginPath();
 for(let i=1;i<points.length;i++){if(i%3===0)continue;const a=points[i-1],b=points[i];ctx.moveTo((a.x-w.player.x)*sign,a.y-w.player.y);ctx.lineTo((b.x-w.player.x)*sign,b.y-w.player.y)}stroke(ctx);
 const radius=22+(reduced?0:Math.sin(timeOf(w)*2.2)*1.4);
 ctx.fillStyle=valid?'#91bba0':'#a6624a';ctx.save();ctx.globalAlpha*=.11;ctx.beginPath();ctx.ellipse(x,y,radius, radius*.48,0,0,TAU);ctx.fill();ctx.restore();
 ctx.beginPath();for(let quarter=0;quarter<4;quarter++)for(let i=0;i<=8;i++){
  const a=quarter*Math.PI/2+.12+i/8*(Math.PI/2-.24),px=x+Math.cos(a)*radius,py=y+Math.sin(a)*radius*.48;i?ctx.lineTo(px,py):ctx.moveTo(px,py);
 }ctx.lineWidth=4.1;ctx.strokeStyle='#18362e';stroke(ctx);ctx.lineWidth=2;ctx.strokeStyle=accent;stroke(ctx);
 ctx.lineWidth=1.5;ctx.beginPath();
 if(valid){ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-2);ctx.lineTo(x,y+2)}
 else{ctx.moveTo(x-6,y-4);ctx.lineTo(x+6,y+4);ctx.moveTo(x-6,y+4);ctx.lineTo(x+6,y-4)}stroke(ctx);ctx.restore();
}

/** Draw before the rod so the linen always leaves the final tip guide. */
export function drawFishingLine(ctx:CanvasRenderingContext2D,w:World,s:FishingRenderState,rig:FishingRodRig){
 const float=fishingFloatPosition(w,s);if(!s.lineVisible||!float)return;
 const endX=(float.x-w.player.x)*(rig.mirror?-1:1),endY=float.y-w.player.y-2;
 const length=Math.hypot(endX-rig.tip.x,endY-rig.tip.y);
 const taut=s.phase==='reeling'||s.phase==='landing',sag=taut?Math.max(1.5,7*(1-s.tension)):Math.min(34,6+length*.055);
 ctx.save();ctx.beginPath();for(let i=0;i<=24;i++){const t=i/24,x=lerp(rig.tip.x,endX,t),y=lerp(rig.tip.y,endY,t)+4*t*(1-t)*sag;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.strokeStyle='#183f37';ctx.globalAlpha*=.45;ctx.lineWidth=1.8;stroke(ctx);
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
 for(const index of GUIDES){
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
 ctx.save();ctx.translate(x,y);ctx.scale(1,1-dip*.57);ctx.globalAlpha*=1-dip*.42;
 ctx.strokeStyle='#2d3328';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(0,3);stroke(ctx);
 ctx.fillStyle='#6b3423';ctx.beginPath();ctx.ellipse(0,-3.5,3.1,5.1,0,0,TAU);ctx.fill();
 ctx.fillStyle='#d8c8a1';ctx.beginPath();ctx.ellipse(-.1,-4.4,2.35,3.5,0,0,TAU);ctx.fill();
 ctx.fillStyle='#a14c30';ctx.beginPath();ctx.ellipse(-.1,-7,2.15,2,0,0,TAU);ctx.fill();
 ctx.fillStyle='#ebd7ad';ctx.beginPath();ctx.ellipse(-.9,-5.7,.65,1.6,0,0,TAU);ctx.fill();
 ctx.restore();
}

const DRONE_ARMS=[[-1,-1],[1,-1],[-1,1],[1,1]] as const;
const DRONE_SHELL=[[-13,-10],[-5,-14],[10,-11],[16,-3],[12,10],[-4,13],[-15,6]] as const;
const DRONE_TOP=[[-10,-7],[-4,-10],[9,-8],[12,-1],[8,7],[-4,9],[-11,4]] as const;
function polygon(ctx:CanvasRenderingContext2D,points:readonly (readonly [number,number])[]){
 ctx.beginPath();for(let i=0;i<points.length;i++){const p=points[i];i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])}ctx.closePath();
}
/** A finite, corroded machine silhouette, rather than a fourth swimming fish.
 * Its one dim red lens has no additive glow or offscreen effects. */
export function drawFishingDroneAt(ctx:CanvasRenderingContext2D,fish:FishingVisualFish,time:number,reduced:boolean,aboveWater=false){
 ctx.save();ctx.translate(fish.x,fish.y);ctx.rotate(fish.angle);ctx.scale(fish.size,fish.size);
 ctx.globalAlpha*=aboveWater?1:.62;
 ctx.strokeStyle=aboveWater?'#4c4939':'#28463e';ctx.lineWidth=3.3;ctx.beginPath();
 for(let i=0;i<DRONE_ARMS.length;i++){
  const [sx,sy]=DRONE_ARMS[i];ctx.moveTo(sx*8,sy*5);ctx.lineTo(sx*(i===2?20:22),sy*(i===2?8:14));
 }stroke(ctx);
 for(let i=0;i<DRONE_ARMS.length;i++){
  const [sx,sy]=DRONE_ARMS[i],x=sx*(i===2?20:22),y=sy*(i===2?8:14);
  ctx.strokeStyle=aboveWater?'#716850':'#476758';ctx.lineWidth=1.6;ctx.beginPath();
  for(let j=0;j<=15;j++){const a=(.18+j/15*(i===2?1.2:1.76))*Math.PI,px=x+Math.cos(a)*7.5,py=y+Math.sin(a)*5;i===2&&j===0?ctx.moveTo(px,py):j?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke();
  ctx.fillStyle=aboveWater?'#3c4439':'#223e35';ctx.beginPath();ctx.ellipse(x,y,2.5,2,0,0,TAU);ctx.fill();
  ctx.strokeStyle=aboveWater?'#99896a':'#6d8270';ctx.lineWidth=1.15;ctx.beginPath();ctx.moveTo(x-5,y+1.3);ctx.lineTo(x+4.2,y-1.3);ctx.stroke();
 }
 ctx.fillStyle=aboveWater?'#3b4338':'#1e3c34';polygon(ctx,DRONE_SHELL);ctx.fill();
 ctx.fillStyle=aboveWater?'#7b8060':'#56725a';polygon(ctx,DRONE_TOP);ctx.fill();
 ctx.fillStyle=aboveWater?'#7d5136':'#4b5941';ctx.beginPath();ctx.ellipse(-7,-4,4.3,2.1,0,0,TAU);ctx.ellipse(3,6,3.8,1.9,0,0,TAU);ctx.fill();
 ctx.strokeStyle=aboveWater?'#b2ad81':'#7e9580';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(-8,-7);ctx.lineTo(7,-7);ctx.lineTo(11,-1);ctx.stroke();
 ctx.fillStyle=aboveWater?'#303c32':'#1c3931';ctx.fillRect(-6,-3,10,5);
 ctx.strokeStyle=aboveWater?'#a79c72':'#7b8e70';ctx.lineWidth=.65;ctx.beginPath();for(let i=0;i<4;i++){ctx.moveTo(-5+i*2.2,-2);ctx.lineTo(-5+i*2.2,1)}ctx.stroke();
 ctx.fillStyle='#222f2b';ctx.beginPath();ctx.ellipse(10,-1.5,3.7,3.1,0,0,TAU);ctx.fill();
 ctx.save();ctx.globalAlpha*=reduced?.8:.74+Math.sin(time*2)*.08;ctx.fillStyle=aboveWater?'#a9553b':'#765240';ctx.beginPath();ctx.ellipse(10.4,-1.7,2.1,1.8,0,0,TAU);ctx.fill();ctx.restore();
 ctx.fillStyle=aboveWater?'#d3a579':'#9b9979';ctx.beginPath();ctx.ellipse(10,-2.4,.6,.45,0,0,TAU);ctx.fill();
 ctx.strokeStyle=aboveWater?'#47523e':'#335240';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-11,5);ctx.lineTo(-15,12);ctx.lineTo(-12,18);ctx.lineTo(-16,24);ctx.moveTo(-2,10);ctx.lineTo(-4,18);ctx.lineTo(-1,23);ctx.stroke();
 ctx.restore();
}
function catchObject(ctx:CanvasRenderingContext2D,fish:FishingVisualFish,time:number,reduced:boolean,activity:number,surface:number,aboveWater=false){
 if(fish.species==='drone'||fish.variant===3)drawFishingDroneAt(ctx,fish,time,reduced,aboveWater);
 else drawFishingFishAt(ctx,fish,time,reduced,activity,surface,aboveWater);
}
function droplets(ctx:CanvasRenderingContext2D,x:number,y:number,progress:number,strength:number,reduced:boolean,waterOnly=true){
 if(reduced||progress<=0||progress>=1)return;
 const fade=1-progress;ctx.save();ctx.strokeStyle='#cad7c0';ctx.globalAlpha*=fade*.62;ctx.lineWidth=1;
 ctx.beginPath();for(let i=0;i<7;i++){
  const angle=i*2.3999632297,r=(12+i%3*9)*progress*strength,gx=x+Math.cos(angle)*r,gy=y+Math.sin(angle)*r*.43;
  if(waterOnly&&!riverWaterContains(gx,gy,2))continue;
  const lift=Math.sin(progress*Math.PI)*(13+i%3*5)*strength;
  ctx.moveTo(gx,gy-lift);ctx.lineTo(gx-.35,gy-lift-1.5-fade*1.6);
 }stroke(ctx);ctx.restore();
}
function fishWake(ctx:CanvasRenderingContext2D,fish:FishingVisualFish,strength:number,reduced:boolean,warning=false){
 if(reduced||fish.species==='drone')return;
 const ux=Math.cos(fish.angle),uy=Math.sin(fish.angle),size=fish.size;
 ctx.save();ctx.strokeStyle=warning?'#d1c69c':'#b1c8b2';ctx.globalAlpha*=warning?.25:.14+strength*.19;ctx.lineWidth=warning?.9:1.05;
 ctx.beginPath();for(const side of SIDES){let open=false;for(let i=0;i<8;i++){
  const along=(warning?13+i*1.2:-18-i*3.1)*size,across=side*(warning?4+i*.35:5+i*.75)*size;
  const x=fish.x+ux*along-uy*across,y=fish.y+uy*along+ux*across;
  if(!riverWaterContains(x,y,3)){open=false;continue}
  open?ctx.lineTo(x,y):ctx.moveTo(x,y);open=true;
 }}ctx.stroke();ctx.restore();
}
function feedingCues(ctx:CanvasRenderingContext2D,w:World,s:FishingRenderState,reduced:boolean){
 if(s.phase!=='equipped'&&s.phase!=='ready'&&s.phase!=='aiming')return;
 for(const spot of s.feedingSpots??[]){
  if(!spot.active||!riverWaterContains(spot.x,spot.y,12))continue;
  const age=reduced?.38:((timeOf(w)+Math.abs(spot.x*.013+spot.y*.017))%3.7)/3.7;
  if(age>.72)continue;
  const radius=(spot.kind==='salvage'?9:8)+age*Math.min(24,spot.radius*.7);
  ring(ctx,spot.x,spot.y,radius,(1-age/.72)*(spot.kind==='salvage'?.16:.22));
  if(spot.kind==='salvage'){
   ctx.save();ctx.globalAlpha*=.38*(1-age/.72);ctx.strokeStyle='#ad9475';ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(spot.x-2,spot.y);ctx.lineTo(spot.x+2,spot.y);ctx.moveTo(spot.x,spot.y-1.5);ctx.lineTo(spot.x,spot.y+1.5);ctx.stroke();ctx.restore();
  }
 }
}
function aftermathWater(ctx:CanvasRenderingContext2D,w:World,s:FishingRenderState,reduced:boolean){
 const a=s.aftermath;if(!a||a.kind!=='release')return;
 const progress=clamp(a.age/a.duration);if(progress<.42)return;
 const swim=clamp((progress-.42)/.58),dx=a.to.x-a.from.x,dy=a.to.y-a.from.y,length=Math.max(1,Math.hypot(dx,dy)),fish=drawing(w).aftermathFish;
 const distance=swim*74,x=a.to.x+dx/length*distance,y=a.to.y+dy/length*distance;
 const clear=riverWaterContains(x,y,Math.max(18,a.fish.size*35));
 Object.assign(fish,a.fish,{x:clear?x:a.to.x,y:clear?y:a.to.y,angle:Math.atan2(dy,dx)});
 ctx.save();ctx.globalAlpha*=1-swim*.8;catchObject(ctx,fish,reduced?0:timeOf(w),reduced,2.4,.8);fishWake(ctx,fish,.55,reduced);ctx.restore();
 const splash=clamp((progress-.42)/.26);if(splash<1){ring(ctx,a.to.x,a.to.y,8+splash*29,(1-splash)*.5);droplets(ctx,a.to.x,a.to.y,splash,1,reduced)}
}

/** Active fish and the float remain under the pier artwork, just like ambient
 * fish. Water checks prevent effects ever spilling onto boards or shoreline. */
export function drawFishingWaterAction(ctx:CanvasRenderingContext2D,w:World,s=fishingRenderState(w)){
 if(!s)return;
 const reduced=!!w.weather?.reducedMotion;
 feedingCues(ctx,w,s,reduced);aftermathWater(ctx,w,s,reduced);
 if(s.phase==='equipped'||s.phase==='ready'||s.phase==='aiming'||s.phase==='caught')return;
 const now=reduced?0:timeOf(w),float=fishingFloatPosition(w,s);
 if(s.fish&&riverWaterContains(s.fish.x,s.fish.y,8)&&!(s.phase==='landing'&&s.phaseProgress>.52)){
  const warning=s.fightBehavior==='warning',surge=s.fightBehavior==='surge'?(s.surge??1):0;
  const struggle=s.phase==='escaped'?2.7:warning?.65:s.phase==='reeling'?1.1+surge*2.3:s.phase==='bite'?1.4:s.phase==='nibble'?.65:.8;
  const fish=Object.assign(drawing(w).waterFish,s.fish);
  if(warning&&fish.species!=='drone'){
   // The animal visibly turns away before the pull; it never changes its
   // simulation position or crosses the water-safe fight route.
   const away=Math.atan2(fish.y-w.player.y,fish.x-w.player.x),turn=clamp((s.warning??0)*1.4),blend=turn*turn*(3-2*turn);
   fish.angle+=Math.atan2(Math.sin(away-fish.angle),Math.cos(away-fish.angle))*blend;
  }
  catchObject(ctx,fish,now,reduced,struggle,s.phase==='reeling'?.9:.58);
  if(s.phase==='reeling'||s.phase==='escaped')fishWake(ctx,fish,surge,reduced,warning);
  if(!reduced&&(surge>.2||s.phase==='bite')){
   const p=(s.age*(surge>.2?1.7:1.2))%1;ring(ctx,s.fish.x,s.fish.y,8+p*22,(1-p)*(surge>.2?.32:.18));
  }
 }
 if(!s.bobberVisible||!float)return;
 const onWater=riverWaterContains(float.x,float.waterY,14);
 if(onWater&&float.height<1){
  ctx.save();ctx.fillStyle='#183c32';ctx.globalAlpha*=.24;ctx.beginPath();ctx.ellipse(float.x,float.waterY+1,5,2,0,0,TAU);ctx.fill();ctx.restore();
  if(!reduced){
   const period=s.phase==='bite'?.7:s.phase==='nibble'?.85:1.8;
   for(let i=0;i<2;i++){const p=(s.age/period+i*.5)%1;ring(ctx,float.x,float.waterY,4+p*(s.phase==='bite'?25:s.phase==='nibble'?8:15),(1-p)*(s.phase==='bite'?.44:s.phase==='nibble'?.17:.24))}
   // Landing impact is brief and stays at the cast target, never at the fish.
   if(s.phase==='waiting'&&s.age<.6){ring(ctx,float.x,float.waterY,7+s.age*39,(1-s.age/.6)*.4);droplets(ctx,float.x,float.waterY,s.age/.6,.7,reduced)}
   if(s.phase==='bite'&&s.age<.5)droplets(ctx,float.x,float.waterY,s.age/.5,1.25,reduced);
  }
  if(reduced&&s.phase==='bite')ring(ctx,float.x,float.waterY,16,.5);
 }
 if(s.phase!=='casting'||float.height<1)floatBody(ctx,float.x,float.y,float.dip);
}

/** The release leaves the player's hands above the deck before becoming a
 * water-layer splash. This pass also survives switching away from the rod. */
export function drawFishingAftermathAir(ctx:CanvasRenderingContext2D,w:World,s:FishingRenderState){
 const a=s.aftermath;if(!a)return;
 const progress=clamp(a.age/a.duration),reduced=!!w.weather?.reducedMotion,fish=drawing(w).aftermathFish;
 if(a.kind==='release'){
  if(progress>=.42||reduced)return;
  const t=progress/.42,dx=a.to.x-a.from.x,dy=a.to.y-a.from.y;
  Object.assign(fish,a.fish,{x:lerp(a.from.x,a.to.x,t)-w.player.x,y:lerp(a.from.y-36,a.to.y,t)-w.player.y-Math.sin(t*Math.PI)*43,angle:Math.atan2(dy,dx)+Math.sin(t*Math.PI)*.16});
  catchObject(ctx,fish,timeOf(w),false,2,1,true);droplets(ctx,fish.x,fish.y,t,.42,false,false);
 }else{
  Object.assign(fish,a.fish,{x:a.from.x-w.player.x+16-progress*23,y:a.from.y-w.player.y-38-Math.sin(progress*Math.PI)*8,angle:-.35,size:a.fish.size*(1-progress*.2)});
  ctx.save();ctx.globalAlpha*=1-progress;catchObject(ctx,fish,reduced?0:timeOf(w),reduced,.7,1,true);ctx.restore();
 }
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
 const reduced=!!w.weather?.reducedMotion,p=drawing(w).airFish,drone=s.species==='drone'||s.fish.variant===3;
 Object.assign(p,s.fish,{x:(float.x-w.player.x)*(mirror?-1:1),y:float.y-w.player.y+13,angle:drone?-.35: -Math.PI/2+(reduced?0:Math.sin(s.age*17)*.18)});
 catchObject(ctx,p,reduced?0:timeOf(w),reduced,1.8,1,true);
 droplets(ctx,p.x,p.y,(s.phaseProgress-.52)/.48,drone?.65:.45,reduced,false);
}
