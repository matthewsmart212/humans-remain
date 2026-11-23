import paint from './stillwater-lake-paint.json';
import bridges from './river-bridges.json';
import {RIVER_BATCHES} from './river-layout';

const source=RIVER_BATCHES[paint.batch].source;
const number=(value:number)=>Number.isInteger(value)?value+'.':String(value);
const values=(items:readonly number[])=>items.map(number).join(',');
// The packager uses this same registered scope. Waterfalls, bridge artwork,
// and every other river reach keep their existing material and motion.
export const STILLWATER_LAKE_PAINT_SKSL=`
float stillwaterPaintAmount(float2 source){
 float2 masterPoint=(source-float2(${values([source.x,source.y])}))*float2(${values([paint.masterSize[0]/source.width,paint.masterSize[1]/source.height])});
 float2 local=masterPoint-float2(${values(paint.crop.slice(0,2))});
 float2 remaining=float2(${values(paint.crop.slice(2))})-local;
 float amount=smoothstep(0.,${number(paint.edgeFade)},min(min(local.x,local.y),min(remaining.x,remaining.y)));
 ${paint.protectedRects.map(({bounds:[x,y,w,h],feather})=>`amount*=smoothstep(0.,${number(feather)},length(max(max(float2(${values([x,y])})-masterPoint,masterPoint-float2(${values([x+w,y+h])})),float2(0.))));`).join('\n ')}
 ${bridges.filter(b=>paint.protectedBridges.includes(b.id)).map(b=>{
  const start=`float2(${values(b.from)})`,end=`float2(${values(b.to)})`;
  return `{float2 a=${start},span=${end}-a;float t=clamp(dot(source-a,span)/dot(span,span),0.,1.);amount*=smoothstep(${number(b.width+paint.bridgeExtraRadius)},${number(b.width+paint.bridgeExtraRadius+paint.bridgeFeather)},length(source-a-span*t));}`;
 }).join('\n ')}
 return amount;
}`;
