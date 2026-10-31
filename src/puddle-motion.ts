import {ASSET_BY_ID} from './world-assets';
import {placementBounds,placementPoint,type Placement,type WorldLayout} from './world-layout';
import type {World} from './survival-engine';

export type PuddleRipple={placementId:string;x:number;y:number;age:number;power:number;side:number};
export type PuddleMotion={layout?:WorldLayout;x:number;y:number;phase:number;foot:number;wet?:string;effects:PuddleRipple[]};
const puddles=new WeakMap<WorldLayout,Placement[]>();
function waterPlacements(layout:WorldLayout){let list=puddles.get(layout);if(!list){list=layout.items.filter(p=>ASSET_BY_ID.get(p.assetId)?.puddle);puddles.set(layout,list)}return list}

/** The same water outline is used for foot contact and ripple clipping. */
export function pointInPuddle(p:Placement,x:number,y:number){
 const water=ASSET_BY_ID.get(p.assetId)?.puddle?.water;if(!water)return false;
 const b=placementBounds(p),[lx,ly]=placementPoint(p,x,y,true),u=(lx-b.x)/b.width,v=(ly-b.y)/b.height;
 if(u<0||u>1||v<0||v>1)return false;
 let inside=false;for(let i=0,j=water.length-1;i<water.length;j=i++){
  const [ax,ay]=water[i],[bx,by]=water[j];if((ay>v)!==(by>v)&&u<(bx-ax)*(v-ay)/(by-ay)+ax)inside=!inside;
 }return inside;
}

/** Fixed-step, distance-driven contacts. Rendering never creates effects. */
export function stepPuddles(w:World,dt:number){
 const p=w.player;
 let s=w.puddleMotion;
 if(!s||s.layout!==w.layout){s=w.puddleMotion={layout:w.layout,x:p.x,y:p.y,phase:p.walkDistance,foot:0,effects:[]};return}
 for(const e of s.effects)e.age+=dt;
 s.effects=s.effects.filter(e=>e.age<1.15);
 const dx=p.x-s.x,dy=p.y-s.y,distance=Math.hypot(dx,dy),oldPhase=s.phase;
 s.x=p.x;s.y=p.y;s.phase=p.walkDistance;
 if(!w.layout||w.scene||!p.moving||distance<.01||distance>80){s.wet=undefined;return}
 const footfall=Math.floor(oldPhase/56)!==Math.floor(p.walkDistance/56);
 const side=s.foot%2?1:-1,fx=p.x-dy/distance*6*side,fy=p.y+dx/distance*6*side;
 const wet=waterPlacements(w.layout).find(item=>pointInPuddle(item,fx,fy));
 if(wet&&(footfall||s.wet!==wet.id)){
  const b=placementBounds(wet),[x,y]=placementPoint(wet,fx,fy,true);
  s.effects.push({placementId:wet.id,x:(x-b.x)/b.width,y:(y-b.y)/b.height,age:0,power:p.sprinting?1:.48,side});
  if(s.effects.length>36)s.effects.splice(0,s.effects.length-36);
  s.foot++;
 }
 s.wet=wet?.id;
}
