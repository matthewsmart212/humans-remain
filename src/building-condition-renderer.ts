import {timeOf,type World} from './survival-engine';
import {campBuildingPlacements} from './camp-restoration';
import {campRepairSite} from './camp-repair-site';
import {placementBounds,placementPoint,type Placement} from './world-layout';
import {buildingHudState} from './camp-hud';

export type HudRect={x:number;y:number;width:number;height:number};
const overlaps=(a:HudRect,b:HudRect)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
/** Keep a damage bar close to its structure, outside the toolbar and visible actors. */
export function buildingHudRect(placement:Placement,scale:number,wide:number,viewport:HudRect|undefined,avoid:HudRect[]=[]):HudRect|undefined{
 const k=1/Math.max(.35,scale),b=placementBounds(placement),corners=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>placementPoint(placement,x,y));
 const left=Math.min(...corners.map(p=>p[0])),right=Math.max(...corners.map(p=>p[0])),top=Math.min(...corners.map(p=>p[1])),bottom=Math.max(...corners.map(p=>p[1]));
 if(viewport&&(right<viewport.x||left>viewport.x+viewport.width||bottom<viewport.y||top>viewport.y+viewport.height))return;
 const width=wide*k,height=4*k,anchorX=(left+right)/2-width/2,anchorY=top-height-6*k;
 const fit=(x:number,y:number):HudRect=>({x:viewport?Math.max(viewport.x+12*k,Math.min(viewport.x+viewport.width-width-12*k,x)):x,y:viewport?Math.max(viewport.y+(viewport.height>viewport.width?154:viewport.width*scale>=800?60:108)*k,Math.min(viewport.y+viewport.height-height-12*k,y)):y,width,height});
 const candidates=[fit(anchorX,anchorY),fit(anchorX,top+8*k),fit(left+8*k,top+8*k),fit(right-width-8*k,top+8*k),fit(anchorX,bottom+6*k)];
 // If the building is too crowded, omit the momentary indicator rather than detach it from its target.
 return candidates.find(r=>avoid.every(a=>overlaps(r,a)===0));
}
/** Compact screen-sized damage bars; repair progress is shown only by the action button. */
export function drawBuildingCondition(ctx:CanvasRenderingContext2D,w:World,scale:number,viewport?:HudRect){
 if(!w.progression||w.scene)return;
 const t=timeOf(w),k=1/Math.max(.35,scale),reduced=!!w.weather?.reducedMotion;
 const avoid:HudRect[]=[{x:w.player.x-46,y:w.player.y-125,width:92,height:135},...w.enemies.filter(e=>e.hp>0).map(e=>{const h=e.kind==='iron-brute'?260:155;return{x:e.x-60,y:e.y-h,width:120,height:h+10}})];
 ctx.save();
 for(const {id,placement} of campBuildingPlacements(w.layout)){
  const state=buildingHudState(w,id);if(!state)continue;
  const site=campRepairSite(w,id);if(!site||Math.hypot(site.x-w.player.x,site.y-w.player.y)>1250)continue;
  const r=buildingHudRect(placement,scale,82,viewport,avoid);if(!r)continue;avoid.push(r);
  const {x,y,width,height}=r;
  ctx.save();ctx.globalAlpha=state.alpha;
  ctx.fillStyle='#071f21e8';ctx.fillRect(x,y,width,height);
  ctx.fillStyle=state.critical?'#d66a55':state.shield?'#8fb9b4':state.fraction<=.5?'#dcb56a':'#a6bc84';ctx.fillRect(x,y,width*state.fraction,height);
  ctx.fillStyle='#f9e6bb30';ctx.fillRect(x,y,width*state.fraction,k);
  ctx.restore();
 }
 const job=w.buildingRepair;
 if(job?.held&&!reduced){const beat=(t-job.started)%.65,life=Math.max(0,1-beat/.3);ctx.globalAlpha=life;ctx.strokeStyle='#ffe2a0';ctx.lineWidth=1.5*k;ctx.beginPath();for(let i=0;i<5;i++){const a=i*Math.PI*.4,d=(7+beat*45)*k;ctx.moveTo(w.player.x+Math.cos(a)*d,w.player.y-62*k+Math.sin(a)*d);ctx.lineTo(w.player.x+Math.cos(a)*(d+6*k),w.player.y-62*k+Math.sin(a)*(d+6*k))}ctx.stroke()}
 ctx.restore();
}
