import type {World} from './survival-engine';
import {ASSET_BY_ID} from './world-assets';
import {placementBounds,type Placement} from './world-layout';
import {WAREHOUSE_ID,WAREHOUSE_ART,warehouseLevel,type WarehouseMaterial} from './warehouse';
import {storedCount} from './expedition-inventory';
// The three stock regions are disjoint on the registered 1,254 px master.
// The painted cart lip and timber bin already occlude the goods in each sprite.
export const WAREHOUSE_MASKS={
 pallets:[[.228,.536],[.498,.536],[.498,.736],[.228,.736]],
 stone:[[.545,.669],[.731,.669],[.731,.792],[.545,.792]],
 scrap:[[.647,.493],[.896,.493],[.896,.657],[.647,.657]],
} as const;
export function warehouseStockMask(kind:WarehouseMaterial){return WAREHOUSE_MASKS[kind]}
export function drawWarehouse(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,p:Placement){
 if(p.assetId!==WAREHOUSE_ID||ASSET_BY_ID.get(p.assetId)?.image!==WAREHOUSE_ART.full||!imgs.warehouseEmpty)return false;
 const b=placementBounds(p);ctx.save();ctx.drawImage(imgs.warehouseEmpty,b.x,b.y,b.width,b.height);
 for(const kind of ['pallets','stone','scrap'] as const){
  const stage=warehouseLevel(storedCount(w,kind),kind);if(!stage)continue;
  const stock=stage===1?imgs.warehouseLight:stage===2?imgs.warehouseHalf:imgs.warehouseFull;if(!stock)continue;
  ctx.save();ctx.beginPath();
  // Registered partial/full paintings show complete objects at each stock level.
  const points=warehouseStockMask(kind);
  points.forEach(([x,y],i)=>i?ctx.lineTo(b.x+x*b.width,b.y+y*b.height):ctx.moveTo(b.x+x*b.width,b.y+y*b.height));ctx.closePath();ctx.clip();ctx.drawImage(stock,b.x,b.y,b.width,b.height);ctx.restore();
 }ctx.restore();return true;
}
