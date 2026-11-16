import {campLootChest,LOOT_CHEST_IMAGE_KEY,lootChestFrame,lootChestOpened} from './loot-chest';
import type {World} from './survival-engine';
const FRAME_WIDTH=96,FRAME_HEIGHT=76,ART_WIDTH=164,ART_HEIGHT=130;
const visible=(x:number,y:number,v:{x:number;y:number;width:number;height:number})=>x>v.x-140&&x<v.x+v.width+140&&y>v.y-155&&y<v.y+v.height+90;
const shimmer=(w:World)=>w.weather?.reducedMotion?0.64:0.62+0.24*Math.sin(w.tick*.105);
/** One cached atlas: opening never decodes six independent textures. */
export function lootChestDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,viewport:{x:number;y:number;width:number;height:number}){
 const p=campLootChest(w);if(!p||!visible(p.x,p.y,viewport))return [];
 const sprite=imgs[LOOT_CHEST_IMAGE_KEY],frame=lootChestFrame(w,p.id);
 return [{y:p.y,draw:()=>{
  ctx.save();ctx.fillStyle='rgba(5,20,19,0.24)';
  ctx.beginPath();ctx.ellipse(p.x,p.y+2,70,16,0,0,Math.PI*2);ctx.fill();
  if(!lootChestOpened(w,p.id)){
   ctx.globalAlpha=shimmer(w)*.20;
   ctx.fillStyle='#20e4d7';ctx.beginPath();ctx.arc(p.x,p.y-35,67,0,Math.PI*2);ctx.fill();
   ctx.globalAlpha=1;
  }
  if(sprite)ctx.drawImage(sprite,(frame%3)*FRAME_WIDTH,Math.floor(frame/3)*FRAME_HEIGHT,FRAME_WIDTH,FRAME_HEIGHT,p.x-ART_WIDTH/2,p.y-ART_HEIGHT+15,ART_WIDTH,ART_HEIGHT);
  else{ctx.fillStyle='#322d25';ctx.fillRect(p.x-58,p.y-44,116,43);ctx.fillStyle='#2acbbb';ctx.fillRect(p.x-48,p.y-30,96,5)}
  ctx.restore();
 }}];
}
/** Emissive LEDs are composited after the nighttime darkness pass. */
export function drawLootChestLights(ctx:CanvasRenderingContext2D,w:World,viewport:{x:number;y:number;width:number;height:number}){
 const p=campLootChest(w);if(!p||!visible(p.x,p.y,viewport))return;
 const opened=lootChestOpened(w,p.id),pulse=shimmer(w),frame=lootChestFrame(w,p.id);
 ctx.save();ctx.globalAlpha=(opened ? .46 : .86)*pulse;ctx.fillStyle='#4bfff0';
 ctx.fillRect(p.x-50,p.y-33,19,3);ctx.fillRect(p.x+32,p.y-33,19,3);
 ctx.beginPath();ctx.arc(p.x,p.y-38,5,0,Math.PI*2);ctx.fill();
 if(opened&&frame>1){ctx.globalAlpha=Math.min(.32,.05+frame*.044)*pulse;ctx.beginPath();ctx.arc(p.x,p.y-62,27,0,Math.PI*2);ctx.fill()}
 ctx.restore();
}
