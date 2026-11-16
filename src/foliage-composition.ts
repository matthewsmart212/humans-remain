import {ASSET_BY_ID} from './world-assets';
import {placementBounds,placementPoint,layoutBlocked,type Placement,type WorldLayout} from './world-layout';
import {campBounds,campContains} from './world-bounds';
import {riverWaterBlocked} from './river-collision';
import {campWallClearance} from './camp-vegetation';
import {inCampInnerRing} from './camp-foliage';
import {usesPaintedHomeTerrain} from './terrain-art';
import {WORLD_PLAN_ROUTES,routePoints,sourcePointToWorld} from './world-master-plan';
import {EAST_TERRAIN_SCALE} from './east-approach';
import {MAX_LAYOUT_ITEMS} from './layout-limits';

export const FOLIAGE_CLUSTER_PREFIX='scenery-cluster-v1-';
export const decorativeFoliage=(p:Placement)=>!!ASSET_BY_ID.get(p.assetId)?.foliage&&!p.assetId.startsWith('art_forage_');
const automated=(p:Placement)=>/^(camp-natural-v1-|camp-fringe-v1-|camp-river-v1-|camp-outskirts-v1-|world-plant-v1-|scenery-cluster-v1-)/.test(p.id);
const editableDecoration=(p:Placement)=>decorativeFoliage(p)&&automated(p)&&!p.locked&&!p.solid&&!p.collision&&!p.frame;
type Rect={x:number;y:number;width:number;height:number};
const overlaps=(a:Rect,b:Rect,pad=0)=>a.x+a.width>b.x-pad&&a.x<b.x+b.width+pad&&a.y+a.height>b.y-pad&&a.y<b.y+b.height+pad;
/** Include rotations/flips rather than testing roots alone. */
export function foliageEnvelope(p:Placement):Rect{
 const b=placementBounds(p),points=[[0,0],[1,0],[1,1],[0,1]].map(([u,v])=>placementPoint(p,b.x+u*b.width,b.y+v*b.height));
 const xs=points.map(q=>q[0]),ys=points.map(q=>q[1]);
 return{x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
}
function spatial<T>(rect:(value:T)=>Rect){
 const cells=new Map<string,Set<T>>(),size=400;
 const keys=(b:Rect)=>{const result:string[]=[];for(let x=Math.floor(b.x/size);x<=Math.floor((b.x+b.width)/size);x++)for(let y=Math.floor(b.y/size);y<=Math.floor((b.y+b.height)/size);y++)result.push(x+','+y);return result};
 return{add(value:T){for(const key of keys(rect(value))){let cell=cells.get(key);if(!cell)cells.set(key,cell=new Set());cell.add(value)}},query(b:Rect){const found=new Set<T>();for(const key of keys(b))for(const value of cells.get(key)??[])found.add(value);return [...found]}};
}
function hash(x:number,y:number,seed:number){let h=Math.imul(x^seed,374761393)+Math.imul(y,668265263);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296}
function noise(x:number,y:number){
 x/=420;y/=420;const ix=Math.floor(x),iy=Math.floor(y),sx=x-ix,sy=y-iy,u=sx*sx*(3-2*sx),v=sy*sy*(3-2*sy);
 return(hash(ix,iy,161126)*(1-u)+hash(ix+1,iy,161126)*u)*(1-v)+(hash(ix,iy+1,161126)*(1-u)+hash(ix+1,iy+1,161126)*u)*v;
}
/** Index clearances once, outside the simulation/render loop. */
export function sceneryClearance(layout:WorldLayout){
 const wallClear=campWallClearance(layout),features=spatial<Rect>(b=>b);
 for(const p of layout.items){
  const a=ASSET_BY_ID.get(p.assetId);if(!a||decorativeFoliage(p)||a.perimeter||a.groundDetail)continue;
  if(p.assetId.startsWith('art_tree_')||p.assetId==='prop_tree')features.add({x:p.x-38,y:p.y-38,width:76,height:76});
  else if(!a.puddle&&(p.solid||a.interior||p.role!=='prop'||p.assetId.startsWith('art_forage_')))features.add(foliageEnvelope(p));
 }
 type Segment={a:readonly number[];b:readonly number[];radius:number;bounds:Rect};
 const roads=spatial<Segment>(r=>r.bounds);
 for(const road of WORLD_PLAN_ROUTES.filter(r=>r.kind!=='access')){
  const points=routePoints(road).map(p=>sourcePointToWorld(p,EAST_TERRAIN_SCALE)),radius=road.width*EAST_TERRAIN_SCALE/2+30;
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i];roads.add({a,b,radius,bounds:{x:Math.min(a[0],b[0])-radius,y:Math.min(a[1],b[1])-radius,width:Math.abs(a[0]-b[0])+radius*2,height:Math.abs(a[1]-b[1])+radius*2}});
  }
 }
 return(p:Placement)=>{
  const b=foliageEnvelope(p),pad=22;
  if(!campContains(layout,p.x,p.y,40)||inCampInnerRing(p.x,p.y)||!wallClear(p))return false;
  if(features.query({x:b.x-55,y:b.y-55,width:b.width+110,height:b.height+110}).some(q=>overlaps(b,q,50)))return false;
  for(const u of [0,.5,1])for(const v of [0,.5,1]){
   const x=b.x+b.width*u,y=b.y+b.height*v;
   if(!campContains(layout,x,y,pad)||riverWaterBlocked(x,y,pad)||layoutBlocked(layout,x,y,pad))return false;
   if(roads.query({x:x-pad,y:y-pad,width:pad*2,height:pad*2}).some(q=>{
    const dx=q.b[0]-q.a[0],dy=q.b[1]-q.a[1],t=Math.max(0,Math.min(1,((x-q.a[0])*dx+(y-q.a[1])*dy)/(dx*dx+dy*dy||1)));
    return Math.hypot(x-q.a[0]-dx*t,y-q.a[1]-dy*t)<q.radius+pad;
   }))return false;
  }
  return true;
 };
}

/** One-time coherent thinning: low-density pockets open first, thickets remain.
 * Original IDs, locked/hand-placed decorations, trees and food are preserved. */
export function refineForageScenery(layout:WorldLayout):WorldLayout{
 if(layout.forageSceneryVersion===1||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 // Correct only the original test positions; retain IDs/picked state and any
 // positions Matthew subsequently edits. Check the painted wall, not just collision.
 for(const [id,x,y] of [['northwest-test-potato-v1',430,330],['northwest-test-carrot-v1',585,205]] as const){
  const plant=layout.items.find(p=>p.id===id);if(!plant||plant.locked||plant.x!==x||plant.y!==y)continue;
  const clearSample=sceneryClearance({...layout,items:layout.items.filter(p=>p.id!==id)});
  if(clearSample(plant))continue;
  let replacement:Placement|undefined;
  for(let radius=40;radius<=600&&!replacement;radius+=40)for(let i=0;i<16;i++){
   const angle=-Math.PI/2+i*Math.PI/8,q={...plant,x:+(x+Math.cos(angle)*radius).toFixed(1),y:+(y+Math.sin(angle)*radius).toFixed(1)};
   if(clearSample(q)){replacement=q;break}
  }
  if(replacement)layout={...layout,items:layout.items.map(p=>p.id===id?replacement!:p)};
 }
 const candidates=layout.items.filter(editableDecoration),wallClear=campWallClearance(layout),food=spatial<Rect>(b=>b),removed=new Set<string>();
 for(const p of layout.items.filter(p=>p.assetId.startsWith('art_forage_')))food.add(foliageEnvelope(p));
 // Existing woodland intentionally grows under tree crowns and beside rocks.
 // Retain that composition; full road/building checks apply to NEW clusters.
 for(const p of candidates){const b=foliageEnvelope(p);if(!wallClear(p)||food.query({x:b.x-55,y:b.y-55,width:b.width+110,height:b.height+110}).some(q=>overlaps(b,q,50)))removed.add(p.id)}
 const target=Math.round(candidates.length*.23);
 const ranked=candidates.filter(p=>!removed.has(p.id)).sort((a,b)=>noise(a.x,a.y)-noise(b.x,b.y)||a.id.localeCompare(b.id));
 for(const p of ranked.slice(0,Math.max(0,target-removed.size)))removed.add(p.id);
 return{...layout,forageSceneryVersion:1,items:layout.items.filter(p=>!removed.has(p.id)),updatedAt:new Date().toISOString()};
}

export type FoliageClusterOptions={seed:number;count:number;bounds?:Rect};
/** Offline/editor authoring only. Irregular ellipses, a local plant community,
 * large centres and smaller edges. No new textures, physics or per-frame work. */
export function composeFoliageClusters(layout:WorldLayout,options:FoliageClusterOptions){
 if(!usesPaintedHomeTerrain(layout.terrainImage))throw Error('Cluster placement requires the registered painted world.');
 if(!Number.isInteger(options.seed)||options.seed<0||options.seed>0xffffffff)throw Error('Seed must be an unsigned 32-bit integer.');
 if(!Number.isInteger(options.count)||options.count<0||options.count>MAX_LAYOUT_ITEMS)throw Error('Invalid foliage count.');
 // Re-running a seed replaces only this script's output, not authored scenery.
 const base={...layout,items:layout.items.filter(p=>!p.id.startsWith(FOLIAGE_CLUSTER_PREFIX)||p.locked)},clear=sceneryClearance(base);
 const worldBounds=campBounds(base),bounds=options.bounds??{x:worldBounds.left,y:worldBounds.top,width:worldBounds.width,height:worldBounds.height};
 const budget=Math.min(options.count,MAX_LAYOUT_ITEMS-base.items.length);
 if(budget<0||![bounds.x,bounds.y,bounds.width,bounds.height].every(Number.isFinite)||bounds.width<=0||bounds.height<=0)throw Error('Invalid composition bounds or full world.');
 const left=bounds.x,top=bounds.y;
 let seed=options.seed;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const existing=spatial<Placement>(foliageEnvelope);base.items.filter(decorativeFoliage).forEach(p=>existing.add(p));
 const palettes=[['fern','blue_fern','forest_ivy'],['copper_leaf','moss_rosette','ochre_meadow_grass'],['sage_fan','lime_rosette','white_woodland_flowers']].map(p=>p.map(k=>'art_foliage_'+k).filter(id=>ASSET_BY_ID.has(id)));
 const additions:Placement[]=[],centres:{x:number;y:number;radius:number}[]=[];
 const reservedIds=new Set(base.items.map(p=>p.id));let serial=0;
 for(let attempt=0;attempt<Math.max(100,budget*35)&&additions.length<budget;attempt++){
  const cx=left+random()*bounds.width,cy=top+random()*bounds.height,rx=170+random()*160,ry=rx*(.45+random()*.3),angle=random()*Math.PI*2;
  if(centres.some(c=>Math.hypot(cx-c.x,cy-c.y)<rx+c.radius+130))continue;
  const palette=palettes[Math.floor(random()*palettes.length)];if(!palette.length)continue;
  const total=4+Math.floor(random()*5);let made=0;
  for(let tries=0;tries<total*25&&made<total&&additions.length<budget;tries++){
   const theta=random()*Math.PI*2,r=Math.sqrt(random()),dx=Math.cos(theta)*rx*r,dy=Math.sin(theta)*ry*r;
   const x=+(cx+dx*Math.cos(angle)-dy*Math.sin(angle)).toFixed(1),y=+(cy+dx*Math.sin(angle)+dy*Math.cos(angle)).toFixed(1),assetId=palette[Math.floor(random()*palette.length)],a=ASSET_BY_ID.get(assetId)!;
   const width=(75+random()*55)*(1-r*.25),scale=+Math.max(.25,Math.min(3,width/a.width)).toFixed(3);
   const p:Placement={id:'',assetId,x,y,scale,rotation:Math.round(random()*24-12+360)%360,flipX:random()<.5,solid:false,roof:'auto',role:'prop',allowTransparency:false,locked:false,layer:0};
   const b=foliageEnvelope(p);
   if(b.x<left||b.y<top||b.x+b.width>left+bounds.width||b.y+b.height>top+bounds.height||!clear(p))continue;
   if(existing.query({x:b.x-70,y:b.y-70,width:b.width+140,height:b.height+140}).some(q=>Math.hypot(q.x-p.x,q.y-p.y)<Math.max(64,(foliageEnvelope(q).width+b.width)*.4)))continue;
   do{p.id=FOLIAGE_CLUSTER_PREFIX+options.seed+'-'+(++serial)}while(reservedIds.has(p.id));
   additions.push(p);existing.add(p);made++;
  }
  if(made)centres.push({x:cx,y:cy,radius:rx});
 }
 return{layout:{...base,items:[...base.items,...additions]},added:additions.length,clusters:centres.length,requested:options.count};
}
