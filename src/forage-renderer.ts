import {FORAGE_BY_ID} from './forage-art';
import {forageRemaining} from './foraging';
import {assetImageKey} from './world-assets';
import {placementBounds,placementPoint,type Placement} from './world-layout';
import {timeOf,type World} from './survival-engine';

// Fruit sits among the leaves of the same base sprite in every state.
const berryPoints=[[.28,.53],[.49,.38],[.68,.55],[.5,.67]];
const applePoints=[[.3,.38],[.56,.24],[.73,.47]];
export function drawForagePlant(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,p:Placement){
 const art=FORAGE_BY_ID.get(p.assetId);if(!art)return false;
 const base=imgs[assetImageKey(art.image)];if(!base)return false;
 const b=placementBounds(p),s=w.forage?.[p.id],age=s?timeOf(w)-s.pickedAt:Infinity,reduced=!!w.weather?.reducedMotion;
 const points=art.kind==='berries'?berryPoints:applePoints,fruit=imgs[`provision_${art.kind}`],count=forageRemaining(w,p),size=(art.kind==='berries'?22:24)*p.scale;
 ctx.save();
 if(art.kind==='apple'&&p.allowTransparency!==false){const [px,py]=placementPoint(p,w.player.x,w.player.y,true);if(py<p.y&&py>b.y&&Math.abs(px-p.x)<b.width*.34)ctx.globalAlpha*=.6}
 const motion=w.foliageMotions?.[p.id];
 const shake=!reduced&&age>=0&&age<.3?Math.sin(age/.3*Math.PI*4)*.023*(1-age/.3):0;
 const contact=!reduced&&art.kind==='berries'&&motion?motion.x*.025:0;
 if(shake||contact){ctx.translate(p.x,p.y);ctx.rotate(shake+contact);ctx.translate(-p.x,-p.y)}
 ctx.drawImage(base,b.x,b.y,b.width,b.height);
 if(fruit)for(const [x,y]of points.slice(0,count))ctx.drawImage(fruit,b.x+x*b.width-size/2,b.y+y*b.height-size/2,size,size);
 ctx.restore();
 // A brief gather arc provides feedback without allocating ongoing effects.
 if(fruit&&s&&!reduced&&age>=0&&age<.38){
  const t=age/.38,[tx,ty]=placementPoint(p,s.to.x,s.to.y,true);
  ctx.save();ctx.globalAlpha*=Math.min(1,(1-t)*3);
  for(let i=0;i<s.picked;i++){const [nx,ny]=points[(s.remaining+i)%points.length],sx=b.x+nx*b.width,sy=b.y+ny*b.height,x=sx+(tx-sx)*t,y=sy+(ty-sy)*t-Math.sin(t*Math.PI)*32*p.scale;ctx.drawImage(fruit,x-size/2,y-size/2,size,size)}
  ctx.restore();
 }
 return true;
}
