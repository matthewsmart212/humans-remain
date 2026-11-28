import type {SkCanvas,SkPaint,SkRuntimeEffect,Skia as SkiaApi} from '@shopify/react-native-skia';
import {BlendMode} from '@shopify/react-native-skia/lib/module/skia/types';

/** Shared by the blue overlay and the night mask, so neither extends beyond the other. */
export const PATCH_SCAN_FEATHER=`
float scanFeather(float2 delta,float2 axis,float radius,float halfAngle){
 float d=length(delta);
 float cosine=d<0.001?1.0:dot(delta/d,axis);
 float angular=smoothstep(cos(halfAngle),cos(halfAngle*0.35),cosine);
 float radial=1.0-smoothstep(radius*0.15,radius,d);
 return angular*radial;
}`;

/** A soft UV projection with one broad, quiet sweep. Screen blending preserves
 * the ground's colour and detail instead of laying a dark blue fan over it. */
const beamSource=`
uniform float2 aperture;
uniform float2 axis;
uniform float radius;
uniform float phase;
uniform float halfAngle;
${PATCH_SCAN_FEATHER}
half4 main(float2 p){
 float2 delta=p-aperture;
 float d=length(delta),travel=clamp(d/radius,0.0,1.0);
 float feather=scanFeather(delta,axis,radius,halfAngle);
 float cosine=d<0.001?1.0:dot(delta/d,axis);
 float core=smoothstep(cos(halfAngle*0.65),1.0,cosine);
 float wave=1.0-smoothstep(0.0,radius*0.095,abs(d-radius*phase));
 wave*=smoothstep(0.04,0.18,phase)*(1.0-smoothstep(0.72,1.0,phase));
 float source=0.20*(1.0-smoothstep(0.0,32.0,d));
 float alpha=feather*(0.13+0.10*core+0.045*(1.0-travel)+0.075*wave+source);
 float3 ink=mix(float3(0.03,0.28,1.0),float3(0.16,0.66,1.0),core*0.65+wave*0.25);
 return half4(ink*alpha,alpha);
}`;

/** Fluorescent blue follows the painted relief and the original transparent edges. */
export const PATCH_SCAN_RELIEF=`
uniform shader art;
half4 main(float2 p){
 half4 sample=art.eval(p);
 float3 ink=sample.rgb/max(0.001,float(sample.a));
 float value=dot(ink,float3(0.29,0.58,0.13));
 float ridge=smoothstep(0.17,0.60,value);
 float3 relief=mix(float3(0.16,0.47,0.78),float3(0.67,0.94,1.0),ridge);
 float alpha=sample.a*(0.38+0.52*ridge);
 return half4(relief*alpha,alpha);
}`;

export function createPatchScanLight(Skia:Pick<typeof SkiaApi,'Paint'|'RuntimeEffect'>){
 let effect:SkRuntimeEffect|null=null,paint:SkPaint|undefined;
 return {
  draw(canvas:SkCanvas,aperture:{x:number;y:number},angle:number,halfAngle:number,radius:number,phase:number,opacity:number){
   effect??=Skia.RuntimeEffect.Make(beamSource);
   if(!effect)return false;
   if(!paint){paint=Skia.Paint();paint.setBlendMode(BlendMode.Screen)}
   const shader=effect.makeShader([aperture.x,aperture.y,Math.cos(angle),Math.sin(angle),
    radius,phase,halfAngle]);
   paint.setShader(shader);paint.setAlphaf(opacity);
   canvas.drawRect({x:-radius-48,y:-radius-48,width:2*radius+96,height:2*radius+96},paint);
   paint.setShader(null);shader.dispose();
   return true;
  },
  dispose(){paint?.dispose();effect?.dispose()},
 };
}
