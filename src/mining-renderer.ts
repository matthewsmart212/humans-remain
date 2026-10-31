import type {World} from './survival-engine';
import type {axeAttachment} from './axe-renderer';

export function drawPickaxe(ctx:CanvasRenderingContext2D,image:HTMLImageElement,pose:ReturnType<typeof axeAttachment>){
 ctx.save();ctx.translate(...pose.hand);ctx.rotate(pose.angle);ctx.scale(pose.flip,1);
 const k=.043;ctx.drawImage(image,-530*k,-1150*k,1024*k,1536*k);ctx.restore();
}
export function stoneDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,view?:{x:number;y:number;width:number;height:number}){
 return w.loot.filter(l=>['stone','ironOre','ironIngot'].includes(l.kind)&&(!view||l.x>view.x-80&&l.x<view.x+view.width+80&&l.y>view.y-80&&l.y<view.y+view.height+80)).map(l=>({y:l.y,draw:()=>{
  const image=imgs[l.kind];if(!image)return;
  const t=w.tick/60,u=l.flight?Math.max(0,Math.min(1,(t-l.flight.born)/(l.flight.lands-l.flight.born))):1;
  const x=l.flight?l.flight.from.x+(l.x-l.flight.from.x)*u:l.x,y=l.flight?l.flight.from.y+(l.y-l.flight.from.y)*u-(w.weather?.reducedMotion?0:Math.sin(u*Math.PI)*45):l.y;
  ctx.save();ctx.fillStyle='#201d1638';ctx.beginPath();ctx.ellipse(l.x,l.y,23,7,0,0,Math.PI*2);ctx.fill();ctx.drawImage(image,x-28,y-34,56,36);ctx.restore();
 }}));
}
