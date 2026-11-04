import type {World} from './survival-engine';
import {ASSET_BY_ID} from './world-assets';
import {placementBounds,type Placement} from './world-layout';
import {WAREHOUSE_ID,WAREHOUSE_ART,warehouseLevel,type WarehouseMaterial} from './warehouse';
import {storedCount} from './expedition-inventory';
// Clip only inside the three openings. Roof, beams and foundations never jump.
export const WAREHOUSE_MASKS={
 pallets:[[.214,.513],[.399,.505],[.405,.686],[.235,.718],[.214,.680]],
 stone:[[.668,.550],[.765,.551],[.767,.708],[.674,.705]],
 scrap:[[.414,.412],[.589,.412],[.589,.607],[.414,.607]],
} as const;
export function warehouseStockMask(kind:WarehouseMaterial){return WAREHOUSE_MASKS[kind]}
export function drawWarehouse(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,p:Placement){
 if(p.assetId!==WAREHOUSE_ID||ASSET_BY_ID.get(p.assetId)?.image!==WAREHOUSE_ART.full||!imgs.warehouseEmpty)return false;
 const b=placementBounds(p);ctx.save();ctx.drawImage(imgs.warehouseEmpty,b.x,b.y,b.width,b.height);
 for(const kind of ['pallets','stone','scrap'] as const){
  const stage=warehouseLevel(storedCount(w,kind),kind);if(!stage)continue;
  const stock=stage===1?imgs.warehouseHalf:imgs.warehouseFull;if(!stock)continue;
  ctx.save();ctx.beginPath();
  // Registered partial/full paintings show complete objects at each stock level.
  const points=warehouseStockMask(kind);
  points.forEach(([x,y],i)=>i?ctx.lineTo(b.x+x*b.width,b.y+y*b.height):ctx.moveTo(b.x+x*b.width,b.y+y*b.height));ctx.closePath();ctx.clip();ctx.drawImage(stock,b.x,b.y,b.width,b.height);ctx.restore();
 }ctx.restore();return true;
}
