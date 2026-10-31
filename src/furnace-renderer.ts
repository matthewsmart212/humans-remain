import {hasMetalworking} from './run-progression';
import {FURNACE_ID} from './ironworks-data';
import {furnaces,furnaceWorking} from './camp-furnace';
import {assetImageKey} from './world-assets';
import {placementBounds,placementPoint,type Placement} from './world-layout';
import {timeOf,type World} from './survival-engine';
import type {CampLight} from './lighting-model';

export function drawCampFurnace(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,p:Placement){
 if(p.assetId!==FURNACE_ID)return false;const b=placementBounds(p),image=imgs.campFurnace??imgs[assetImageKey('/survival/ironworks-v1/camp-furnace.png')];if(!image)return false;
 ctx.drawImage(image,b.x,b.y,b.width,b.height);const f=w.ironworks?.stations[p.id];
 if(!hasMetalworking(w)){
  ctx.save();ctx.strokeStyle='#251c18';ctx.lineWidth=Math.max(2,b.width*.012);ctx.beginPath();ctx.moveTo(b.x+b.width*.45,b.y+b.height*.27);ctx.lineTo(b.x+b.width*.49,b.y+b.height*.39);ctx.lineTo(b.x+b.width*.43,b.y+b.height*.48);ctx.lineTo(b.x+b.width*.48,b.y+b.height*.57);ctx.stroke();
  ctx.fillStyle='#6e4f32';ctx.translate(b.x+b.width*.44,b.y+b.height*.65);ctx.rotate(-.2);ctx.fillRect(-b.width*.14,-b.height*.02,b.width*.28,b.height*.035);ctx.restore();return true;
 }
 if(furnaceWorking(f)){
  const t=w.weather?.reducedMotion?0:timeOf(w),frame=Math.floor(t*10)%8;
  const fire=imgs[`furnaceFire${frame}`]??imgs.furnaceFire0;
  ctx.save();ctx.beginPath();[[.365,.695],[.363,.617],[.37,.579],[.395,.548],[.442,.537],[.486,.541],[.518,.565],[.535,.61],[.536,.69]].forEach(([x,y],i)=>i?ctx.lineTo(b.x+x*b.width,b.y+y*b.height):ctx.moveTo(b.x+x*b.width,b.y+y*b.height));ctx.closePath();ctx.clip();
  ctx.fillStyle='#d54b1745';ctx.fillRect(b.x+b.width*.35,b.y+b.height*.53,b.width*.2,b.height*.18);
  // Only the painted flame above the campfire logs enters the stone firebox.
  // Clip after scaling so its masonry and lower sill always stay in front.
  if(fire)ctx.drawImage(fire,340,90,600,440,b.x+b.width*.35,b.y+b.height*.53,b.width*.20,b.height*.17);
  ctx.restore();
 }
 if(f?.ready&&imgs.ironIngot)for(let i=0;i<Math.min(3,f.ready);i++)ctx.drawImage(imgs.ironIngot,b.x+b.width*(.105+i*.045),b.y+b.height*(.647-i*.013),b.width*.095,b.width*.07);
 return true;
}
export function furnaceLights(w:World):CampLight[]{
 const lights:CampLight[]=[];
 for(const p of furnaces(w.layout))if(furnaceWorking(w.ironworks?.stations[p.id])){const b=placementBounds(p),[x,y]=placementPoint(p,b.x+b.width*.45,b.y+b.height*.66);lights.push({x,y,radius:210*p.scale,strength:.65})}return lights;
}
