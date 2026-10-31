import type {TorchBeam} from './torch';
import {BlendMode,TileMode,FilterMode,MipmapMode} from '@shopify/react-native-skia/lib/module/skia/types';
import type {SkCanvas,Skia as SkiaApi,SkShader} from '@shopify/react-native-skia';
import {MAX_NIGHT_LIGHTS,type CampLight,type LightViewport} from './lighting-model';

const stops=[0,.06,.15,.25,.4,.55,.7,.85,1];
const falloff=stops.map(d=>{const t=Math.max(0,(d-.06)/.94);return t*t*(3-2*t)});
type Disposable={dispose:()=>void};
/** Bake the soft light field only when a fire changes. Each frame then costs one
 * ordinary texture draw, on WebGL and software. The mask is at most 256 KiB;
 * world artwork still renders at its original resolution. */
export function createNightLighting(Skia:Pick<typeof SkiaApi,'Paint'|'Shader'|'Surface'|'Matrix'|'XYWHRect'|'RuntimeEffect'>){
 const effect=Skia.RuntimeEffect.Make(`
 uniform shader field;
 uniform float2 origin;
 uniform float2 direction;
 uniform float reach;
 uniform float darkness;
 uniform float torchEnabled;
 uniform float4 warning0;
 uniform float4 warning1;
 float warningLight(float2 p,float4 source){
  return (1.0-smoothstep(0.1,1.0,length(p-source.xy)/max(1.0,source.z)))*source.w;
 }
 half4 main(float2 p){
  float2 v=p-origin;float along=dot(v,direction);
  float across=abs(v.x*direction.y-v.y*direction.x);
  float width=18.0+max(0.0,along)*0.65;
  float beam=(1.0-smoothstep(0.40,1.0,across/width))*(1.0-smoothstep(reach*0.55,reach,along))*smoothstep(-4.0,8.0,along);
  // Soft lens spill keeps the survivor and nearby footing readable.
  float spill=(1.0-smoothstep(25.0,135.0,length(v)))*0.65;
  float torchLight=max(beam,spill)*torchEnabled;
  float red=max(warningLight(p,warning0),warningLight(p,warning1));
  float light=max(torchLight,red);
  half4 night=field.eval(p)*darkness*(1.0-light*0.96);
  float glow=torchLight*(0.035+darkness*0.025);
  half4 shaded=half4(half3(1.0,0.77,0.39)*glow,glow)+night*(1.0-glow);
  float redGlow=red*0.08*darkness;
  return half4(half3(1.0,0.045,0.018)*redGlow,redGlow)+shaded*(1.0-redGlow);
 }`);
 if(!effect)throw Error('Torch lighting shader could not compile');
 let field:SkShader;
 const paint=Skia.Paint();paint.setAntiAlias(false);
 let resources:Disposable[]=[],previous:number[]=[],disposed=false,builds=0;
 const prepare=(lights:CampLight[])=>{
  const values=lights.slice(0,MAX_NIGHT_LIGHTS).flatMap(l=>[l.x,l.y,l.radius,l.strength]);
  if(resources.length&&values.length===previous.length&&values.every((n,i)=>n===previous[i]))return;
  const next:Disposable[]=[],keep=(shader:SkShader)=>{next.push(shader);return shader};
  const night=keep(Skia.Shader.MakeColor(new Float32Array([.018,.032,.062,.88])));
  let shader=night,mask:SkShader|undefined;
  for(let i=0;i<values.length;i+=4){
   const [x,y,radius,strength]=values.slice(i,i+4);
   const colors=falloff.map(alpha=>new Float32Array([1,1,1,1-(1-alpha)*strength]));
   const hole=keep(Skia.Shader.MakeRadialGradient({x,y},Math.max(1,radius),colors,stops,TileMode.Clamp));
   mask=mask?keep(Skia.Shader.MakeBlend(BlendMode.DstIn,mask,hole)):hole;
  }
  if(mask){
   const shadow=keep(Skia.Shader.MakeBlend(BlendMode.DstIn,night,mask));
   const orange=keep(Skia.Shader.MakeColor(new Float32Array([1,.49,.14,.075])));
   const warmth=keep(Skia.Shader.MakeBlend(BlendMode.DstOut,orange,mask));
   shader=keep(Skia.Shader.MakeBlend(BlendMode.SrcOver,shadow,warmth));
   // The entire field is cached in world coordinates, so camera panning,
   // zooming, flames and walking never redraw the mask. Clamp its dark border
   // to cover the rest of the map without any additional full-screen layer.
   const sources=lights.slice(0,MAX_NIGHT_LIGHTS),left=Math.min(...sources.map(l=>l.x-l.radius)),top=Math.min(...sources.map(l=>l.y-l.radius));
   const right=Math.max(...sources.map(l=>l.x+l.radius)),bottom=Math.max(...sources.map(l=>l.y+l.radius)),pad=Math.max(right-left,bottom-top)*.02;
   const rect={x:left-pad,y:top-pad,width:right-left+pad*2,height:bottom-top+pad*2},scale=256/Math.max(rect.width,rect.height);
   const width=Math.max(1,Math.min(256,Math.ceil(rect.width*scale))),height=Math.max(1,Math.min(256,Math.ceil(rect.height*scale))),surface=Skia.Surface.Make(width,height);
   if(surface){
    const c=surface.getCanvas(),bake=Skia.Paint();bake.setShader(shader);c.scale(width/rect.width,height/rect.height);c.translate(-rect.x,-rect.y);c.drawRect(Skia.XYWHRect(rect.x,rect.y,rect.width,rect.height),bake);surface.flush();
    const image=surface.makeImageSnapshot(),matrix=Skia.Matrix().translate(rect.x,rect.y).scale(rect.width/width,rect.height/height);
    shader=image.makeShaderOptions(TileMode.Clamp,TileMode.Clamp,FilterMode.Linear,MipmapMode.None,matrix);
    matrix.dispose();bake.dispose();surface.dispose();next.forEach(s=>s.dispose());next.length=0;next.push(image,shader);
   }
  }
  field=shader;paint.setShader(shader);resources.forEach(s=>s.dispose());resources=next;previous=values;builds++;
 };
 prepare([]);
 return{
  // Upload the small cached mask to the actual surface before the first frame.
  warm(canvas:SkCanvas,lights:CampLight[]){if(disposed)return;prepare(lights);paint.setAlphaf(1);canvas.drawRect(Skia.XYWHRect(0,0,1,1),paint)},
  draw(canvas:SkCanvas,lights:CampLight[],amount:number,view:LightViewport,torch?:TorchBeam,warningLights:CampLight[]=[]){
   if(disposed||(amount<=0&&!torch))return;prepare(lights);
   const warningUniforms=[0,1].flatMap(i=>{const l=warningLights[i];return l?[l.x,l.y,Math.max(1,l.radius),Math.max(0,Math.min(1,l.strength))]:[0,0,1,0]});
   const shader=torch||warningLights.length?effect.makeShaderWithChildren([
    torch?.x??0,torch?.y??0,torch?.dx??1,torch?.dy??0,torch?.range??1,
    Math.max(0,Math.min(1,amount)),torch?1:0,...warningUniforms,
   ],[field]):undefined;
   paint.setShader(shader??field);paint.setAlphaf(shader?1:Math.min(1,amount));
   canvas.drawRect(Skia.XYWHRect(view.x,view.y,view.width,view.height),paint);
   if(shader){paint.setShader(field);shader.dispose()}
  },
  get shaderBuilds(){return builds},
  dispose(){if(disposed)return;disposed=true;effect.dispose();paint.dispose();resources.forEach(s=>s.dispose());resources=[]},
 };
}
