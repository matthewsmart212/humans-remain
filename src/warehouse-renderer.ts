import type {World} from './survival-engine';
import {placementBounds,type Placement} from './world-layout';
import {WAREHOUSE_ID,warehouseLevel} from './warehouse';
// Only replace the two storage openings. The original roof, posts and outline
// remain perfectly still as the independently stocked bays change state.
export const WAREHOUSE_MASKS={pallets:[[.238,.443],[.434,.455],[.434,.703],[.236,.649]],scrap:[[.477,.514],[.690,.610],[.706,.706],[.673,.763],[.585,.817],[.444,.722],[.477,.675]]} as const;
export function drawWarehouse(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,p:Placement){
 if(p.assetId!==WAREHOUSE_ID||!imgs.warehouseFull)return false;
 const b=placementBounds(p);ctx.save();ctx.drawImage(imgs.warehouseFull,b.x,b.y,b.width,b.height);
 for(const kind of ['pallets','scrap'] as const){const stage=warehouseLevel(w.stock[kind],kind),image=stage===0?imgs.warehouseEmpty:stage===1?imgs.warehouseHalf:undefined;if(!image)continue;
  ctx.save();ctx.beginPath();WAREHOUSE_MASKS[kind].forEach(([x,y],i)=>i?ctx.lineTo(b.x+x*b.width,b.y+y*b.height):ctx.moveTo(b.x+x*b.width,b.y+y*b.height));ctx.closePath();ctx.clip();ctx.drawImage(image,b.x,b.y,b.width,b.height);ctx.restore();
 }ctx.restore();return true;
}
