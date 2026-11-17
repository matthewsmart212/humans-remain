import {BlendMode} from '@shopify/react-native-skia/lib/module/skia/types';
import type {SkCanvas,Skia as SkiaApi} from '@shopify/react-native-skia';
import type {LootChestFx} from './loot-chest-fx';
import {CHEST_MOUTH_BACK,CHEST_MOUTH_FRONT} from './loot-chest-rig';

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
uniform float2 lidY;
uniform float4 lidX;
float bell(float2 p,float2 size){float2 v=p/size;return exp(-dot(v,v)*2.0);}
// Broad moving clouds with soft edges, rather than straight light beams.
float radiance(float2 p){
 float h=-p.y-0.70;
 float drift=sin(time*1.1+h*4.1)*0.16+sin(time*0.63-h*2.7)*0.12;
 float across=p.x-drift;
 float rolling=0.76+0.15*sin(across*5.2+h*4.0-time*1.9)+0.09*sin(across*8.0-h*5.7+time*1.1);
 float body=bell(float2(across,h-0.46),float2(0.98,1.12));
 float curl=bell(float2(p.x+sin(time*0.8-h*3.3)*0.34,h-0.9),float2(0.72,0.95));
 return (body*rolling+curl*0.25)*smoothstep(-0.10,0.12,h);
}
half4 main(float2 position){
 float2 p=(position-origin)/100.0;
 float breathe=0.88+0.08*sin(time*2.4)+0.04*sin(time*5.1);
 float3 light=float3(0.0);
 if(front<0.5){
  // Reflected amber across the ground and a soft halo behind the silhouette.
  light+=float3(1.0,0.39,0.065)*bell(p-float2(0.0,-0.05),float2(1.72,0.62))*(0.29+opening*0.13+burst*0.4)*breathe;
  light+=float3(1.0,0.46,0.12)*bell(p-float2(0.0,-0.64),float2(1.5,1.45))*(0.06+charge*0.08+opening*0.05);
  // Warm outer haze around a pale, flowing centre. No directional ray pattern.
  light+=float3(1.0,0.88,0.59)*radiance(p)*(0.015+opening*0.11+charge*0.12+burst*0.38);
  light+=float3(1.0,0.38,0.045)*bell(p-float2(sin(time*0.7)*0.16,-1.10),float2(1.14,0.94))*(0.01+opening*0.025);
  // Even sealed, faint wisps and a brighter seam suggest contained energy.
  float wisps=0.65+0.35*sin(p.x*4.5+sin(p.y*3.0-time)*1.3);
  light+=float3(1.0,0.51,0.13)*bell(p-float2(0.0,-0.88),float2(1.15,1.0))*wisps*0.025;
  light+=float3(1.0,0.70,0.3)*bell(p-float2(0.0,-0.76),float2(1.05,0.11))*(0.16+charge*0.47+burst*0.5);
 }else{
  // Authored crystal and orange inlays are the light sources. The broad bloom
  // stays transparent, preserving the weathered wood, iron and moss beneath.
  light+=float3(1.0,0.40,0.045)*bell(p-float2(-0.05,-0.43),float2(0.57,0.55))*(0.55+charge*0.35+burst*0.75)*breathe;
  light+=float3(1.0,0.69,0.25)*bell(p-float2(-0.05,-0.43),float2(0.13,0.22))*0.6;
  light+=float3(1.0,0.42,0.055)*(bell(p-float2(-0.53,-0.38),float2(0.40,0.14))+bell(p-float2(0.43,-0.36),float2(0.40,0.14)))*0.4*breathe;
  // The lid crack advances with the actual poses, then remains a radiant
  // interior. Height and width are clipped to the inside of the wooden rim.
  float mouthBack=${(CHEST_MOUTH_BACK/100).toFixed(6)},mouthFront=${(CHEST_MOUTH_FRONT/100).toFixed(6)};
  float depth=clamp((p.y-mouthBack)/(mouthFront-mouthBack),0.0,1.0);
  float inside=smoothstep(mouthBack,mouthBack+0.055,p.y)*(1.0-smoothstep(mouthFront-0.07,mouthFront,p.y));
  float width=mix(0.70,0.79,depth);
  inside*=1.0-smoothstep(width-0.10,width,abs(p.x));
  float shimmer=0.86+0.10*sin(time*3.6+p.x*5.0)+0.04*sin(time*7.1-p.x*9.0);
  // A rounded source deep in the compartment replaces the white horizontal
  // strip; the front lip keeps its dark metal and weathered texture.
  float core=bell(p-float2(sin(time*0.8)*0.025,mouthBack+0.14),float2(0.63,0.15));
  light+=float3(1.0,0.83,0.44)*inside*opening*(0.27+core*0.55+burst*0.28)*shimmer;
  light+=float3(1.0,0.58,0.16)*bell(p-float2(0.0,mouthBack+0.15),float2(0.89,0.20))*opening*0.19;
  // Reflected light follows the raised inner face in EVERY opening pose.
  // Screen blending retains the wood grain and dark iron straps. It is
  // strongest near the hinge, with a warm reflection reaching the top rail.
  float v=clamp((p.y-lidY.x)/max(0.001,lidY.y-lidY.x),0.0,1.0);
  float left=mix(lidX.x,lidX.z,v),right=mix(lidX.y,lidX.w,v);
  float lid=smoothstep(lidY.x,lidY.x+0.045,p.y)*(1.0-smoothstep(lidY.y-0.035,lidY.y,p.y));
  lid*=smoothstep(left,left+0.045,p.x)*(1.0-smoothstep(right-0.045,right,p.x));
  float reflection=(0.14+pow(v,1.5)*0.40)*(0.66+0.34*exp(-p.x*p.x*2.0));
  float caustic=0.80+0.20*sin(p.x*4.0+v*4.2-time*1.7);
  light+=float3(1.0,0.68,0.29)*lid*reflection*opening*caustic;
  float rimY=lidY.x-0.10,centre=(lidX.x+lidX.y)*0.5;
  light+=float3(1.0,0.73,0.36)*bell(p-float2(centre,rimY),float2(0.96,0.085))*opening*0.22;
  // Rolling light sits across the inner face and air above, preserving the
  // authored wood texture rather than painting a flat amber rectangle.
  light+=float3(1.0,0.91,0.68)*radiance(p)*opening*(0.06+burst*0.10);
  light+=float3(1.0,0.65,0.26)*bell(p-float2(0.0,-1.02),float2(0.74,0.8))*opening*0.13;
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
   const shader=effect.makeShader([x,y,fx.time,fx.open,fx.charge,fx.burst,fx.power,front?1:0,...fx.lid.map(n=>n/100)]);
   paint.setShader(shader);
   // Bounds contain the very soft tail; no visible rectangular fade boundary.
   canvas.drawRect(Skia.XYWHRect(x-220,y-330,440,430),paint);
   paint.setShader(null);shader.dispose();
  },
  dispose(){if(disposed)return;disposed=true;paint?.dispose();effect?.dispose()},
 };
}
