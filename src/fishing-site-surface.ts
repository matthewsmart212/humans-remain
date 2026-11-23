import {FISHING_PIER_SIZE} from './fishing-site-art';

// Water meets the lower supports below the deck, before their original painted
// cutout ends. Coordinates refer to the approved pier painting, not collision.
const waterline=[
 [0,636],[160,665],[440,793],[480,816],[552,816],
 [600,754],[840,643],[980,611],[1008,464],[1290,343],
] as const;

export function fishingPierWaterline(x:number){
 for(let i=1;i<waterline.length;i++){
  const [ax,ay]=waterline[i-1],[bx,by]=waterline[i];
  if(x<=bx)return ay+(by-ay)*Math.max(0,Math.min(1,(x-ax)/(bx-ax)));
 }
 return waterline[waterline.length-1][1];
}

const lineFunction=waterline.slice(1).map(([x,y],i)=>{
 const [ax,ay]=waterline[i];
 return `if(x<=${x}.)return mix(${ay}.,${y}.,clamp((x-${ax}.)/${x-ax}.,0.,1.));`;
}).join('\n');

/** One cached sprite shader. Planks and upright foreground pixels stay exact;
 * the lower timbers darken, take the lake's colour and disappear into water. */
export const FISHING_PIER_SURFACE_SHADER=`
uniform shader artwork;
uniform float4 crop;
uniform float2 wet;
float waterline(float x){
 ${lineFunction}
 return 343.;
}
half4 main(float2 uv){
 half4 base=artwork.eval(crop.xy+uv*crop.zw);
 if(base.a<=.001)return half4(0.);
 float2 pixel=uv*float2(${FISHING_PIER_SIZE[0]}.,${FISHING_PIER_SIZE[1]}.);
 float active=(pixel.x<1000.?wet.x:wet.y)*(1.-step(1290.,pixel.x));
 float depth=pixel.y-waterline(pixel.x);
 float submerged=smoothstep(-10.,32.,depth)*active;
 float alpha=base.a*(1.-smoothstep(0.,48.,depth)*active);
 half3 wood=base.rgb/max(base.a,.001);
 wood=mix(wood,half3(.075,.22,.19),submerged*.88);
 return half4(wood*alpha,alpha);
}`;

export type FishingPierSurfaceContext=CanvasRenderingContext2D&{
 drawFishingPierSurface?:(image:HTMLImageElement,crop:readonly number[],
  bounds:{x:number;y:number;width:number;height:number},wet:readonly [number,number])=>void;
 strokeRounded?:()=>void;
};
