import {gateColliders} from './camp-gates';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {campBounds,originalCampBounds,campContains,boundCampPoint,rectBounds} from './world-bounds';
import {usesPaintedHomeTerrain} from './terrain-art';
import type {ArtworkFile} from './artwork-model';
import {MAX_TERRAIN_FILE,MAX_TERRAIN_PIXELS,MAX_TERRAIN_EDGE,validTerrainBorder} from './terrain-limits';
import {ASSET_BY_ID,WorldAsset,WorldRole} from './world-assets';
import {MAP_WIDTH,MAP_HEIGHT} from './factory-map';
import {collisionError,type AssetCollision} from './asset-collision';
import {colliderBounds,hitCollider,type Collider} from './camp-collision';

/** Captured once, before a tier change. Artwork never controls an established placement's size. */
export type PlacementFrame={sourceAssetId:string;width:number;height:number;anchor:[number,number]};
export type Placement={id:string;assetId:string;x:number;y:number;scale:number;frame?:PlacementFrame;rotation?:number;flipX?:boolean;flipY?:boolean;locked?:boolean;layer?:number;solid:boolean;allowTransparency?:boolean;roof:'auto'|'hidden'|'shown';role:WorldRole;collision?:AssetCollision;footprint?:{width:number;depth:number}};
export type WorldLayout={campGardenVersion?:1;ironworksVersion?:1|2;forageVersion?:1;treeVariantsVersion?:1;campFringeVersion?:1;worldPlantingVersion?:1;woodlandZonesVersion?:1;campRiverVersion?:1;campOutskirtsVersion?:1;campPerimeterVersion?:1|2|3|4|5|6|7;terrainPuddleVersion?:1|2;terrainFoliageVersion?:1|2;foliageTrialVersion?:1|2|3;campCentreVersion?:1;hqPropsVersion?:1|2|3;version:1;name:string;terrain:'home';terrainImage?:ArtworkFile;terrainBorder?:number;spawn:{x:number;y:number};items:Placement[];updatedAt:string};
export const LAYOUT_KEY='safety-last-world-draft-v1',APPLIED_KEY='safety-last-world-applied-v1';
export const emptyLayout=():WorldLayout=>({version:1,name:'My home camp',terrain:'home',spawn:{x:MAP_WIDTH*.5,y:MAP_HEIGHT*.55},items:[],updatedAt:new Date().toISOString()});
let placementSequence=0;
export const newPlacementId=()=>globalThis.crypto?.randomUUID?.()||`placed-${Date.now().toString(36)}-${(++placementSequence).toString(36)}-${Math.random().toString(36).slice(2,12)}`;
export function newPlacement(assetId:string,x:number,y:number):Placement{const a=ASSET_BY_ID.get(assetId);if(!a)throw Error('Unknown artwork');return{id:newPlacementId(),assetId,x,y,scale:1,...(a.puddle?{layer:-7,allowTransparency:false}:a.groundDetail?{layer:-6,allowTransparency:false}:{}),solid:a.solid,roof:'auto',role:a.role}}
export function placementFrame(p:Placement,assets=ASSET_BY_ID):PlacementFrame{const a=assets.get(p.assetId)!;return p.frame??{sourceAssetId:p.assetId,width:a.width,height:a.height,anchor:[a.anchor[0]/a.crop[2],a.anchor[1]/a.crop[3]]}}
export function placementGeometryAsset(p:Placement,assets=ASSET_BY_ID){return assets.get(p.frame?.sourceAssetId??p.assetId)!}
export function placementBounds(p:Placement,assets=ASSET_BY_ID){const f=placementFrame(p,assets);return{x:p.x-f.anchor[0]*f.width*p.scale,y:p.y-f.anchor[1]*f.height*p.scale,width:f.width*p.scale,height:f.height*p.scale}}
export const normalizeRotation=(degrees:number)=>((degrees%360)+360)%360;
/** Mirror around the image centre, then rotate around its ground anchor. */
export function placementPoint(p:Placement,x:number,y:number,inverse=false,assets=ASSET_BY_ID):[number,number]{
 const mirror=(x:number,y:number):[number,number]=>{if(!p.flipX&&!p.flipY)return[x,y];const b=placementBounds(p,assets);return[p.flipX?2*b.x+b.width-x:x,p.flipY?2*b.y+b.height-y:y]};
 if(!inverse)[x,y]=mirror(x,y);
 const angle=(p.rotation||0)*Math.PI/180*(inverse?-1:1),c=Math.cos(angle),s=Math.sin(angle),dx=x-p.x,dy=y-p.y,result:[number,number]=[p.x+dx*c-dy*s,p.y+dx*s+dy*c];return inverse?mirror(...result):result;
}
export function placementContains(p:Placement,x:number,y:number){const b=placementBounds(p),[lx,ly]=placementPoint(p,x,y,true);return lx>=b.x&&lx<=b.x+b.width&&ly>=b.y&&ly<=b.y+b.height}
/** Layer zero preserves automatic depth; other layers order complete assets. */
/** Roofs cover the world regardless of a building's editable base layer. */
export function compareWorldDrawables(a:{roof?:boolean;layer?:number;y:number},b:{roof?:boolean;layer?:number;y:number}){return Number(!!a.roof)-Number(!!b.roof)||(a.layer??0)-(b.layer??0)||a.y-b.y}
function selectionDepth(p:Placement){
 const a=ASSET_BY_ID.get(p.assetId);if(!a)return p.y;
 if(a.roof&&p.roof!=='hidden')return 100000;
 const b=placementBounds(p);
 return Math.max(a.interior?-10000:p.y,...(a.foreground||[]).map(f=>placementPoint(p,b.x+(f[0]+f[2]/2)/a.crop[2]*b.width,b.y+(f[1]+f[3])/a.crop[3]*b.height)[1]));
}
export function placementHitStack(items:Placement[],x:number,y:number){
 return items.map((p,index)=>({p,index})).filter(({p})=>placementContains(p,x,y)).sort((a,b)=>compareWorldDrawables({layer:b.p.layer,y:selectionDepth(b.p)},{layer:a.p.layer,y:selectionDepth(a.p)})||b.index-a.index).map(({p})=>p);
}
export function placementEditable(p:Placement,patch:Partial<Placement>){return !p.locked||!['x','y','scale','rotation','flipX','flipY'].some(k=>Object.hasOwn(patch,k))}
export function placementBodies(p:Placement,assets=ASSET_BY_ID):Collider[]{
 if(!p.solid)return [];
 if(assets.get(p.assetId)?.gate)return gateColliders(p,0,assets);
 if(p.rotation||p.flipX||p.flipY){return placementBodies({...p,rotation:0,flipX:false,flipY:false},assets).map((b):Collider=>{
  if(b.shape==='circle'){const [x,y]=placementPoint(p,b.x,b.y,false,assets);return{...b,x,y}}
  if(b.shape==='segment'){const [x,y]=placementPoint(p,b.x,b.y,false,assets),[ex,ey]=placementPoint(p,b.ex,b.ey,false,assets);return{...b,x,y,ex,ey}}
  const source=b.shape==='polygon'?b.points:[[b.x-b.hw,b.y-b.hh],[b.x+b.hw,b.y-b.hh],[b.x+b.hw,b.y+b.hh],[b.x-b.hw,b.y+b.hh]];
  const points=source.map(([x,y])=>placementPoint(p,x,y,false,assets)),xs=points.map(v=>v[0]),ys=points.map(v=>v[1]),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
  return{id:b.id,shape:'polygon',points,x:(left+right)/2,y:(top+bottom)/2,hw:(right-left)/2,hh:(bottom-top)/2};
 })}
 const a=placementGeometryAsset(p,assets);if(!a||!p.solid||['scrap','fuel','pallets','animal','enemySpawn'].includes(p.role))return[];
 const f=placementFrame(p,assets);
 // A placed-object outline overrides its shared asset default.
 const collision=p.collision??a.collision;
 if(collision){const w=f.width*p.scale,h=f.height*p.scale,[ax,ay]=f.anchor;return collision.paths.flatMap((path,i):Collider[]=>{const points=path.points.map(([x,y]):[number,number]=>[p.x+(x-ax)*w,p.y+(y-ay)*h]);if(path.closed){const xs=points.map(v=>v[0]),ys=points.map(v=>v[1]),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);return[{id:p.id+':outline'+i,shape:'polygon',points,x:(left+right)/2,y:(top+bottom)/2,hw:(right-left)/2,hh:(bottom-top)/2}]}return points.slice(1).map(([ex,ey],j)=>({id:p.id+':wall'+i+':'+j,shape:'segment',x:points[j][0],y:points[j][1],ex,ey,r:collision.lineWidth*w/2}))})}
 const bodies=p.footprint?[{x:0,y:-p.footprint.depth/2,hw:p.footprint.width/2,hh:p.footprint.depth/2}]:a.body;
 return [...bodies.map((b,i):Collider=>({id:p.id+':'+i,shape:'rect',x:p.x+b.x*p.scale,y:p.y+b.y*p.scale,hw:b.hw*p.scale,hh:b.hh*p.scale})),...(!p.footprint?a.segments||[]:[]).map((b,i):Collider=>({id:p.id+':segment'+i,shape:'segment',x:p.x+b.x*p.scale,y:p.y+b.y*p.scale,ex:p.x+b.ex*p.scale,ey:p.y+b.ey*p.scale,r:b.r*p.scale}))]
}
export function insideBuilding(p:Placement,x:number,y:number,assets=ASSET_BY_ID){const b=placementGeometryAsset(p,assets)?.interior;[x,y]=placementPoint(p,x,y,true,assets);return !!b&&x>p.x+b.x*p.scale&&x<p.x+(b.x+b.width)*p.scale&&y>p.y+b.y*p.scale&&y<p.y+(b.y+b.height)*p.scale}
const spatial=new WeakMap<WorldLayout,Map<string,Collider[]>>();
/** Shared library collision edits invalidate the cached blockers of open worlds. */
export function invalidateLayoutCollision(layout:WorldLayout){spatial.delete(layout)}
/** Identity of the layout's current collision index. It changes whenever the
 * collision is invalidated, so derived navigation caches can key on it. */
export function layoutCollisionKey(layout:WorldLayout):object{return index(layout)}
/** The fixed part of a dynamic-gate layoutBlocked query: true outside the
 * walkable bounds, otherwise every solid placement collider touching the circle. */
export function layoutColliderHits(layout:WorldLayout,x:number,y:number,r:number,bounds?:{width:number;height:number;left?:number;top?:number}):true|Collider[]{
 const b=bounds?rectBounds(bounds.left??0,bounds.top??0,bounds.width,bounds.height):campBounds(layout);
 if(x<b.left+r||x>b.right-r||y<b.top+r||y>b.bottom-r||!bounds&&!campContains(layout,x,y,r))return true;
 const map=index(layout),hits:Collider[]=[];
 for(let cx=Math.floor((x-r)/160);cx<=Math.floor((x+r)/160);cx++)for(let cy=Math.floor((y-r)/160);cy<=Math.floor((y+r)/160);cy++)for(const c of map.get(cx+','+cy)||[])if(!hits.includes(c)&&hitCollider(c,x,y,r))hits.push(c);
 return hits;
}
function index(layout:WorldLayout,assets=ASSET_BY_ID){let map=assets===ASSET_BY_ID?spatial.get(layout):undefined;if(map)return map;map=new Map();for(const c of layout.items.filter(p=>!assets.get(p.assetId)?.gate).flatMap(p=>placementBodies(p,assets))){const b=colliderBounds(c);for(let x=Math.floor(b.left/160);x<=Math.floor(b.right/160);x++)for(let y=Math.floor(b.top/160);y<=Math.floor(b.bottom/160);y++){const k=x+','+y,list=map.get(k)||[];list.push(c);map.set(k,list)}}if(assets===ASSET_BY_ID)spatial.set(layout,map);return map}
export function layoutBlocked(layout:WorldLayout,x:number,y:number,r=19,ignoreRoles:WorldRole[]=[],assets=ASSET_BY_ID,bounds?:{width:number;height:number;left?:number;top?:number},dynamicGates=false,ignoredColliders?:ReadonlySet<string>){if(!dynamicGates&&layout.items.some(p=>assets.get(p.assetId)?.gate&&gateColliders(p,0,assets).some(c=>hitCollider(c,x,y,r))))return true;const b=bounds?rectBounds(bounds.left??0,bounds.top??0,bounds.width,bounds.height):campBounds(layout);if(x<b.left+r||x>b.right-r||y<b.top+r||y>b.bottom-r||!bounds&&!campContains(layout,x,y,r))return true;const map=index(layout,assets),ignored=ignoreRoles.length?layout.items.filter(p=>ignoreRoles.includes(p.role)).map(p=>p.id+':'):[];for(let cx=Math.floor((x-r)/160);cx<=Math.floor((x+r)/160);cx++)for(let cy=Math.floor((y-r)/160);cy<=Math.floor((y+r)/160);cy++)for(const c of map.get(cx+','+cy)||[])if(!ignoredColliders?.has(c.id)&&!ignored.some(id=>c.id.startsWith(id))&&hitCollider(c,x,y,r))return true;return false}
export function roleItems(layout:WorldLayout,role:WorldRole){return layout.items.filter(p=>p.role===role)}
/** Editor placements share the walkable terrain's coordinate bounds. */
export function placementLimits(assetId?:string,assets=ASSET_BY_ID,layout?:WorldLayout){const a=assets.get(assetId||'');return (a?.foliage||a?.puddle)&&!usesPaintedHomeTerrain(layout?.terrainImage)?originalCampBounds():campBounds(layout)}
export function boundPlacementPoint(p:{x:number;y:number},assetId?:string,layout?:WorldLayout){if(usesPaintedHomeTerrain(layout?.terrainImage))return boundCampPoint(p,layout);const b=placementLimits(assetId,ASSET_BY_ID,layout);return{x:Math.max(b.left,Math.min(b.right,p.x)),y:Math.max(b.top,Math.min(b.bottom,p.y))}}
function placementPositionValid(p:Placement,assets=ASSET_BY_ID,layout?:WorldLayout){const b=placementLimits(p.assetId,assets,layout);return Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom&&(!usesPaintedHomeTerrain(layout?.terrainImage)||campContains(layout,p.x,p.y))}
export function validateLayout(raw:unknown,forGame=false,assets=ASSET_BY_ID):{layout?:WorldLayout;errors:string[]}{
 const errors:string[]=[];if(!raw||typeof raw!=='object')return{errors:['Invalid layout']};const v=raw as WorldLayout;
 if(v.campGardenVersion!==undefined&&v.campGardenVersion!==1)return{errors:['Invalid camp garden version']};
 if(v.ironworksVersion!==undefined&&![1,2].includes(v.ironworksVersion))return{errors:['Invalid ironworks version']};
 if(v.forageVersion!==undefined&&v.forageVersion!==1)return{errors:['Invalid foraging version']};
 if(v.treeVariantsVersion!==undefined&&v.treeVariantsVersion!==1)return{errors:['Invalid tree variants version']};
 if(v.campFringeVersion!==undefined&&v.campFringeVersion!==1)return{errors:['Invalid camp fringe version']};
 if(v.worldPlantingVersion!==undefined&&v.worldPlantingVersion!==1)return{errors:['Invalid world planting version']}; if(v.woodlandZonesVersion!==undefined&&v.woodlandZonesVersion!==1)return{errors:['Invalid woodland zones version']}; if(v.campRiverVersion!==undefined&&v.campRiverVersion!==1)return{errors:['Invalid river planting version']};
 if(v.campOutskirtsVersion!==undefined&&v.campOutskirtsVersion!==1)return{errors:['Invalid camp outskirts version']};
 if(v.campPerimeterVersion!==undefined&&v.campPerimeterVersion!==1&&v.campPerimeterVersion!==2&&v.campPerimeterVersion!==3&&v.campPerimeterVersion!==4&&v.campPerimeterVersion!==5&&v.campPerimeterVersion!==6&&v.campPerimeterVersion!==7)return{errors:['Invalid camp perimeter version']};
 if(v.terrainPuddleVersion!==undefined&&v.terrainPuddleVersion!==1&&v.terrainPuddleVersion!==2)return{errors:['Invalid terrain puddle version']};
 if(v.terrainFoliageVersion!==undefined&&v.terrainFoliageVersion!==1&&v.terrainFoliageVersion!==2)return{errors:['Invalid terrain foliage version']};
 if(v.foliageTrialVersion!==undefined&&v.foliageTrialVersion!==1&&v.foliageTrialVersion!==2&&v.foliageTrialVersion!==3)return{errors:['Invalid foliage trial version']};
 if(v.campCentreVersion!==undefined&&v.campCentreVersion!==1)return{errors:['Invalid camp centre version']};
 if(v.hqPropsVersion!==undefined&&v.hqPropsVersion!==1&&v.hqPropsVersion!==2&&v.hqPropsVersion!==3)return{errors:['Invalid headquarters decoration version']};
 if(v.version!==1||v.terrain!=='home'||typeof v.name!=='string'||v.name.length>80||!Array.isArray(v.items)||v.items.length>MAX_LAYOUT_ITEMS)return{errors:[`Unsupported layout or too many objects (maximum ${MAX_LAYOUT_ITEMS}).`]};
 if(v.terrainImage){const t=v.terrainImage;if(typeof t.id!=='string'||! /^[a-zA-Z0-9_-]{1,100}$/.test(t.id)||t.url!=='/api/asset-files/'+t.id||typeof t.name!=='string'||t.name.length>150||!['image/png','image/webp','image/jpeg'].includes(t.mime)||![t.width,t.height,t.bytes].every(n=>Number.isInteger(n)&&n>0)||t.width>MAX_TERRAIN_EDGE||t.height>MAX_TERRAIN_EDGE||t.width*t.height>MAX_TERRAIN_PIXELS||t.bytes>MAX_TERRAIN_FILE)return{errors:['Invalid terrain image reference.']}}
 if(v.terrainBorder!==undefined&&(!v.terrainImage||!validTerrainBorder(v.terrainImage.width,v.terrainImage.height,v.terrainBorder)))return{errors:['Invalid outer scenery border.']};
 const finite=(n:unknown,lo:number,hi:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=lo&&n<=hi;
 const limits=campBounds(v);const pos=(p:any)=>p&&finite(p.x,limits.left,limits.right)&&finite(p.y,limits.top,limits.bottom)&&campContains(v,p.x,p.y);
 if(!pos(v.spawn))return{errors:['Invalid worker spawn']};const ids=new Set<string>();
 for(const p of v.items){const a=assets.get(p?.assetId);if(!a||typeof p.id!=='string'||!p.id||p.id.length>100||ids.has(p.id)||!placementPositionValid(p,assets,v)||!finite(p.scale,.25,3)||p.rotation!==undefined&&!finite(p.rotation,0,360)||p.layer!==undefined&&(!Number.isInteger(p.layer)||!finite(p.layer,-10000,10000))||p.locked!==undefined&&typeof p.locked!=='boolean'||p.flipX!==undefined&&typeof p.flipX!=='boolean'||p.flipY!==undefined&&typeof p.flipY!=='boolean'||typeof p.solid!=='boolean'||p.allowTransparency!==undefined&&typeof p.allowTransparency!=='boolean'||!['auto','hidden','shown'].includes(p.roof)||!['prop','generator','hearth','well','storage','lamp','scrap','fuel','pallets','crate','search','animal','enemySpawn','crusher','shutter'].includes(p.role)||p.footprint&&(!finite(p.footprint.width,4,1500)||!finite(p.footprint.depth,4,1500)))return{errors:['An object has invalid placement data.']};if(p.collision!==undefined){const error=collisionError(p.collision);if(error)return{errors:[`${a.name}: ${error}`]}}ids.add(p.id)}
 for(const p of v.items)if(p.frame!==undefined){const f=p.frame;if(!f||!assets.has(f.sourceAssetId)||!finite(f.width,1,16000)||!finite(f.height,1,16000)||!Array.isArray(f.anchor)||f.anchor.length!==2||!f.anchor.every(n=>finite(n,0,1)))return{errors:['An object has invalid fixed tier dimensions.']}}
 const layout:WorldLayout={version:1,terrain:'home',...(v.campGardenVersion?{campGardenVersion:v.campGardenVersion}:{}),...(v.ironworksVersion?{ironworksVersion:v.ironworksVersion}:{}),...(v.forageVersion?{forageVersion:v.forageVersion}:{}),...(v.treeVariantsVersion?{treeVariantsVersion:v.treeVariantsVersion}:{}),...(v.campFringeVersion?{campFringeVersion:v.campFringeVersion}:{}),...(v.worldPlantingVersion?{worldPlantingVersion:v.worldPlantingVersion}:{}),...(v.woodlandZonesVersion?{woodlandZonesVersion:v.woodlandZonesVersion}:{}),...(v.campRiverVersion?{campRiverVersion:v.campRiverVersion}:{}),...(v.campOutskirtsVersion?{campOutskirtsVersion:v.campOutskirtsVersion}:{}),...(v.campPerimeterVersion?{campPerimeterVersion:v.campPerimeterVersion}:{}),...(v.terrainPuddleVersion?{terrainPuddleVersion:v.terrainPuddleVersion}:{}),...(v.terrainFoliageVersion?{terrainFoliageVersion:v.terrainFoliageVersion}:{}),...(v.foliageTrialVersion?{foliageTrialVersion:v.foliageTrialVersion}:{}),...(v.campCentreVersion?{campCentreVersion:v.campCentreVersion}:{}),...(v.hqPropsVersion?{hqPropsVersion:v.hqPropsVersion}:{}),...(v.terrainImage&&v.terrainBorder!==undefined?{terrainBorder:v.terrainBorder}:{}),...(v.terrainImage?{terrainImage:{...v.terrainImage}}:{}),name:v.name.trim()||'My home camp',spawn:{x:v.spawn.x,y:v.spawn.y},items:v.items.map(p=>({id:p.id,assetId:p.assetId,x:p.x,y:p.y,scale:p.scale,...(p.frame?{frame:{sourceAssetId:p.frame.sourceAssetId,width:p.frame.width,height:p.frame.height,anchor:[...p.frame.anchor] as [number,number]}}:{}),...(p.rotation!==undefined?{rotation:normalizeRotation(p.rotation)}:{}),...(p.layer!==undefined?{layer:p.layer}:{}),...(p.locked!==undefined?{locked:p.locked}:{}),...(p.flipX!==undefined?{flipX:p.flipX}:{}),...(p.flipY!==undefined?{flipY:p.flipY}:{}),solid:p.solid,...(p.allowTransparency!==undefined?{allowTransparency:p.allowTransparency}:{}),roof:p.roof,role:p.role,...(p.collision!==undefined?{collision:{lineWidth:p.collision.lineWidth,paths:p.collision.paths.map(path=>({closed:path.closed,points:path.points.map(([x,y]):[number,number]=>[x,y])}))}}:{}),...(p.footprint?{footprint:{width:p.footprint.width,depth:p.footprint.depth}}:{})})),updatedAt:typeof v.updatedAt==='string'?v.updatedAt:new Date().toISOString()};
 if(forGame){
  for(const role of ['generator','hearth','well','storage'] as const)if(roleItems(layout,role).length!==1)errors.push(`Place exactly one ${role==='storage'?'shared supplies station':role}.`);
  if(layoutBlocked(layout,layout.spawn.x,layout.spawn.y,19,[],assets))errors.push('Worker spawn is blocked. Move the spawn marker to clear ground.');
  for(const p of layout.items.filter(p=>['generator','hearth','well','storage'].includes(p.role))){const front={x:p.x,y:p.y+(p.role==='generator'?85:65)};if(layoutBlocked(layout,front.x,front.y,19,[],assets))errors.push(`${assets.get(p.assetId)?.name}: leave its front interaction point clear.`)}
 }
 return{layout,errors};
}
export function readLocalLayout(key=LAYOUT_KEY):WorldLayout|null{try{const result=validateLayout(JSON.parse(localStorage.getItem(key)||'null'));return result.layout||null}catch{return null}}
export function storeLocalLayout(layout:WorldLayout,key=LAYOUT_KEY){localStorage.setItem(key,JSON.stringify(layout))}
export function starterLayout(){const l=emptyLayout(),x=l.spawn.x,y=l.spawn.y;const defs:[string,number,number][]=[['exp_generation_t1',x+260,y-240],['base_hearth_t1',x,y-180],['base_well_t1',x-240,y-70],['base_shared_store_t1',x+210,y+20],['base_lighting_t4',x-90,y+150],['prop_scrap',x-300,y+200],['existing_fuel_can',x+330,y+240],['prop_planks',x+100,y+300],['art-provisions-rabbit0',x+450,y+340],['art-provisions-rabbit0',x-440,y+340]];l.items=defs.map(([id,px,py])=>newPlacement(id,px,py));return l}
export async function fetchWorldLayout(){const r=await fetch('/api/world-layout',{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('World storage is unavailable');return await r.json() as {draft:WorldLayout|null;applied:WorldLayout|null;revision:number;canEdit:boolean;updatedAt:string|null}}
export async function saveWorldLayout(layout:WorldLayout,revision:number,action:'save'|'apply'|'original'){
 const r=await fetch('/api/world-layout',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({layout,revision,action})});const data=await r.json();if(!r.ok)throw Error(data.error||'World could not be saved');return data as {revision:number;updatedAt:string};
}
