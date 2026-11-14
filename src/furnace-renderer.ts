import {hasMetalworking} from './run-progression';
import {FURNACE_ID,IRONWORKS_IMAGES} from './ironworks-data';
import {FURNACE_ACTIVE_FRAMES,FURNACE_ANIMATION_FPS} from './furnace-animation-art';
import {buildingRestored} from './camp-restoration';
import {furnaces,furnaceWorking} from './camp-furnace';
import {assetImageKey} from './world-assets';
import {placementBounds,placementPoint,type Placement} from './world-layout';
import {timeOf,type World} from './survival-engine';
import type {CampLight} from './lighting-model';
import {FURNACE_FIREBOX} from './camp-worksites-art';

export function drawCampFurnace(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,p:Placement){
 if(p.assetId!==FURNACE_ID)return false;
 const b=placementBounds(p),station=w.ironworks?.stations[p.id];
 const cold=imgs.campFurnace??imgs[assetImageKey(IRONWORKS_IMAGES.campFurnace)];
 const working=hasMetalworking(w)&&furnaceWorking(station);
 const time=w.weather?.reducedMotion?0:timeOf(w);
 const frame=Math.floor(time*FURNACE_ANIMATION_FPS)%FURNACE_ACTIVE_FRAMES.length;
 const image=working?(imgs[`furnaceFire${frame}`]??imgs[assetImageKey(FURNACE_ACTIVE_FRAMES[frame])]??imgs.furnaceFire0??cold):cold;
 if(!image)return false;
 ctx.drawImage(image,b.x,b.y,b.width,b.height);
 if(station?.ready&&imgs.ironIngot)for(let i=0;i<Math.min(3,station.ready);i++)ctx.drawImage(imgs.ironIngot,b.x+b.width*(.673+i*.027),b.y+b.height*(.568-i*.01),b.width*.055,b.width*.041);
 return true;
}

export function furnaceLights(w:World):CampLight[]{
 if(!hasMetalworking(w)||!buildingRestored(w,'furnace'))return [];
 const lights:CampLight[]=[];
 for(const p of furnaces(w.layout))if(furnaceWorking(w.ironworks?.stations[p.id])){
  const b=placementBounds(p),[x,y]=placementPoint(p,b.x+b.width*FURNACE_FIREBOX.light[0],b.y+b.height*FURNACE_FIREBOX.light[1]);
  lights.push({x,y,radius:210*p.scale,strength:.65});
 }
 return lights;
}
