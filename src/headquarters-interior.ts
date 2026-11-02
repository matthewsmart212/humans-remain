import {ASSET_BY_ID} from './world-assets';
import {HQ_SOUTH_INTERIOR,HQ_SOUTH_COLLISION,HQ_SOUTH_OLD_COLLISION} from './headquarters-south-art';
import {HEADQUARTERS_PLACEMENT_ID} from './headquarters-south-placement';
import {placementBounds,placementPoint,type WorldLayout} from './world-layout';

/** Refit existing furniture to the owner's current hall, once. The hall itself
 * and later furniture edits are never moved or resized by this upgrade. */
export function fitHeadquartersInterior(layout:WorldLayout):WorldLayout{
 if(layout.headquartersInteriorVersion===2||ASSET_BY_ID.get('base_shelter_t1')?.image!==HQ_SOUTH_INTERIOR)return layout;
 const hall=layout.items.find(p=>p.id===HEADQUARTERS_PLACEMENT_ID);if(!hall)return layout;
 const b=placementBounds(hall);
 const oldSpecs:Record<string,[number,number,number]>={
  '63081463-b478-4601-8c5e-e8da8206f317':[.23,.53,.52],
  'e8c914ae-d062-4003-a826-43a395bf452e':[.74,.53,.50],
  'hq-props-v1-art_hq_peg_rail':[.23,.38,.65],
  'hq-props-v1-art_hq_supply_bundle':[.13,.67,.65],
  'hq-props-v1-art_hq_field_shelf':[.88,.46,.65],
  'hq-props-v1-art_hq_boots':[.89,.73,.65],
 };
 const specs:typeof oldSpecs={
  '63081463-b478-4601-8c5e-e8da8206f317':[.25,.565,.49],
  'e8c914ae-d062-4003-a826-43a395bf452e':[.74,.55,.47],
  'hq-props-v1-art_hq_peg_rail':[.23,.49,.60],
  'hq-props-v1-art_hq_supply_bundle':[.13,.63,.55],
  'hq-props-v1-art_hq_field_shelf':[.88,.585,.56],
  'hq-props-v1-art_hq_boots':[.88,.655,.55],
 };
 return {...layout,headquartersInteriorVersion:2,items:layout.items.map(p=>{
  if(p===hall)return JSON.stringify(p.collision)===JSON.stringify(HQ_SOUTH_OLD_COLLISION)?{...p,collision:HQ_SOUTH_COLLISION}:p;
  // Preserve furniture moved in the editor after the previous refit.
  const old=oldSpecs[p.id];
  if(layout.headquartersInteriorVersion===1&&old){
   const [ox,oy]=placementPoint(hall,b.x+old[0]*b.width,b.y+old[1]*b.height);
   if(Math.hypot(p.x-ox,p.y-oy)>.01||Math.abs(p.scale-hall.scale*old[2])>.001)return p;
  }
  const s=specs[p.id];if(!s)return p;
  const [x,y]=placementPoint(hall,b.x+s[0]*b.width,b.y+s[1]*b.height);
  return {...p,x,y,scale:hall.scale*s[2],layer:hall.layer??0,rotation:hall.rotation??0,flipX:hall.flipX??false,flipY:hall.flipY??false};
 })};
}

export const HQ_INTERIOR_PROP_IDS=new Set(['63081463-b478-4601-8c5e-e8da8206f317','e8c914ae-d062-4003-a826-43a395bf452e','hq-props-v1-art_hq_peg_rail','hq-props-v1-art_hq_supply_bundle','hq-props-v1-art_hq_field_shelf','hq-props-v1-art_hq_boots']);

/** A continued run can have stopped on the old, over-deep floor. Bring that
 * survivor onto the new floor instead of leaving them behind the back wall. */
export function headquartersRefitReturnPoint(before:WorldLayout,after:WorldLayout,point:{x:number;y:number}){
 if(before.headquartersInteriorVersion!==1||after.headquartersInteriorVersion!==2)return;
 const old=before.items.find(p=>p.id===HEADQUARTERS_PLACEMENT_ID),hall=after.items.find(p=>p.id===HEADQUARTERS_PLACEMENT_ID);
 if(!old||!hall||old.collision===hall.collision)return;
 const b=placementBounds(hall),[x,y]=placementPoint(hall,point.x,point.y,true),u=(x-b.x)/b.width,v=(y-b.y)/b.height;
 if(u<.08||u>.92||v<.32||v>.53)return;
 const [px,py]=placementPoint(hall,b.x+b.width*.5,b.y+b.height*.60);return{x:px,y:py};
}
