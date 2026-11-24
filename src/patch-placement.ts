import {PATCH_STATION_ID,PATCH_LOCKER_ID} from './patch-art';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {foliageEnvelope} from './foliage-composition';
import {riverWaterBlocked} from './river-collision';
import {usesPaintedHomeTerrain} from './terrain-art';
import {ASSET_BY_ID} from './world-assets';
import {campContains} from './world-bounds';
import {layoutBlocked,placementPoint,type Placement,type WorldLayout} from './world-layout';

type Point={x:number;y:number};
type Rect=Point&{width:number;height:number};
export const PATCH_STATION_PLACEMENT_ID='stillwater-maintenance-station';
export const PATCH_LOCKER_PLACEMENT_ID='stillwater-maintenance-locker';
const ids=new Set([PATCH_STATION_PLACEMENT_ID,PATCH_LOCKER_PLACEMENT_ID]);
const assets=new Set([PATCH_STATION_ID,PATCH_LOCKER_ID]);
// Surveyed against the published world. Reach the west bank over the existing
// southern bridge; nothing in the lake, camp, roads or surrounding trees moves.
export const PATCH_SURVEYED_SITES:readonly Point[]=[{x:-3850,y:7000},{x:-3900,y:7200},{x:-4050,y:7050}];
function localPoint(p:Placement,dx:number,dy:number):Point{
 const [x,y]=placementPoint(p,p.x+dx*p.scale,p.y+dy*p.scale);return{x,y};
}
type SiteIndex={items:Placement[];length:number;stationIndex:number;lockerIndex:number;station?:Placement;locker?:Placement};
const siteIndices=new WeakMap<WorldLayout,SiteIndex>();
function sitePlacements(layout:WorldLayout){
 let cached=siteIndices.get(layout);
 if(!cached||cached.items!==layout.items||cached.length!==layout.items.length||
  layout.items[cached.stationIndex]!==cached.station||layout.items[cached.lockerIndex]!==cached.locker||
  cached.station&&(cached.station.id!==PATCH_STATION_PLACEMENT_ID||cached.station.assetId!==PATCH_STATION_ID)||
  cached.locker&&(cached.locker.id!==PATCH_LOCKER_PLACEMENT_ID||cached.locker.assetId!==PATCH_LOCKER_ID)){
  const stationIndex=layout.items.findIndex(p=>p.id===PATCH_STATION_PLACEMENT_ID&&p.assetId===PATCH_STATION_ID);
  const lockerIndex=layout.items.findIndex(p=>p.id===PATCH_LOCKER_PLACEMENT_ID&&p.assetId===PATCH_LOCKER_ID);
  cached={items:layout.items,length:layout.items.length,stationIndex,lockerIndex,station:layout.items[stationIndex],locker:layout.items[lockerIndex]};siteIndices.set(layout,cached);
 }
 return cached;
}
export function patchQuestSite(layout?:WorldLayout){
 if(!layout)return null;
 const {station,locker:lockerPlacement}=sitePlacements(layout);
 if(!station||!lockerPlacement)return null;
 return{station,lockerPlacement,robot:localPoint(station,125,80),
  locker:localPoint(lockerPlacement,0,35),approach:localPoint(station,180,150)};
}
function siteItems(site:Point):Placement[]{
 return[
  {id:PATCH_STATION_PLACEMENT_ID,assetId:PATCH_STATION_ID,...site,scale:1,solid:true,allowTransparency:false,role:'prop',roof:'auto'},
  {id:PATCH_LOCKER_PLACEMENT_ID,assetId:PATCH_LOCKER_ID,x:site.x-240,y:site.y-160,scale:1,solid:true,allowTransparency:false,role:'prop',roof:'auto'},
 ];
}
const intersects=(a:Rect,b:Rect,pad=22)=>a.x+a.width>b.x-pad&&a.x<b.x+b.width+pad&&a.y+a.height>b.y-pad&&a.y<b.y+b.height+pad;
function siteClear(layout:WorldLayout,items:Placement[],occupied:Rect[]){
 // Clearance includes the front service bay and both interaction approaches,
 // not merely the small wall/locker collision outlines.
 const p=items[0],boxes=[{x:p.x-235,y:p.y-290,width:470,height:440},
  {x:items[1].x-65,y:items[1].y-80,width:130,height:145}];
 if(boxes.some(box=>occupied.some(other=>intersects(box,other))))return false;
 for(const box of boxes)for(const u of [0,.25,.5,.75,1])for(const v of [0,.25,.5,.75,1]){
  const x=box.x+u*box.width,y=box.y+v*box.height;
  if(!campContains(layout,x,y,28)||riverWaterBlocked(x,y,28,layout)||layoutBlocked(layout,x,y,28))return false;
 }
 return true;
}
/** One-time authored scenery only. Run progress never edits these placements. */
export function placePatchMaintenanceStation(layout:WorldLayout):WorldLayout{
 if(layout.patchSiteVersion!==undefined||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 // Unmarked editor copies can already contain the site. Do not replenish a
 // removed half, move a custom copy, or undo the owner's later deletion.
 if(layout.items.some(p=>ids.has(p.id)||assets.has(p.assetId)))return{...layout,patchSiteVersion:1};
 if(layout.items.length+2>MAX_LAYOUT_ITEMS||!layout.items.some(p=>p.id==='camp-circular-wall-v1-14'))return layout;
 if(!ASSET_BY_ID.has(PATCH_STATION_ID)||!ASSET_BY_ID.has(PATCH_LOCKER_ID))return layout;
 const occupied=layout.items.map(p=>p.frame||ASSET_BY_ID.has(p.assetId)?foliageEnvelope(p):{x:p.x-128,y:p.y-128,width:256,height:256});
 for(const position of PATCH_SURVEYED_SITES){
  const items=siteItems(position);
  if(siteClear(layout,items,occupied))return{...layout,patchSiteVersion:1,items:[...layout.items,...items]};
 }
 return layout;
}
