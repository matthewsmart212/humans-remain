import type {SkCanvas,SkPaint,SkRuntimeEffect,Skia as SkiaApi} from '@shopify/react-native-skia';

/** Point source with an angular penumbra. Coordinates lie on the ground beneath the actors. */
const beamSource=`
uniform float2 aperture;
uniform float2 axis;
uniform float radius;
uniform float reach;
uniform float outerCos;
uniform float innerCos;
half4 main(float2 p){
 float2 fromLamp=p-aperture;
 float d=length(fromLamp);
 float angle=dot(fromLamp/max(0.5,d),axis);
 float feather=smoothstep(outerCos,innerCos,angle);
 float distanceToFront=reach-length(p-aperture*(1.0-reach/radius));
 float body=smoothstep(-1.0,10.0,distanceToFront);
 float travel=clamp(d/radius,0.0,1.0);
 float spill=(0.13+0.32*(1.0-travel)*(1.0-travel))*body;
 float core=1.0-smoothstep(0.55,2.8,abs(distanceToFront));
 float echo=0.20*(1.0-smoothstep(0.0,5.0,abs(distanceToFront-9.0)));
 float apertureLight=0.28*(1.0-smoothstep(0.0,21.0,d));
 float rim=feather*(core*0.70+echo);
 float alpha=clamp(feather*(spill+apertureLight)+rim,0.0,0.91);
 float3 ink=mix(float3(0.16,0.45,1.0),float3(0.58,0.88,1.0),min(1.0,rim*1.6+apertureLight));
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
  draw(canvas:SkCanvas,aperture:{x:number;y:number},angle:number,halfAngle:number,radius:number,reach:number,opacity:number){
   effect??=Skia.RuntimeEffect.Make(beamSource);
   if(!effect)return false;
   paint??=Skia.Paint();
   const shader=effect.makeShader([aperture.x,aperture.y,Math.cos(angle),Math.sin(angle),
    radius,reach,Math.cos(halfAngle),Math.cos(halfAngle*.62)]);
   paint.setShader(shader);paint.setAlphaf(opacity);
   canvas.drawRect({x:-radius-48,y:-radius-48,width:2*radius+96,height:2*radius+96},paint);
   paint.setShader(null);shader.dispose();
   return true;
  },
  dispose(){paint?.dispose();effect?.dispose()},
 };
}
