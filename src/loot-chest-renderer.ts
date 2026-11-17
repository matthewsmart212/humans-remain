import {
 campLootChest,LOOT_CHEST_ID,LOOT_CHEST_IMAGE_KEY,LOOT_CHEST_OPEN_TICKS,
 lootChestFrame,lootChestOpened,lootChestRemaining
} from './loot-chest';
import type {World} from './survival-engine';

// Keep the user's approved orange chest artwork unchanged. All illumination
// and particles are procedural and share the existing web Canvas / iOS Skia
// adapter: no new runtime dependencies, timers, textures, or stored particles.
const FRAME_WIDTH=440,FRAME_HEIGHT=390,COLUMNS=5;
const ART_WIDTH=240,ART_HEIGHT=213,BASELINE_OFFSET=178;
const TAU=Math.PI*2;
type Viewport={x:number;y:number;width:number;height:number};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const visible=(x:number,y:number,v:Viewport)=>x>v.x-210&&x<v.x+v.width+210&&y>v.y-230&&y<v.y+v.height+120;
const ageOf=(w:World)=>Math.max(0,w.tick-(w.lootChests?.[LOOT_CHEST_ID]?.openedAt??w.tick));

function ambientLight(ctx:CanvasRenderingContext2D,x:number,y:number,power:number,night:number){
 // Soft, boundary-free amber ambience on the surrounding terrain. This is
 // deliberately NOT a ground ellipse, duplicate shadow, or interaction ring.
 const r=148;
 const gradient=ctx.createRadialGradient(x,y-53,0,x,y-53,r);
 gradient.addColorStop(0,'rgba(255,185,69,0.23)');
 gradient.addColorStop(.30,'rgba(255,136,35,0.14)');
 gradient.addColorStop(.67,'rgba(226,91,17,0.055)');
 gradient.addColorStop(1,'rgba(226,91,17,0)');
 ctx.globalAlpha=power*(.72+night*.28);
 ctx.fillStyle=gradient;
 ctx.fillRect(x-r,y-53-r,r*2,r*2);
 ctx.globalAlpha=1;
}

function openingRays(ctx:CanvasRenderingContext2D,x:number,y:number,t:number,opening:number,reduced:boolean){
 // Warm, transparent shafts rise *behind* the actual lid while it opens.
 // No texture overlay is ever applied to the approved sprite artwork.
 if(opening<.06)return;
 const burst=reduced?opening*.25:opening*(.77+.23*Math.sin(t*.14));
 for(let i=-2;i<=2;i++){
  const sway=reduced?0:Math.sin(t*.032+i*1.9)*7;
  const fromX=x+i*24;
  ctx.globalAlpha=burst*(i===0 ? .085 :.041);
  ctx.fillStyle=i===0?'#ffe6a4':'#ffac32';
  ctx.beginPath();
  ctx.moveTo(fromX-6,y-79);
  ctx.lineTo(fromX+i*10+sway-16,y-168-opening*24);
  ctx.lineTo(fromX+i*10+sway+12,y-168-opening*24);
  ctx.lineTo(fromX+7,y-79);
  ctx.closePath();ctx.fill();
 }
 ctx.globalAlpha=1;
}

function cavityLight(ctx:CanvasRenderingContext2D,x:number,y:number,t:number,level:number,power:number,reduced:boolean){
 if(level<.05)return;
 ctx.save();
 // The dark empty cavity is approximately x=+-80, y=-78..-48 in
 // the authored art. Clip the glow INSIDE it to preserve the stone rim,
 // front crystal, and the complete upper lid silhouette.
 ctx.beginPath();
 ctx.moveTo(x-80,y-81);ctx.lineTo(x+81,y-81);
 ctx.lineTo(x+71,y-51);ctx.lineTo(x-71,y-51);
 ctx.closePath();ctx.clip();
 const breathe=reduced ? .72 :.70+.19*Math.sin(t*.083)+.11*Math.sin(t*.23+1.1);
 const intensity=clamp(level*power*breathe);
 const inner=ctx.createRadialGradient(x,y-59,0,x,y-59,96);
 inner.addColorStop(0,'rgba(255,246,188,0.90)');
 inner.addColorStop(.18,'rgba(255,196,75,0.77)');
 inner.addColorStop(.55,'rgba(255,122,21,0.39)');
 inner.addColorStop(1,'rgba(232,76,9,0)');
 ctx.fillStyle=inner;ctx.globalAlpha=intensity*.76;
 ctx.fillRect(x-97,y-90,194,50);
 // A moving light ribbon makes the interior visibly shimmer while fully open.
 if(!reduced){
  const sweep=Math.sin(t*.055)*48;
  ctx.globalAlpha=intensity*.24;
  ctx.fillStyle='#fff0bc';
  ctx.beginPath();
  ctx.moveTo(x+sweep-10,y-89);ctx.lineTo(x+sweep+1,y-89);
  ctx.lineTo(x+sweep+24,y-45);ctx.lineTo(x+sweep+13,y-45);
  ctx.closePath();ctx.fill();
 }
 ctx.restore();
}

function inlayLights(ctx:CanvasRenderingContext2D,x:number,y:number,t:number,power:number,reduced:boolean){
 // The front amber bars and jewel are the actual light sources. Brighten
 // their thin interiors rather than drawing the unwanted dot/ring around them.
 const shimmer=reduced ? .72 :.70+.20*Math.sin(t*.11)+.10*Math.sin(t*.28+1.2);
 ctx.globalAlpha=clamp(power*(.28+.36*shimmer));
 ctx.fillStyle='#ff9e32';
 ctx.fillRect(x-66,y-37,26,4);
 ctx.fillRect(x+39,y-37,27,4);
 ctx.globalAlpha=clamp(power*(.30+.38*shimmer));
 ctx.fillStyle='#ffcc6b';
 ctx.fillRect(x-61,y-36,17,2);
 ctx.fillRect(x+44,y-36,17,2);
 if(!reduced){
  const sweep=((t*.035)%1)*20;
  ctx.globalAlpha=power*.64;
  ctx.fillStyle='#fff5c2';
  ctx.fillRect(x-62+sweep,y-36,2,2);
  ctx.fillRect(x+43+(20-sweep),y-36,2,2);
 }
 // Faceted core, not a circle. Its flare is brightest for brief moments.
 const flash=reduced?0:Math.pow(Math.max(0,Math.sin(t*.075+.9)),14);
 ctx.globalAlpha=clamp(power*(.26+.40*shimmer+.28*flash));
 ctx.fillStyle='#ffe0a2';
 ctx.beginPath();
 ctx.moveTo(x,y-54);ctx.lineTo(x+5,y-43);
 ctx.lineTo(x,y-33);ctx.lineTo(x-5,y-43);
 ctx.closePath();ctx.fill();
 if(flash>.36){
  ctx.globalAlpha=flash*power*.55;
  ctx.fillRect(x-10,y-44,20,1.3);
  ctx.fillRect(x-.65,y-58,1.3,29);
 }
 ctx.globalAlpha=1;
}

function embers(ctx:CanvasRenderingContext2D,x:number,y:number,t:number,open:number,power:number,reduced:boolean){
 // Life cycles are calculated from tick, so the effect is deterministic,
 // multiplayer-safe, and has no update loop or mutable particle arrays.
 const count=reduced?6:open>.20?30:16;
 const originY=y-(open>.25?78:48);
 const lift=53+open*68;
 for(let i=0;i<count;i++){
  const phase=reduced?((i*.233)%1):((t*(.011+(i%5)*.003)+i*.187)%1);
  const side=Math.sin(i*2.399)*((i%3===0?62:45)+open*14);
  const wobble=reduced?0:Math.sin(t*(.018+i%4*.006)+i*1.99)*(5+open*8)*phase;
  const xx=x+side+wobble,yy=originY-phase*lift-Math.cos(i*1.79)*10;
  const lifetime=clamp(phase*7)*clamp((1-phase)*4);
  const twinkle=reduced ? .7 :.75+.25*Math.sin(t*.23+i*3.23);
  const alpha=clamp(lifetime*twinkle*power*(open>.20 ? .79 :.46));
  if(alpha<.04)continue;
  ctx.globalAlpha=alpha;
  ctx.fillStyle=i%7===0?'#fff4cc':i%3===0?'#ffc56e':'#ff9231';
  const size=i%5===0?2.6:1.7;
  ctx.fillRect(xx,yy,size,size);
  if(i%6===0){
   // Occasional four-point glints instead of repetitive orbiting dots.
   ctx.globalAlpha=alpha*.55;
   ctx.fillRect(xx-4,yy+.8,10,1);
   ctx.fillRect(xx+.8,yy-4,1,10);
  }
 }
 ctx.globalAlpha=1;
}

/** One depth-sorted drawable: every light and spark stays behind a survivor
 * standing in front of the chest, on web and the native Skia renderer. */
export function lootChestDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,viewport:Viewport){
 const p=campLootChest(w);if(!p||!visible(p.x,p.y,viewport))return [];
 const sprite=imgs[LOOT_CHEST_IMAGE_KEY],frame=lootChestFrame(w,p.id);
 const opened=lootChestOpened(w,p.id),age=ageOf(w),t=w.tick;
 const progress=opened?clamp(age/LOOT_CHEST_OPEN_TICKS):0;
 const open=opened?clamp((frame-2)/7):0;
 const reduced=!!w.weather?.reducedMotion;
 const night=clamp(w.nightAmount??(w.phase==='night'?1:0));
 const empty=opened&&lootChestRemaining(w,p.id)===0;
 const nearby=clamp((220-Math.hypot(w.player.x-p.x,w.player.y-p.y))/160);
 const power=(empty ? .58 :1)*(1+nearby*.12);
 // Open state retains warm illumination, while the opening surge peaks as
 // the lid moves. Closed chests remain obviously rare and alive.
 const surge=opened&&progress<1?Math.sin(Math.PI*progress)**2:0;
 const pulse=reduced ? .75 :.78+.15*Math.sin(t*.079)+.07*Math.sin(t*.19);
 const aura=power*(.36+.38*open+.28*surge)*pulse;
 return [{y:p.y,draw:()=>{
  ctx.save();
  const x=p.x,y=p.y;
  ambientLight(ctx,x,y,aura,night);
  openingRays(ctx,x,y,t,open*(.24+.76*surge),reduced);
  if(sprite){
   ctx.drawImage(sprite,(frame%5)*FRAME_WIDTH,Math.floor(frame/5)*FRAME_HEIGHT,
    FRAME_WIDTH,FRAME_HEIGHT,x-ART_WIDTH/2,y-BASELINE_OFFSET,ART_WIDTH,ART_HEIGHT);
  }else{
   ctx.globalAlpha=.8;ctx.fillStyle='#393028';ctx.fillRect(x-83,y-70,166,70);
  }
  cavityLight(ctx,x,y,t,open,power,reduced);
  inlayLights(ctx,x,y,t,power,reduced);
  embers(ctx,x,y,t,open,power*(1+.60*surge),reduced);
  ctx.restore();
 }}];
}