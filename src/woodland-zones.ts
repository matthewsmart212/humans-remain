import zoning from './woodland-zones.json';
import outskirts from './camp-outskirts-planting.json';
import riverside from './camp-river-planting.json';
import {usesPaintedHomeTerrain} from './terrain-art';
import {ASSET_BY_ID} from './world-assets';
import type {Placement,WorldLayout} from './world-layout';

const originals=new Map([...outskirts.placements,...riverside.placements].map(p=>[p.id,p]));
const changes=new Map(zoning.changes.map(p=>[p.id,p]));
function unchanged(p:Placement,seed:object){
 const current=p as unknown as Record<string,unknown>,original=seed as Record<string,unknown>;
 return Object.keys({...original,...current}).every(key=>JSON.stringify(current[key])===JSON.stringify(original[key]));
}
/** One authored refinement of existing planting. Never recreates a deleted tree,
 * overrides an owner edit, or adds work to the rendering loop. */
export function refineApprovedWoodlandZones(layout:WorldLayout):WorldLayout{
 if(layout.woodlandZonesVersion||!layout.campOutskirtsVersion||!layout.campRiverVersion||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 const fire=layout.items.find(p=>p.id==='06c42057-0d46-43ef-977b-f183d7c50561'&&p.role==='hearth');
 if(!fire||Math.hypot(fire.x-1718.1676,fire.y-1573.5125)>160)return layout;
 const items=layout.items.map(p=>{
  const change=changes.get(p.id),seed=originals.get(p.id);
  if(!change||!seed||!ASSET_BY_ID.has(change.assetId)||!unchanged(p,seed))return p;
  return{...p,assetId:change.assetId,scale:change.scale};
 });
 return{...layout,woodlandZonesVersion:1,items,updatedAt:new Date().toISOString()};
}
