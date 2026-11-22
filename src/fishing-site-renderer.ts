import {FISHING_PIER_WATER_FEET} from './fishing-site-art';
import {fishingPierMetadata} from './fishing-site-metadata';
import {fishingPiers,fishingPierGeometry,fishingPierDeckContains,type FishingPierGeometry} from './fishing-site-geometry';
import {riverWaterContains} from './river-collision';
import {usesPaintedHomeTerrain} from './terrain-art';
import type {Placement} from './world-layout';
import type {World} from './survival-engine';
import type {FoliageViewport} from './foliage-renderer';

export type FishingFishOrbit={x:number;y:number;rx:number;ry:number;phase:number;speed:number;size:number;period:number;rippleOffset:number};
const schools=new WeakMap<Placement,{geometry:FishingPierGeometry;fish:readonly FishingFishOrbit[]}>();
const waterContacts=new WeakMap<FishingPierGeometry,readonly {x:number;y:number;size:number}[]>();
const TAU=Math.PI*2;
const intersects=(a:{x:number;y:number;width:number;height:number},b:FoliageViewport,pad=0)=>a.x+a.width+pad>=b.x&&a.x-pad<=b.x+b.width&&a.y+a.height+pad>=b.y&&a.y-pad<=b.y+b.height;
function hash(text:string){let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return n>>>0}

/** Build a few complete water-only routes once, never scan world placements per frame. */
export function fishingFishSchool(p:Placement):readonly FishingFishOrbit[]{
 const geometry=fishingPierGeometry(p),cached=schools.get(p);
 if(cached?.geometry===geometry)return cached.fish;
 const fish:FishingFishOrbit[]=[],seed=hash(p.id),origin=geometry.waterEnd;
 const scale=Math.max(.6,Math.min(1.5,geometry.bounds.width/660));
 if(geometry.deck.length>=3)for(let i=0;i<42&&fish.length<5;i++){
  const angle=i*2.399963229728653+(seed%6283)/1000,ring=(80+(i%3)*65)*scale;
  const x=origin.x+Math.cos(angle)*ring,y=origin.y+Math.sin(angle)*ring*.8;
  if(fishingPierDeckContains(p,x,y))continue;
  const rx=(25+(i*17%28))*scale,ry=(13+(i*11%14))*scale,size=(.8+(i*7%6)*.08)*scale;
  let water=true;
  // Sampling is finer than the artwork water-mask cells; the extra margin
  // contains each fish, its tail, and the largest occasional ripple.
  for(let j=0;j<40;j++)if(!riverWaterContains(x+Math.cos(j*TAU/40)*rx,y+Math.sin(j*TAU/40)*ry,36*scale)){water=false;break}
  if(!water)continue;
  fish.push({x,y,rx,ry,phase:((seed+i*977)%6283)/1000,speed:(.12+(i%4)*.018)*(i%2?-1:1),size,period:17+(i%4)*2,rippleOffset:((seed+i*131)%170)/10});
 }
 schools.set(p,{geometry,fish});return fish;
}
export function fishingFishPosition(fish:FishingFishOrbit,time:number){
 const phase=fish.phase+time*fish.speed;
 return {x:fish.x+Math.cos(phase)*fish.rx,y:fish.y+Math.sin(phase)*fish.ry,angle:Math.atan2(Math.cos(phase)*fish.ry*fish.speed,-Math.sin(phase)*fish.rx*fish.speed)};
}
function drawFish(ctx:CanvasRenderingContext2D,fish:FishingFishOrbit,time:number,reduced:boolean){
 const phase=fish.phase+time*fish.speed,c=Math.cos(phase),s=Math.sin(phase);
 const x=fish.x+c*fish.rx,y=fish.y+s*fish.ry,angle=Math.atan2(c*fish.ry*fish.speed,-s*fish.rx*fish.speed);
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(fish.size,fish.size);
 ctx.globalAlpha*=.6+.07*Math.sin(phase*.7+fish.phase);ctx.fillStyle='#153c38';
 ctx.beginPath();ctx.ellipse(0,0,12.5,4.5,0,0,TAU);ctx.fill();
 const tail=reduced?0:Math.sin(time*3.4+fish.phase)*1.6;
 ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(-18.75,-5+tail);ctx.lineTo(-16.25,tail);ctx.lineTo(-18.75,5+tail);ctx.closePath();ctx.fill();
 ctx.globalAlpha*=.5;ctx.beginPath();ctx.moveTo(-1.25,-2.5);ctx.lineTo(-6.25,-7.5);ctx.lineTo(5,-2.5);ctx.closePath();ctx.fill();
 ctx.restore();
 if(reduced)return;
 const age=(time+fish.rippleOffset)%fish.period,duration=1.7;
 if(age>=duration)return;
 // An expanding ring stays at the place where the fish disturbed the surface.
 const startPhase=fish.phase+(time-age)*fish.speed,rx=fish.x+Math.cos(startPhase)*fish.rx,ry=fish.y+Math.sin(startPhase)*fish.ry;
 const radius=(4+age*13)*fish.size;
 ctx.save();ctx.globalAlpha*=.17*(1-age/duration);ctx.strokeStyle='#c1d3c8';ctx.lineWidth=1;
 ctx.beginPath();ctx.ellipse(rx,ry,radius,radius*.55,0,0,TAU);ctx.stroke();
 if(age>.24){ctx.globalAlpha*=.45;ctx.beginPath();ctx.ellipse(rx,ry,radius*.64,radius*.35,0,0,TAU);ctx.stroke()}
 ctx.restore();
}
function placementTransform(ctx:CanvasRenderingContext2D,p:Placement,g:FishingPierGeometry){
 ctx.translate(p.x,p.y);ctx.rotate((p.rotation??0)*Math.PI/180);ctx.translate(-p.x,-p.y);
 if(p.flipX||p.flipY){const b=g.bounds,cx=b.x+b.width/2,cy=b.y+b.height/2;ctx.translate(cx,cy);ctx.scale(p.flipX?-1:1,p.flipY?-1:1);ctx.translate(-cx,-cy)}
}
function painting(ctx:CanvasRenderingContext2D,image:HTMLImageElement,g:FishingPierGeometry){
 const b=g.bounds,c=fishingPierMetadata().crop;ctx.drawImage(image,c[0],c[1],c[2],c[3],b.x,b.y,b.width,b.height);
}
function drawWaterContacts(ctx:CanvasRenderingContext2D,g:FishingPierGeometry){
 let contacts=waterContacts.get(g);
 if(!contacts){
  contacts=FISHING_PIER_WATER_FEET.map(([u,v],i)=>({
   x:g.originX+u*g.uX+v*g.vX,y:g.originY+u*g.uY+v*g.vY,
   size:g.bounds.width/660*(i===1||i===3?.72:1),
  })).filter(p=>riverWaterContains(p.x,p.y,25*p.size));
  waterContacts.set(g,contacts);
 }
 for(const {x,y,size}of contacts){
  ctx.save();ctx.globalAlpha*=.35;ctx.fillStyle='#174f4b';
  ctx.beginPath();ctx.ellipse(x,y,19*size,4*size,0,0,TAU);ctx.fill();
  ctx.globalAlpha*=.55;ctx.strokeStyle='#b6cec0';ctx.lineWidth=.8;
  ctx.beginPath();ctx.ellipse(x,y,24*size,5*size,0,0,TAU);ctx.stroke();ctx.restore();
 }
}

/** Water life stays below the complete pier painting; every actor walks above its planks. */
export function drawFishingSiteGround(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,view:FoliageViewport){
 const piers=fishingPiers(w.layout);if(!piers.length)return;
 const image=imgs['placed:'+fishingPierMetadata().image];if(!image)return;
 const life=!w.scene&&usesPaintedHomeTerrain(w.layout?.terrainImage)&&(view.scale??1)>=.25,reduced=!!w.weather?.reducedMotion,time=reduced?0:w.tick/60;
 if(life)for(const p of piers){
  const g=fishingPierGeometry(p);if(!intersects(g.worldBounds,view,450))continue;
  for(const fish of fishingFishSchool(p)){
   if(fish.x+fish.rx+40<view.x||fish.x-fish.rx-40>view.x+view.width||fish.y+fish.ry+40<view.y||fish.y-fish.ry-40>view.y+view.height)continue;
   drawFish(ctx,fish,time,reduced);
  }
 }
 for(const p of piers){
  const g=fishingPierGeometry(p);if(!intersects(g.worldBounds,view))continue;
  ctx.save();placementTransform(ctx,p,g);painting(ctx,image,g);ctx.restore();
  if(life)drawWaterContacts(ctx,g);
 }
}

/** Replay only the painted uprights at their actual feet, using the same aligned texture. */
export function fishingPierForegroundDrawables(ctx:CanvasRenderingContext2D,image:HTMLImageElement,p:Placement){
 const g=fishingPierGeometry(p),b=g.bounds;
 return g.foreground.map(part=>({y:part.foot.y,layer:p.layer??0,draw:()=>{
  ctx.save();placementTransform(ctx,p,g);ctx.beginPath();
  for(let i=0;i<part.outline.length;i++){const [u,v]=part.outline[i],x=b.x+u*b.width,y=b.y+v*b.height;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}
  ctx.closePath();ctx.clip();painting(ctx,image,g);ctx.restore();
 }}));
}
