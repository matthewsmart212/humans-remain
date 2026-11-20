import type {AssetCollision} from './asset-collision';
import {colliderBounds,hitCollider} from './camp-collision';
import {placedCollision} from './camp-fixture-collision';
import {buildingRestored,campBuildingPlacements} from './camp-restoration';
import {WAREHOUSE_ARTWORK,WAREHOUSE_COLLISION,warehouseLogCollision} from './camp-worksites-art';
import {storedCount} from './expedition-inventory';
import {HQ_SOUTH_COLLISION,HQ_SOUTH_INTERIOR,HQ_SOUTH_RUIN_DEBRIS} from './headquarters-south-art';
import type {World} from './survival-engine';
import {warehouseLevel} from './warehouse';
import {layoutCollisionKey,placementBodies,placementGeometryAsset,type Placement,type WorldLayout} from './world-layout';

function footprint(p:Placement,collision:AssetCollision){
 return placementBodies({...p,collision}).map(body=>({body,bounds:colliderBounds(body)}));
}
type Footprint=ReturnType<typeof footprint>;
type StateGeometry={debris:Footprint;logs:Footprint[]};
const compiled=new WeakMap<object,StateGeometry>();

function geometry(layout:WorldLayout){
 const key=layoutCollisionKey(layout),cached=compiled.get(key);
 if(cached)return cached;
 const debris:Footprint=[],logs:Footprint[]=[[],[],[],[]];
 for(const {id,placement:p} of campBuildingPlacements(layout)){
  if(!p.solid||id!=='headquarters'&&id!=='warehouse')continue;
  const a=placementGeometryAsset(p);
  if(!a)continue;
  const expected=id==='headquarters'?HQ_SOUTH_COLLISION:WAREHOUSE_COLLISION;
  if(a.image!==(id==='headquarters'?HQ_SOUTH_INTERIOR:WAREHOUSE_ARTWORK.full))continue;
  const outline=placedCollision(a,p.collision);
  // Owner-drawn outlines replace the entire painted footprint.
  if(outline!==expected&&JSON.stringify(outline)!==JSON.stringify(expected))continue;
  if(id==='headquarters')debris.push(...footprint(p,HQ_SOUTH_RUIN_DEBRIS));
  else for(let stage=1;stage<=3;stage++){
   const shape=warehouseLogCollision(stage);
   if(shape)logs[stage].push(...footprint(p,shape));
  }
 }
 const value={debris,logs};
 compiled.set(key,value);
 return value;
}

function touches(parts:Footprint,x:number,y:number,r:number){
 return parts.some(({body,bounds})=>x+r>=bounds.left&&x-r<=bounds.right&&y+r>=bounds.top&&y-r<=bounds.bottom&&hitCollider(body,x,y,r));
}

/** Only the fallen beam and the wood stacks change shape during play. */
export function campStateBlocked(w:World,x:number,y:number,r:number){
 if(w.scene||!w.layout)return false;
 const {debris,logs}=geometry(w.layout);
 if(debris.length&&!buildingRestored(w,'headquarters')&&touches(debris,x,y,r))return true;
 if(!logs[3].length||!buildingRestored(w,'warehouse'))return false;
 return touches(logs[warehouseLevel(storedCount(w,'pallets'),'pallets')],x,y,r);
}
