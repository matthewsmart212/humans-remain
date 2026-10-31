import mask from './river-water-mask.json';
import loggingMask from './river-logging-water-mask.json';
import extensionMasks from './river-extension-water-masks.json';
import bridges from './river-bridges.json';
import sideMasks from './river-side-water-masks.json';
import {EAST_TERRAIN_SCALE} from './east-approach';
import {RIVER_BATCHES} from './river-layout';

// Ownership switches where the continuation becomes opaque, so the old closed
// pool does not leave invisible water collision beneath its new outlet banks.
const masks=[{batch:0,...mask},{batch:1,...loggingMask},...extensionMasks];
const batches=masks.map((mask,index)=>({source:RIVER_BATCHES[mask.batch].source,mask,
 minY:index?RIVER_BATCHES[mask.batch].source.y+RIVER_BATCHES[mask.batch].topFade:-Infinity,
 maxY:index+1<masks.length?RIVER_BATCHES[masks[index+1].batch].source.y+RIVER_BATCHES[masks[index+1].batch].topFade:Infinity}));

export const RIVER_BRIDGES=bridges;
function onBridge(x:number,y:number,r:number){
 return bridges.some(b=>{
  const [ax,ay]=b.from,[bx,by]=b.to,dx=bx-ax,dy=by-ay;
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
  return Math.hypot(x-ax-t*dx,y-ay-t*dy)<=Math.max(0,b.width/2-r);
 });
}

/** Only the installed water is solid. Future river guides remain walkable. */
export function riverWaterBlocked(x:number,y:number,r:number){
 const s=EAST_TERRAIN_SCALE,sx=x/s+600,sy=y/s+600,radius=r/s;
 if(onBridge(sx,sy,radius))return false;
 // Branches can leave dry land between two water channels on the same row.
 // Keep every separate span instead of filling that intervening peninsula.
 for(const mask of sideMasks){
  const source=RIVER_BATCHES[mask.batch].source,px=sx-source.x,py=sy-source.y;
  if(px+radius<0||px-radius>source.width||py+radius<0||py-radius>source.height)continue;
  const start=Math.max(0,Math.floor((py-radius)/mask.step)),end=Math.min(mask.rows.length-1,Math.floor((py+radius)/mask.step));
  for(let i=start;i<=end;i++)for(const row of mask.rows[i]){
   const dx=Math.max(row[0]*mask.step-px,0,px-row[1]*mask.step),dy=Math.max(i*mask.step-py,0,py-(i+1)*mask.step);
   if(dx*dx+dy*dy<=radius*radius)return true;
  }
 }
 for(const {source,mask,minY,maxY} of batches){
  const px=sx-source.x,py=sy-source.y;
  if(px+radius<0||px-radius>source.width||py+radius<0||py-radius>source.height)continue;
  const start=Math.max(0,Math.floor((py-radius)/mask.step)),end=Math.min(mask.rows.length-1,Math.floor((py+radius)/mask.step));
  for(let i=start;i<=end;i++){
   const row=mask.rows[i],rowY=source.y+i*mask.step;if(!row||rowY<minY||rowY>=maxY)continue;
   const dx=Math.max(row[0]*mask.step-px,0,px-row[1]*mask.step),dy=Math.max(i*mask.step-py,0,py-(i+1)*mask.step);
   if(dx*dx+dy*dy<=radius*radius)return true;
  }
 }
 return false;
}
