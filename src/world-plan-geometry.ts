import {WORLD_PLAN_BOUNDS,WORLD_PLAN_NODES,WORLD_PLAN_ROUTES,WORLD_PLAN_RIVERS,WORLD_PLAN_QUIET,routePoints,type PlanPoint,type PlanRect} from './world-master-plan';
const cross=(a:PlanPoint,b:PlanPoint)=>a[0]*b[1]-a[1]*b[0];
const sub=(a:PlanPoint,b:PlanPoint):PlanPoint=>[a[0]-b[0],a[1]-b[1]];
export function segmentIntersection(a:PlanPoint,b:PlanPoint,c:PlanPoint,d:PlanPoint):PlanPoint|null{
 const r=sub(b,a),s=sub(d,c),den=cross(r,s);if(Math.abs(den)<1e-8)return null;
 const t=cross(sub(c,a),s)/den,u=cross(sub(c,a),r)/den;
 return t>=-1e-8&&t<=1+1e-8&&u>=-1e-8&&u<=1+1e-8?[a[0]+t*r[0],a[1]+t*r[1]]:null;
}
export function pointInPolygon(p:PlanPoint,poly:readonly PlanPoint[]){
 let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside;
}
export const insideRect=(p:PlanPoint,r:PlanRect)=>p[0]>=r.x&&p[0]<=r.x+r.width&&p[1]>=r.y&&p[1]<=r.y+r.height;
const edges=(r:PlanRect)=>[
 {side:'north',a:[r.x,r.y],b:[r.x+r.width,r.y]},
 {side:'east',a:[r.x+r.width,r.y],b:[r.x+r.width,r.y+r.height]},
 {side:'south',a:[r.x+r.width,r.y+r.height],b:[r.x,r.y+r.height]},
 {side:'west',a:[r.x,r.y+r.height],b:[r.x,r.y]},
] as const;
export function patchRouteContacts(rect:PlanRect){
 const contacts:{route:string;side:string;point:PlanPoint;width:number;kind:string;status:string}[]=[];
 for(const route of WORLD_PLAN_ROUTES.filter(r=>r.kind!=='access')){
  const p=routePoints(route);
  for(let i=1;i<p.length;i++)for(const edge of edges(rect)){
   const at=segmentIntersection(p[i-1],p[i],edge.a,edge.b);if(!at)continue;
   if(contacts.some(c=>c.route===route.id&&c.side===edge.side&&Math.hypot(c.point[0]-at[0],c.point[1]-at[1])<.01))continue;
   contacts.push({route:route.id,side:edge.side,point:[Math.round(at[0]),Math.round(at[1])],width:route.width,kind:route.kind,status:route.status});
  }
 }return contacts;
}
export function riverRouteCrossings(){
 const crossings:{route:string;river:string;point:PlanPoint;bridge:boolean}[]=[];
 for(const route of WORLD_PLAN_ROUTES.filter(r=>r.kind!=='access')){
  const p=routePoints(route);
  for(let i=1;i<p.length;i++)for(const river of WORLD_PLAN_RIVERS)for(let j=1;j<river.points.length;j++){
   const at=segmentIntersection(p[i-1],p[i],river.points[j-1],river.points[j]);
   if(at&&!crossings.some(c=>c.route===route.id&&c.river===river.id&&Math.hypot(c.point[0]-at[0],c.point[1]-at[1])<.01))crossings.push({route:route.id,river:river.id,point:at,bridge:route.kind==='bridge'});
  }
 }return crossings;
}
export function quietAreaConflicts(){
 const conflicts:string[]=[];
 for(const route of WORLD_PLAN_ROUTES.filter(r=>r.kind!=='access')){
  const p=routePoints(route);
  for(const area of WORLD_PLAN_QUIET){
   let hit=p.some(v=>pointInPolygon(v,area.polygon));
   for(let i=1;i<p.length&&!hit;i++)for(let j=0;j<area.polygon.length;j++)if(segmentIntersection(p[i-1],p[i],area.polygon[j],area.polygon[(j+1)%area.polygon.length]))hit=true;
   if(hit)conflicts.push(route.id+' crosses '+area.id);
  }
 }return conflicts;
}
export function connectedPlanNodes(){
 const reached=new Set(['camp']);let changed=true;
 while(changed){changed=false;for(const r of WORLD_PLAN_ROUTES){if(reached.has(r.from)&&!reached.has(r.to)){reached.add(r.to);changed=true}if(reached.has(r.to)&&!reached.has(r.from)){reached.add(r.from);changed=true}}}
 return reached;
}
export function validateWorldPlan(){
 const errors:string[]=[],ids=new Set<string>();
 for(const r of WORLD_PLAN_ROUTES){
  if(ids.has(r.id))errors.push('Duplicate route: '+r.id);ids.add(r.id);
  if(!WORLD_PLAN_NODES[r.from]||!WORLD_PLAN_NODES[r.to]){errors.push('Missing route node: '+r.id);continue}
  if(routePoints(r).some(p=>!insideRect(p,WORLD_PLAN_BOUNDS)))errors.push('Route leaves world: '+r.id);
 }
 for(const c of riverRouteCrossings())if(!c.bridge)errors.push('Unbridged river crossing: '+c.route+' / '+c.river);
 for(const r of WORLD_PLAN_ROUTES.filter(r=>r.kind==='bridge'))if(!riverRouteCrossings().some(c=>c.route===r.id))errors.push('Bridge misses river: '+r.id);
 errors.push(...quietAreaConflicts());
 const reached=connectedPlanNodes();for(const id of Object.keys(WORLD_PLAN_NODES))if(!reached.has(id))errors.push('Disconnected destination: '+id);
 return errors;
}
