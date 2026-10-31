import {timeOf,type World} from './survival-engine';
import {deerFrame} from './camp-deer';
import {deerView,DEER_CELL,DEER_ANCHOR,DEER_SCALE} from './deer-art';
import type {FoliageViewport} from './foliage-renderer';
export function deerDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,view?:FoliageViewport){
 const out:{y:number;draw:()=>void}[]=[],t=timeOf(w);
 for(const a of w.animals){
  const m=a.deer;if(!m||a.hp<=0&&t-(m.deadAt??0)>2)continue;
  if(view&&(a.x<view.x-160||a.x>view.x+view.width+160||a.y<view.y-160||a.y>view.y+view.height+160))continue;
  const v=deerView(m.kind,m.direction),im=imgs[v.key];if(!im)continue;
  const frame=deerFrame(w,a),scale=DEER_SCALE[m.kind],alpha=a.hp>0?1:Math.min(1,(2-(t-(m.deadAt??t)))/.6);
  out.push({y:a.y,draw:()=>{ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#19271c55';ctx.beginPath();ctx.ellipse(a.x,a.y+1,27,8,0,0,Math.PI*2);ctx.fill();ctx.translate(a.x,a.y);ctx.scale(v.mirror?-scale:scale,scale);ctx.drawImage(im,frame%4*DEER_CELL,Math.floor(frame/4)*DEER_CELL,DEER_CELL,DEER_CELL,-DEER_ANCHOR[0],-DEER_ANCHOR[1],DEER_CELL,DEER_CELL);ctx.restore()}});
 }
 return out;
}
