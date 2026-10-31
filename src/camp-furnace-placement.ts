import {FURNACE_ID} from './ironworks-data';
import {layoutBlocked,type WorldLayout} from './world-layout';

export const FURNACE_WORKSHOP_OFFSET={x:334,y:92} as const;
const original={x:1438.8575749932425,y:1215.1547517146687};
/** One approved move of the starter furnace. Later editor moves and removals survive. */
export function placeFurnaceByWorkshop(layout:WorldLayout):WorldLayout{
 if(layout.ironworksVersion!==1)return layout;
 const furnace=layout.items.find(p=>p.id==='ironworks-v1-camp-furnace'&&p.assetId===FURNACE_ID);
 const workshop=layout.items.find(p=>p.assetId==='base_workshop_t1');
 let items=layout.items;
 if(furnace&&workshop&&Math.hypot(furnace.x-original.x,furnace.y-original.y)<2&&!furnace.rotation&&!furnace.flipX&&!furnace.flipY){
  const x=Math.round(workshop.x+FURNACE_WORKSHOP_OFFSET.x),y=Math.round(workshop.y+FURNACE_WORKSHOP_OFFSET.y);
  const other={...layout,items:layout.items.filter(p=>p.id!==furnace.id)};
  if(!layoutBlocked(other,x,y-25,95)&&!layoutBlocked(other,x-5,y+93,30))items=layout.items.map(p=>p===furnace?{...p,x,y}:p);
 }
 return{...layout,items,ironworksVersion:2,updatedAt:new Date().toISOString()};
}
