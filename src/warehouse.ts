import {WAREHOUSE_ASSET_ID,WAREHOUSE_ARTWORK} from './camp-worksites-art';
import type {World} from './survival-engine';
import {lineClear} from './survival-engine';
import {placementBounds,placementPoint,type Placement,type WorldLayout} from './world-layout';
export const WAREHOUSE_ID=WAREHOUSE_ASSET_ID;
export const WAREHOUSE_ART=WAREHOUSE_ARTWORK;
export const WAREHOUSE_IMAGES={warehouseEmpty:WAREHOUSE_ART.empty,warehouseLight:WAREHOUSE_ART.light,warehouseHalf:WAREHOUSE_ART.half,warehouseFull:WAREHOUSE_ART.full};
export type WarehouseMaterial='pallets'|'stone'|'scrap';
export const WAREHOUSE_MATERIALS=[{id:'pallets',name:'Wood',unit:'logs',singular:'log',image:'/survival/ui-field-kit-v1/logs.png',fullAt:20},{id:'stone',name:'Stone',unit:'stone',singular:'stone',image:'/survival/world-rocks-v1/river-stone-trio.webp',fullAt:30},{id:'scrap',name:'Scrap metal',unit:'scrap',singular:'scrap',image:'/survival/ui-backpack-v1/scrap.png',fullAt:50}] as const;
export const warehouseLevel=(count:number,kind:WarehouseMaterial)=>{const full=WAREHOUSE_MATERIALS.find(m=>m.id===kind)!.fullAt;return count<=0?0:count<Math.ceil(full/2)?1:count<full?2:3};
export const warehouseStage=(count:number,kind:WarehouseMaterial)=>['Empty','Lightly stocked','Well stocked','Full'][warehouseLevel(count,kind)];
const cache=new WeakMap<WorldLayout,Placement[]>();
export function warehouses(layout?:WorldLayout){if(!layout)return[];let items=cache.get(layout);if(!items){items=layout.items.filter(p=>p.assetId===WAREHOUSE_ID);cache.set(layout,items)}return items}
/** Approach the open front, never interact through the roof or rear wall. */
export function warehouseDock(p:Placement){const b=placementBounds(p);const [x,y]=placementPoint(p,b.x+b.width*.46,b.y+b.height*.78);return{x,y}}
export function nearbyWarehouse(w:World){
 if(w.scene)return null;let result:{placement:Placement;x:number;y:number}|null=null,best=145;
 for(const p of warehouses(w.layout)){const dock=warehouseDock(p),d=Math.hypot(w.player.x-dock.x,w.player.y-dock.y);if(d<best&&lineClear(w.player,dock,w)){best=d;result={placement:p,...dock}}}return result;
}
