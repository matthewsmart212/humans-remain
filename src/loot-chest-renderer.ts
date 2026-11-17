import {campLootChest,LOOT_CHEST_ID,LOOT_CHEST_IMAGE_KEY,lootChestFrame,lootChestOpened,lootChestRemaining} from './loot-chest';
import type {World} from './survival-engine';
const FRAME_WIDTH=256,FRAME_HEIGHT=192,ART_WIDTH=164,ART_HEIGHT=130;
const visible=(x:number,y:number,v:{x:number;y:number;width:number;height:number})=>x>v.x-140&&x<v.x+v.width+140&&y>v.y-155&&y<v.y+v.height+90;
const pulse=(w:World)=>w.weather?.reducedMotion?.65:.70+.30*Math.sin(w.tick*.08);
const chestAge=(w:World)=>Math.max(0,w.tick-(w.lootChests?.[LOOT_CHEST_ID]?.openedAt??w.tick));
/** The loot is part of the opened chest's interior, never spawned onto the terrain. */
export function lootChestDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,viewport:{x:number;y:number;width:number;height:number}){
 const p=campLootChest(w);if(!p||!visible(p.x,p.y,viewport))return [];
 const sprite=imgs[LOOT_CHEST_IMAGE_KEY],frame=lootChestFrame(w,p.id);
 return [{y:p.y,draw:()=>{
  ctx.save();
  // Use the shadow painted into the sprite, not a second ground oval.
  if(sprite){
   const top=p.y-ART_HEIGHT+15;
   ctx.drawImage(sprite,(frame%3)*FRAME_WIDTH,Math.floor(frame/3)*FRAME_HEIGHT,FRAME_WIDTH,FRAME_HEIGHT,p.x-ART_WIDTH/2,top,ART_WIDTH,ART_HEIGHT);
   // The atlas already has opening frames; never composite the closed lid on top.
  }
  else{ctx.fillStyle='#322d25';ctx.fillRect(p.x-58,p.y-44,116,43);ctx.fillStyle='#2acbbb';ctx.fillRect(p.x-48,p.y-30,96,5)}
  // The rewards are presented in the menu after the chest opens.
  ctx.restore();
 }}];
}
/** Cheap layered emissive effects, composited after the camp darkness pass. */
export function drawLootChestLights(ctx:CanvasRenderingContext2D,w:World,viewport:{x:number;y:number;width:number;height:number}){
 const p=campLootChest(w);if(!p||!visible(p.x,p.y,viewport))return;
 const opened=lootChestOpened(w,p.id),age=chestAge(w),remaining=lootChestRemaining(w,p.id);
 const reduced=!!w.weather?.reducedMotion;
 const opening=opened&&age<68&&!reduced?Math.sin(Math.PI*Math.min(1,age/68)):0;
 const glow=opened?(remaining?0.78:0.24):0.9;
 const flicker=pulse(w),s=glow*flicker;
 ctx.save();
 const cy=p.y-(opened?62:36);
 // Three concentric halos give the core apparent bloom without GPU blur.
 if(opened)for(let ring=2;ring>=1;ring--){
  ctx.globalAlpha=(.035+opening*.045)*s;
  ctx.fillStyle=ring%2?'#2cfff1':'#bffffb';
  ctx.beginPath();ctx.arc(p.x,cy,14+ring*14+opening*16,0,Math.PI*2);ctx.fill();
 }
 // Opening sends turquoise light shafts up through the raised lid.
 if(opening>.03){
  for(let i=-3;i<=3;i++){
   ctx.globalAlpha=(.055+opening*.08)*s;
   ctx.fillStyle=i%2?'#b9fff4':'#16e8dc';
   ctx.beginPath();ctx.moveTo(p.x+i*12,p.y-53);ctx.lineTo(p.x+i*26-9,p.y-125-opening*65);ctx.lineTo(p.x+i*26+12,p.y-125-opening*65);ctx.closePath();ctx.fill();
  }
  ctx.strokeStyle='#bdfff7';ctx.lineWidth=2;ctx.globalAlpha=opening*.50*s;
  ctx.beginPath();ctx.ellipse(p.x,p.y-46,40+opening*48,17+opening*29,0,0,Math.PI*2);ctx.stroke();
 }
 // Orbiting sparks and rising motes, never an item ejection.
 const count=reduced?8:22;
 for(let i=0;i<count;i++){
  const phase=reduced?(i%4)/4:(w.tick*(.025+(i%3)*.008)+i*.31)%1;
  const angle=reduced?i*.61:w.tick*(.012+(i%4)*.003)+i*1.931;
  const x=p.x+Math.sin(angle)*(36+(i*17%38)),y=cy+14-Math.cos(i*2.57)*11-phase*(30+(i%4)*9)+opening*12;
  ctx.globalAlpha=(.30+opening*.50)*(i%3===0?1:.7)*(1-phase*.55)*s;
  ctx.fillStyle=i%3===0?'#e3fff7':'#57eadd';
  ctx.fillRect(x,y,i%4===0?3:2,i%4===0?3:2);
  if(i%5===0){ctx.globalAlpha=.23*s;ctx.fillRect(x-4,y+1,11,1);ctx.fillRect(x+1,y-4,1,11)}
 }
 ctx.globalAlpha=(opened?0.80:0.9)*s;ctx.fillStyle='#a5fff6';
 ctx.fillRect(p.x-50,p.y-33,19,3);ctx.fillRect(p.x+32,p.y-33,19,3);
 // The chest artwork supplies its own lock glow; don't overlay a second circle.
 ctx.restore();
}
