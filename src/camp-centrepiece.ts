import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {ASSET_BY_ID} from './world-assets';
import {newPlacement,layoutBlocked,type WorldLayout,type Placement} from './world-layout';

/** One approved addition to this particular camp. Existing placements are never moved.
 * The marker survives saving/import so removing the well later stays removed. */
export function addApprovedCampWell(layout:WorldLayout):WorldLayout{
 if(layout.campCentreVersion===1||!layout.items.some(p=>p.id==='4d468bcc-83b9-4bb7-af01-da4b69a67d9a'))return layout;
 if(layout.items.some(p=>p.role==='well'||p.assetId==='base_well_t1'))return{...layout,campCentreVersion:1};
 if(!ASSET_BY_ID.has('base_well_t1')||layout.items.length>=MAX_LAYOUT_ITEMS)return layout;
 const well:Placement={...newPlacement('base_well_t1',2740,1330),id:'camp-centre-v1-oak-well',scale:2.7,locked:true,allowTransparency:false,
  // Only the stone curb blocks movement. The roof and dirt skirt do not.
  collision:{lineWidth:.008,paths:[{closed:true,points:[[.15,.79],[.24,.64],[.46,.60],[.68,.70],[.75,.83],[.65,.94],[.42,.98],[.22,.91]]}]}};
 // Do not place across any newly added object or a changed map: leave that draft intact.
 for(const [dx,dy]of [[0,65],[-150,20],[150,20],[0,-70],[-100,-70],[100,-70]])
  if(layoutBlocked(layout,well.x+dx,well.y+dy,26))return layout;
 return{...layout,campCentreVersion:1,items:[...layout.items,well],updatedAt:new Date().toISOString()};
}
