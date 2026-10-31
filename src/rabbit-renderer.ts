import {timeOf,type World} from './survival-engine';
import {rabbitFrame} from './camp-rabbits';
import {rabbitView,RABBIT_CELL,RABBIT_ANCHOR,RABBIT_SCALE} from './rabbit-art';
import type {FoliageViewport} from './foliage-renderer';
export function rabbitDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,view?:FoliageViewport){
 const out:{y:number;draw:()=>void}[]=[],t=timeOf(w);
 for(const a of w.animals){
  const m=a.rabbit;if(!m||a.hp<=0&&t-(m.deadAt??0)>2)continue;
  if(view&&(a.x<view.x-80||a.x>view.x+view.width+80||a.y<view.y-80||a.y>view.y+view.height+80))continue;
  const v=rabbitView(m.direction),im=imgs[v.key];if(!im)continue;
  const frame=rabbitFrame(w,a),alpha=a.hp>0?1:Math.min(1,(2-(t-(m.deadAt??t)))/.6);
  out.push({y:a.y,draw:()=>{ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#19271c55';ctx.beginPath();ctx.ellipse(a.x,a.y+1,16,5,0,0,Math.PI*2);ctx.fill();ctx.translate(a.x,a.y);ctx.scale(v.mirror?-RABBIT_SCALE:RABBIT_SCALE,RABBIT_SCALE);ctx.drawImage(im,frame%4*RABBIT_CELL,Math.floor(frame/4)*RABBIT_CELL,RABBIT_CELL,RABBIT_CELL,-RABBIT_ANCHOR[0],-RABBIT_ANCHOR[1],RABBIT_CELL,RABBIT_CELL);ctx.restore()}});
 }
 return out;
}
