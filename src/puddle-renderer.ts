import type {World} from './survival-engine';
import type {WorldAsset} from './world-assets';
import {placementBounds,type Placement} from './world-layout';

/** Called within the ordinary placement transform, below plants and characters. */
export function drawPuddle(ctx:CanvasRenderingContext2D,image:HTMLImageElement,w:World,p:Placement,a:WorldAsset){
 const b=placementBounds(p);
 ctx.drawImage(image,...a.crop as [number,number,number,number],b.x,b.y,b.width,b.height);
 const effects=w.puddleMotion?.effects.filter(e=>e.placementId===p.id)||[],water=a.puddle?.water;
 if(!effects.length||!water)return;
 ctx.save();ctx.beginPath();water.forEach(([x,y],i)=>i?ctx.lineTo(b.x+x*b.width,b.y+y*b.height):ctx.moveTo(b.x+x*b.width,b.y+y*b.height));ctx.closePath();ctx.clip();
 for(const e of effects){
  const x=b.x+e.x*b.width,y=b.y+e.y*b.height;
  for(let ring=0;ring<2;ring++){
   const age=e.age-ring*.14;if(age<0||age>.98)continue;
   const radius=(3+age*(19+e.power*17))*Math.min(1.3,Math.max(.6,p.scale));
   ctx.globalAlpha=(1-age/.98)*(.34+e.power*.2)*(w.weather?.reducedMotion ? .65 : 1);
   ctx.strokeStyle='#d7e6df';ctx.lineWidth=1.1;ctx.beginPath();ctx.ellipse(x,y,radius,radius*.72,0,0,Math.PI*2);ctx.stroke();
   ctx.globalAlpha*=.36;ctx.strokeStyle='#293f47';ctx.beginPath();ctx.ellipse(x,y+1.4,radius+1.3,radius*.72+1,0,0,Math.PI*2);ctx.stroke();
  }
 }
 ctx.restore();
 if(w.weather?.reducedMotion)return;
 // Small airborne drops land quickly; sprinting creates a wider, higher splash.
 for(const e of effects){if(e.age>.36)continue;const t=e.age/.36,x=b.x+e.x*b.width,y=b.y+e.y*b.height;ctx.save();ctx.globalAlpha=(1-t)*.8;ctx.fillStyle='#c8d9d9';
  for(let i=0;i<(e.power>.8?5:2);i++){const angle=i*2.399+e.side,spread=(5+e.power*12)*t,dx=Math.cos(angle)*spread,dy=Math.sin(angle)*spread*.5-Math.sin(Math.PI*t)*(5+e.power*10);ctx.beginPath();ctx.ellipse(x+dx,y+dy,.8+e.power*.65,1.3+e.power*.8,angle,0,Math.PI*2);ctx.fill()}
  ctx.restore();
 }
}
