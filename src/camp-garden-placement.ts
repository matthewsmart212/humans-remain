import {GARDEN_ART,GARDEN_IDS,GARDEN_PLACEMENT_ID} from './camp-garden-art';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {layoutBlocked,newPlacement,type WorldLayout} from './world-layout';

/** Approved outer strip BELOW the medical tent; never search the central clearing. */
export function addApprovedCampGarden(layout:WorldLayout):WorldLayout{
 if(layout.campGardenVersion===1)return layout;
 const medical=layout.items.find(p=>p.id==='4bcdf22f-3b36-42e9-8a3a-3ec21e3e4a99'&&p.assetId==='base_medical_t2');
 if(!medical)return layout;
 if(layout.items.some(p=>GARDEN_IDS.has(p.assetId)))return{...layout,campGardenVersion:1};
 if(layout.items.length>=MAX_LAYOUT_ITEMS)return layout;
 const x=medical.x-140,y=medical.y+365;
 // Newly placed solid owner objects take priority over the approved addition.
 if([[-95,-85],[0,-125],[95,-80],[0,-30]].some(([dx,dy])=>layoutBlocked(layout,x+dx,y+dy,20)))return layout;
 const garden={...newPlacement(GARDEN_ART[0].id,x,y),id:GARDEN_PLACEMENT_ID,locked:true,allowTransparency:false};
 return{...layout,campGardenVersion:1,items:[...layout.items,garden],updatedAt:new Date().toISOString()};
}
