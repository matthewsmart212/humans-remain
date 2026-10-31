import {timeOf,type World} from './survival-engine';
import {chickenFrame} from './camp-chickens';
import {chickenView,CHICKEN_CELL,CHICKEN_ANCHOR,CHICKEN_SCALE} from './chicken-art';
import type {FoliageViewport} from './foliage-renderer';

export function chickenDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,view?:FoliageViewport){
 const out:{y:number;draw:()=>void}[]=[],t=timeOf(w);
 for(const a of w.animals){
  const m=a.chicken;if(!m)continue;
  if(a.hp<=0&&t-(m.deadAt??0)>2)continue;
  if(view&&(a.x<view.x-80||a.x>view.x+view.width+80||a.y<view.y-80||a.y>view.y+view.height+80))continue;
  const v=chickenView(m.direction),image=imgs[v.key];if(!image)continue;
  const frame=chickenFrame(w,a),alpha=a.hp>0?1:Math.min(1,(2-(t-(m.deadAt??t)))/.6);
  out.push({y:a.y,draw:()=>{
   ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#19271c55';ctx.beginPath();ctx.ellipse(a.x,a.y+1,15,5,0,0,Math.PI*2);ctx.fill();ctx.translate(a.x,a.y);ctx.scale(v.mirror?-CHICKEN_SCALE:CHICKEN_SCALE,CHICKEN_SCALE);
   ctx.drawImage(image,frame%4*CHICKEN_CELL,Math.floor(frame/4)*CHICKEN_CELL,CHICKEN_CELL,CHICKEN_CELL,-CHICKEN_ANCHOR[0],-CHICKEN_ANCHOR[1],CHICKEN_CELL,CHICKEN_CELL);ctx.restore();
  }});
 }
 return out;
}
