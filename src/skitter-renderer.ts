import {timeOf,type World,type Direction,type Enemy} from './survival-engine';
import {SKITTER_LASER as L} from './skitter-model';
import {skitterFrame,skitterView,skitterEyes,SKITTER_CELL,SKITTER_DISPLAY,SKITTER_ANCHOR} from './skitter-sprites';
import {skitterRay} from './skitter-ai';
const TAU=Math.PI*2,clamp=(n:number)=>Math.max(0,Math.min(1,n)),k=SKITTER_DISPLAY/SKITTER_CELL;
// Reuse preview casts between display frames. Actual firing always casts afresh.
const rays=new WeakMap<Enemy,{world:World;tick:number;angle:number;locked:boolean;ray:ReturnType<typeof skitterRay>}>();
function warningRay(w:World,e:Enemy,locked:boolean){
 const angle=e.motion!.angle,prior=rays.get(e);
 if(prior&&prior.world===w&&w.tick>=prior.tick&&w.tick-prior.tick<3&&prior.locked===locked&&Math.abs(angle-prior.angle)<.04)return prior.ray;
 const ray=skitterRay(w,e,angle);rays.set(e,{world:w,tick:w.tick,angle,locked,ray});return ray;
}
function sprite(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,direction:Direction,frame:number){
 const view=skitterView(direction),sheet=imgs[view.key];if(!sheet)return;ctx.save();if(view.mirror)ctx.scale(-1,1);
 ctx.drawImage(sheet,frame%4*SKITTER_CELL,Math.floor(frame/4)*SKITTER_CELL,SKITTER_CELL,SKITTER_CELL,-SKITTER_ANCHOR[0]*k,-SKITTER_ANCHOR[1]*k,SKITTER_DISPLAY,SKITTER_DISPLAY);
 if(frame>=10)for(const [x,y,r] of skitterEyes(direction,frame)){ctx.fillStyle='#142425';ctx.beginPath();ctx.ellipse((x-SKITTER_ANCHOR[0])*k,(y-SKITTER_ANCHOR[1])*k,r*k*1.3,r*k*1.3,0,0,TAU);ctx.fill()}
 ctx.restore();
}
export function skitterDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World){
 const t=timeOf(w),out=w.enemies.filter(e=>e.kind==='skitter'&&e.hp>0).map(e=>({y:e.y,draw:()=>{
  ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=clamp((t-(e.spawnedAt??-1))/.2);if(e.flashUntil>t)ctx.filter='brightness(2)';sprite(ctx,imgs,e.motion?.direction??'down',skitterFrame(e,t));ctx.restore();
  if(e.hp<e.maxHp){ctx.save();ctx.fillStyle='#102325dd';ctx.fillRect(e.x-22,e.y-95,44,5);ctx.fillStyle='#db714d';ctx.fillRect(e.x-20,e.y-94,40*clamp(e.hp/e.maxHp),3);ctx.restore()}
 }}));
 for(const e of w.effects){const age=t-e.born;if(e.enemyKind==='skitter'&&e.type==='kill'&&age>=0&&age<.9)out.push({y:e.y,draw:()=>{ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=1-clamp((age-.25)/.65);sprite(ctx,imgs,e.direction??'down',age<.13?10:11);ctx.restore()}})}
 return out;
}
const line=(ctx:CanvasRenderingContext2D,x:number,y:number,ex:number,ey:number)=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.stroke()};
/** All self-lit effects render after night/weather; beam physics and preview use
 * the same clipped ray, angle, charge clock and eye registration. */
export function drawSkitterEffects(ctx:CanvasRenderingContext2D,w:World){
 const t=timeOf(w),reduced=!!w.weather?.reducedMotion;ctx.save();
 for(const e of w.enemies){if(e.kind!=='skitter'||e.hp<=0)continue;const m=e.motion,direction=m?.direction??'down',frame=skitterFrame(e,t),charging=m?.phase==='windup',progress=charging?clamp((t-m.since)/L.charge):0;
  if(charging){
   const locked=t-m.since>=L.charge-L.lock,ray=warningRay(w,e,locked);ctx.save();ctx.globalAlpha=locked?.8:.35;ctx.strokeStyle=locked?'#ff442d':'#ff8b46';ctx.lineWidth=locked?1.8:1;ctx.setLineDash(locked?[]:[5,7]);line(ctx,ray.start.x,ray.start.y-L.height,ray.end.x,ray.end.y-L.height);ctx.restore();
  }
  const view=skitterView(direction);
  for(const [ex,ey,radius] of skitterEyes(direction,frame)){
   const x=e.x+(ex-SKITTER_ANCHOR[0])*k*(view.mirror?-1:1),y=e.y+(ey-SKITTER_ANCHOR[1])*k,r=radius*k,glow=r*(charging?3+progress*2:2.7);
   ctx.globalAlpha=clamp((t-(e.spawnedAt??-1))/.2);const halo=ctx.createRadialGradient(x,y,0,x,y,glow);halo.addColorStop(0,charging?'#ff9a61cf':'#ff3319aa');halo.addColorStop(.45,'#ff271a55');halo.addColorStop(1,'#ff271a00');ctx.fillStyle=halo;ctx.beginPath();ctx.ellipse(x,y,glow,glow,0,0,TAU);ctx.fill();
   const lens=ctx.createRadialGradient(x,y,0,x,y,r);lens.addColorStop(0,charging?'#fff8d5':'#ffe0b8');lens.addColorStop(.3,'#ff8865');lens.addColorStop(1,'#e21c1b');ctx.fillStyle=lens;ctx.beginPath();ctx.ellipse(x,y,r,r,0,0,TAU);ctx.fill();
   if(charging&&!reduced){ctx.strokeStyle='#ffad70';ctx.lineWidth=1.3;ctx.beginPath();for(let i=0;i<4;i++){const a=i*TAU/4+.5,near=glow*.65,far=near+(1-progress)*10;ctx.moveTo(x+Math.cos(a)*near,y+Math.sin(a)*near);ctx.lineTo(x+Math.cos(a)*far,y+Math.sin(a)*far)}ctx.stroke()}
  }
 }
 for(const e of w.effects){const age=t-e.born;if(e.type!=='skitter-laser'||!e.beamEnd||age<0||age>L.beamLife)continue;
  const end=e.beamEnd,life=1-age/L.beamLife;ctx.globalAlpha=(reduced?.65:1)*life;
  for(const [width,color] of [[12,'#ff261936'],[6,'#ff4523a0'],[2.6,'#ffbc81'],[1,'#fff6da']] as const){ctx.lineWidth=width;ctx.strokeStyle=color;line(ctx,e.x,e.y,end.x,end.y)}
  const r=7+(reduced?0:age*60),halo=ctx.createRadialGradient(end.x,end.y,0,end.x,end.y,r*2);halo.addColorStop(0,'#fff1bb');halo.addColorStop(.25,'#ff673eaa');halo.addColorStop(1,'#ff271a00');ctx.fillStyle=halo;ctx.beginPath();ctx.ellipse(end.x,end.y,r*2,r*2,0,0,TAU);ctx.fill();
  if(!reduced){ctx.strokeStyle='#ffc783';ctx.lineWidth=1.3;ctx.beginPath();for(let i=0;i<6;i++){const a=i*TAU/6+e.id,travel=4+age*80;ctx.moveTo(end.x+Math.cos(a)*travel,end.y+Math.sin(a)*travel);ctx.lineTo(end.x+Math.cos(a)*(travel+life*8),end.y+Math.sin(a)*(travel+life*8))}ctx.stroke()}
 }
 ctx.restore();
}
