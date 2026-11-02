import {ASSET_BY_ID} from './world-assets';
import {HQ_SOUTH_INTERIOR} from './headquarters-south-art';
import {HEADQUARTERS_PLACEMENT_ID} from './headquarters-south-placement';
import {placementBounds,placementPoint,type WorldLayout} from './world-layout';

/** Refit existing furniture to the owner's current hall, once. The hall itself
 * and later furniture edits are never moved or resized by this upgrade. */
export function fitHeadquartersInterior(layout:WorldLayout):WorldLayout{
 if(layout.headquartersInteriorVersion===1||ASSET_BY_ID.get('base_shelter_t1')?.image!==HQ_SOUTH_INTERIOR)return layout;
 const hall=layout.items.find(p=>p.id===HEADQUARTERS_PLACEMENT_ID);if(!hall)return layout;
 const b=placementBounds(hall);
 const specs:Record<string,[number,number,number]>={
  '63081463-b478-4601-8c5e-e8da8206f317':[.23,.53,.52],
  'e8c914ae-d062-4003-a826-43a395bf452e':[.74,.53,.50],
  'hq-props-v1-art_hq_peg_rail':[.23,.38,.65],
  'hq-props-v1-art_hq_supply_bundle':[.13,.67,.65],
  'hq-props-v1-art_hq_field_shelf':[.88,.46,.65],
  'hq-props-v1-art_hq_boots':[.89,.73,.65],
 };
 return {...layout,headquartersInteriorVersion:1,items:layout.items.map(p=>{
  const s=specs[p.id];if(!s)return p;
  const [x,y]=placementPoint(hall,b.x+s[0]*b.width,b.y+s[1]*b.height);
  return {...p,x,y,scale:hall.scale*s[2],layer:hall.layer??0,rotation:hall.rotation??0,flipX:hall.flipX??false,flipY:hall.flipY??false};
 })};
}

export const HQ_INTERIOR_PROP_IDS=new Set(['63081463-b478-4601-8c5e-e8da8206f317','e8c914ae-d062-4003-a826-43a395bf452e','hq-props-v1-art_hq_peg_rail','hq-props-v1-art_hq_supply_bundle','hq-props-v1-art_hq_field_shelf','hq-props-v1-art_hq_boots']);
