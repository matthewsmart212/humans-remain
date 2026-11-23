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

// The exported painting has rectangular preservation areas for old artwork.
// Those are not physical boundaries in the lake. A separate broad water field
// carries the same material through its inlet and outlet without grading soil,
// pale stones or timber. Its north edge ends below the previous river batch.
export const STILLWATER_LAKE_WATER_SKSL=`
float stillwaterWaterAmount(float2 source){
 float2 nativePoint=(source-float2(${values([source.x,source.y])}))*float2(${values([paint.masterSize[0]/2/source.width,paint.masterSize[1]/2/source.height])});
 float radius=length((nativePoint-float2(950.,625.))/float2(450.,430.));
 return 1.-smoothstep(.86,1.10,radius);
}
half3 stillwaterWaterColour(half3 colour){
 // Shift old blue towards the woodland while retaining reflected light and
 // submerged stones. A fixed dark replacement erases those highlights and
 // leaves hard-looking islands between the stones and foam.
 float water=smoothstep(.025,.11,float(colour.b-colour.r))*smoothstep(.015,.075,float(colour.g-colour.r));
 half excess=max(half(0.),colour.b-colour.g);
 half3 settled=half3(colour.r+excess*.20,colour.g*.84+excess*.08,colour.b*.35+colour.g*.30)*.82;
 return mix(colour,settled,water);
}`;
