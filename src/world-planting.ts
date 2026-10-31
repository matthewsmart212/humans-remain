import planting from './world-planting.json';
import {usesPaintedHomeTerrain} from './terrain-art';
import {ASSET_BY_ID} from './world-assets';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {layoutBlocked,placementBounds,type Placement,type WorldLayout} from './world-layout';
import {visiblePlacements} from './layout-views';

export const WORLD_PLANTING_PREFIX='world-plant-v1-';
/** A reviewed, one-time planting pass. Instances remain editable and share the
 * existing image sources; no procedural work is added to the frame loop. */
export function addApprovedWorldPlanting(layout:WorldLayout):WorldLayout{
 if(layout.worldPlantingVersion||!layout.woodlandZonesVersion||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 const fire=layout.items.find(p=>p.id==='06c42057-0d46-43ef-977b-f183d7c50561'&&p.role==='hearth');
 if(!fire||Math.hypot(fire.x-1718.1676,fire.y-1573.5125)>160)return layout;
 if(layout.items.some(p=>p.id.startsWith(WORLD_PLANTING_PREFIX)))return{...layout,worldPlantingVersion:1};
 const additions=(planting.placements as Placement[]).filter(p=>{
  const a=ASSET_BY_ID.get(p.assetId);if(!a||layoutBlocked(layout,p.x,p.y,a.foliage?30:85))return false;
  // Query only nearby placements. Anything the owner added after composition
  // takes precedence, including custom collision outlines and foliage edits.
  return !visiblePlacements(layout,{x:p.x-300,y:p.y-300,width:600,height:600}).some(q=>{
   const other=ASSET_BY_ID.get(q.assetId);if(!other||other.puddle)return false;
   if(other.foliage)return Math.hypot(q.x-p.x,q.y-p.y)<(a.foliage?85:250);
   const b=placementBounds(q);return p.x>b.x-150&&p.x<b.x+b.width+150&&p.y>b.y-100&&p.y<b.y+b.height+170;
  });
 }).map(p=>({...p}));
 if(layout.items.length+additions.length>MAX_LAYOUT_ITEMS)return layout;
 return{...layout,worldPlantingVersion:1,items:[...layout.items,...additions],updatedAt:new Date().toISOString()};
}
