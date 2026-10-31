import {WORLD_PLAN_ROUTES,routePoints,sourcePointToWorld,type PlanPoint,type PlanRect,type PlanRoute} from './world-master-plan';
import {EAST_TERRAIN_SCALE} from './east-approach';
import {ROAD_ART_CORE,roadMaterialWeights} from './world-road-materials';

/** Separate textured surfaces following the fixed road layout. */
export const WORLD_ROAD_STAGE='painted-road-sections' as const;
export const WORLD_ROAD_PLACEHOLDER='#111111';
export type RoadMesh={positions:{x:number;y:number}[];uv:{x:number;y:number}[];alpha:number[];materials:number[][];indices:number[]};
export type WorldRoad={
 id:string;from:string;to:string;kind:Exclude<PlanRoute['kind'],'access'>;
 material:'stone'|'dirt'|'bridge';width:number;
 sourcePoints:readonly PlanPoint[];sourceOutline:readonly PlanPoint[];
 outline:readonly PlanPoint[];bounds:PlanRect;mesh:RoadMesh;
};
const distance=(a:PlanPoint,b:PlanPoint)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const towards=(a:PlanPoint,b:PlanPoint,d:number):PlanPoint=>{
 const f=d/distance(a,b);return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
};

// Round local corners without moving junctions or bowing long segments across
// reserved river banks. Sample once at module load, never once per frame.
function roundCorners(points:readonly PlanPoint[]):PlanPoint[]{
 const result:PlanPoint[]=[points[0]];
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1];
  const trim=Math.min(260,distance(a,b)*.28,distance(b,c)*.28);
  if(trim<.01)continue;
  const start=towards(b,a,trim),end=towards(b,c,trim);result.push(start);
  for(let j=1;j<=12;j++){
   const t=j/12,u=1-t;
   result.push([u*u*start[0]+2*u*t*b[0]+t*t*end[0],u*u*start[1]+2*u*t*b[1]+t*t*end[1]]);
  }
 }
 result.push(points[points.length-1]);
 // A regular maximum spacing also lets widths taper independently of the
 // distance between the survey's control points.
 const sampled:PlanPoint[]=[result[0]];
 for(let i=1;i<result.length;i++){
  const a=result[i-1],b=result[i],steps=Math.ceil(distance(a,b)/100);
  for(let j=1;j<=steps;j++)sampled.push([a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps]);
 }
 return sampled;
}

/** Closed round-ended ribbon: usable as a plain fill now or a clipped texture later. */
function roadOutline(points:readonly PlanPoint[],widths:readonly number[]):PlanPoint[]{
 const left:PlanPoint[]=[],right:PlanPoint[]=[];
 const normals=points.slice(1).map((p,i):PlanPoint=>{
  const d=distance(points[i],p);return [-(p[1]-points[i][1])/d,(p[0]-points[i][0])/d];
 });
 for(let i=0;i<points.length;i++){
  const a=normals[Math.max(0,i-1)],b=normals[Math.min(normals.length-1,i)];
  const length=Math.hypot(a[0]+b[0],a[1]+b[1]);
  const n:PlanPoint=length>.001?[(a[0]+b[0])/length,(a[1]+b[1])/length]:b;
  const offset=widths[i]/2/Math.max(.5,n[0]*b[0]+n[1]*b[1]),p=points[i];
  left.push([p[0]+n[0]*offset,p[1]+n[1]*offset]);right.push([p[0]-n[0]*offset,p[1]-n[1]*offset]);
 }
 const cap=(p:PlanPoint,angle:number,half:number)=>Array.from({length:15},(_,i):PlanPoint=>{
  const a=angle-Math.PI*(i+1)/16;return [p[0]+Math.cos(a)*half,p[1]+Math.sin(a)*half];
 });
 const last=points.length-1;
 return [...left,...cap(points[last],Math.atan2(normals[last-1][1],normals[last-1][0]),widths[last]/2),...right.reverse(),...cap(points[0],Math.atan2(-normals[0][1],-normals[0][0]),widths[0]/2)];
}

/** Bend the complete painted section along the route, including its shoulders. */
function roadMesh(points:readonly PlanPoint[],widths:readonly number[],outline:readonly PlanPoint[]):RoadMesh{
 const positions:{x:number;y:number}[]=[],uv:{x:number;y:number}[]=[],alpha:number[]=[],materials:number[][]=[],indices:number[]=[];
 const vertex=(p:PlanPoint,u:number,v:number,a:number,weights:number[])=>{const [x,y]=sourcePointToWorld(p,EAST_TERRAIN_SCALE);positions.push({x,y});uv.push({x:u,y:v});alpha.push(a);materials.push(weights);return positions.length-1};
 const count=points.length,travel=[0];
 for(let i=1;i<count;i++)travel.push(travel[i-1]+distance(points[i-1],points[i])/((widths[i]+widths[i-1])/2/ROAD_ART_CORE));
 for(let i=0;i<count;i++){
  const p=points[i],left=outline[i],dx=(left[0]-p[0])/ROAD_ART_CORE,dy=(left[1]-p[1])/ROAD_ART_CORE,weights=roadMaterialWeights(...p);
  for(let j=0;j<=8;j++){const f=1-j/4;vertex([p[0]+dx*f,p[1]+dy*f],j/8,travel[i],j===0||j===8?0:1,weights)}
  if(i)for(let j=0;j<8;j++){const a=(i-1)*9+j,b=i*9+j;indices.push(a,b,a+1,a+1,b,b+1)}
 }
 const cap=(i:number,start:boolean)=>{
  const p=points[i],half=widths[i]/2/ROAD_ART_CORE,inner=half*.65,weights=roadMaterialWeights(...p);
  const normal=Math.atan2(outline[i][1]-p[1],outline[i][0]-p[0]),angle=normal+(start?Math.PI:0),nx=Math.cos(normal),ny=Math.sin(normal);
  const vert=(radius:number,a:number,opacity:number)=>{const dx=Math.cos(a)*radius,dy=Math.sin(a)*radius;return vertex([p[0]+dx,p[1]+dy],.5-(dx*nx+dy*ny)/(half*2),travel[i]+(dx*ny-dy*nx)/(half*2),opacity,weights)};
  const centre=vert(0,0,1),inside:number[]=[],outside:number[]=[];
  for(let j=0;j<=16;j++){
   const a=angle-j*Math.PI/16;
   inside.push(vert(inner,a,1));outside.push(vert(half,a,0));
   if(j){indices.push(centre,inside[j-1],inside[j],inside[j-1],outside[j-1],inside[j],inside[j],outside[j-1],outside[j])}
  }
 };
 cap(0,true);cap(count-1,false);return {positions,uv,alpha,materials,indices};
}

const junctionWidth=(id:string)=>Math.max(...WORLD_PLAN_ROUTES.filter(r=>r.from===id||r.to===id).map(r=>r.width));
const taper=(distance:number)=>{const t=Math.max(0,1-distance/400);return t*t*(3-2*t)};
export const WORLD_ROADS:readonly WorldRoad[]=WORLD_PLAN_ROUTES.filter((r):r is PlanRoute&{kind:WorldRoad['kind']}=>r.kind!=='access').map(route=>{
 const sourcePoints=roundCorners(routePoints(route)),lengths=[0];
 for(let i=1;i<sourcePoints.length;i++)lengths.push(lengths[i-1]+distance(sourcePoints[i-1],sourcePoints[i]));
 const start=junctionWidth(route.from),end=junctionWidth(route.to),total=lengths[lengths.length-1];
 const widths=lengths.map(d=>route.width+Math.max((start-route.width)*taper(d),(end-route.width)*taper(total-d)));
 const sourceOutline=roadOutline(sourcePoints,widths);
 const outline=sourceOutline.map(p=>sourcePointToWorld(p,EAST_TERRAIN_SCALE));
 const mesh=roadMesh(sourcePoints,widths,sourceOutline),xs=mesh.positions.map(p=>p.x),ys=mesh.positions.map(p=>p.y);
 return {id:route.id,from:route.from,to:route.to,kind:route.kind,material:route.kind==='stone'?'stone':route.kind==='bridge'?'bridge':'dirt',width:route.width,sourcePoints,sourceOutline,outline,mesh,bounds:{x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)}};
});

export function traceWorldRoad(ctx:CanvasRenderingContext2D,road:WorldRoad){
 ctx.beginPath();road.outline.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
}
