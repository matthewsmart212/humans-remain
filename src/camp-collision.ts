import {OBSTACLES} from './factory-map';
export type Collider=({shape:'rect';x:number;y:number;hw:number;hh:number}|{shape:'circle';x:number;y:number;r:number}|{shape:'segment';x:number;y:number;ex:number;ey:number;r:number}|{shape:'polygon';points:[number,number][];x:number;y:number;hw:number;hh:number})&{id:string};
// Terrain is artwork only. Collision belongs to visible placed objects.
export const TERRAIN_COLLIDERS:Collider[]=[];
export const STATIC_COLLIDERS:Collider[]=OBSTACLES.map((b,i)=>({...b,id:'placed-'+i,shape:'rect' as const}));
const segmentDistance=(x:number,y:number,ax:number,ay:number,bx:number,by:number)=>{const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-ax-t*dx,y-ay-t*dy)};
export function colliderBounds(c:Collider){const bx=c.shape==='segment'?c.ex:c.x,by=c.shape==='segment'?c.ey:c.y,rx=c.shape==='rect'||c.shape==='polygon'?c.hw:c.r,ry=c.shape==='rect'||c.shape==='polygon'?c.hh:c.r;return{left:Math.min(c.x,bx)-rx,right:Math.max(c.x,bx)+rx,top:Math.min(c.y,by)-ry,bottom:Math.max(c.y,by)+ry}}
export function hitCollider(c:Collider,x:number,y:number,r:number){
 if(c.shape==='circle')return Math.hypot(x-c.x,y-c.y)<r+c.r;
 if(c.shape==='rect')return Math.hypot(x-Math.max(c.x-c.hw,Math.min(c.x+c.hw,x)),y-Math.max(c.y-c.hh,Math.min(c.y+c.hh,y)))<r;
 if(c.shape==='segment')return segmentDistance(x,y,c.x,c.y,c.ex,c.ey)<r+c.r;
 let inside=false;for(let i=0,j=c.points.length-1;i<c.points.length;j=i++){const [ax,ay]=c.points[j],[bx,by]=c.points[i];if(segmentDistance(x,y,ax,ay,bx,by)<=r)return true;if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside}return inside;
}
// Spatial buckets keep off-screen objects out of each movement check.
const CELL=160,buckets=new Map<string,Collider[]>();
for(const c of STATIC_COLLIDERS){const b=colliderBounds(c);for(let x=Math.floor(b.left/CELL);x<=Math.floor(b.right/CELL);x++)for(let y=Math.floor(b.top/CELL);y<=Math.floor(b.bottom/CELL);y++){const key=x+','+y,list=buckets.get(key)||[];list.push(c);buckets.set(key,list)}}
export function staticBlocked(x:number,y:number,r:number){for(let cx=Math.floor((x-r)/CELL);cx<=Math.floor((x+r)/CELL);cx++)for(let cy=Math.floor((y-r)/CELL);cy<=Math.floor((y+r)/CELL);cy++)for(const c of buckets.get(cx+','+cy)||[])if(hitCollider(c,x,y,r))return true;return false}
