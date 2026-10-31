import {timeOf,type World,type Effect} from './survival-engine';
import {BRUTE} from './brute-model';

const TAU=Math.PI*2,clamp=(n:number)=>Math.max(0,Math.min(1,n));
export const BRUTE_IMPACT_LIFE=1.15;
const visible=(fx:Effect,t:number)=>fx.type==='brute-slam'&&fx.heavy&&t>=fx.born&&t-fx.born<BRUTE_IMPACT_LIFE;
// Fixed, irregular pieces: animation never allocates simulation particles or loot.
const stones=Array.from({length:14},(_,i)=>({angle:i*2.39996,spread:.5+(i%5)*.16,size:10+(i*7%13),height:35+(i*13%49),flight:.55+(i%4)*.09,spin:(i%2?1:-1)*(1.4+i%3)}));
const rockImage=(imgs:Record<string,HTMLImageElement>,i:number)=>imgs[i%3?'bruteRubbleOchre':'bruteRubbleChalk'];
export function bruteRockPose(fx:Effect,index:number,age:number,reduced=false){
 const s=stones[index],a=s.angle+fx.id*.73,r=fx.radius??BRUTE.smashRadius,u=clamp(age/s.flight),travel=reduced?0:1-(1-u)*(1-u),distance=r*s.spread*(.24+.76*travel);
 return {x:fx.x+Math.cos(a)*distance,y:fx.y+Math.sin(a)*distance*.72,lift:reduced||u>=1?0:Math.sin(u*Math.PI)*s.height,angle:a+(reduced?0:u*s.spin),size:s.size*(r/BRUTE.smashRadius),alpha:1-clamp((age-.65)/.5)};
}
/** Ground plates and deep branching cracks are lit with the terrain, below feet. */
export function drawBruteTerrain(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World){
 const t=timeOf(w),reduced=!!w.weather?.reducedMotion;ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
 for(const fx of w.effects){if(!visible(fx,t))continue;const age=t-fx.born,r=fx.radius??BRUTE.smashRadius,reveal=reduced?1:clamp(age/.09),fade=1-clamp((age-.55)/.6);ctx.globalAlpha=fade;
  // Reuse the world's painted sandstone, flattened into uneven lifted plates.
  for(let i=0;i<7;i++){const image=rockImage(imgs,i);if(!image)continue;const a=i*2.39996+fx.id*.73,d=r*(.18+(i%3)*.17),x=fx.x+Math.cos(a)*d,y=fx.y+Math.sin(a)*d*.7,size=(29+i%3*10)*reveal;ctx.save();ctx.translate(x,y);ctx.rotate(a*.25);ctx.drawImage(image,-size/2,-size*.2,size,size*.42);ctx.restore()}
  for(let i=0;i<9;i++){const a=i*TAU/9+fx.id*.73,rim=r*(.48+(i%4)*.13)*reveal,turn=(i%2?1:-1)*.17;
   const x=(d:number,b=a)=>fx.x+Math.cos(b)*d,y=(d:number,b=a)=>fx.y+Math.sin(b)*d*.75;
   ctx.beginPath();ctx.moveTo(x(17),y(17));ctx.lineTo(x(rim*.37,a+turn),y(rim*.37,a+turn));ctx.lineTo(x(rim*.66,a-turn*.7),y(rim*.66,a-turn*.7));ctx.lineTo(x(rim),y(rim));ctx.moveTo(x(rim*.57,a-turn*.2),y(rim*.57,a-turn*.2));ctx.lineTo(x(rim*.75,a+turn*1.8),y(rim*.75,a+turn*1.8));
   ctx.strokeStyle='#5f412b66';ctx.lineWidth=3.2;ctx.stroke();ctx.strokeStyle='#30251bb0';ctx.lineWidth=1.4;ctx.stroke();
  }
 }
 ctx.restore();
}
/** Painted rock faces tumble upward, fall, settle and fade. */
export function bruteDebrisDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World){
 const t=timeOf(w),reduced=!!w.weather?.reducedMotion,out=[];
 for(const fx of w.effects){if(!visible(fx,t))continue;const age=t-fx.born;
  for(let i=0;i<(reduced?6:stones.length);i++){const image=rockImage(imgs,i);if(!image)continue;const p=bruteRockPose(fx,i,age,reduced),width=p.size*2.5;out.push({y:p.y,draw:()=>{ctx.save();ctx.globalAlpha=p.alpha;ctx.translate(p.x,p.y-p.lift);ctx.rotate(p.angle*.7);ctx.drawImage(image,-width/2,-width*.35,width,width*.7);ctx.restore()}})}
 }
 return out;
}
/** Separate drifting dust plumes, with no expanding outline or perimeter. */
export function drawBruteDust(ctx:CanvasRenderingContext2D,w:World){
 const t=timeOf(w),reduced=!!w.weather?.reducedMotion;ctx.save();
 for(const fx of w.effects){if(!visible(fx,t))continue;const age=t-fx.born,life=1-clamp(age/1.05),r=fx.radius??BRUTE.smashRadius;
  for(let i=0;i<(reduced?4:8);i++){const a=i*2.39996+fx.id*.73,d=r*(.2+i%3*.17)+(reduced?0:age*(17+i%3*12)),x=fx.x+Math.cos(a)*d,y=fx.y+Math.sin(a)*d*.65-(reduced?0:age*24),size=18+i%3*8+(reduced?0:age*25);ctx.globalAlpha=life*.66;const dust=ctx.createRadialGradient(x,y,0,x,y,size);dust.addColorStop(0,'#c1a57fa0');dust.addColorStop(.5,'#a1845c65');dust.addColorStop(1,'#9a7a4e00');ctx.fillStyle=dust;ctx.beginPath();ctx.ellipse(x,y,size,size*.68,0,0,TAU);ctx.fill()}
 }
 ctx.restore();
}
