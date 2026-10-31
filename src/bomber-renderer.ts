import {timeOf,type World,type Direction,type Enemy} from './survival-engine';
import type {CampLight} from './lighting-model';
import {BOMBER_ATTACK,bomberPulsePhase,bomberWarningRadius,bomberProgress} from './bomber-model';
import {BOMBER_CELL,BOMBER_ANCHOR,BOMBER_EXPLOSION,bomberView,bomberFrame,bomberBeacon,bomberEyes,bomberWarningAnchor,BOMBER_BEACON_PATCH,bomberNeedsBeacon} from './bomber-sprites';

const SIZE=150,TAU=Math.PI*2,clamp=(n:number)=>Math.max(0,Math.min(1,n));
// A closed oval with equal axes remains a complete circle on every Skia backend.
function circle(ctx:CanvasRenderingContext2D,x:number,y:number,r:number){
 ctx.beginPath();ctx.ellipse(x,y,r,r,0,0,TAU);ctx.closePath();
}
function sprite(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,direction:Direction,frame:number){
 const view=bomberView(direction),im=imgs[view.key];if(!im)return;
 const k=SIZE/BOMBER_CELL;ctx.save();if(view.mirror)ctx.scale(-1,1);
 ctx.drawImage(im,frame%4*BOMBER_CELL,Math.floor(frame/4)*BOMBER_CELL,BOMBER_CELL,BOMBER_CELL,-BOMBER_ANCHOR[0]*k,-BOMBER_ANCHOR[1]*k,SIZE,SIZE);
 if(bomberNeedsBeacon(direction,frame)){
  const lamp=imgs[BOMBER_BEACON_PATCH.imageKey];
  if(lamp){
   const [bx,by]=bomberBeacon(direction,frame),patch=BOMBER_BEACON_PATCH,[cx,cy,cw,ch]=patch.crop;
   ctx.save();ctx.translate((bx-BOMBER_ANCHOR[0])*k,(by-BOMBER_ANCHOR[1])*k);ctx.scale(k,k);
   ctx.beginPath();patch.outline.forEach(([x,y],i)=>i?ctx.lineTo(x-patch.anchor[0],y-patch.anchor[1]):ctx.moveTo(x-patch.anchor[0],y-patch.anchor[1]));ctx.closePath();ctx.clip();
   ctx.drawImage(lamp,cx,cy,cw,ch,cx-patch.anchor[0],cy-patch.anchor[1],cw,ch);ctx.restore();
  }
 }
 ctx.restore();
}
export function bomberWarningCentre(e:Enemy){
 const direction=e.motion?.direction??'down',view=bomberView(direction),[x,y]=bomberWarningAnchor(direction),k=SIZE/BOMBER_CELL;
 return {x:e.x+(x-BOMBER_ANCHOR[0])*k*(view.mirror?-1:1),y:e.y+(y-BOMBER_ANCHOR[1])*k};
}
export function drawBomberGround(ctx:CanvasRenderingContext2D,w:World){
 const t=timeOf(w);ctx.save();ctx.setLineDash([]);
 for(const e of w.enemies){if(e.kind!=='scrap-bomber'||!e.bomber||e.hp<=0)continue;
  const age=t-e.bomber.armedAt,progress=bomberProgress(age),breath=bomberWarningRadius(age,!!w.weather?.reducedMotion);
  if(breath<.5)continue;
  const centre=bomberWarningCentre(e),x=centre.x,y=centre.y,glow=32+8*progress;
  // Broad, feathered crimson light spreads inward, deepening toward the rim.
  ctx.globalAlpha=.8+.2*progress;
  const inner=ctx.createRadialGradient(x,y,0,x,y,breath+glow*.55);
  for(const [at,colour] of [[0,'#3c03090a'],[.3,'#50050e1c'],[.6,'#69080c4d'],[.78,'#710a0866'],[.9,'#8b110c24'],[1,'#8b110c00']] as const)inner.addColorStop(at,colour);
  ctx.fillStyle=inner;circle(ctx,x,y,breath+glow*.55);ctx.fill();
  // A smooth annular gradient gives a neon halo without hard concentric bands.
  // Keep the centre translucent so the robot remains readable.
  const halo=ctx.createRadialGradient(x,y,Math.max(0,breath-glow),x,y,breath+glow);
  for(const [at,colour] of [[0,'#ff200000'],[.2,'#ff24000a'],[.38,'#ff2e0059'],[.5,'#ff4b16c9'],[.62,'#ff2e0059'],[.8,'#ff24000a'],[1,'#ff200000']] as const)halo.addColorStop(at,colour);
  ctx.fillStyle=halo;circle(ctx,x,y,breath+glow);ctx.fill();
  for(const [width,colour] of [[5,'#ff3914'],[2.8,'#ff8b24'],[1,'#ffe2a0']] as const){
   ctx.strokeStyle=colour;ctx.lineWidth=width;circle(ctx,x,y,breath);ctx.stroke();
  }

 }
 // The expanding blast wave expires with the existing effect queue.
 for(const e of w.effects){const age=t-e.born;if(e.type!=='bomber-blast'||age<0||age>1.15)continue;
  if(age<.32){ctx.globalAlpha=(1-age/.32)*.5;ctx.strokeStyle='#ff6150';ctx.lineWidth=4*(1-age/.32);circle(ctx,e.x,e.y,BOMBER_ATTACK.radius*clamp(age/.21));ctx.stroke()}
 }
 ctx.restore();
}
const blastDurations=[.045,.065,.11,.12,.16,.18,.18,.20];
export function bomberBlastFrame(age:number){let elapsed=0;for(let i=0;i<blastDurations.length;i++){elapsed+=blastDurations[i];if(age<elapsed)return i}return -1}
/** Small moving lights use uniforms, leaving the cached camp lightmap intact. */
export function bomberLights(w:World):CampLight[]{
 return w.enemies.filter(e=>e.kind==='scrap-bomber'&&e.hp>0&&e.bomber&&!e.bomber.detonated).slice(0,BOMBER_ATTACK.maxArming).map(e=>({
  ...bomberWarningCentre(e),radius:110,strength:.42,
 }));
}
/** Emissive details are composited after darkness and atmospheric washes. */
export function drawBomberEmissives(ctx:CanvasRenderingContext2D,w:World){
 const t=timeOf(w),k=SIZE/BOMBER_CELL;
 for(const e of w.enemies){
  if(e.kind!=='scrap-bomber'||e.hp<=0||e.bomber?.detonated)continue;
  const direction=e.motion?.direction??'down',view=bomberView(direction),frame=bomberFrame(e,t);
  const armed=!!e.bomber,pulse=armed&&!w.weather?.reducedMotion ? .5+.5*Math.cos(bomberPulsePhase(t-e.bomber!.armedAt)*TAU) : .65;
  ctx.save();ctx.translate(e.x,e.y);
  const m=e.motion;if(m&&t-m.hitAt<.18&&!armed&&!w.weather?.reducedMotion){const recoil=Math.sin(clamp((t-m.hitAt)/.18)*Math.PI)*3;ctx.translate(Math.cos(m.hitAngle)*recoil,Math.sin(m.hitAngle)*recoil)}
  if(view.mirror)ctx.scale(-1,1);
  ctx.globalAlpha=clamp((t-(e.spawnedAt??-1))/.2);ctx.filter='none';
  for(const [ex,ey,radius] of bomberEyes(direction,frame)){
   const x=(ex-BOMBER_ANCHOR[0])*k,y=(ey-BOMBER_ANCHOR[1])*k,r=radius*k;
   const halo=ctx.createRadialGradient(x,y,0,x,y,r*2.8);halo.addColorStop(0,armed?`rgba(255,22,30,${.55+.3*pulse})`:'rgba(255,158,24,.55)');halo.addColorStop(1,armed?'#ff102000':'#ff9e1800');ctx.fillStyle=halo;circle(ctx,x,y,r*2.8);ctx.fill();
   const lens=ctx.createRadialGradient(x,y,0,x,y,r);lens.addColorStop(0,armed?'#fff0e8':'#fff3bb');lens.addColorStop(.24,armed?'#ff9a88':'#ffe36b');lens.addColorStop(.58,armed?'#ff2828':'#ffae22');lens.addColorStop(1,armed?'#a10d20':'#c25e0d');ctx.fillStyle=lens;circle(ctx,x,y,r);ctx.fill();
  }
  const [bx,by]=bomberBeacon(direction,frame),x=(bx-BOMBER_ANCHOR[0])*k,y=(by-BOMBER_ANCHOR[1])*k;
  const glow=ctx.createRadialGradient(x,y,0,x,y,17);glow.addColorStop(0,`rgba(255,30,40,${.5+.25*pulse})`);glow.addColorStop(1,'#ff3b1700');ctx.fillStyle=glow;circle(ctx,x,y,17);ctx.fill();
  ctx.fillStyle='#ff4030';circle(ctx,x,y,3.2);ctx.fill();ctx.fillStyle='#ffe2a0';circle(ctx,x,y,1.3);ctx.fill();
  ctx.restore();
 }
}
export function bomberDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World){
 const t=timeOf(w),out:{y:number;draw:()=>void}[]=[];
 for(const e of w.enemies){if(e.kind!=='scrap-bomber'||e.hp<=0)continue;
  out.push({y:e.y,draw:()=>{
   const direction=e.motion?.direction??'down',frame=bomberFrame(e,t),m=e.motion;
   ctx.save();ctx.translate(e.x,e.y);
   ctx.globalAlpha=clamp((t-(e.spawnedAt??-1))/.2);
   if(m&&t-m.hitAt<.18&&!e.bomber&&!w.weather?.reducedMotion){const recoil=Math.sin(clamp((t-m.hitAt)/.18)*Math.PI)*3;ctx.translate(Math.cos(m.hitAngle)*recoil,Math.sin(m.hitAngle)*recoil)}
   if(e.flashUntil>t)ctx.filter='brightness(1.8)';sprite(ctx,imgs,direction,frame);
   ctx.restore();
   if(e.hp<e.maxHp||e.bomber){
    const hp=clamp(e.hp/e.maxHp),lag=m?clamp((m.healthFrom+(e.hp-m.healthFrom)*clamp((t-m.hitAt-.1)/.45))/e.maxHp):hp;
    ctx.save();ctx.fillStyle='#0e2228eb';ctx.fillRect(e.x-31,e.y-111,62,7);ctx.fillStyle='#fce2ad';ctx.fillRect(e.x-29,e.y-109,58*Math.max(hp,lag),3);ctx.fillStyle='#df7854';ctx.fillRect(e.x-29,e.y-109,58*hp,3);ctx.restore();
   }
  }});
 }
 for(const e of w.effects){const age=t-e.born;
  if(e.type==='kill'&&e.enemyKind==='scrap-bomber'&&age>=0&&age<1.1)out.push({y:e.y,draw:()=>{ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=1-clamp((age-.35)/.75);sprite(ctx,imgs,e.direction??'down',age<.14?10:11);ctx.restore()}});
  if(e.type!=='bomber-blast'||age<0||age>1.06)continue;
  out.push({y:e.y+.5,draw:()=>{
   const frame=bomberBlastFrame(age);if(frame<0)return;
   ctx.save();const im=imgs[BOMBER_EXPLOSION.key],cell=BOMBER_EXPLOSION.cell,size=310,k=size/cell;
   ctx.globalAlpha=age<.82?1:clamp((1.06-age)/.24);
   if(im)ctx.drawImage(im,frame%BOMBER_EXPLOSION.columns*cell,Math.floor(frame/BOMBER_EXPLOSION.columns)*cell,cell,cell,e.x-BOMBER_EXPLOSION.anchor[0]*k,e.y-BOMBER_EXPLOSION.anchor[1]*k,size,size);
   else{ctx.fillStyle='#e9913c';ctx.beginPath();ctx.arc(e.x,e.y-20,Math.max(1,70*(1-age/1.06)),0,TAU);ctx.fill()}
   if(!w.weather?.reducedMotion&&age<.55){
    ctx.globalAlpha=1-age/.55;
    for(let i=0;i<8;i++){const a=i*TAU/8+e.id*.9,d=age*(100+(i%3)*55),x=e.x+Math.cos(a)*d,y=e.y-35+Math.sin(a)*d*.6-80*age+140*age*age;ctx.fillStyle=i%2?'#c27c38':'#587f78';ctx.save();ctx.translate(x,y);ctx.rotate(a+age*6);ctx.fillRect(-3,-2,6,4);ctx.restore()}
   }
   ctx.restore();
  }});
 }
 return out;
}
