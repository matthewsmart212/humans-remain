import roads from './player-map-camp-roads.json';
import type {PlayerMapPath} from './player-map';
import {placementPoint,type Placement} from './world-layout';
import type {WorldAsset} from './world-assets';

// Cartographic symbol only: gameplay walls, terrain and roads stay untouched.
export const CAMP_MAP_WALL={x:1700,y:1550,radius:1450,posts:220,width:31,height:70};
export const CAMP_MAP_ROADS=roads.roads;
export const isCampMapWall=(name:string)=>/^Base wall [2-8]$/.test(name);
type Point={x:number;y:number};
function segmentDistance(p:Point,a:number[],b:number[]){
 const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy||1)));
 return Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy);
}
// Sample the same quadratic smoothing used by the painted atlas road trace.
const curves=CAMP_MAP_ROADS.map(r=>{
 const p=r.points,points=[p[0]];let start=p[0];
 for(let i=1;i<p.length-1;i++){
  const end=[(p[i][0]+p[i+1][0])/2,(p[i][1]+p[i+1][1])/2];
  for(let j=1;j<=6;j++){const t=j/6,u=1-t;points.push([u*u*start[0]+2*u*t*p[i][0]+t*t*end[0],u*u*start[1]+2*u*t*p[i][1]+t*t*end[1]])}
  start=end;
 }
 points.push(p[p.length-1]);return{...r,points};
});
export function campMapRoadClearance(p:Point){
 return Math.min(...curves.map(r=>Math.min(...r.points.slice(1).map((b,i)=>segmentDistance(p,r.points[i],b)))-r.width/2));
}
export const CAMP_MAP_STAKES=Array.from({length:CAMP_MAP_WALL.posts},(_,i)=>{
 const a=i*Math.PI*2/CAMP_MAP_WALL.posts,c=CAMP_MAP_WALL;
 return{x:c.x+Math.cos(a)*c.radius,y:c.y+Math.sin(a)*c.radius};
}).filter(p=>campMapRoadClearance(p)>CAMP_MAP_WALL.height+24);
const n=(v:number)=>Number(v.toFixed(2));
const polygon=(points:number[][])=>'M'+points.map(p=>p.map(n).join(' ')).join('L')+'Z';
// Two retained paths: upright pointed stakes with one flat shaded side.
export const CAMP_MAP_WALL_PATHS:PlayerMapPath[]=[{
 id:'camp-palisade-posts',fill:'#b89b5a',stroke:'#625536',strokeWidth:3,
 path:CAMP_MAP_STAKES.map(({x,y})=>polygon([[x-15,y],[x-15,y-48],[x,y-70],[x+15,y-48],[x+15,y]])).join(''),
},{
 id:'camp-palisade-shade',fill:'#887542',
 path:CAMP_MAP_STAKES.map(({x,y})=>polygon([[x,y-66],[x+13,y-47],[x+13,y-2],[x,y-2]])).join(''),
}];

/** Engrave the installed wall's actual ground curves, including its road ends.
 * Each placement stays independent, so moving or deleting a piece in Build
 * is reflected on the map without restoring a decorative fixed circle. */
export function circularCampMapWallPaths(walls:{p:Placement;a:WorldAsset}[]):PlayerMapPath[]{
 const stone:string[]=[],timber:string[]=[],shade:string[]=[];
 for(const {p,a} of walls){
  const curve=a.perimeterCurve;if(!curve||curve.length<2)continue;
  const points=curve.map(([x,y])=>placementPoint(p,p.x+x*p.scale,p.y+y*p.scale));
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
  const length=lengths[lengths.length-1];if(length<1)continue;
  const at=(distance:number)=>{let i=1;while(i<lengths.length-1&&lengths[i]<distance)i++;const t=(distance-lengths[i-1])/(lengths[i]-lengths[i-1]||1),u=points[i-1],v=points[i];return[u[0]+(v[0]-u[0])*t,u[1]+(v[1]-u[1])*t]};
  const side=(sign:number)=>points.map((v,i)=>{const before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)],dx=after[0]-before[0],dy=after[1]-before[1],d=Math.hypot(dx,dy)||1;return[v[0]-dy/d*20*p.scale*sign,v[1]+dx/d*20*p.scale*sign]});
  stone.push(polygon([...side(1),...side(-1).reverse()]));
  const count=Math.max(1,Math.ceil(length/(40*p.scale)));
  for(let i=0;i<=count;i++){
   const [x,y]=at(length*i/count),w=14*p.scale,h=(i%3===0?76:67)*p.scale;
   timber.push(polygon([[x-w,y],[x-w,y-h*.7],[x+w*.12,y-h],[x+w,y-h*.76],[x+w,y]]));
   shade.push(polygon([[x+w*.1,y-h*.93],[x+w*.86,y-h*.73],[x+w*.86,y-2*p.scale],[x+w*.1,y-2*p.scale]]));
  }
 }
 if(!timber.length)return[];
 return[
  {id:'circular-camp-stone-base',path:stone.join(''),fill:'#a49370',stroke:'#667046',strokeWidth:5},
  {id:'circular-camp-spiked-timber',path:timber.join(''),fill:'#b89b5a',stroke:'#625536',strokeWidth:2.5},
  {id:'circular-camp-timber-shade',path:shade.join(''),fill:'#887542'},
 ];
}
