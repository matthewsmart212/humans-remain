import {ASSET_BY_ID} from './world-assets';
import {placementBounds,type Placement,type WorldLayout} from './world-layout';
import {HQ_SOUTH_INTERIOR,HQ_SOUTH_COLLISION} from './headquarters-south-art';

export const HEADQUARTERS_PLACEMENT_ID='4d468bcc-83b9-4bb7-af01-da4b69a67d9a';
/** One approved camp refit. Subsequent editor moves/removals remain untouched. */
export function placeSouthFacingHeadquarters(layout:WorldLayout):WorldLayout{
 if(layout.headquartersSouthVersion===1||ASSET_BY_ID.get('base_shelter_t1')?.image!==HQ_SOUTH_INTERIOR)return layout;
 const hall=layout.items.find(p=>p.id===HEADQUARTERS_PLACEMENT_ID&&p.assetId==='base_shelter_t1');
 const hearth=layout.items.find(p=>p.role==='hearth');
 if(!hall||!hearth)return layout;
 const headquarters:Placement={...hall,x:hearth.x,y:hearth.y-1050,scale:1.8,rotation:0,flipX:false,flipY:false,
  layer:0,frame:{sourceAssetId:'base_shelter_t1',width:672,height:448,anchor:[.5,.94]},collision:HQ_SOUTH_COLLISION};
 delete headquarters.footprint;
 const b=placementBounds(headquarters);
 const props:Record<string,[number,number,number]>={
  '63081463-b478-4601-8c5e-e8da8206f317':[.23,.44,.9],
  'e8c914ae-d062-4003-a826-43a395bf452e':[.76,.44,.9],
  'hq-props-v1-art_hq_peg_rail':[.23,.32,1],
  'hq-props-v1-art_hq_supply_bundle':[.12,.47,1],
  'hq-props-v1-art_hq_field_shelf':[.86,.34,1],
  'hq-props-v1-art_hq_boots':[.88,.47,1],
 };
 const items=layout.items.map(p=>{
  if(p===hall)return headquarters;
  // These two unchanged authored neighbours overlapped the new straight
  // stairs/front foundation. Keep them together just southwest of HQ.
  if(p.id==='123ef300-94ed-4b01-98ce-c3ef52e3bd36'&&Math.hypot(p.x-1234.011541632066,p.y-622.8945000648265)<2)return {...p,x:hearth.x-758,y:hearth.y-950};
  if(p.id==='ironworks-v1-camp-furnace'&&Math.hypot(p.x-1553.0963133096375,p.y-511.17179213144027)<2)return {...p,x:hearth.x-390,y:hearth.y-874};
  const spec=props[p.id];
  return spec?{...p,x:b.x+spec[0]*b.width,y:b.y+spec[1]*b.height,scale:spec[2],layer:0,rotation:0,flipX:false,flipY:false}:p;
 });
 return {...layout,headquartersSouthVersion:1,items,updatedAt:new Date().toISOString()};
}
