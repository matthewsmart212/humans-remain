import {campLootChest,LOOT_CHEST_IMAGE_KEY,lootChestFrame} from './loot-chest';
import type {World} from './survival-engine';

// Ten hand-painted orange chest poses in a 5-column / 2-row atlas.
// Transparent frames are aligned at the same contact point and have full lids.
const FRAME_WIDTH=440,FRAME_HEIGHT=390,COLUMNS=5;
const ART_WIDTH=240,ART_HEIGHT=213,BASELINE_OFFSET=178;
type Viewport={x:number;y:number;width:number;height:number};
const visible=(x:number,y:number,v:Viewport)=>x>v.x-175&&x<v.x+v.width+175&&y>v.y-210&&y<v.y+v.height+95;

/** Draw the exact sprite with no additional turquoise illumination or lid patch. */
export function lootChestDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,viewport:Viewport){
 const p=campLootChest(w);if(!p||!visible(p.x,p.y,viewport))return [];
 const sprite=imgs[LOOT_CHEST_IMAGE_KEY],frame=lootChestFrame(w,p.id);
 return [{y:p.y,draw:()=>{
  ctx.save();
  if(sprite){
   const left=p.x-ART_WIDTH/2,top=p.y-BASELINE_OFFSET;
   ctx.drawImage(sprite,(frame%COLUMNS)*FRAME_WIDTH,Math.floor(frame/COLUMNS)*FRAME_HEIGHT,
    FRAME_WIDTH,FRAME_HEIGHT,left,top,ART_WIDTH,ART_HEIGHT);
  }else{
   ctx.fillStyle='#38302a';ctx.fillRect(p.x-85,p.y-62,170,62);
  }
  ctx.restore();
 }}];
}
