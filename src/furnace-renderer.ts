import {hasMetalworking} from './run-progression';
import {FURNACE_ID,IRONWORKS_IMAGES} from './ironworks-data';
import {furnaces,furnaceWorking} from './camp-furnace';
import {assetImageKey} from './world-assets';
import {placementBounds,placementPoint,type Placement} from './world-layout';
import {timeOf,type World} from './survival-engine';
import type {CampLight} from './lighting-model';
import {FURNACE_FIREBOX} from './camp-worksites-art';

export function drawCampFurnace(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,p:Placement){
 if(p.assetId!==FURNACE_ID)return false;const b=placementBounds(p),image=imgs.campFurnace??imgs[assetImageKey(IRONWORKS_IMAGES.campFurnace)];if(!image)return false;
 ctx.drawImage(image,b.x,b.y,b.width,b.height);const f=w.ironworks?.stations[p.id];
 if(!hasMetalworking(w))return true;
 if(furnaceWorking(f)){
  const t=w.weather?.reducedMotion?0:timeOf(w),frame=Math.floor(t*10)%8;
  const fire=imgs[`furnaceFire${frame}`]??imgs.furnaceFire0;
  const box=FURNACE_FIREBOX;
  ctx.save();ctx.beginPath();box.points.forEach(([x,y],i)=>i?ctx.lineTo(b.x+x*b.width,b.y+y*b.height):ctx.moveTo(b.x+x*b.width,b.y+y*b.height));ctx.closePath();ctx.clip();
  ctx.fillStyle='#d54b1745';ctx.fillRect(b.x+b.width*box.x,b.y+b.height*box.y,b.width*box.width,b.height*box.height);
  // Only the painted flame above the campfire logs enters the stone firebox.
  // Clip after scaling so its masonry and lower sill always stay in front.
  if(fire)ctx.drawImage(fire,340,90,600,440,b.x+b.width*box.x,b.y+b.height*box.y,b.width*box.width,b.height*box.height);
  ctx.restore();
 }
 if(f?.ready&&imgs.ironIngot)for(let i=0;i<Math.min(3,f.ready);i++)ctx.drawImage(imgs.ironIngot,b.x+b.width*(.614+i*.047),b.y+b.height*(.735-i*.013),b.width*.095,b.width*.07);
 return true;
}
export function furnaceLights(w:World):CampLight[]{
 const lights:CampLight[]=[];
 for(const p of furnaces(w.layout))if(furnaceWorking(w.ironworks?.stations[p.id])){const b=placementBounds(p),[x,y]=placementPoint(p,b.x+b.width*FURNACE_FIREBOX.light[0],b.y+b.height*FURNACE_FIREBOX.light[1]);lights.push({x,y,radius:210*p.scale,strength:.65})}return lights;
}
