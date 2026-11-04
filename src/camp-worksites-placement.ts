import {FURNACE_ID} from './ironworks-data';
import {WAREHOUSE_ASSET_ID,WAREHOUSE_COLLISION,FURNACE_COLLISION} from './camp-worksites-art';
import type {WorldLayout,Placement} from './world-layout';

/** One approved rearrangement. Stable IDs retain inventory, repair and queue
 * state; later editor moves/removals survive, as do unrelated world edits. */
export function placeCampWorksites(layout:WorldLayout):WorldLayout{
 if(layout.campWorksitesVersion===3)return layout;
 const targets:Record<string,{assetId:string;x:number;y:number;scale:number}>={
  'ironworks-v1-camp-furnace':{assetId:FURNACE_ID,x:870,y:800,scale:1},
  '974cb8ef-0155-4191-8ca6-77cc7eb8a575':{assetId:WAREHOUSE_ASSET_ID,x:2920.633,y:1790.824,scale:.45},
 };
 const items=layout.items.map((p):Placement=>{
  const target=targets[p.id];if(!target||p.assetId!==target.assetId)return p;
  const {frame,collision,footprint,...rest}=p;
  const known=p.assetId===FURNACE_ID?[[870,800],[1064.329,965.305],[1328.168,699.512]]:[[2850,1570],[2960,1645],[2920.633,1790.824]];
  const authored=known.some(([x,y])=>Math.hypot(p.x-x,p.y-y)<2);
  // Preserve later custom moves, rotations and sizes while upgrading the footprint.
  const position=authored?{...target,rotation:0,flipX:false,flipY:false,layer:0}:{};
  return {...rest,...position,collision:p.assetId===FURNACE_ID?FURNACE_COLLISION:WAREHOUSE_COLLISION,allowTransparency:false};
 });
 return {...layout,items,campWorksitesVersion:3};
}
