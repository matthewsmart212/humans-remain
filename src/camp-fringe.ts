import planting from './camp-fringe.json';
import {usesPaintedHomeTerrain} from './terrain-art';
import {ASSET_BY_ID} from './world-assets';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {visiblePlacements} from './layout-views';
import {layoutBlocked,placementBounds,type Placement,type WorldLayout} from './world-layout';

export const CAMP_FRINGE_PREFIX='camp-fringe-v1-';
/** New owner placements always win over the reviewed fringe. */
export function campFringePlacementClear(layout:WorldLayout,p:Placement){
 if(layoutBlocked(layout,p.x,p.y,30))return false;
 const b=placementBounds(p);
 return !visiblePlacements(layout,{x:p.x-260,y:p.y-260,width:520,height:520}).some(q=>{
  const a=ASSET_BY_ID.get(q.assetId);if(!a||a.puddle)return false;
  const r=placementBounds(q);
  if(a.foliage)return Math.hypot(q.x-p.x,q.y-p.y)<Math.max(58,b.width*.28+r.width*.22);
  return b.x+b.width>r.x-55&&b.x<r.x+r.width+55&&b.y+b.height>r.y-30&&b.y<r.y+r.height+70;
 });
}
/** Extend existing leaf communities once; density and scale taper outwards.
 * Every original placement stays intact, and there is no new per-frame work. */
export function addApprovedCampFringe(layout:WorldLayout):WorldLayout{
 if(layout.campFringeVersion||!layout.worldPlantingVersion||layout.terrainFoliageVersion!==2||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 const fire=layout.items.find(p=>p.id==='06c42057-0d46-43ef-977b-f183d7c50561'&&p.role==='hearth');
 if(!fire||Math.hypot(fire.x-1718.1676,fire.y-1573.5125)>160)return layout;
 if(layout.items.some(p=>p.id.startsWith(CAMP_FRINGE_PREFIX)))return{...layout,campFringeVersion:1};
 const additions:Placement[]=[];
 for(let i=0;i<planting.items.length;i++){
  const [index,x,y,scale,rotation,flip]=planting.items[i],assetId=planting.assets[index];
  if(!ASSET_BY_ID.get(assetId)?.foliage)continue;
  const p:Placement={id:CAMP_FRINGE_PREFIX+(i+1),assetId,x,y,scale,rotation,flipX:!!flip,locked:false,layer:0,solid:false,allowTransparency:false,roof:'auto',role:'prop'};
  if(campFringePlacementClear(layout,p))additions.push(p);
 }
 if(layout.items.length+additions.length>MAX_LAYOUT_ITEMS)return layout;
 return{...layout,campFringeVersion:1,items:[...layout.items,...additions],updatedAt:new Date().toISOString()};
}
