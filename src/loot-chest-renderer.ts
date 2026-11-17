import {
 campLootChest,LOOT_CHEST_ID,LOOT_CHEST_IMAGE_KEY,LOOT_CHEST_EMISSIVE_KEY,
 LOOT_CHEST_FRAMES,LOOT_CHEST_OPEN_TICKS,lootChestFrame,lootChestOpened,lootChestRemaining
} from './loot-chest';
import type {World} from './survival-engine';

// Ten 384x384 cells: five columns, two rows. Each pose has its own painted
// shadow; no artificial blue ground oval or interaction circle is necessary.
const FRAME_SIZE=384,COLUMNS=5,ART_SIZE=220,BASELINE=190;
type Viewport={x:number;y:number;width:number;height:number};
const visible=(x:number,y:number,v:Viewport)=>x>v.x-165&&x<v.x+v.width+165&&y>v.y-205&&y<v.y+v.height+90;
const clamp=(value:number,a=0,b=1)=>Math.min(b,Math.max(a,value));
const chestAge=(w:World)=>Math.max(0,w.tick-(w.lootChests?.[LOOT_CHEST_ID]?.openedAt??w.tick));

function drawAtlasFrame(ctx:CanvasRenderingContext2D,img:HTMLImageElement,frame:number,left:number,top:number){
 ctx.drawImage(img,(frame%COLUMNS)*FRAME_SIZE,Math.floor(frame/COLUMNS)*FRAME_SIZE,
  FRAME_SIZE,FRAME_SIZE,left,top,ART_SIZE,ART_SIZE);
}

/** Animated light and sparks; all motion derives from world ticks. */
function drawChestEffects(ctx:CanvasRenderingContext2D,w:World,x:number,y:number,frame:number){
 const opened=lootChestOpened(w,LOOT_CHEST_ID),t=w.tick,age=chestAge(w);
 const reduced=!!w.weather?.reducedMotion;
 const depleted=opened&&lootChestRemaining(w,LOOT_CHEST_ID)===0;
 const power=depleted?0.40:1;
 const progress=opened?clamp(age/LOOT_CHEST_OPEN_TICKS):0;
 const lid=opened?clamp((frame-2)/7):0;
 const pulse=reduced?0.72:0.75+0.22*Math.sin(t*.115)+0.09*Math.sin(t*.31);
 ctx.save();

 // Animate the metal inlays only. Do not draw the earlier extra lock circle.
 ctx.globalAlpha=(.25+.26*pulse)*power;
 ctx.fillStyle='#5affeb';
 ctx.fillRect(x-64,y-47,23,2.3);ctx.fillRect(x+39,y-47,23,2.3);
 ctx.globalAlpha=(.25+.35*pulse)*power;ctx.fillStyle='#9ffff5';
 ctx.fillRect(x-3,y-53,5,7);

 if(lid>0){
  // Constrain the live light to the open cavity rather than the surrounding
  // terrain, while preserving the chest's real painted shadow.
  ctx.save();ctx.beginPath();
  ctx.moveTo(x-80,y-95);ctx.lineTo(x+78,y-98);
  ctx.lineTo(x+64,y-48);ctx.lineTo(x-73,y-46);ctx.closePath();ctx.clip();
  const intensity=power*lid*(reduced?0.65:0.52+0.32*Math.sin(t*.085)+0.12*Math.sin(t*.21));
  for(let i=2;i>=0;i--){
   ctx.globalAlpha=clamp(intensity*(.11+i*.045));
   ctx.fillStyle=i===0?'#c7fff7':i===1?'#54fff0':'#1bd5cf';
   ctx.beginPath();
   const offset=reduced?0:Math.sin(t*.055+i)*11;
   ctx.ellipse(x+offset,y-67+i*3,46+i*14,11+i*5,0,0,Math.PI*2);
   ctx.fill();
  }
  // A moving shaft shimmers across the vault even once the lid is stationary.
  ctx.globalAlpha=clamp(intensity*.20);ctx.fillStyle='#ddfffa';
  const sweep=reduced?0:Math.sin(t*.062)*52;
  ctx.beginPath();ctx.moveTo(x+sweep-10,y-92);ctx.lineTo(x+sweep+5,y-92);
  ctx.lineTo(x+sweep+23,y-40);ctx.lineTo(x+sweep+10,y-40);
  ctx.closePath();ctx.fill();ctx.restore();
 }

 // Short cinematic burst during opening, smoothly fading into the idle glow.
 const burst=opened&&!reduced?Math.sin(Math.PI*progress)**2:0;
 if(burst>.03){
  for(let i=-3;i<=3;i++){
   ctx.globalAlpha=clamp(burst*(i%2===0 ? .085 : .055))*power;
   ctx.fillStyle=i%2===0?'#a9fff5':'#20fbe4';ctx.beginPath();
   ctx.moveTo(x+i*18,y-79);
   ctx.lineTo(x+i*28-12,y-143-burst*25);
   ctx.lineTo(x+i*28+7,y-143-burst*25);
   ctx.closePath();ctx.fill();
  }
 }

 // Independent rising motes. Different drift, lifespan and glint widths
 // avoid the artificial rotating dot-circle used by the previous chest.
 const count=reduced?6:opened?27:15;
 for(let i=0;i<count;i++){
  const life=reduced?(i%5)/5:(t*(.018+(i%4)*.003)+i*.173)%1;
  const drift=reduced?0:Math.sin(t*(.017+(i%3)*.006)+i*2.83)*13;
  const radius=(opened?64:58)+(i*13%27);
  const px=x+Math.sin(i*2.39)*radius+drift;
  const py=y-(opened?77:57)-life*(opened?82:53)-Math.cos(i*1.79)*9;
  ctx.globalAlpha=clamp(power*(.15+.50*(1-life))*(opened ? .9 : .52)*(reduced ? .65 : .70+.30*Math.sin(t*.12+i*3.3)));
  ctx.fillStyle=i%5===0?'#e3fffc':'#44f5e5';
  const size=i%6===0?3:2;ctx.fillRect(px,py,size,size);
  if(i%6===0){ctx.globalAlpha*=.6;ctx.fillRect(px-4,py+1,10,1);ctx.fillRect(px+1,py-4,1,10);}
 }
 ctx.restore();
}

/** Depth-sorted with scenery: a survivor in front always covers the glow. */
export function lootChestDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,viewport:Viewport){
 const p=campLootChest(w);if(!p||!visible(p.x,p.y,viewport))return [];
 const base=imgs[LOOT_CHEST_IMAGE_KEY],emissive=imgs[LOOT_CHEST_EMISSIVE_KEY];
 const frame=lootChestFrame(w,p.id),age=chestAge(w),opened=lootChestOpened(w,p.id);
 const frameTime=opened?clamp(age/LOOT_CHEST_OPEN_TICKS)*(LOOT_CHEST_FRAMES-1):0;
 const blend=frame<LOOT_CHEST_FRAMES-1?clamp((frameTime-frame-.70)/.30):0;
 return [{y:p.y,draw:()=>{
  ctx.save();const left=p.x-ART_SIZE/2,top=p.y-BASELINE;
  if(base){
   drawAtlasFrame(ctx,base,frame,left,top);
   // Sub-frame crossfade adds a few soft transitions between the ten poses.
   if(blend>0){ctx.globalAlpha=blend*.80;drawAtlasFrame(ctx,base,frame+1,left,top);ctx.globalAlpha=1;}
  }else{ctx.fillStyle='#39332c';ctx.fillRect(p.x-70,p.y-100,140,88);}
  if(emissive){
   const shimmer=w.weather?.reducedMotion?0.68:0.65+0.20*Math.sin(w.tick*.13)+0.09*Math.sin(w.tick*.31);
   const dim=opened&&lootChestRemaining(w,p.id)===0?0.45:1;
   ctx.globalAlpha=clamp(shimmer*dim);drawAtlasFrame(ctx,emissive,frame,left,top);
   if(blend>0){ctx.globalAlpha=clamp(shimmer*blend*dim*.80);drawAtlasFrame(ctx,emissive,frame+1,left,top);}
   ctx.globalAlpha=1;
  }
  drawChestEffects(ctx,w,p.x,p.y,frame);
  ctx.restore();
 }}];
}