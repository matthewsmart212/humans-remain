import assert from 'node:assert/strict';
import {build} from 'esbuild';

// Test the same geometry and selection functions used by WorldEditor on taps.
const compiled=await build({stdin:{contents:"export * from './src/world-layout';export * from './src/world-assets';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const {newPlacement,ASSET_BY_ID,insideBuilding,placementPoint,placementHitStack,preferredPlacementHit,buildingInteriorExposed}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));

// The fixed HQ image covers furniture, but its revealed room should not.
const building=newPlacement('base_shelter_t1',1700,1450);
const a=ASSET_BY_ID.get(building.assetId);
assert(a?.interior&&a.roof,'HQ has a roof and walkable interior');
const centre={x:building.x+(a.interior.x+a.interior.width/2),y:building.y+(a.interior.y+a.interior.height/2)};
assert(insideBuilding(building,centre.x,centre.y));
const furniture=newPlacement('base_well_t1',centre.x,centre.y);
furniture.id='room-furniture';
const room={...building,id:'room-building'};
const items=[furniture,room];
const hit=(roof,viewer,selectedId='room-building')=>{
 const p={...room,roof};
 const hits=placementHitStack([furniture,p],centre.x,centre.y,viewer);
 return {hits,chosen:preferredPlacementHit(hits,centre.x,centre.y,selectedId,viewer)};
};
const exposed=hit('auto',centre);
assert.equal(exposed.chosen?.id,'room-furniture','indoor taps pick furniture even if the building was selected');
assert.equal(exposed.hits[0]?.id,'room-furniture','open roof does not cover furniture in hit ordering');
assert(buildingInteriorExposed(room,centre),'worker entering the building exposes its interior');
const outside={x:centre.x+1700,y:centre.y+800};
assert.equal(hit('auto',outside).chosen?.id,'room-building','closed automatic roof remains selectable outdoors');
assert.equal(hit('shown',centre).chosen?.id,'room-building','always-visible roof still covers furniture');
assert.equal(hit('hidden',outside).chosen?.id,'room-furniture','manually hidden roof allows indoor edits from outside');
assert.equal(hit('auto',centre,'room-furniture').chosen?.id,'room-furniture','already-selected furniture keeps drag selection');
const empty=preferredPlacementHit(placementHitStack([room],centre.x,centre.y,centre),centre.x,centre.y,'room-building',centre);
assert.equal(empty?.id,'room-building','building remains selectable on empty floor');

// The building may be rotated or mirrored, so the interior must be tested in
// its transformed coordinates instead of treating the room as an axis-aligned box.
for(const [rotation,flipX] of [[90,false],[35,true],[270,true]]){
 const rotated={...room,rotation,flipX};
 const [x,y]=placementPoint(rotated,centre.x,centre.y);
 const chair={...furniture,x,y};
 const hits=placementHitStack([rotated,chair],x,y,{x,y});
 assert.equal(preferredPlacementHit(hits,x,y,rotated.id,{x,y})?.id,'room-furniture','rotated room selection: '+rotation);
}
console.log('PASS: revealed building interiors select and drag furniture; covered roofs, empty floors, and rotated rooms retain expected picks.');
