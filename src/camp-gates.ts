import {ASSET_BY_ID,type WorldAsset} from './world-assets';
import {placementBounds,placementPoint,type Placement} from './world-layout';
import {hitCollider,type Collider} from './camp-collision';
import {layoutViews} from './layout-views';
import type {World} from './survival-engine';
export type GateMotion={amount:number;target:0|1;held?:boolean;swing?:1|-1;clearFor?:number};
export type GateArt={a:number[];b:number[];height:number;leaf:string;leafSize:number[];post:string;postSize:number[];postWidth:number;postHeight:number;postAnchor?:number[];topRail?:boolean;states?:{closed:string;open:string;size:number[]}};
export const GATE_SECONDS=.72,GATE_ANGLE=Math.PI*.38;
export function gateAmount(w:World,id:string){return w.gateMotions?.[id]?.amount??0}
export function gatePose(w:World,id:string){return gateAmount(w,id)*(w.gateMotions?.[id]?.swing??1)}
export function gateIsOpen(w:World,id:string){return w.gateMotions?.[id]?.target===1}
export function gateActionLabel(w:World,id:string){return w.gateMotions?.[id]?.held?'Cancel close':gateAmount(w,id)>=.5?'Close gate':'Open gate'}
/** Coordinates are in the untransformed sprite frame; rendering applies placement transforms. */
export function gateLocal(p:Placement,a:WorldAsset,amount:number,assets=ASSET_BY_ID){
 const b=placementBounds(p,assets),g=a.gate!,A={x:b.x+g.a[0]*b.width,y:b.y+g.a[1]*b.height},B={x:b.x+g.b[0]*b.width,y:b.y+g.b[1]*b.height};
 const dx=(B.x-A.x)/2,dy=(B.y-A.y)/2,c=Math.cos(amount*GATE_ANGLE),s=Math.sin(amount*GATE_ANGLE);
 return {a:A,b:B,ae:{x:A.x+dx*c-dy*s,y:A.y+dy*c+dx*s},be:{x:B.x-dx*c-dy*s,y:B.y-dy*c+dx*s},height:g.height*b.height/a.height,postWidth:g.postWidth*b.width/a.width,postHeight:g.postHeight*b.height/a.height};
}
export function gateColliders(p:Placement,amount:number,assets=ASSET_BY_ID):Collider[]{
 const a=assets.get(p.assetId);if(!a?.gate||!p.solid)return [];
 const q=gateLocal(p,a,0,assets),point=(v:{x:number;y:number})=>{const [x,y]=placementPoint(p,v.x,v.y,false,assets);return{x,y}},A=point(q.a),B=point(q.b);
 const posts:Collider[]=[{id:p.id+':post-a',shape:'circle',...A,r:20*p.scale},{id:p.id+':post-b',shape:'circle',...B,r:20*p.scale}];
 // Open artwork is parked beside the hinges. There is no invisible moving sweep.
 return Math.abs(amount)>=.5?posts:[...posts,{id:p.id+':leaf-closed',shape:'segment',...A,ex:B.x,ey:B.y,r:16*p.scale}];
}
export function gatesBlocked(w:World,x:number,y:number,r:number){return layoutViews(w.layout).gates.some(p=>gateColliders(p,gatePose(w,p.id)).some(c=>hitCollider(c,x,y,r)))}
function occupied(w:World,p:Placement,amount:number,swing= w.gateMotions?.[p.id]?.swing??1){const bodies=gateColliders(p,amount*swing).filter(c=>c.id.includes(':leaf-'));return [{...w.player,r:20},...w.enemies.filter(e=>e.hp>0).map(e=>({...e,r:19})),...w.animals.filter(e=>e.hp>0).map(e=>({...e,r:12}))].some(v=>bodies.some(c=>hitCollider(c,v.x,v.y,v.r)))}
export function nearbyGate(w:World){if(w.player.downedUntil)return null;let best:Placement|null=null,distance=260;
 for(const p of layoutViews(w.layout).gates){if(!p.solid)continue;const [a,b]=gateColliders(p,0),dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((w.player.x-a.x)*dx+(w.player.y-a.y)*dy)/(dx*dx+dy*dy))),d=Math.hypot(w.player.x-a.x-t*dx,w.player.y-a.y-t*dy);if(d<distance){distance=d;best=p}}return best;
}
export function toggleGate(w:World,id:string){
 const p=nearbyGate(w);if(!p||p.id!==id)return false;
 const motion=w.gateMotions?.[id];
 if(motion?.held){motion.target=1;motion.held=false;motion.clearFor=0;w.notice='Gate will stay open'}
 else if(gateAmount(w,id)<.5){(w.gateMotions??={})[id]={amount:1,target:1};w.notice='Gate opened'}
 else {(w.gateMotions??={})[id]={amount:1,target:0,held:true,clearFor:0};w.notice='Closing when the doorway is clear'}
 w.noticeUntil=w.tick/60+2;for(const e of w.enemies){e.path=[];e.repathAt=0}return true;
}
export function stepGates(w:World,seconds:number){
 for(const p of layoutViews(w.layout).gates){const motion=w.gateMotions?.[p.id];if(!motion||motion.amount===motion.target)continue;
  if(motion.target===1){motion.amount=1;motion.held=false;continue}
  if(occupied(w,p,0)){motion.held=true;motion.clearFor=0;continue}
  // A short clear interval prevents closing on a player or animal crossing the threshold.
  motion.clearFor=(motion.clearFor??0)+Math.min(seconds,.1);
  if(motion.clearFor<.2)continue;
  motion.amount=0;motion.held=false;motion.clearFor=0;
  for(const e of w.enemies){e.path=[];e.repathAt=0}
 }
}
