import {FISHING_PIER_IMAGE,FISHING_PIER_SIZE,FISHING_PIER_WATER_FEET} from './fishing-site-art';
import {fishingPierMetadata} from './fishing-site-metadata';
import {fishingPierWaterline,type FishingPierSurfaceContext} from './fishing-site-surface';
import {fishingPiers,fishingPierGeometry,fishingPierDeckContains,type FishingPierGeometry} from './fishing-site-geometry';
import {riverWaterContains} from './river-collision';
import {usesPaintedHomeTerrain} from './terrain-art';
import type {Placement} from './world-layout';
import type {World} from './survival-engine';
import type {FoliageViewport} from './foliage-renderer';

export {fishingFishSchool,fishingFishPosition,type FishingFishOrbit} from './fishing-water-life';
import {fishingFishSchool,drawFishingFish} from './fishing-water-life';

const waterContacts=new WeakMap<FishingPierGeometry,readonly {x:number;y:number;size:number}[]>();
const wetSurfaces=new WeakMap<FishingPierGeometry,readonly [number,number]>();
const pierShadows=new WeakMap<FishingPierGeometry,readonly {x:number;y:number}[]>();
const intersects=(a:{x:number;y:number;width:number;height:number},b:FoliageViewport,pad=0)=>a.x+a.width+pad>=b.x&&a.x-pad<=b.x+b.width&&a.y+a.height+pad>=b.y&&a.y-pad<=b.y+b.height;
function placementTransform(ctx:CanvasRenderingContext2D,p:Placement,g:FishingPierGeometry){
 ctx.translate(p.x,p.y);ctx.rotate((p.rotation??0)*Math.PI/180);ctx.translate(-p.x,-p.y);
 if(p.flipX||p.flipY){const b=g.bounds,cx=b.x+b.width/2,cy=b.y+b.height/2;ctx.translate(cx,cy);ctx.scale(p.flipX?-1:1,p.flipY?-1:1);ctx.translate(-cx,-cy)}
}
function painting(ctx:CanvasRenderingContext2D,image:HTMLImageElement,g:FishingPierGeometry){
 const b=g.bounds,c=fishingPierMetadata().crop;ctx.drawImage(image,c[0],c[1],c[2],c[3],b.x,b.y,b.width,b.height);
}
function wetSurface(g:FishingPierGeometry):readonly [number,number]{
 let wet=wetSurfaces.get(g);
 if(!wet){
  const u=1225/FISHING_PIER_SIZE[0],v=fishingPierWaterline(1225)/FISHING_PIER_SIZE[1];
  wet=[riverWaterContains(g.waterEnd.x,g.waterEnd.y,18)?1:0,
   riverWaterContains(g.originX+u*g.uX+v*g.vX,g.originY+u*g.uY+v*g.vY)?1:0];
  wetSurfaces.set(g,wet);
 }
 return wet;
}
function drawPierShadow(ctx:FishingPierSurfaceContext,g:FishingPierGeometry){
 const scale=g.bounds.width/740;
 let shadow=pierShadows.get(g);
 if(!shadow){
  // Water is below the boards; the landing rests directly on the bank. Keep
  // its shadow close so the short apron feels seated instead of hovering.
  shadow=g.deck.map(([x,y])=>riverWaterContains(x,y)?
   {x:x+8*scale,y:y+22*scale}:{x:x+2*scale,y:y+4*scale});
  pierShadows.set(g,shadow);
 }
 ctx.save();ctx.fillStyle='#102b26';ctx.strokeStyle='#102b26';ctx.beginPath();
 for(let i=0;i<shadow.length;i++){
  const {x,y}=shadow[i];i?ctx.lineTo(x,y):ctx.moveTo(x,y);
 }
 ctx.closePath();ctx.globalAlpha*=.16;ctx.fill();
 // A few soft edge bands follow the deck's actual silhouette. No broad oval
 // shadow, full-screen layer or per-frame image allocation is needed.
 for(const [width,opacity]of [[30,.13],[18,.18],[8,.22]]){
  ctx.lineWidth=width*scale;ctx.save();ctx.globalAlpha*=opacity;
  ctx.strokeRounded?ctx.strokeRounded():ctx.stroke();ctx.restore();
 }
 ctx.restore();
}
function drawWaterContacts(ctx:CanvasRenderingContext2D,g:FishingPierGeometry,time:number){
 let contacts=waterContacts.get(g);
 if(!contacts){
  contacts=FISHING_PIER_WATER_FEET.map(([u],i)=>{
   const v=fishingPierWaterline(u*FISHING_PIER_SIZE[0])/FISHING_PIER_SIZE[1];
   return{x:g.originX+u*g.uX+v*g.vX,y:g.originY+u*g.uY+v*g.vY,
    size:g.bounds.width/740*(i===1||i===3?.72:1)};
  }).filter(p=>riverWaterContains(p.x,p.y,26*p.size));
  waterContacts.set(g,contacts);
 }
 for(let i=0;i<contacts.length;i++){
  const {x,y,size}=contacts[i],swell=1+Math.sin(time*.7+i*1.8)*.06;
  ctx.save();ctx.globalAlpha*=.16;ctx.strokeStyle='#a7beb0';ctx.lineWidth=.8;
  for(const [start,end,radius]of [[.1,.76,24],[1.12,1.65,21]]){
   ctx.beginPath();
   for(let step=0;step<=8;step++){
    const angle=(start+(end-start)*step/8)*Math.PI;
    const px=x+Math.cos(angle)*radius*size*swell,py=y+Math.sin(angle)*4.5*size*swell;
    step?ctx.lineTo(px,py):ctx.moveTo(px,py);
   }
   ctx.stroke();
  }
  ctx.restore();
 }
}

/** Water life stays below the complete pier painting; every actor walks above its planks. */
export function drawFishingSiteGround(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,view:FoliageViewport){
 const piers=fishingPiers(w.layout);if(!piers.length)return;
 const image=imgs['placed:'+fishingPierMetadata().image];if(!image)return;
 const home=!w.scene&&usesPaintedHomeTerrain(w.layout?.terrainImage),life=home&&(view.scale??1)>=.25;
 const approved=fishingPierMetadata().image===FISHING_PIER_IMAGE,reduced=!!w.weather?.reducedMotion,time=reduced?0:w.tick/60;
 if(home&&approved)for(const p of piers){
  const g=fishingPierGeometry(p);if(intersects(g.worldBounds,view,40)&&wetSurface(g)[0])drawPierShadow(ctx,g);
 }
 if(life)for(const p of piers){
  const g=fishingPierGeometry(p);if(!intersects(g.worldBounds,view,600))continue;
  for(const fish of fishingFishSchool(p)){
   if(fish.x+fish.rx+fish.drawRadius<view.x||fish.x-fish.rx-fish.drawRadius>view.x+view.width||fish.y+fish.ry+fish.drawRadius<view.y||fish.y-fish.ry-fish.drawRadius>view.y+view.height)continue;
   drawFishingFish(ctx,fish,time,reduced);
  }
 }
 for(const p of piers){
  const g=fishingPierGeometry(p);if(!intersects(g.worldBounds,view))continue;
  const surface=ctx as FishingPierSurfaceContext,wet=home&&approved?wetSurface(g):undefined;
  ctx.save();placementTransform(ctx,p,g);
  if(wet?.some(Boolean)&&surface.drawFishingPierSurface)surface.drawFishingPierSurface(image,fishingPierMetadata().crop,g.bounds,wet);
  else painting(ctx,image,g);
  ctx.restore();
  if(life&&approved)drawWaterContacts(ctx,g,time);
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
