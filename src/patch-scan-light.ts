import type {SkCanvas,SkPaint,SkRuntimeEffect,Skia as SkiaApi} from '@shopify/react-native-skia';

/** Shared by the blue overlay and the night mask, so neither extends beyond the other. */
export const PATCH_SCAN_FEATHER=`
float scanFeather(float2 delta,float2 axis,float radius,float halfAngle){
 float d=length(delta);
 float cosine=dot(delta/max(0.001,d),axis);
 float angular=smoothstep(cos(halfAngle),cos(halfAngle*0.76),cosine);
 float radial=1.0-smoothstep(radius*0.75,radius,d);
 return angular*radial;
}`;

/** A steady field with two travelling wavefronts, rather than a frozen pulse. */
const beamSource=`
uniform float2 aperture;
uniform float2 axis;
uniform float radius;
uniform float phase;
uniform float halfAngle;
${PATCH_SCAN_FEATHER}
float wave(float d,float front){
 float head=1.0-smoothstep(0.65,3.0,abs(d-front));
 float tail=(1.0-smoothstep(0.0,16.0,front-d))*step(d,front);
 return head*0.38+tail*0.10;
}
half4 main(float2 p){
 float2 delta=p-aperture;
 float d=length(delta),travel=clamp(d/radius,0.0,1.0);
 float feather=scanFeather(delta,axis,radius,halfAngle);
 float bands=wave(d,radius*phase)+wave(d,radius*fract(phase+0.5));
 float source=0.12*(1.0-smoothstep(0.0,26.0,d));
 float alpha=feather*(0.13+0.17*(1.0-travel)+bands+source);
 float3 ink=mix(float3(0.05,0.29,1.0),float3(0.24,0.75,1.0),min(1.0,bands*1.7+source));
 return half4(ink*alpha,alpha);
}`;

/** Fluorescent blue follows the painted relief and the original transparent edges. */
export const PATCH_SCAN_RELIEF=`
uniform shader art;
half4 main(float2 p){
 half4 sample=art.eval(p);
 float3 ink=sample.rgb/max(0.001,float(sample.a));
 float value=dot(ink,float3(0.29,0.58,0.13));
 float ridge=smoothstep(0.17,0.54,value);
 float3 relief=mix(float3(0.08,0.39,0.99),float3(0.66,0.96,1.0),ridge);
 return half4(relief*sample.a,sample.a);
}`;

export function createPatchScanLight(Skia:Pick<typeof SkiaApi,'Paint'|'RuntimeEffect'>){
 let effect:SkRuntimeEffect|null=null,paint:SkPaint|undefined;
 return {
  draw(canvas:SkCanvas,aperture:{x:number;y:number},angle:number,halfAngle:number,radius:number,phase:number,opacity:number){
   effect??=Skia.RuntimeEffect.Make(beamSource);
   if(!effect)return false;
   paint??=Skia.Paint();
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
