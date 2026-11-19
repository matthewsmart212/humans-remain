import {LOOT_CHEST_ID,LOOT_CHEST_OPEN_TICKS} from './loot-chest';
import type {World} from './survival-engine';
type Point=readonly [number,number];
export const CHEST_WIDTH_SCALE=.8,CHEST_DEPTH_SCALE=1.18;
const ART_SCALE=213/390,MOUTH_SOURCE_HEIGHT=46;
const MOUTH_FRONT=-178+(178+MOUTH_SOURCE_HEIGHT)*ART_SCALE;
export const CHEST_MOUTH_BACK=MOUTH_FRONT-MOUTH_SOURCE_HEIGHT*ART_SCALE*CHEST_DEPTH_SCALE;
export const CHEST_MOUTH_FRONT=MOUTH_FRONT;
const HINGE_Y=-58-24*CHEST_DEPTH_SCALE,LID_RISE=75*CHEST_DEPTH_SCALE;
export function chestHinge(w:World){
 const state=w.lootChests?.[LOOT_CHEST_ID];
 const t=state?Math.max(0,Math.min(1,(w.tick-state.openedAt)/LOOT_CHEST_OPEN_TICKS)):0;
 // Continuous hinge motion; no frame-swapped body, straps, skids or lock.
 const eased=t*t*(3-2*t),angle=eased*Math.PI/2;
 // A deeper rigid lid rotates around the same fixed back hinge. The front
 // rail and stationary body keep their existing height and narrower width.
 const back=HINGE_Y,front=back+24*CHEST_DEPTH_SCALE*Math.cos(angle)-LID_RISE*Math.sin(angle);
 const frontWidth=99-15*Math.sin(angle),backWidth=89;
 return {t,front,back,frontWidth,backWidth,inside:front<back};
}
function triangle(ctx:CanvasRenderingContext2D,image:HTMLImageElement,crop:readonly number[],a:Point,b:Point,c:Point,second:boolean){
 ctx.save();ctx.beginPath();
 const cx=(a[0]+b[0]+c[0])/3,cy=(a[1]+b[1]+c[1])/3;
 for(const [i,p] of [a,b,c].entries()){const dx=p[0]-cx,dy=p[1]-cy,n=Math.hypot(dx,dy),xx=p[0]+dx/n*.8,yy=p[1]+dy/n*.8;if(i)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy)}
 ctx.closePath();ctx.clip();
 const [sx,sy,sw,sh]=crop;
 if(second)ctx.transform(b[0]-c[0],b[1]-c[1],c[0]-a[0],c[1]-a[1],a[0],a[1]);
 else ctx.transform(b[0]-a[0],b[1]-a[1],c[0]-b[0],c[1]-b[1],a[0],a[1]);
 ctx.drawImage(image,sx,sy,sw,sh,0,0,1,1);ctx.restore();
}
/** Reuse two authored lid surfaces and ONE stationary base from the atlas.
 * Only texture projection moves. No generated in-between artwork is used. */
export function drawChestRig(ctx:CanvasRenderingContext2D,image:HTMLImageElement,w:World,x:number,y:number){
 const h=chestHinge(w);
 // Deepen only the compartment. The front, lock, straps and skids retain
 // their exact authored proportions and remain identical in every pose.
 ctx.drawImage(image,0,0,440,MOUTH_SOURCE_HEIGHT,x-120,y+CHEST_MOUTH_BACK,240,MOUTH_FRONT-CHEST_MOUTH_BACK);
 ctx.drawImage(image,0,MOUTH_SOURCE_HEIGHT,440,212-MOUTH_SOURCE_HEIGHT,x-120,y+MOUTH_FRONT,240,(212-MOUTH_SOURCE_HEIGHT)*ART_SCALE);
 if(Math.abs(h.front-h.back)<.18)return;
 const top=h.inside?h.front:h.back,bottom=h.inside?h.back:h.front;
 const tw=h.inside?h.frontWidth:h.backWidth,bw=h.inside?h.backWidth:h.frontWidth;
 const q:Point[]=[[-tw,top],[tw,top],[bw,bottom],[-bw,bottom]].map(([xx,yy])=>[x+xx,y+yy] as const);
 const crop=h.inside?[0,212,365,146]:[0,358,365,89];
 ctx.save();ctx.beginPath();q.forEach(([xx,yy],i)=>i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy));ctx.closePath();ctx.clip();
 triangle(ctx,image,crop,q[0],q[1],q[2],false);triangle(ctx,image,crop,q[0],q[2],q[3],true);ctx.restore();
 // A narrow dark hinge edge gives the rigid lid thickness at its edge-on pose.
 ctx.strokeStyle='#382b20';ctx.globalAlpha=.7;ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(x-bw,y+bottom);ctx.lineTo(x+bw,y+bottom);ctx.stroke();ctx.globalAlpha=1;
}
