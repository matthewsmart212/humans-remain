// The approved pilot on the broad upper cascade. The original river paintings and
// collision remain untouched; every sample is aligned to their native pixels.
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
// Both variants share exactly the approved flow and generated foam treatment.
// The pilot keeps its original native sampling; other drops sample existing tiles.
function waterfallShader(section=false){return `
uniform shader artwork;
uniform shader stencil;
uniform shader frames;
uniform float4 bounds;
uniform float clock;
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
 ${section?'float2 across=float2(direction.y,-direction.x);float2 flowUv=float2(dot(uv-.5,across),dot(uv-.5,direction))+.5;':''}
 half mask=stencil.eval(pixel).r;
 if(mask<.001)return half4(0.);
 float t=mod(clock,1.5)/1.5;
 float t2=fract(t+.5);
 float blend=abs(t*2.-1.);
 // Fast downward flow on the drop, slower spreading flow in the plunge pool.
 float landing=smoothstep(.48,.76,${section?'flowUv':'uv'}.y);
 float2 travel=${section?'mix(direction*19.,across*(flowUv.x-.5)*12.+direction*9.,landing)':'mix(float2(0.,19.),float2((uv.x-.5)*12.,9.),landing)'};
 float2 a=pixel-travel*(t-.5),b=pixel-travel*(t2-.5);
 half4 base=${section?'sampleArtwork':'artwork.eval'}(pixel);
 half4 fa=mix(base,${section?'sampleArtwork':'artwork.eval'}(a),stencil.eval(a).r);
 half4 fb=mix(base,${section?'sampleArtwork':'artwork.eval'}(b),stencil.eval(b).r);
 half4 flowing=mix(base,mix(fa,fb,blend),.85);
 float phase=t*12.;
 half4 foam=mix(frameAt(floor(phase),${section?'flowUv':'uv'}),frameAt(mod(floor(phase)+1.,12.),${section?'flowUv':'uv'}),fract(phase));
 // Premultiplied generated foam preserves the transparent gaps and keeps the
// waterfall blue-white rather than painting a solid bright rectangle.
 half3 straight=foam.rgb/max(foam.a,.001);
 half highlights=smoothstep(.86,.98,min(straight.r,min(straight.g,straight.b)));
 half opacity=mix(.28,.14,landing)*highlights*(1.-smoothstep(.72,.87,${section?'flowUv':'uv'}.y));
 half3 colour=flowing.rgb*(1.-foam.a*opacity)+foam.rgb*opacity;
 return half4(colour*mask,mask);
}`;}
export const WATERFALL_SHADER=waterfallShader();
export const WATERFALL_SECTION_SHADER=waterfallShader(true);
