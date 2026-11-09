import {GARDEN_ART,GARDEN_IDS,GARDEN_PLACEMENT_ID} from './camp-garden-art';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {newPlacement,type WorldLayout} from './world-layout';
/** Move the original garden to the western puddle, beside the road.
 * Versioning upgrades worlds already shipped with a garden, without duplicates. */
export function addApprovedCampGarden(layout:WorldLayout):WorldLayout{
 if(layout.potatoGardenVersion===1)return layout;
 const puddle=layout.items.find(p=>p.id==='camp-puddle-v1-4');
 const original=layout.items.find(p=>p.id===GARDEN_PLACEMENT_ID||GARDEN_IDS.has(p.assetId));
 const x=puddle?puddle.x+490:original?.x??840,y=puddle?puddle.y+315:original?.y??1345;
 const items=original?layout.items.map(p=>p===original?{...p,x,y,assetId:GARDEN_ART[0].id,scale:1,locked:true,allowTransparency:false,solid:false}:p):
   layout.items.length<MAX_LAYOUT_ITEMS?[...layout.items,{...newPlacement(GARDEN_ART[0].id,x,y),id:GARDEN_PLACEMENT_ID,locked:true,allowTransparency:false,solid:false}]:layout.items;
 return {...layout,campGardenVersion:1,potatoGardenVersion:1,items,updatedAt:new Date().toISOString()};
}
