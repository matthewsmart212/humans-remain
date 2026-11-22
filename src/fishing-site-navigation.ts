import {FISHING_PIER_ENTRY} from './fishing-site-art';
import {fishingPiers,fishingPierGeometry,fishingPierPoint,fishingPierDeckContains} from './fishing-site-geometry';
import type {Placement,WorldLayout} from './world-layout';

type Point={x:number;y:number};
type Blocked=(x:number,y:number)=>boolean;
type CoarseRoute=(start:Point,target:Point)=>Point[];
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);

// Reused only for the small region surrounding a pier. The outdoor navigation
// grid stays at its normal resolution; its large scratch arrays are untouched.
let costs=new Float64Array(0),scores=new Float64Array(0),parents=new Int32Array(0),positions=new Int32Array(0),known=new Uint8Array(0),closed=new Uint8Array(0);
const heap:number[]=[];
function reset(count:number){
 if(costs.length<count){costs=new Float64Array(count);scores=new Float64Array(count);parents=new Int32Array(count);positions=new Int32Array(count);known=new Uint8Array(count);closed=new Uint8Array(count)}
 costs.fill(Infinity,0,count);parents.fill(-1,0,count);positions.fill(-1,0,count);known.fill(0,0,count);closed.fill(0,0,count);heap.length=0;
}
function offer(id:number){
 let i=positions[id];if(i<0){i=heap.length;heap.push(id)}
 while(i){const up=(i-1)>>1,n=heap[up];if(scores[n]<=scores[id])break;heap[i]=n;positions[n]=i;i=up}
 heap[i]=id;positions[id]=i;
}
function take(){
 const first=heap[0],last=heap.pop()!;positions[first]=-1;
 if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&scores[heap[child+1]]<scores[heap[child]])child++;if(scores[last]<=scores[heap[child]])break;heap[i]=heap[child];positions[heap[i]]=i;i=child}heap[i]=last;positions[last]=i}
 return first;
}
function clearSegment(a:Point,b:Point,blocked:Blocked){
 const steps=Math.max(1,Math.ceil(distance(a,b)/2));
 for(let i=0;i<=steps;i++)if(blocked(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps))return false;
 return true;
}
function localBounds(p:Placement){const b=fishingPierGeometry(p).deckBounds;return{x:b.x-135,y:b.y-135,width:b.width+270,height:b.height+270}}
function within(p:Point,b:ReturnType<typeof localBounds>){return p.x>=b.x&&p.y>=b.y&&p.x<=b.x+b.width&&p.y<=b.y+b.height}

/** A bounded fine route resolves a narrow diagonal gangway and its upright props.
 * Every join and shortcut is checked with the same full body as real movement. */
function localRoute(p:Placement,start:Point,target:Point,blocked:Blocked,maxVisited:number):Point[]{
 const b=localBounds(p);
 if(!within(start,b)||!within(target,b)||blocked(start.x,start.y)||blocked(target.x,target.y))return [];
 if(clearSegment(start,target,blocked))return [target];
 const size=Math.max(3,Math.sqrt(b.width*b.height/90000)),cols=Math.ceil(b.width/size),rows=Math.ceil(b.height/size),count=cols*rows;
 reset(count);
 const point=(id:number):Point=>({x:b.x+(id%cols+.5)*size,y:b.y+(Math.floor(id/cols)+.5)*size});
 const open=(id:number)=>{if(!known[id]){const q=point(id);known[id]=blocked(q.x,q.y)?2:1}return known[id]===1};
 const sx=Math.floor((start.x-b.x)/size),sy=Math.floor((start.y-b.y)/size);
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
  const x=sx+dx,y=sy+dy;if(x<0||x>=cols||y<0||y>=rows)continue;
  const id=y*cols+x,q=point(id);if(!open(id)||!clearSegment(start,q,blocked))continue;
  costs[id]=distance(start,q);scores[id]=costs[id]+distance(q,target);offer(id);
 }
 let goal=-1,visited=0;
 while(heap.length&&visited++<Math.min(count,maxVisited)){
  const current=take(),q=point(current);closed[current]=1;
  if(distance(q,target)<=size*2.5&&clearSegment(q,target,blocked)){goal=current;break}
  const x=current%cols,y=Math.floor(current/cols);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(!(dx||dy)||x+dx<0||x+dx>=cols||y+dy<0||y+dy>=rows)continue;
   const id=current+dx+dy*cols;if(closed[id]||!open(id))continue;
   const cost=costs[current]+size*(dx&&dy?Math.SQRT2:1);if(cost>=costs[id])continue;
   const next=point(id);if(!clearSegment(q,next,blocked))continue;
   parents[id]=current;costs[id]=cost;scores[id]=cost+distance(next,target);offer(id);
  }
 }
 if(goal<0)return [];
 const raw:Point[]=[target];for(let id=goal;id>=0;id=parents[id])raw.push(point(id));raw.reverse();
 // Keep only body-clear straight stretches, so following a route does not
 // round a tight corner by skipping tiny fine-grid waypoints.
 const route:Point[]=[];let anchor=start;
 for(let i=0;i<raw.length;){let end=i;while(end+1<raw.length&&clearSegment(anchor,raw[end+1],blocked))end++;anchor=raw[end];route.push(anchor);i=end+1}
 return route;
}

/** Undefined leaves ordinary outdoor navigation untouched. Pier routes join
 * the existing land route at the bank; they cannot create paths over bare water. */
export function fishingPierRoute(layout:WorldLayout,start:Point,target:Point,blocked:Blocked,coarse:CoarseRoute,maxVisited=Infinity):Point[]|undefined{
 let from:Placement|undefined,to:Placement|undefined;
 for(const p of fishingPiers(layout)){
  if(!from&&fishingPierDeckContains(p,start.x,start.y))from=p;
  if(!to&&fishingPierDeckContains(p,target.x,target.y))to=p;
 }
 if(!from&&!to)return;
 const pier=from??to!;
 if(from===to||within(start,localBounds(pier))&&within(target,localBounds(pier))){
  const direct=localRoute(pier,start,target,blocked,maxVisited);if(direct.length||from===to)return direct;
 }
 const entry=(p:Placement)=>fishingPierPoint(p,...FISHING_PIER_ENTRY);
 const land=coarse(from?entry(from):start,to?entry(to):target);if(!land.length)return [];
 let route=land;
 if(from){const approach=localRoute(from,start,land[0],blocked,maxVisited);if(!approach.length)return [];route=[...approach,...land.slice(1)]}
 if(to){const arrival=localRoute(to,land[land.length-1],target,blocked,maxVisited);if(!arrival.length)return [];route=[...route,...arrival]}
 return route;
}
