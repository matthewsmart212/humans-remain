import plan from './tree-variant-placements.json';
import {usesPaintedHomeTerrain} from './terrain-art';
import {ASSET_BY_ID} from './world-assets';
import {placementPoint,type Placement,type WorldLayout} from './world-layout';
const changes=new Map(plan.changes.map(c=>[c.original.id,c]));
function unchanged(p:Placement,seed:object){const a=p as unknown as Record<string,unknown>,b=seed as Record<string,unknown>;return Object.keys({...a,...b}).every(k=>JSON.stringify(a[k])===JSON.stringify(b[k]));}
/** One authored pass: preserve species, density, trunk positions and owner edits. */
export function addApprovedTreeVariants(layout:WorldLayout):WorldLayout{
 if(layout.treeVariantsVersion||!layout.worldPlantingVersion||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 const fire=layout.items.find(p=>p.id==='06c42057-0d46-43ef-977b-f183d7c50561'&&p.role==='hearth');
 if(!fire||Math.hypot(fire.x-1718.1676,fire.y-1573.5125)>160)return layout;
 const items=layout.items.map(p=>{const c=changes.get(p.id);if(!c||!ASSET_BY_ID.has(c.assetId)||!unchanged(p,c.original))return p;
  const next={...p,assetId:c.assetId},oldRoot=placementPoint(p,p.x,p.y),newRoot=placementPoint(next,next.x,next.y);
  next.x+=oldRoot[0]-newRoot[0];next.y+=oldRoot[1]-newRoot[1];return next;
 });return{...layout,treeVariantsVersion:1,items,updatedAt:new Date().toISOString()};
}
