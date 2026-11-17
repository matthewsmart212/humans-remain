import {campLootChest,LOOT_CHEST_IMAGE_KEY,lootChestFrame} from './loot-chest';
import {lootChestFx,type LootChestFx} from './loot-chest-fx';
import type {World} from './survival-engine';

const FRAME_WIDTH=440,FRAME_HEIGHT=390,COLUMNS=5;
const ART_WIDTH=240,ART_HEIGHT=213,BASELINE_OFFSET=178,TAU=Math.PI*2;
type Viewport={x:number;y:number;width:number;height:number};
type LightContext=CanvasRenderingContext2D&{drawLootChestLight?:(x:number,y:number,fx:LootChestFx,front:boolean)=>void};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const fract=(n:number)=>n-Math.floor(n);
const seed=(i:number)=>fract(Math.sin(i*127.1+311.7)*43758.5453);
const visible=(x:number,y:number,v:Viewport)=>x+220>v.x&&x-220<v.x+v.width&&y+100>v.y&&y-330<v.y+v.height;
function diamond(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,stretch=1){
 ctx.moveTo(x,y-r*stretch);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r*stretch);ctx.lineTo(x-r,y);ctx.closePath();
}
function star(ctx:CanvasRenderingContext2D,x:number,y:number,r:number){
 ctx.moveTo(x,y-r);ctx.lineTo(x+r*.16,y-r*.16);ctx.lineTo(x+r*.72,y);
 ctx.lineTo(x+r*.16,y+r*.16);ctx.lineTo(x,y+r);ctx.lineTo(x-r*.16,y+r*.16);
 ctx.lineTo(x-r*.72,y);ctx.lineTo(x-r*.16,y-r*.16);ctx.closePath();
}
/** Canvas fallback; production web and iOS use the same two-pass Skia light. */
function light(ctx:LightContext,x:number,y:number,fx:LootChestFx,front:boolean){
 if(ctx.drawLootChestLight){ctx.drawLootChestLight(x,y,fx,front);return}
 ctx.save();ctx.globalCompositeOperation='screen';
 const glow=(xx:number,yy:number,r:number,alpha:number)=>{
  const gradient=ctx.createRadialGradient(xx,yy,0,xx,yy,r);
  gradient.addColorStop(0,'rgba(255,207,104,'+alpha+')');gradient.addColorStop(.35,'rgba(255,133,29,'+alpha*.6+')');gradient.addColorStop(1,'rgba(255,103,13,0)');
  ctx.fillStyle=gradient;ctx.fillRect(xx-r,yy-r,r*2,r*2);
 };
 ctx.globalAlpha=fx.power;
 if(front){
  glow(x-5,y-43,47,.63+fx.charge*.2);glow(x-53,y-38,28,.3);glow(x+43,y-36,28,.3);
  if(fx.open){
   glow(x,y-69,82,fx.open*.7);glow(x,y-73,125,fx.burst*.75);
   const [top,bottom,leftTop,rightTop,leftBottom,rightBottom]=fx.lid;
   ctx.save();ctx.beginPath();ctx.moveTo(x+leftTop,y+top);ctx.lineTo(x+rightTop,y+top);
   ctx.lineTo(x+rightBottom,y+bottom);ctx.lineTo(x+leftBottom,y+bottom);ctx.closePath();ctx.clip();
   glow(x,y+bottom,125,fx.open*.65);ctx.restore();
   glow(x,y+top-10,70,fx.open*.25);
  }
 }else{
  glow(x,y-40,170,.29+fx.charge*.17+fx.open*.14);
  if(fx.open)for(let i=-2;i<=2;i++){
   ctx.globalAlpha=fx.power*fx.open*(.07+fx.burst*.13);ctx.fillStyle='#ffdb88';
   ctx.beginPath();ctx.moveTo(x-10+i*8,y-72);ctx.lineTo(x+i*40-14,y-270-Math.abs(i)*12);ctx.lineTo(x+i*40+14,y-270-Math.abs(i)*12);ctx.lineTo(x+10+i*8,y-72);ctx.closePath();ctx.fill();
  }
 }
 ctx.restore();
}
function inlays(ctx:CanvasRenderingContext2D,x:number,y:number,fx:LootChestFx){
 const shimmer=.78+.15*Math.sin(fx.time*3.1)+.07*Math.sin(fx.time*7.3);
 ctx.globalAlpha=fx.power*(.55+fx.charge*.35)*shimmer;
 ctx.fillStyle='#ffeab1';
 // Centres measured from the approved atlas. Keep the dark iron rims visible.
 ctx.fillRect(x-67,y-38.5,28,1.5);ctx.fillRect(x+30,y-37.2,27,1.5);
 ctx.beginPath();diamond(ctx,x-5,y-43,2.3,2.8);ctx.fill();
 // An occasional pin-sharp glint across the jewel, never a permanent cross.
 const sparkle=fx.reduced?0:Math.pow(Math.max(0,Math.sin(fx.time*1.6+.9)),18);
 if(sparkle>.02){ctx.globalAlpha=fx.power*sparkle*.87;ctx.fillStyle='#fff5d5';ctx.beginPath();star(ctx,x-5,y-43,10+fx.charge*7);ctx.fill()}
 ctx.globalAlpha=1;
}
function lidGlints(ctx:CanvasRenderingContext2D,x:number,y:number,fx:LootChestFx){
 if(fx.open<.05||fx.reduced)return;
 const [top,,left,right]=fx.lid;
 // Two irregular catches on the real upper rail, following its opening pose.
 for(let i=0;i<2;i++){
  const pulse=Math.pow(Math.max(0,Math.sin(fx.time*(i?1.3:1.1)+i*2.8)),8);
  if(pulse<.03)continue;
  const xx=x+left+(right-left)*(i?.87:.13),yy=y+top-9;
  ctx.globalAlpha=fx.power*fx.open*pulse*.18;ctx.fillStyle='#ffbb48';
  ctx.beginPath();diamond(ctx,xx,yy,9,1.2);ctx.fill();
  ctx.globalAlpha=fx.power*fx.open*pulse*.9;ctx.fillStyle='#fff5cf';
  ctx.beginPath();star(ctx,xx,yy,3+pulse*5);ctx.fill();
 }
 ctx.globalAlpha=1;
}
function motes(ctx:CanvasRenderingContext2D,x:number,y:number,fx:LootChestFx){
 const count=fx.reduced?5:fx.empty?8:fx.open>.1?42:32;
 // Three small batched paths, with size giving each mote its own life envelope.
 // No stored particle objects, gradient per spark or native allocation per mote.
 for(let pass=0;pass<3;pass++){
  ctx.beginPath();
  for(let i=0;i<count;i++){
   const phase=fract(fx.time*(.18+seed(i+30)*.2)+seed(i+60));
   const life=clamp(phase*6)*clamp((1-phase)*4);
   const twinkle=.7+.3*Math.sin(fx.time*4.7+i*2.9);
   const xx=x+(seed(i+9)-.5)*(152+phase*(40+fx.open*40))+Math.sin(fx.time*.9+i*2.4+phase*TAU)*(8+fx.open*13)*phase;
   const yy=y-54-fx.open*19-phase*(105+fx.open*125)+Math.sin(i*1.7)*8;
   const r=(1.1+seed(i+90)*1.5)*life*twinkle;
   if(r<.2||pass===2&&i%3!==0)continue;
   if(pass===0)diamond(ctx,xx,yy,r*3.3,1.3);
   else if(i%6===0)star(ctx,xx,yy,r*(pass===2?1.8:3.7));
   else diamond(ctx,xx,yy,r*(pass===2?.5:1),1.5);
   if(pass===1&&!fx.reduced&&fx.open>.1&&i%4===0){
    // Sparse, tapering trails give the rising particles some velocity and depth.
    ctx.moveTo(xx-r*.4,yy);ctx.lineTo(xx+r*.4,yy);
    ctx.lineTo(xx+Math.sin(i*2.4)*3,yy+(6+seed(i+121)*9)*life);ctx.closePath();
   }
  }
  ctx.globalAlpha=fx.power*[.1,.8,.94][pass];ctx.fillStyle=['#ffbc53','#ffe3a0','#fff7dc'][pass];ctx.fill();
 }
 ctx.globalAlpha=1;
}
function openingSparks(ctx:CanvasRenderingContext2D,x:number,y:number,fx:LootChestFx){
 const age=fx.revealAge/60;
 if(age<0||age>1.22||fx.reduced||fx.empty)return;
 const fade=clamp(age*16)*Math.pow(clamp(1-age/1.22),1.3)*fx.power;
 // A single fan of ballistic sparks, timed to the first visible lid gap.
 for(let pass=0;pass<2;pass++){
  ctx.beginPath();
  for(let i=0;i<38;i++){
   const angle=-Math.PI*.94+seed(i+140)*Math.PI*.88,speed=70+seed(i+180)*180;
   const vx=Math.cos(angle)*speed,vy=Math.sin(angle)*speed;
   const xx=x+vx*age,yy=y-76+vy*age+78*age*age;
   const size=(.8+seed(i+220)*1.7)*fade;
   if(pass===0){ctx.moveTo(xx,yy);ctx.lineTo(xx-vx*.025,yy-(vy+156*age)*.025)}
   else if(i%7===0)star(ctx,xx,yy,size*3);else diamond(ctx,xx,yy,size,1.4);
  }
  ctx.globalAlpha=fade*(pass===0?.46:.95);ctx.strokeStyle='#ffbd52';ctx.lineWidth=1.5;
  ctx.fillStyle='#fff1b5';if(pass===0)ctx.stroke();else ctx.fill();
 }
 ctx.globalAlpha=1;
}
function sealFlare(ctx:CanvasRenderingContext2D,x:number,y:number,fx:LootChestFx){
 if(fx.burst<.02||fx.reduced)return;
 // Long tapered light streaks at the seal, with a short white-gold core.
 ctx.beginPath();
 const r=90+fx.burst*55,cy=y-74;
 ctx.moveTo(x-r,cy);ctx.lineTo(x-13,cy-2.4);ctx.lineTo(x,cy-9*fx.burst);
 ctx.lineTo(x+13,cy-2.4);ctx.lineTo(x+r,cy);ctx.lineTo(x+13,cy+2.4);
 ctx.lineTo(x,cy+9*fx.burst);ctx.lineTo(x-13,cy+2.4);ctx.closePath();
 ctx.globalAlpha=fx.burst*.78*fx.power;ctx.fillStyle='#fff0b8';ctx.fill();ctx.globalAlpha=1;
}

/** All effects are one depth-sorted drawable. A survivor in front occludes
 * sparks, beams and bloom as well as the chest, on both renderers. */
export function lootChestDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,viewport:Viewport){
 const p=campLootChest(w);if(!p||!visible(p.x,p.y,viewport))return [];
 const sprite=imgs[LOOT_CHEST_IMAGE_KEY],frame=lootChestFrame(w),fx=lootChestFx(w);
 return [{y:p.y,draw:()=>{
  ctx.save();const x=p.x,y=p.y;
  light(ctx,x,y,fx,false);
  if(sprite)ctx.drawImage(sprite,(frame%COLUMNS)*FRAME_WIDTH,Math.floor(frame/COLUMNS)*FRAME_HEIGHT,
   FRAME_WIDTH,FRAME_HEIGHT,x-ART_WIDTH/2,y-BASELINE_OFFSET,ART_WIDTH,ART_HEIGHT);
  else{ctx.fillStyle='#393028';ctx.fillRect(x-83,y-70,166,70)}
  light(ctx,x,y,fx,true);
  inlays(ctx,x,y,fx);lidGlints(ctx,x,y,fx);motes(ctx,x,y,fx);openingSparks(ctx,x,y,fx);sealFlare(ctx,x,y,fx);
  ctx.restore();
 }}];
}
