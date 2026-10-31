import {lineClear,timeOf,type World} from './survival-engine';
import {visiblePlacements} from './layout-views';
import {ASSET_BY_ID} from './world-assets';
import type {FieldKitTarget} from './field-kit-target';
import {insideBuilding,placementContains} from './world-layout';

type View={x:number;y:number;width:number;height:number;scale:number};
type Loot=World['loot'][number];
type Cache={bucket:number;layout:World['layout'];checks:Map<Loot,boolean>};
// camp identity survives presentPlayer's per-frame shallow World copies.
const caches=new WeakMap<World['camp'],Cache>();
/** Presentation only: no textures, blur, pulsing, timers or simulation writes.
 * Visibility/collision queries run at most ten times a second per nearby item. */
export function visiblePickupCues(w:World,v:View){
 const bucket=Math.floor(w.tick/6);let cache=caches.get(w.camp);
 if(!cache||cache.bucket!==bucket||cache.layout!==w.layout){cache={bucket,layout:w.layout,checks:new Map()};caches.set(w.camp,cache)}
 const candidates=w.loot.filter(l=>l.amount>0&&(!l.flight||timeOf(w)>=l.flight.lands)&&
  l.x>=v.x-40&&l.x<=v.x+v.width+40&&l.y>=v.y-30&&l.y<=v.y+v.height+70&&
  Math.hypot(l.x-w.player.x,l.y-w.player.y)<650)
  .sort((a,b)=>Math.hypot(a.x-w.player.x,a.y-w.player.y)-Math.hypot(b.x-w.player.x,b.y-w.player.y)).slice(0,24);
 return candidates.filter(l=>{
  let clear=cache!.checks.get(l);if(clear!==undefined)return clear;
  clear=lineClear(w.player,l,w);
  // Collision line-of-sight handles real walls. Painted wall bounds can
  // overlap reachable drops, so they must not suppress the accessibility cue.
  // An opaque building roof still hides its contents.
  if(clear&&w.layout)clear=!visiblePlacements(w.layout,{x:l.x-20,y:l.y-65,width:40,height:75}).some(p=>
   p.id!==l.placementId&&ASSET_BY_ID.get(p.assetId)?.roof&&p.roof!=='hidden'&&
   !(p.roof==='auto'&&insideBuilding(p,w.player.x,w.player.y))&&
   (placementContains(p,l.x,l.y-42)||placementContains(p,l.x,l.y-12)));
  cache!.checks.set(l,clear);return clear;
 });
}
/** Small, staggered glints reveal loose loot without badges or persistent rings.
 * At most two glints are visible; reduced motion uses two quiet static diamonds. */
export function drawPickupGlints(ctx:CanvasRenderingContext2D,items:readonly Loot[],scale:number,time=0,target?:FieldKitTarget,reduced=false){
 const s=Math.max(.05,scale);let drawn=0;ctx.save();
 for(const item of items.slice(0,8)){
  if(item.id===target?.pickupId)continue;
  const phase=(time+(item.id%19)*.61)%5.5;if(!reduced&&phase>.65)continue;
  const x=item.x+12/s,y=item.y-18/s,r=(reduced?2:3)/s;
  ctx.globalAlpha=reduced?.4:Math.sin(phase/.65*Math.PI)*.8;
  ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r*.35,y-r*.35);ctx.lineTo(x+r,y);ctx.lineTo(x+r*.35,y+r*.35);ctx.lineTo(x,y+r);ctx.lineTo(x-r*.35,y+r*.35);ctx.lineTo(x-r,y);ctx.lineTo(x-r*.35,y-r*.35);ctx.closePath();
  ctx.strokeStyle='#293225';ctx.lineWidth=1.6/s;ctx.stroke();ctx.fillStyle='#ead69a';ctx.fill();
  if(++drawn===2)break;
 }
 ctx.restore();
}
