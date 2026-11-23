// The approved pilot on the broad upper cascade. The original river paintings and
// collision remain untouched; every sample is aligned to their native pixels.
import {EAST_TERRAIN_SCALE} from './east-approach';
import {STILLWATER_LAKE_WATER_SKSL} from './stillwater-lake-art';
const sx=2048/1070,sy=2816/1470;
export const WATERFALL_PILOT={x:-6256+300*sx,y:-6200+320*sy,width:280*sx,height:260*sy};
export const WATERFALL_IMAGES={
 riverWaterfallArtwork:'/survival/waterfall-pilot-v1/artwork.webp',
 riverWaterfallMask:'/survival/waterfall-pilot-v1/water-mask.png',
 riverWaterfallFrames:'/survival/waterfall-pilot-v1/whitewater-frames.webp',
};

// The mask is an exact, feathered water-only stencil from the unchanged artwork.
// Two downstream samples crossfade before their offsets reset, avoiding a jump
// at the loop boundary. Generated frames add falling strands and landing foam.
// The pilot keeps its original native sampling; other drops sample existing tiles.
function waterfallShader(section=false){return `
uniform shader artwork;
uniform shader stencil;
uniform shader frames;
uniform float4 bounds;
uniform float clock;
${STILLWATER_LAKE_WATER_SKSL}
${section?`uniform float2 nativeSize;
uniform float2 artOrigin;
uniform float2 artScale;
uniform float2 direction;
half4 sampleArtwork(float2 pixel){return artwork.eval(artOrigin+pixel*artScale);}`:""}
half4 frameAt(float index,float2 uv){
 float2 cell=float2(mod(index,4.),floor(index/4.));
 return frames.eval((cell+clamp(uv,float2(.003),float2(.997)))*160.);
}
half4 main(float2 p){
 float2 uv=(p-bounds.xy)/bounds.zw;
 float2 pixel=uv*${section?'nativeSize':'float2(280.,260.)'};
 float2 down=${section?'direction':'float2(0.,1.)'};
 float2 across=float2(down.y,-down.x);
 float2 flowUv=float2(dot(uv-.5,across),dot(uv-.5,down))+.5;
 half mask=stencil.eval(pixel).r;
 if(mask<.001)return half4(0.);
 float t=mod(clock,1.5)/1.5;
 float t2=fract(t+.5);
 float blend=abs(t*2.-1.);
 // Neighbouring ribbons slip over the ledge at slightly different speeds.
 float landing=smoothstep(.47,.76,flowUv.y);
 float lane=sin(22.*flowUv.x+1.4*sin(9.*flowUv.x));
 float2 drop=down*(22.+4.*lane);
 float2 outflow=down*10.+across*((flowUv.x-.5)*20.);
 float2 travel=mix(drop,outflow,landing);
 float2 a=pixel-travel*(t-.5),b=pixel-travel*(t2-.5);
 half4 base=${section?'sampleArtwork':'artwork.eval'}(pixel);
 half4 fa=mix(base,${section?'sampleArtwork':'artwork.eval'}(a),stencil.eval(a).r);
 half4 fb=mix(base,${section?'sampleArtwork':'artwork.eval'}(b),stencil.eval(b).r);
 half4 flowing=mix(base,mix(fa,fb,blend),.85);
 float phase=t*12.;
 half4 foam=mix(frameAt(floor(phase),flowUv),frameAt(mod(floor(phase)+1.,12.),flowUv),fract(phase));
 // Catch light on the existing foam strands as they spill over the lip.
 half3 straight=foam.rgb/max(foam.a,.001);
 half highlights=smoothstep(.78,.97,min(straight.r,min(straight.g,straight.b)));
 half opacity=mix(.39,.18,landing)*highlights*(1.-smoothstep(.72,.90,flowUv.y));
 half3 colour=flowing.rgb*(1.-foam.a*opacity)+foam.rgb*opacity;

 // Broken crests fan out from the impact into the plunge pool. Paint
 // brightness breaks the arcs over dark water and preserves the rock stencil.
 float2 fromImpact=(flowUv-float2(.49,.53))*float2(1.,1.7);
 float radius=length(fromImpact);
 float wave=cos(47.*radius-6.2831853*t+.6*lane);
 float crest=smoothstep(.48,.96,wave)*landing*(1.-smoothstep(.34,.64,radius));
 float glint=crest*smoothstep(.23,.76,flowing.g)*.19;
 colour=mix(colour,half3(.81,.90,.89),glint);
 // The upstream lake water shares the surrounding material. The exact
 // waterfall stencil, falling movement and white foam retain their shape.
 float lakeWater=stillwaterWaterAmount(p/${EAST_TERRAIN_SCALE}+float2(600.));
 colour=mix(colour,stillwaterWaterColour(colour),lakeWater);
 return half4(colour*mask,mask);
}`;}
export const WATERFALL_SHADER=waterfallShader();
export const WATERFALL_SECTION_SHADER=waterfallShader(true);
