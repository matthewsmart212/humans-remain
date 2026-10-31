import {assetImageKey,TREE_LOG_IMAGE} from './world-assets';
import type {World} from './survival-engine';

/** Reuse one existing log sprite for every bundle. No new texture per tree. */
export function treeLogDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,view?:{x:number;y:number;width:number;height:number}){
 const image=imgs[assetImageKey(TREE_LOG_IMAGE)];if(!image)return[];
 return w.loot.filter(l=>l.appearance==='logs'&&(!view||l.x>view.x-90&&l.x<view.x+view.width+90&&l.y>view.y-90&&l.y<view.y+view.height+90)).map(l=>({y:l.y,draw:()=>{
  const age=w.tick/60,u=w.weather?.reducedMotion?1:l.flight?Math.max(0,Math.min(1,(age-l.flight.born)/(l.flight.lands-l.flight.born))):1;
  const x=l.flight?l.flight.from.x+(l.x-l.flight.from.x)*u:l.x,y=l.flight?l.flight.from.y+(l.y-l.flight.from.y)*u-Math.sin(u*Math.PI)*22:l.y;
  ctx.save();ctx.fillStyle='#20160f30';ctx.beginPath();ctx.ellipse(l.x,l.y,25,8,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(image,x-35,y-34,70,47);ctx.restore();
 }}));
}
