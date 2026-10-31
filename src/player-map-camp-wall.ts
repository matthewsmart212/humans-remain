import roads from './player-map-camp-roads.json';
import type {PlayerMapPath} from './player-map';

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
