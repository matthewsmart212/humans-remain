import {campLootChest,LOOT_CHEST_ID,LOOT_CHEST_IMAGE_KEY,LOOT_CHEST_REWARDS,lootChestContents,lootChestFrame,lootChestOpened,lootChestRemaining} from './loot-chest';
import type {World} from './survival-engine';
const FRAME_WIDTH=256,FRAME_HEIGHT=192,ART_WIDTH=164,ART_HEIGHT=130;
const visible=(x:number,y:number,v:{x:number;y:number;width:number;height:number})=>x>v.x-140&&x<v.x+v.width+140&&y>v.y-155&&y<v.y+v.height+90;
const pulse=(w:World)=>w.weather?.reducedMotion?.65:.70+.30*Math.sin(w.tick*.08);
const chestAge=(w:World)=>Math.max(0,w.tick-(w.lootChests?.[LOOT_CHEST_ID]?.openedAt??w.tick));
/** The loot is part of the opened chest's interior, never spawned onto the terrain. */
export function lootChestDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,viewport:{x:number;y:number;width:number;height:number}){
 const p=campLootChest(w);if(!p||!visible(p.x,p.y,viewport))return [];
 const sprite=imgs[LOOT_CHEST_IMAGE_KEY],frame=lootChestFrame(w,p.id),opened=lootChestOpened(w,p.id),remaining=lootChestRemaining(w,p.id);
 return [{y:p.y,draw:()=>{
  ctx.save();
  ctx.fillStyle='rgba(5,20,19,0.25)';
  ctx.beginPath();ctx.ellipse(p.x,p.y+2,70,16,0,0,Math.PI*2);ctx.fill();
  // A broad aura makes the cache unmistakably special even before it is opened.
  const alpha=opened?.10:.17;
  ctx.globalAlpha=alpha*pulse(w);ctx.fillStyle='#16e9dc';
  ctx.beginPath();ctx.ellipse(p.x,p.y-18,77,34,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
  if(sprite)ctx.drawImage(sprite,(frame%3)*FRAME_WIDTH,Math.floor(frame/3)*FRAME_HEIGHT,FRAME_WIDTH,FRAME_HEIGHT,p.x-ART_WIDTH/2,p.y-ART_HEIGHT+15,ART_WIDTH,ART_HEIGHT);
  else{ctx.fillStyle='#322d25';ctx.fillRect(p.x-58,p.y-44,116,43);ctx.fillStyle='#2acbbb';ctx.fillRect(p.x-48,p.y-30,96,5)}
  // Reward illustrations sit inside the bright open cavity.
  if(opened&&frame>=4&&remaining>0){
   const contents=lootChestContents(w,p.id);
   const icons=LOOT_CHEST_REWARDS.filter(reward=>(contents[reward.kind]??0)>0);
   const spacing=icons.length===1?0:Math.min(29,87/(icons.length-1));
   for(let i=0;i<icons.length;i++){
    const reward=icons[i],x=p.x-(icons.length-1)*spacing/2+i*spacing,y=p.y-66+(i%2)*4,img=imgs[reward.imageKey];
    ctx.globalAlpha=.46;ctx.fillStyle='#7effeb';ctx.beginPath();ctx.arc(x,y+8,15,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    if(img)ctx.drawImage(img,x-14,y-10,28,26);
    else{ctx.fillStyle='#c4b58c';ctx.fillRect(x-9,y-5,18,12)}
   }
  }
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
 for(let ring=3;ring>=1;ring--){
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
 const count=reduced?5:12;
 for(let i=0;i<count;i++){
  const angle=i*2.39996+(reduced?0:w.tick*.017*(i%2?1:-1));
  const radius=41+(i%3)*12+opening*19;
  const x=p.x+Math.cos(angle)*radius,y=cy-9+Math.sin(angle)*17-(reduced?0:Math.sin(w.tick*.042+i*3)*9);
  ctx.globalAlpha=(.30+opening*.50)*(i%3===0?1:.7)*s;
  ctx.fillStyle=i%3===0?'#e3fff7':'#57eadd';
  ctx.fillRect(x,y,i%4===0?3:2,i%4===0?3:2);
  if(i%4===0){ctx.globalAlpha=.23*s;ctx.fillRect(x-3,y+1,9,1);ctx.fillRect(x+1,y-3,1,9)}
 }
 ctx.globalAlpha=(opened?0.80:0.9)*s;ctx.fillStyle='#a5fff6';
 ctx.fillRect(p.x-50,p.y-33,19,3);ctx.fillRect(p.x+32,p.y-33,19,3);
 ctx.beginPath();ctx.arc(p.x,p.y-38,5,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
