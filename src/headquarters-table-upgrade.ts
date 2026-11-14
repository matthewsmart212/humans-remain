import {ASSET_BY_ID} from './world-assets';
import {HQ_SOUTH_INTERIOR,HQ_SOUTH_COLLISION} from './headquarters-south-art';
import {HEADQUARTERS_PLACEMENT_ID} from './headquarters-south-placement';
import {placementBounds,placementPoint,type Placement,type WorldLayout} from './world-layout';

/** One-time HQ v2 migration: the planning table is baked into the new sprite.
 * Only the two original HQ furniture pieces and auto-added dressing are retired. */
export function replaceHeadquartersFurnitureWithTable(layout:WorldLayout):WorldLayout{
 if(layout.headquartersArtworkVersion===1||ASSET_BY_ID.get('base_shelter_t1')?.image!==HQ_SOUTH_INTERIOR)return layout;
 const hall=layout.items.find(p=>p.id===HEADQUARTERS_PLACEMENT_ID&&p.assetId==='base_shelter_t1');
 if(!hall)return layout;
 const b=placementBounds(hall);
 const inHall=(p:Placement)=>{const [x,y]=placementPoint(hall,p.x,p.y,true);return x>b.x+b.width*.05&&x<b.x+b.width*.95&&y>b.y+b.height*.23&&y<b.y+b.height*.90};
 const oldIds=new Set([
  '63081463-b478-4601-8c5e-e8da8206f317', // original HQ chest
  'e8c914ae-d062-4003-a826-43a395bf452e', // original planning desk
 ]);
 const items=layout.items.filter(p=>{
  if(p.id===hall.id)return true;
  if(oldIds.has(p.id)||p.id.startsWith('hq-props-v1-'))return false;
  return !(inHall(p)&&(p.assetId==='art_hq_storage_chest'||p.assetId==='art_camp_planning_board'));
 }).map(p=>p.id===hall.id?{...p,collision:HQ_SOUTH_COLLISION}:p);
 return {...layout,headquartersArtworkVersion:1,items,updatedAt:new Date().toISOString()};
}
