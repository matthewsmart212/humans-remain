import {ASSET_BY_ID} from './world-assets';
import {placementBounds,placementPoint,newPlacement,type Placement,type WorldLayout} from './world-layout';

// One-time approved furnishing of this existing camp, including device-local
// furniture that has not yet been saved to the shared draft. Never replace it.
const HEADQUARTERS_ID='4d468bcc-83b9-4bb7-af01-da4b69a67d9a';
export function addApprovedHeadquartersProps(layout:WorldLayout):WorldLayout{
 if(layout.hqPropsVersion===3)return layout;
 if(layout.hqPropsVersion===1||layout.hqPropsVersion===2)return removeHeadquartersRug(layout);
 const headquarters=layout.items.find(p=>p.id===HEADQUARTERS_ID);
 if(!headquarters)return layout;
 const contains=(p:Placement)=>{const b=placementBounds(headquarters),[x,y]=placementPoint(headquarters,p.x,p.y,true);return x>b.x&&x<b.x+b.width&&y>b.y&&y<b.y+b.height};
 const chest=layout.items.find(p=>p.assetId==='art_hq_storage_chest'&&contains(p));
 const bench=layout.items.find(p=>p.assetId==='art_camp_planning_board'&&contains(p));
 if(!chest||!bench)return layout;
 const specs:[string,Placement,number,number,number][]=[
  ['art_hq_peg_rail',chest,.32,.10,(headquarters.layer??0)+1],
  ['art_hq_supply_bundle',chest,-.02,.68,chest.layer??0],
  ['art_hq_field_shelf',bench,.94,.52,(headquarters.layer??0)+1],
  ['art_hq_boots',bench,.96,.90,bench.layer??0],
 ];
 if(specs.some(([id])=>!ASSET_BY_ID.has(id)))return layout;
 const additions=specs.filter(([id])=>!layout.items.some(p=>p.assetId===id)).map(([id,reference,u,v,layer])=>{
  const a=ASSET_BY_ID.get(id)!,b=placementBounds(reference),[cx,cy]=placementPoint(reference,b.x+b.width*u,b.y+b.height*v);
  // Match the reference's orientation without changing its existing placement.
  const angle=(reference.rotation||0)*Math.PI/180,scale=reference.scale;
  const dx=(.5-a.anchor[0]/a.crop[2])*a.width*scale,dy=(.5-a.anchor[1]/a.crop[3])*a.height*scale;
  const p=newPlacement(id,cx-(dx*Math.cos(angle)-dy*Math.sin(angle)),cy-(dx*Math.sin(angle)+dy*Math.cos(angle)));
  return {...p,id:`hq-props-v1-${id}`,scale,rotation:reference.rotation,flipX:reference.flipX,flipY:reference.flipY,layer:Math.max(-10000,Math.min(10000,layer)),locked:true,allowTransparency:false};
 });
 return {...layout,hqPropsVersion:3,items:[...layout.items,...additions],updatedAt:new Date().toISOString()};
}

// Remove only the rug supplied automatically by the headquarters dressing.
// A separately placed library rug has a different ID and remains untouched.
function removeHeadquartersRug(layout:WorldLayout):WorldLayout{
 return {...layout,hqPropsVersion:3,items:layout.items.filter(p=>p.id!=='hq-props-v1-art_hq_woven_rug'),updatedAt:new Date().toISOString()};
}
