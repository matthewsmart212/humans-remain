import {MAX_LAYOUT_ITEMS} from './layout-limits';
import plan from './camp-circular-wall-layout.json';
import oldWalls from './wall-artwork-replacements.json';
import {usesPaintedHomeTerrain} from './terrain-art';
import {placementBodies,type Placement,type WorldLayout} from './world-layout';
import type {Collider} from './camp-collision';

type Point=[number,number];
const originalIds=new Set(plan.sourceProvenance.originalWallPlacementIds);
const currentIds=new Set(plan.placements.map(p=>p.id));
const oldAssetIds=new Set(oldWalls.flatMap(a=>[a.entryId,'wall-t2-'+a.entryId]));
const isCampGate=(p:Placement)=>p.id.startsWith('camp-original-gate-')||p.assetId.startsWith('camp_gate_')||p.frame?.sourceAssetId.startsWith('camp_gate_');
const cross=(a:Point,b:Point,c:Point)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function edgesCross(a:Point,b:Point,c:Point,d:Point){
 const epsilon=1e-7;
 if(Math.max(a[0],b[0])+epsilon<Math.min(c[0],d[0])||Math.max(c[0],d[0])+epsilon<Math.min(a[0],b[0])||Math.max(a[1],b[1])+epsilon<Math.min(c[1],d[1])||Math.max(c[1],d[1])+epsilon<Math.min(a[1],b[1]))return false;
 return cross(a,b,c)*cross(a,b,d)<=epsilon&&cross(c,d,a)*cross(c,d,b)<=epsilon;
}
function within(point:Point,polygon:Point[]){
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[j],b=polygon[i];
  if(edgesCross(a,b,point,point))return true;
  if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
function polygonsOverlap(a:Point[],b:Point[]){
 return a.some(point=>within(point,b))||b.some(point=>within(point,a))||a.some((point,i)=>b.some((other,j)=>edgesCross(point,a[(i+1)%a.length],other,b[(j+1)%b.length])));
}
function colliderPolygon(c:Collider):Point[]{
 if(c.shape==='polygon')return c.points;
 if(c.shape==='rect')return[[c.x-c.hw,c.y-c.hh],[c.x+c.hw,c.y-c.hh],[c.x+c.hw,c.y+c.hh],[c.x-c.hw,c.y+c.hh]];
 // The three audited scenery objects have polygon or rectangle footprints.
 // Preserve an owner's replacement geometry instead of guessing another shape.
 return[];
}
function clearAuditedScenery(p:Placement,centre:Point,wallPolygons:Point[][]):Placement{
 const change=plan.sceneryAdjustments.find(a=>a.id===p.id);
 if(!change||p.assetId!==change.assetId||!p.solid||p.frame||p.collision||p.footprint||Math.abs(p.x-change.originalPosition[0])>.01||Math.abs(p.y-change.originalPosition[1])>.01||Math.abs(p.scale-change.originalScale)>1e-6||(p.rotation||0)!==change.originalRotation||!!p.flipX!==change.originalFlipX||!!p.flipY!==change.originalFlipY)return p;
 const footprints=placementBodies(p).map(colliderPolygon).filter(points=>points.length>0);
 if(!footprints.some(points=>wallPolygons.some(wall=>polygonsOverlap(points,wall))))return p;
 const dx=p.x-centre[0],dy=p.y-centre[1],radius=Math.hypot(dx,dy);
 if(!radius)return p;
 return{...p,x:p.x+dx/radius*change.outwardDistance,y:p.y+dy/radius*change.outwardDistance};
}

/** Replace the authored camp perimeter once; later editor changes remain intact. */
export function addApprovedCampPerimeter(layout:WorldLayout):WorldLayout{
 if(layout.campPerimeterVersion===5||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 const hearth=layout.items.find(p=>p.id===plan.hearthPlacementId&&p.role==='hearth');
 if(!hearth)return layout;
 const centre:Point=[hearth.x,hearth.y],offsetX=centre[0]-plan.centre[0],offsetY=centre[1]-plan.centre[1];
 // Match the eleven original placements and legacy wall artwork around camp.
 // Remote owner-placed uses of the old artwork stay in the world.
 const nearCamp=(p:Placement)=>Math.hypot(p.x-centre[0],p.y-centre[1])<=plan.radius+plan.baseThickness*2;
 const oldCampWall=(p:Placement)=>originalIds.has(p.id)||nearCamp(p)&&(p.id.startsWith('camp-perimeter-v3-')||oldAssetIds.has(p.assetId)||oldAssetIds.has(p.frame?.sourceAssetId||''));
 const retained=layout.items.filter(p=>!oldCampWall(p)&&!currentIds.has(p.id)&&!isCampGate(p));
 if(retained.length+plan.placements.length>MAX_LAYOUT_ITEMS)return layout;
 const walls=plan.placements.map(p=>({...p,x:p.x+offsetX,y:p.y+offsetY} as Placement));
 const wallPolygons=plan.sections.map(s=>s.collisionFootprint.polygonWorldRelativeToCircle.map(([x,y]):Point=>[centre[0]+x,centre[1]+y]));
 const items=retained.map(p=>clearAuditedScenery(p,centre,wallPolygons));
 return{...layout,campPerimeterVersion:5,items:[...items,...walls],updatedAt:new Date().toISOString()};
}
