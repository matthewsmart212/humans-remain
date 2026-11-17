import {BlendMode} from '@shopify/react-native-skia/lib/module/skia/types';
import type {SkCanvas,Skia as SkiaApi} from '@shopify/react-native-skia';
import type {LootChestFx} from './loot-chest-fx';

// Two small, world-space light passes. Screen blending makes these emit light
// on bright autumn terrain too. No blur, full-screen surface or new textures.
export const LOOT_CHEST_LIGHT_SHADER=`
uniform float2 origin;
uniform float time;
uniform float opening;
uniform float charge;
uniform float burst;
uniform float power;
uniform float front;
float bell(float2 p,float2 size){float2 v=p/size;return exp(-dot(v,v)*2.0);}
half4 main(float2 position){
 float2 p=(position-origin)/100.0;
 float breathe=0.88+0.08*sin(time*2.4)+0.04*sin(time*5.1);
 float3 light=float3(0.0);
 if(front<0.5){
  // Reflected amber across the ground and a soft halo behind the silhouette.
  light+=float3(1.0,0.39,0.065)*bell(p-float2(0.0,-0.05),float2(1.72,0.62))*(0.29+opening*0.13+burst*0.4)*breathe;
  light+=float3(1.0,0.46,0.12)*bell(p-float2(0.0,-0.64),float2(1.5,1.45))*(0.22+charge*0.13+opening*0.15);
  // Broad, soft-ended shafts fan out from the interior, with moving filaments.
  float h=-p.y-0.69;
  float width=0.20+max(0.0,h)*0.43;
  float across=p.x/width;
  float rays=pow(max(0.0,cos(across*13.0+sin(time*0.7+h*2.0)*0.32)),9.0);
  float reach=1.25+opening*1.1;
  float envelope=smoothstep(-0.04,0.18,h)*(1.0-smoothstep(reach*0.50,reach,h));
  float fan=exp(-across*across*1.65)*envelope;
  light+=float3(1.0,0.84,0.48)*fan*(0.10+rays*0.46)*(0.36+opening*0.84+charge*0.7+burst*2.2);
  // Even sealed, faint wisps and a brighter seam suggest contained energy.
  float wisps=pow(max(0.0,sin(p.x*12.0+sin(p.y*5.0-time)*1.3)),10.0);
  light+=float3(1.0,0.42,0.07)*bell(p-float2(0.0,-0.88),float2(1.15,1.2))*wisps*0.14;
  light+=float3(1.0,0.70,0.3)*bell(p-float2(0.0,-0.76),float2(1.05,0.11))*(0.16+charge*0.47+burst*0.5);
 }else{
  // Authored crystal and orange inlays are the light sources. The broad bloom
  // stays transparent, preserving the weathered wood, iron and moss beneath.
  light+=float3(1.0,0.40,0.045)*bell(p-float2(-0.05,-0.43),float2(0.57,0.55))*(0.55+charge*0.35+burst*0.75)*breathe;
  light+=float3(1.0,0.69,0.25)*bell(p-float2(-0.05,-0.43),float2(0.13,0.22))*0.6;
  light+=float3(1.0,0.42,0.055)*(bell(p-float2(-0.53,-0.38),float2(0.40,0.14))+bell(p-float2(0.43,-0.36),float2(0.40,0.14)))*0.4*breathe;
  // The lid crack advances with the actual poses, then remains a radiant
  // interior. Height and width are clipped to the inside of the wooden rim.
  float inside=smoothstep(-0.83,-0.76,p.y)*(1.0-smoothstep(-0.55,-0.50,p.y));
  inside*=1.0-smoothstep(0.67,0.78,abs(p.x));
  light+=float3(1.0,0.72,0.32)*inside*opening*(0.53+burst*0.42)*breathe;
  light+=float3(1.0,0.63,0.2)*bell(p-float2(0.0,-0.72),float2(0.92,0.2))*opening*0.38;
  // Soft flash centred on the opening, never a full-screen white overlay.
  light+=float3(1.0,0.78,0.4)*bell(p-float2(0.0,-0.73),float2(1.48,1.05))*burst*0.65;
 }
 float boundary=(1.0-smoothstep(1.7,2.2,abs(p.x)))*(1.0-smoothstep(0.55,1.0,p.y))*smoothstep(-3.3,-3.0,p.y);
 light=clamp(light*power*boundary,float3(0.0),float3(0.95));
 // Valid premultiplied colour also gives correct Screen alpha at the edges.
 float alpha=max(light.r,max(light.g,light.b));
 return half4(half3(light),half(alpha));
}`;

export function createLootChestLight(Skia:Pick<typeof SkiaApi,'Paint'|'RuntimeEffect'|'XYWHRect'>){
 // Lazy compilation: editor-only sessions never allocate this effect.
 let effect:ReturnType<typeof Skia.RuntimeEffect.Make>|undefined,paint:ReturnType<typeof Skia.Paint>|undefined,disposed=false;
 return{
  draw(canvas:SkCanvas,x:number,y:number,fx:LootChestFx,front:boolean){
   if(disposed)return;
   if(!effect){effect=Skia.RuntimeEffect.Make(LOOT_CHEST_LIGHT_SHADER);if(!effect)throw Error('Loot chest light shader could not compile')}
   if(!paint){paint=Skia.Paint();paint.setAntiAlias(false);paint.setBlendMode(BlendMode.Screen)}
   const shader=effect.makeShader([x,y,fx.time,fx.open,fx.charge,fx.burst,fx.power,front?1:0]);
   paint.setShader(shader);
   // Bounds contain the very soft tail; no visible rectangular fade boundary.
   canvas.drawRect(Skia.XYWHRect(x-220,y-330,440,430),paint);
   paint.setShader(null);shader.dispose();
  },
  dispose(){if(disposed)return;disposed=true;paint?.dispose();effect?.dispose()},
 };
}
