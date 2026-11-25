import {PATCH_STATION_ID,PATCH_LOCKER_ID,PATCH_ROUTE_ART,type PatchRouteKind} from './patch-art';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {foliageEnvelope} from './foliage-composition';
import {riverWaterBlocked} from './river-collision';
import {usesPaintedHomeTerrain} from './terrain-art';
import {ASSET_BY_ID} from './world-assets';
import {campContains} from './world-bounds';
import {layoutBlocked,placementArtPoint,type Placement,type WorldLayout} from './world-layout';

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
 const a=ASSET_BY_ID.get(p.assetId)!;
 return placementArtPoint(p,a.anchor[0]/a.crop[2]+dx/a.width,a.anchor[1]/a.crop[3]+dy/a.height);
}
// Resolve the reserved placement ID instead of the first matching asset: an
// editor can add another mast or hauler without moving the quest interaction.
const placementsByLayout=new WeakMap<WorldLayout,Map<string,{items:Placement[];length:number;index:number;value?:Placement}>>();
function placed(layout:WorldLayout,id:string,assetId:string){
 let cache=placementsByLayout.get(layout);
 if(!cache){cache=new Map();placementsByLayout.set(layout,cache)}
 let slot=cache.get(id);
 if(!slot||slot.items!==layout.items||slot.length!==layout.items.length||
    layout.items[slot.index]!==slot.value||slot.value&&(slot.value.id!==id||slot.value.assetId!==assetId)){
  const index=layout.items.findIndex(p=>p.id===id&&p.assetId===assetId);
  slot={items:layout.items,length:layout.items.length,index,value:layout.items[index]};cache.set(id,slot);
 }
 return slot.value;
}
export function patchRescueSite(layout?:WorldLayout){
 if(!layout)return null;
 if(layout.patchRouteVersion===1){
  const station=placed(layout,PATCH_ROUTE_IDS.shelter,PATCH_ROUTE_ART.shelter.id);
  return station?{station,robot:localPoint(station,88,46),approach:localPoint(station,136,56)}:null;
 }
 const station=placed(layout,PATCH_STATION_PLACEMENT_ID,PATCH_STATION_ID);
 return station?{station,robot:localPoint(station,125,80),approach:localPoint(station,180,150)}:null;
}
/** The older site also exposes the original shed and empty locker for art and saved layouts. */
export function patchQuestSite(layout?:WorldLayout){
 const rescue=patchRescueSite(layout);
 if(!rescue||!layout)return null;
 const station=placed(layout,PATCH_STATION_PLACEMENT_ID,PATCH_STATION_ID);
 const lockerPlacement=placed(layout,PATCH_LOCKER_PLACEMENT_ID,PATCH_LOCKER_ID);
 return station&&lockerPlacement?{...rescue,station,lockerPlacement,locker:localPoint(lockerPlacement,0,35)}:null;
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
function placeOriginalStation(layout:WorldLayout):WorldLayout{
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

export const PATCH_ROUTE_IDS={
 shelter:'stillwater-evacuation-shelter',
 dispatch:'west-bank-dispatch-post',
 hauler:'logging-road-cable-works',
} as const;
const routeKinds=['shelter','dispatch','hauler'] as const;

export function patchLandmarks(layout:WorldLayout){
 return [placed(layout,PATCH_STATION_PLACEMENT_ID,PATCH_STATION_ID),placed(layout,PATCH_LOCKER_PLACEMENT_ID,PATCH_LOCKER_ID),
  ...routeKinds.map(kind=>placed(layout,PATCH_ROUTE_IDS[kind],PATCH_ROUTE_ART[kind].id))].filter(p=>p!==undefined);
}

export function patchRouteSite(layout:WorldLayout|undefined,kind:PatchRouteKind){
 if(!layout)return null;
 const placement=placed(layout,PATCH_ROUTE_IDS[kind],PATCH_ROUTE_ART[kind].id);
 if(!placement)return null;
 const approach=kind==='hauler'?localPoint(placement,115,54):kind==='dispatch'?localPoint(placement,75,50):localPoint(placement,136,56);
 return {placement,approach,release:kind==='hauler'?localPoint(placement,-120,56):undefined};
}

// Surveyed off the west-bank trail at the southern bridge, then on the road
// from the north logging bridge to the mine. Each alternate keeps its clue true.
const dispatchSites:Point[]=[{x:-3440,y:4720},{x:-3540,y:4670},{x:-3790,y:5020},{x:-3340,y:4770}];
const haulerSites:Point[]=[{x:-4910,y:-2610},{x:-4860,y:-2560},{x:-4450,y:-2400},{x:-4200,y:-1400}];
function routeGroup(kind:PatchRouteKind,position:Point):Placement[]{
 const id=PATCH_ROUTE_IDS[kind];
 const place=(suffix:string,assetId:string,dx:number,dy:number,scale:number,solid=false):Placement=>({
  id:id+suffix,assetId,x:position.x+dx,y:position.y+dy,scale,solid,role:'prop',roof:'auto',
 });
 const landmark=place('',PATCH_ROUTE_ART[kind].id,0,0,1,true);
 if(kind==='shelter')return [landmark,
  place('-bedrolls','art_hq_supply_bundle',-96,28,.75),
  place('-boots','art_hq_boots',-84,57,.65),
 ];
 if(kind==='dispatch')return [landmark,
  place('-records','art_hq_field_shelf',-114,8,.76),
  place('-rail','smallholding-fence-shoulder',117,-22,.68,true),
 ];
 return [landmark,
  place('-chocks','smallholding-kindling',155,-43,.65),
  place('-barrier','smallholding-fence-back',-140,-115,.73,true),
  place('-scree','art_rock_dry_scree_scatter',25,63,.82),
 ];
}
function routeGroupFits(layout:WorldLayout,group:Placement[],kind:PatchRouteKind,occupied:Rect[]){
 if(group.some(p=>!ASSET_BY_ID.has(p.assetId)))return false;
 const boxes=group.map(foliageEnvelope);
 const centre=group[0],front=kind==='hauler'?160:kind==='shelter'?145:95;
 boxes.push({x:centre.x-front,y:centre.y+22,width:front*2,height:64});
 return boxes.every(box=>!occupied.some(other=>intersects(box,other,8))&&
  [0,.5,1].every(u=>[0,.5,1].every(v=>{
   const x=box.x+u*box.width,y=box.y+v*box.height;
   return campContains(layout,x,y,24)&&!riverWaterBlocked(x,y,24,layout)&&!layoutBlocked(layout,x,y,24);
  })));
}

/** Seed the three acts together. The separate route marker permits v1 saves
 * to keep their original station, then preserves later owner moves/deletions. */
export function placePatchMaintenanceStation(source:WorldLayout):WorldLayout{
 const layout=placeOriginalStation(source);
 if(layout.patchRouteVersion!==undefined||layout.patchSiteVersion!==1||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 const site=patchRescueSite(layout);
 if(!site||!layout.items.some(p=>p.id==='camp-circular-wall-v1-14'))return layout;
 if(layout.items.some(p=>routeKinds.some(kind=>p.id===PATCH_ROUTE_IDS[kind]||p.id.startsWith(PATCH_ROUTE_IDS[kind]+'-'))))return{...layout,patchRouteVersion:1};
 const shelterSites=[[50,250],[-100,250],[300,75],[-320,65],[50,340]].map(([dx,dy])=>localPoint(site.station,dx,dy));
 const candidates={shelter:shelterSites,dispatch:dispatchSites,hauler:haulerSites};
 const added:Placement[]=[];
 const occupied=layout.items.map(p=>p.frame||ASSET_BY_ID.has(p.assetId)?foliageEnvelope(p):{x:p.x-128,y:p.y-128,width:256,height:256});
 for(const kind of routeKinds){
  const group=candidates[kind].map(point=>routeGroup(kind,point)).find(items=>routeGroupFits(layout,items,kind,occupied));
  if(!group)return layout;
  added.push(...group);occupied.push(...group.map(foliageEnvelope));
 }
 if(layout.items.length+added.length>MAX_LAYOUT_ITEMS)return layout;
 return{...layout,patchRouteVersion:1,items:[...layout.items,...added]};
}
