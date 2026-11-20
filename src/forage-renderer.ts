import {drawTreeContact} from './tree-contact';
import {FORAGE_BY_ID,FORAGE_FRUIT_ART} from './forage-art';
import {drawWildPotatoPlant} from './potato-patch-renderer';
import {forageRemaining} from './foraging';
import {localFoliageMotion} from './foliage-renderer';
import {BERRY_CONTACT_BEND,FORAGE_PICK_SHAKE} from './foliage-motion';
import {assetImageKey} from './world-assets';
import {placementBounds,placementPoint,type Placement} from './world-layout';
import {timeOf,type World} from './survival-engine';

export function drawForagePlant(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,p:Placement,animate=true,pass:'world'|'outline'='world'){
 const art=FORAGE_BY_ID.get(p.assetId);if(!art)return false;
 if(art.kind==='potato'||art.kind==='carrot')return drawWildPotatoPlant(ctx,imgs,w,p,forageRemaining(w,p)>0,art.kind,animate);
 const base=imgs[assetImageKey(art.image)];if(!base)return false;
 const b=placementBounds(p),s=w.forage?.[p.id],age=s?timeOf(w)-s.pickedAt:Infinity,reduced=!!w.weather?.reducedMotion;
 const fruit=FORAGE_FRUIT_ART[art.kind],size=fruit.size*p.scale,count=forageRemaining(w,p);
 const motion=animate&&!reduced&&art.kind==='berries'?w.foliageMotions?.[p.id]:undefined;
 const push=motion?localFoliageMotion(p,motion):undefined;
 const shake=!reduced&&age>=0&&age<.3?Math.sin(age/.3*Math.PI*4)*FORAGE_PICK_SHAKE*(1-age/.3):0;
 // Lean sideways and shorten/extend the projected crown on a north–south brush.
 // Fruit sockets and leaves share this transform; the stem stays on its ground pin.
 const angle=shake+(push?.x??0)*BERRY_CONTACT_BEND,stretch=1-(push?.y??0)*BERRY_CONTACT_BEND;
 const fruitImage=(variation:number)=>imgs[assetImageKey(fruit.images[variation])]??imgs[`provision_${art.kind}`];
 ctx.save();
 if(art.kind==='apple'&&pass==='world')drawTreeContact(ctx,p.x,p.y,b.width*.15);
 if(art.kind==='apple'&&p.allowTransparency!==false){const [px,py]=placementPoint(p,w.player.x,w.player.y,true);if(py<p.y&&py>b.y&&Math.abs(px-p.x)<b.width*.34)ctx.globalAlpha*=.6}
 if(angle||stretch!==1){ctx.translate(p.x,p.y);ctx.rotate(angle);ctx.scale(1,stretch);ctx.translate(-p.x,-p.y)}
 ctx.drawImage(base,b.x,b.y,b.width,b.height);
 for(let i=0;i<Math.min(count,fruit.points.length);i++){
  const socket=fruit.points[i],image=fruitImage(socket.variation);
  if(image)ctx.drawImage(image,b.x+socket.x*b.width-size/2,b.y+socket.y*b.height-size/2,size,size);
 }
 ctx.restore();
 if(pass==='world'&&s&&!reduced&&age>=0&&age<.38){
  const t=age/.38,[tx,ty]=placementPoint(p,s.to.x,s.to.y,true),c=Math.cos(angle),sn=Math.sin(angle);
  ctx.save();ctx.globalAlpha*=Math.min(1,(1-t)*3);
  for(let i=0;i<s.picked;i++){
   const socket=fruit.points[(s.remaining+i)%fruit.points.length],image=fruitImage(socket.variation);
   if(!image)continue;
   const dx=b.x+socket.x*b.width-p.x,dy=(b.y+socket.y*b.height-p.y)*stretch;
   const sx=p.x+dx*c-dy*sn,sy=p.y+dx*sn+dy*c;
   const x=sx+(tx-sx)*t,y=sy+(ty-sy)*t-Math.sin(t*Math.PI)*32*p.scale;
   ctx.drawImage(image,x-size/2,y-size/2,size,size);
  }
  ctx.restore();
 }
 return true;
}
