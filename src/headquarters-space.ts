import {ASSET_BY_ID} from './world-assets';
import {placementBounds,placementPoint,type WorldLayout} from './world-layout';
import {HEADQUARTERS_PLACEMENT_ID} from './headquarters-south-placement';
import {HQ_INTERIOR_PROP_IDS} from './headquarters-interior';
import {HQ_SOUTH_INTERIOR} from './headquarters-south-art';

export const HEADQUARTERS_SPACE_SCALE=1.18;
/** One approved expansion of the owner's hall. Scale all exterior/interior
 * geometry together; keep its authored origin and the furniture's own size.
 * Later editor moves/resizes are left alone by the version marker. */
export function expandHeadquartersSpace(layout:WorldLayout):WorldLayout{
 if(layout.headquartersSpaceVersion===1||ASSET_BY_ID.get('base_shelter_t1')?.image!==HQ_SOUTH_INTERIOR)return layout;
 const hall=layout.items.find(p=>p.id===HEADQUARTERS_PLACEMENT_ID);if(!hall)return layout;
 const b=placementBounds(hall),factor=HEADQUARTERS_SPACE_SCALE;
 return {...layout,headquartersSpaceVersion:1,items:layout.items.map(p=>{
  if(p===hall)return {...p,scale:p.scale*factor};
  if(!HQ_INTERIOR_PROP_IDS.has(p.id))return p;
  const [x,y]=placementPoint(hall,p.x,p.y,true),u=(x-b.x)/b.width,v=(y-b.y)/b.height;
  // A prop deliberately moved elsewhere is no longer part of this room.
  if(u<.04||u>.96||v<.28||v>.8)return p;
  return {...p,x:hall.x+(p.x-hall.x)*factor,y:hall.y+(p.y-hall.y)*factor};
 })};
}
