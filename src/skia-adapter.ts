import {createWeatherRenderer,type WeatherView} from './weather-skia';
import {createGroundLightningRenderer} from './ground-lightning-skia';
import type {GroundStrike} from './ground-lightning';
import {createArtworkSilhouettes} from './weather-silhouette';
import type {WeatherState} from './weather-model';
import {createNightLighting} from './night-lighting-skia';
import type {CampLight,LightViewport} from './lighting-model';
import {terrainColourPixels,TERRAIN_COLOUR_FIELD_SIZE} from './terrain-colour-field';
import {WORLD_GROUND_BOUNDS} from './world-ground';
import {WORLD_GROUND_COLOUR_SHADER} from './world-ground-colour';
import {WORLD_ROAD_SECTION_SHADER,ROAD_SECTION_GRADES} from './world-road-materials';
import type {WorldRoad} from './world-roads';
import {ROAD_PILOT_SHADER} from './world-road-pilot';
import {RIVER_SHADER} from './river-art';
import {RIVER_BATCHES,RIVER_SIDE_FEATURES,type RiverBatch} from './river-layout';
import {EAST_TERRAIN_SCALE} from './east-approach';
import {riverFlowPixels} from './river-flow-field';
import {WATERFALL_SHADER,WATERFALL_SECTION_SHADER} from './waterfall-pilot';
import type {WaterfallSampling} from './waterfalls';
/** Canvas2D subset used by our existing renderer, backed by native Skia. */
import {PaintStyle,BlendMode,TileMode,FilterMode,MipmapMode,VertexMode,ClipOp,AlphaType,ColorType} from '@shopify/react-native-skia/lib/module/skia/types';
import type {SkCanvas,SkImage,SkShader,SkSurface,SkFont,SkPaint,Skia as SkiaApi} from '@shopify/react-native-skia';
import type {GamePerformanceRecorder} from './performance-recording';
const open=(name:string,run:()=>unknown)=>{try{return run()}catch(e){const error=e instanceof Error?e:Error(String(e));error.message=`${name}: ${error.message}`;throw error}};
export function createSkiaAdapter(Skia:Pick<typeof SkiaApi,'Paint'|'Shader'|'Color'|'Surface'|'Matrix'|'Path'|'PathEffect'|'XYWHRect'|'ColorFilter'|'ImageFilter'|'MakeVertices'|'RuntimeEffect'|'Image'|'Data'>,diagnostics?:GamePerformanceRecorder){
const lighting=open('Night lighting',()=>createNightLighting(Skia)),weather=open('Weather',()=>createWeatherRenderer(Skia)),silhouettes=open('Silhouettes',()=>createArtworkSilhouettes(Skia,diagnostics)),lightning=open('Lightning',()=>createGroundLightningRenderer(Skia));
const groundColour=(()=>{const effect=Skia.RuntimeEffect.Make(WORLD_GROUND_COLOUR_SHADER);if(!effect)throw Error('The terrain colour shader could not compile.');return effect})();
const roadSection=(()=>{const effect=Skia.RuntimeEffect.Make(WORLD_ROAD_SECTION_SHADER);if(!effect)throw Error('The road section shader could not compile.');return effect})();
const roadPilot=(()=>{const effect=Skia.RuntimeEffect.Make(ROAD_PILOT_SHADER);if(!effect)throw Error('The road pilot shader could not compile.');return effect})();
const riverEffect=(()=>{const effect=Skia.RuntimeEffect.Make(RIVER_SHADER);if(!effect)throw Error('The river shader could not compile.');return effect})();
const waterfallEffect=(()=>{const effect=Skia.RuntimeEffect.Make(WATERFALL_SHADER);if(!effect)throw Error('The waterfall shader could not compile.');return effect})();
const waterfallSectionEffect=(()=>{const effect=Skia.RuntimeEffect.Make(WATERFALL_SECTION_SHADER);if(!effect)throw Error('The waterfall section shader could not compile.');return effect})();
const fieldSize=TERRAIN_COLOUR_FIELD_SIZE;
const colourData=Skia.Data.fromBytes(terrainColourPixels());
const colourImage=Skia.Image.MakeImage({width:fieldSize,height:fieldSize,colorType:ColorType.RGBA_8888,alphaType:AlphaType.Opaque},colourData,fieldSize*4);
colourData.dispose();
if(!colourImage)throw Error('The terrain colour field could not open.');
const colourSamplers=new Map<number,SkShader>();
const colourSampler=(scale:number)=>{
 let shader=colourSamplers.get(scale);if(shader)return shader;
 const b=WORLD_GROUND_BOUNDS,matrix=Skia.Matrix().translate((b.x-600)*scale,(b.y-600)*scale).scale(b.width*scale/fieldSize,b.height*scale/fieldSize);
 shader=colourImage.makeShaderOptions(TileMode.Clamp,TileMode.Clamp,FilterMode.Linear,MipmapMode.None,matrix);matrix.dispose();colourSamplers.set(scale,shader);return shader;
};
const roadMeshes=new Map<WorldRoad,(ReturnType<typeof Skia.MakeVertices>|null)[]>();
// Reuse immutable terrain pipelines between frames. Entries own their native
// resources and are invalidated before a streamed image is released.
type Resource={dispose:()=>void};
const terrainCache=new Map<string,{paint:SkPaint;resources:Resource[];images:SkImage[]}>();
const imageIds=new WeakMap<SkImage,number>();let imageSequence=0;
const imageId=(im:SkImage)=>{let id=imageIds.get(im);if(!id){id=++imageSequence;imageIds.set(im,id)}return id};
const drop=(key:string)=>{const item=terrainCache.get(key);if(item){for(const r of [...item.resources].reverse())r.dispose();terrainCache.delete(key)}};
const cachedPaint=(kind:string,images:SkImage[],values:unknown,build:(keep:<T extends Resource>(r:T)=>T)=>SkPaint)=>{
 const key=kind+images.map(imageId).join(',')+JSON.stringify(values);let entry=terrainCache.get(key);
 if(entry){terrainCache.delete(key);terrainCache.set(key,entry);return entry.paint}
 const started=diagnostics?.tracing?performance.now():undefined;
 const resources:Resource[]=[],keep=<T extends Resource>(r:T)=>{resources.push(r);return r};
 const paint=build(keep);entry={paint,resources,images};terrainCache.set(key,entry);
 if(terrainCache.size>256)drop(terrainCache.keys().next().value!);
 if(started!==undefined)diagnostics!.phase('shaderBuildMs',performance.now()-started);
 return paint;
};
// The finite authored fields are shared by every section/chunk in each batch.
// Keep one field per batch/scale; section/chunk images share it.
const flowFields=new Map<string,{children:SkShader[];resources:Resource[];bytes:number}>();
const flowSamplers=(batch:RiverBatch,scale:number,sidePoints?:readonly (readonly number[])[])=>{
 const key=JSON.stringify([batch,scale,sidePoints]);const previous=flowFields.get(key);if(previous)return previous.children;
 const {width,height,main,side}=riverFlowPixels(batch,sidePoints),resources:Resource[]=[];
 const matrix=Skia.Matrix().translate((batch.source.x-600)*scale,(batch.source.y-600)*scale).scale(batch.source.width*scale/width,batch.source.height*scale/height);
 const make=(pixels:Uint8Array)=>{const data=Skia.Data.fromBytes(pixels);const image=Skia.Image.MakeImage({width,height,colorType:ColorType.RGBA_F16,alphaType:AlphaType.Opaque},data,width*8);data.dispose();if(!image)throw Error('The river flow field could not open.');const shader=image.makeShaderOptions(TileMode.Clamp,TileMode.Clamp,FilterMode.Linear,MipmapMode.None,matrix);resources.push(image,shader);return shader};
 const mainShader=make(main),children=[mainShader,side?make(side):mainShader];matrix.dispose();
 flowFields.set(key,{children,resources,bytes:main.byteLength+(side?.byteLength||0)});return children;
};
// Build the finite authored fields while the renderer opens, never during
// the first frame after crossing a river boundary.
open('River fields',()=>{for(const batch of RIVER_BATCHES)flowSamplers(batch,EAST_TERRAIN_SCALE,RIVER_SIDE_FEATURES.find(f=>RIVER_BATCHES[f.batch]===batch)?.points)});
const riverSamplerCache=new Map<string,{children:SkShader[];resources:Resource[];images:SkImage[]}>();
const dropRiverSampler=(key:string)=>{const entry=riverSamplerCache.get(key);if(entry){for(const r of [...entry.resources].reverse())r.dispose();riverSamplerCache.delete(key)}};
const releaseImage=(image:SkImage)=>{for(const [key,item]of terrainCache)if(item.images.includes(image))drop(key);for(const [key,item]of riverSamplerCache)if(item.images.includes(image))dropRiverSampler(key)};
const riverSamplers=(image:SkImage,b:{x:number;y:number;width:number;height:number},scale:number,batch:RiverBatch,sideFootprint?:SkImage,surfaceRipples?:SkImage,sidePoints?:readonly (readonly number[])[])=>{
 const images=[image,sideFootprint||image,surfaceRipples||image],source=batch.source,key=images.map(imageId).join(',')+JSON.stringify([b,scale,batch,sidePoints]);
 const cached=riverSamplerCache.get(key);if(cached){riverSamplerCache.delete(key);riverSamplerCache.set(key,cached);return cached.children}
 const resources:Resource[]=[],keep=<T extends Resource>(r:T)=>{resources.push(r);return r};
 const matrix=keep(Skia.Matrix().translate(b.x,b.y).scale(b.width/image.width(),b.height/image.height()));
 const art=keep(image.makeShaderOptions(TileMode.Clamp,TileMode.Clamp,FilterMode.Linear,MipmapMode.None,matrix));
 const sideMatrix=sideFootprint?keep(Skia.Matrix().translate((source.x-600)*scale,(source.y-600)*scale).scale(source.width*scale/sideFootprint.width(),source.height*scale/sideFootprint.height())):matrix;
 const footprint=keep((sideFootprint||image).makeShaderOptions(TileMode.Clamp,TileMode.Clamp,FilterMode.Linear,MipmapMode.None,sideMatrix));
 const surface=keep((surfaceRipples||image).makeShaderOptions(TileMode.Mirror,TileMode.Mirror,FilterMode.Linear,MipmapMode.None)),children=[art,footprint,surface,...flowSamplers(batch,scale,sidePoints)];
 riverSamplerCache.set(key,{children,resources,images});if(riverSamplerCache.size>128)dropRiverSampler(riverSamplerCache.keys().next().value!);return children;
};

class Gradient{
 stops:{at:number;color:string}[]=[];
 constructor(public x:number,public y:number,public inner:number,public outer:number){}
 addColorStop(at:number,color:string){this.stops.push({at,color})}
 shader():SkShader{const stops=[...this.stops].sort((a,b)=>a.at-b.at);return Skia.Shader.MakeRadialGradient({x:this.x,y:this.y},this.outer,stops.map(s=>Skia.Color(s.color)),stops.map(s=>(this.inner+(this.outer-this.inner)*s.at)/this.outer),TileMode.Clamp)}
}
class NativeLayer{
 private w=900;private h=1200;surface:SkSurface;context:SkiaContext;
 constructor(private face:SkFont){const surface=Skia.Surface.Make(900,1200);if(!surface)throw Error('Could not create lighting surface');this.surface=surface;this.context=new SkiaContext(surface.getCanvas(),900,1200,face)}
 get width(){return this.w}set width(v:number){if(v!==this.w)this.resize(v,this.h)}
 get height(){return this.h}set height(v:number){if(v!==this.h)this.resize(this.w,v)}
 private resize(w:number,h:number){const next=Skia.Surface.Make(w,h);if(!next)throw Error('Could not resize lighting surface');this.context.dispose();this.surface.dispose();this.surface=next;this.w=w;this.h=h;this.context=new SkiaContext(next.getCanvas(),w,h,this.face)}
 getContext(){return this.context}
 image(){this.surface.flush();this.context.dispose();return this.surface.makeImageSnapshot()}
 dispose(){this.context.dispose();this.surface.dispose()}
}
class SkiaContext{
 canvas:{width:number;height:number};fillStyle:string|Gradient='#000';strokeStyle:string|Gradient='#000';globalAlpha=1;lineWidth=1;globalCompositeOperation='source-over';filter='none';font='900 30px sans-serif';textAlign='center';
 private trash:{dispose:()=>void}[]=[];
 private keep<T extends {dispose:()=>void}>(v:T){this.trash.push(v);return v}
 dispose(){this.trash.forEach(v=>v.dispose());this.trash=[]}
 private path=this.keep(Skia.Path.Make());private dash:number[]=[];private states:any[]=[];
 constructor(private c:SkCanvas,width:number,height:number,private face:SkFont){this.canvas={width,height}}
 private paint(stroke=false){const p=this.keep(Skia.Paint());p.setAntiAlias(true);const color=stroke?this.strokeStyle:this.fillStyle;if(typeof color==='string')p.setColor(Skia.Color(color));else p.setShader(this.keep(color.shader()));p.setAlphaf(p.getAlphaf()*this.globalAlpha);p.setStyle(stroke?PaintStyle.Stroke:PaintStyle.Fill);p.setStrokeWidth(this.lineWidth);p.setBlendMode(this.globalCompositeOperation==='destination-out'?BlendMode.DstOut:BlendMode.SrcOver);if(stroke&&this.dash.length)p.setPathEffect(this.keep(Skia.PathEffect.MakeDash(this.dash,0)!));return p}
 save(){this.c.save();this.states.push({fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,globalAlpha:this.globalAlpha,lineWidth:this.lineWidth,globalCompositeOperation:this.globalCompositeOperation,filter:this.filter,font:this.font,textAlign:this.textAlign,dash:[...this.dash]})}
 restore(){this.c.restore();Object.assign(this,this.states.pop()||{})}
 transform(a:number,b:number,c:number,d:number,e:number,f:number){this.c.concat([a,c,e,b,d,f,0,0,1])}
 translate(x:number,y:number){this.c.translate(x,y)} rotate(a:number){this.c.rotate(a*180/Math.PI,0,0)} scale(x:number,y:number){this.c.scale(x,y)}
 // One textured mesh draw for the moving body, avoiding dozens of clipped
 // images/paint objects per frame on iPhone. Head remains one ordinary draw.
 drawTexturedMesh(image:SkImage,mesh:{positions:{x:number;y:number}[];uv:{x:number;y:number}[];indices:number[]}){
  const verts=this.keep(Skia.MakeVertices(VertexMode.Triangles,mesh.positions,mesh.uv,undefined,mesh.indices,true));
  const paint=cachedPaint('spriteMesh',[image],null,keep=>{
   const paint=keep(Skia.Paint());paint.setAntiAlias(true);
   paint.setShader(keep(image.makeShaderOptions(TileMode.Clamp,TileMode.Clamp,FilterMode.Linear,MipmapMode.None)));return paint;
  });paint.setAlphaf(this.globalAlpha);
  this.c.drawVertices(verts,BlendMode.SrcOver,paint);
 }
 artworkSilhouette(image:SkImage,crop?:readonly number[]){return silhouettes.outline(image,crop)}
 drawRoadTerrainPatch(image:SkImage,b:{x:number;y:number;width:number;height:number},scale:number,sample=b,core=b){
  const paint=cachedPaint('road',[image],[b,sample,scale],keep=>{
   const matrix=keep(Skia.Matrix().translate(sample.x,sample.y).scale(sample.width/image.width(),sample.height/image.height()));
   const art=keep(image.makeShaderOptions(TileMode.Clamp,TileMode.Clamp,FilterMode.Linear,MipmapMode.None,matrix));
   const shader=keep(roadPilot.makeShaderWithChildren([b.x,b.y,b.width,b.height,scale],[art]));
   const paint=keep(Skia.Paint());paint.setShader(shader);paint.setAntiAlias(false);return paint;
  });paint.setAlphaf(this.globalAlpha);
  this.c.drawRect(Skia.XYWHRect(core.x,core.y,core.width,core.height),paint);
 }
 drawRiverTerrainPatch(image:SkImage,b:{x:number;y:number;width:number;height:number},scale:number,time:number,sourceY:number,batch:RiverBatch,sideFootprint?:SkImage,sidePoints?:readonly (readonly number[])[],core=b,surfaceRipples?:SkImage){
  const started=diagnostics?.tracing?performance.now():undefined;
  const children=riverSamplers(image,b,scale,batch,sideFootprint,surfaceRipples,sidePoints);
  const source=batch.source;
  const shader=this.keep(riverEffect.makeShaderWithChildren([source.x,source.y,source.width,source.height,scale,time,sourceY,batch.topFade,sideFootprint?1:0,surfaceRipples?1:0],children));
  const paint=this.keep(Skia.Paint());paint.setShader(shader);paint.setAlphaf(this.globalAlpha);paint.setAntiAlias(false);
  if(started!==undefined)diagnostics!.phase('shaderBuildMs',performance.now()-started);
  this.c.drawRect(Skia.XYWHRect(core.x,core.y,core.width,core.height),paint);
 }
 drawWaterfallPilot(artwork:SkImage,mask:SkImage,frames:SkImage,b:{x:number;y:number;width:number;height:number},time:number){
  const children=[artwork,mask,frames].map(image=>this.keep(image.makeShaderOptions(TileMode.Clamp,TileMode.Clamp,FilterMode.Linear,MipmapMode.None)));
  const shader=this.keep(waterfallEffect.makeShaderWithChildren([b.x,b.y,b.width,b.height,time],children));
  const paint=this.keep(Skia.Paint());paint.setShader(shader);paint.setAlphaf(this.globalAlpha);paint.setAntiAlias(false);
  this.c.drawRect(Skia.XYWHRect(b.x,b.y,b.width,b.height),paint);
 }
 drawWaterfallSection(artwork:SkImage,mask:SkImage,frames:SkImage,b:{x:number;y:number;width:number;height:number},time:number,sampling:WaterfallSampling,core=b){
  const children=[artwork,mask,frames].map(image=>this.keep(image.makeShaderOptions(TileMode.Clamp,TileMode.Clamp,FilterMode.Linear,MipmapMode.None)));
  const [x,y,w,h]=sampling.region,[width,height]=sampling.nativeSize;
  const uniforms=[b.x,b.y,b.width,b.height,time,width,height,x*artwork.width(),y*artwork.height(),w*artwork.width()/width,h*artwork.height()/height,...sampling.direction];
  const shader=this.keep(waterfallSectionEffect.makeShaderWithChildren(uniforms,children));
  const paint=this.keep(Skia.Paint());paint.setShader(shader);paint.setAlphaf(this.globalAlpha);paint.setAntiAlias(false);
  this.c.drawRect(Skia.XYWHRect(core.x,core.y,core.width,core.height),paint);
 }
 drawRoadSurfaces(roads:readonly WorldRoad[],images:SkImage[],scale:number){
  const paints=images.map((image,i)=>{
   const paint=cachedPaint('roadMaterial',[image],i,keep=>{
    const matrix=keep(Skia.Matrix().scale(1/image.width(),1/image.width()));
    const artwork=keep(image.makeShaderOptions(TileMode.Clamp,TileMode.Mirror,FilterMode.Linear,MipmapMode.None,matrix));
    const shader=keep(roadSection.makeShaderWithChildren(ROAD_SECTION_GRADES[i],[artwork]));
    const paint=keep(Skia.Paint());paint.setShader(shader);paint.setAntiAlias(true);return paint;
   });paint.setAlphaf(this.globalAlpha);return paint;
  });
  // Cache bent artwork geometry once, including alpha-painted soil shoulders.
  for(const road of roads){
   let meshes=roadMeshes.get(road);
   if(!meshes){meshes=images.map((_,i)=>road.mesh.materials.some(w=>w[i]>.001)?Skia.MakeVertices(VertexMode.Triangles,road.mesh.positions,road.mesh.uv,road.mesh.alpha.map((a,j)=>new Float32Array([1,1,1,a*road.mesh.materials[j][i]])),road.mesh.indices,false):null);roadMeshes.set(road,meshes)}
   for(const i of [1,2,3,4,0])if(meshes[i])this.c.drawVertices(meshes[i]!,BlendMode.Modulate,paints[i]);
  }
 }
 // Blend only terrain contact/outer edges. One shader draw, no full-map bitmap,
 // offscreen surface or pixel readback; the original artwork stays unmodified.
 drawTerrainTile(image:SkImage,t:{x:number;y:number;width:number;height:number;fadeTop:number;fadeBottom:number;fadeRight:number;fadeLeft:number;paintTop:number;paintLeft?:number;paintWidth:number;paintHeight:number;rotation?:number;mirror?:boolean;maskBounds?:{x:number;y:number;width:number;height:number};groundMaterials?:{brown:SkImage;clear:SkImage;scale:number}}){
  const dependencies=t.groundMaterials?[image,t.groundMaterials.brown,t.groundMaterials.clear]:[image];
  const {groundMaterials,...geometry}=t;
  const paint=cachedPaint('ground',dependencies,[geometry,groundMaterials?.scale],keep=>{
  const matrix=keep(Skia.Matrix().translate(t.x+t.width/2,t.y+t.height/2).rotate((t.rotation||0)*Math.PI/2).scale((t.mirror?-1:1)*t.width/image.width(),t.height/image.height()).translate(-image.width()/2,-image.height()/2));
  let shader=keep(image.makeShaderOptions(TileMode.Clamp,TileMode.Clamp,FilterMode.Linear,MipmapMode.None,matrix));
  if(t.groundMaterials){
   const {brown,clear,scale:s}=t.groundMaterials;
   const blend=(im:SkImage,x:number,y:number,radius:number,alphas:number[],stops:number[])=>{
    const mask=keep(Skia.Shader.MakeRadialGradient({x:(x-600)*s,y:(y-600)*s},radius*s,alphas.map(a=>new Float32Array([1,1,1,a])),stops,TileMode.Clamp));
    const layer=keep(im.makeShaderOptions(TileMode.Clamp,TileMode.Clamp,FilterMode.Linear,MipmapMode.None,matrix));
    shader=keep(Skia.Shader.MakeBlend(BlendMode.SrcOver,shader,keep(Skia.Shader.MakeBlend(BlendMode.DstIn,layer,mask))));
   };
   blend(brown,2400,2400,12000,[0,0,.8],[0,.27,1]);
   const clearShader=keep(clear.makeShaderOptions(TileMode.Clamp,TileMode.Clamp,FilterMode.Linear,MipmapMode.None,matrix));
   shader=keep(groundColour.makeShaderWithChildren([s],[shader,clearShader,colourSampler(s)]));
  }
  const fade=(x:number,y:number,ex:number,ey:number)=>{
   const mask=keep(Skia.Shader.MakeLinearGradient({x,y},{x:ex,y:ey},[new Float32Array([1,1,1,0]),new Float32Array([1,1,1,1])],[0,1],TileMode.Clamp));
   shader=keep(Skia.Shader.MakeBlend(BlendMode.DstIn,shader,mask));
  };
  const b=t.maskBounds||t;
  if(t.fadeTop)fade(b.x,b.y,b.x,b.y+t.fadeTop);
  if(t.fadeBottom)fade(b.x,b.y+b.height,b.x,b.y+b.height-t.fadeBottom);
  if(t.fadeRight)fade(b.x+b.width,b.y,b.x+b.width-t.fadeRight,b.y);
  if(t.fadeLeft)fade(b.x,b.y,b.x+t.fadeLeft,b.y);
  const paint=keep(Skia.Paint());paint.setAntiAlias(false);paint.setShader(shader);

   return paint;
  });paint.setAlphaf(this.globalAlpha);
  this.c.drawRect(Skia.XYWHRect(t.x+(t.paintLeft||0),t.y+t.paintTop,t.paintWidth,t.paintHeight),paint);
 }
 // One extra rendering of the current animated pose into a small local layer.
 // Dilated alpha minus the original alpha leaves only its true outer edge;
 // no replacement silhouette, full-screen buffer or pixel readback is needed.
 drawSpriteOutline(draw:()=>void,bounds:{x:number;y:number;width:number;height:number},alpha:number,width:number){
  // CanvasKit rounds morphological radii to whole source pixels. A radius
  // below one disappears entirely at the editor's close-up zoom levels.
  const radius=Math.max(1,width);
  const paint=cachedPaint('sprite-outline',[],radius,keep=>{
   const dilation=keep(Skia.ImageFilter.MakeDilate(radius,radius)),edge=keep(Skia.ImageFilter.MakeBlend(BlendMode.DstOut,dilation));
   const paint=keep(Skia.Paint());paint.setColorFilter(keep(Skia.ColorFilter.MakeBlend(Skia.Color('#f5e7c3'),BlendMode.SrcIn)));paint.setImageFilter(edge);return paint;
  });paint.setAlphaf(alpha);
  this.c.saveLayer(paint,Skia.XYWHRect(bounds.x,bounds.y,bounds.width,bounds.height));
  try{draw()}finally{this.c.restore()}
 }
 drawGroundLightning(strike:GroundStrike|undefined,age:number,reduced:boolean){lightning.draw(this.c,strike,age,reduced)}
 drawWeather(state:WeatherState|undefined,view:WeatherView,night:number,shelters:readonly (readonly [number,number][])[]){weather.draw(this.c,state,view,night,shelters)}
 drawNightLighting(lights:CampLight[],amount:number,view:LightViewport,torch?:import('./torch').TorchBeam,warningLights:CampLight[]=[]){lighting.draw(this.c,lights,amount,view,torch,warningLights)}
 clearRect(x:number,y:number,w:number,h:number){const p=this.keep(Skia.Paint());p.setBlendMode(BlendMode.Clear);this.c.drawRect(Skia.XYWHRect(x,y,w,h),p)}
 fillRect(x:number,y:number,w:number,h:number){this.c.drawRect(Skia.XYWHRect(x,y,w,h),this.paint())}
 strokeRect(x:number,y:number,w:number,h:number){this.c.drawRect(Skia.XYWHRect(x,y,w,h),this.paint(true))}
 beginPath(){this.path=this.keep(Skia.Path.Make())}
 moveTo(x:number,y:number){this.path.moveTo(x,y)}lineTo(x:number,y:number){this.path.lineTo(x,y)}closePath(){this.path.close()}
 clip(){this.c.clipPath(this.path,ClipOp.Intersect,true)}
 clipOutsidePath(){this.c.clipPath(this.path,ClipOp.Difference,true)}
 clipOutsideRect(x:number,y:number,width:number,height:number){this.c.clipRect(Skia.XYWHRect(x,y,width,height),ClipOp.Difference,false)}
 arc(x:number,y:number,r:number,start:number,end:number){this.path.addArc(Skia.XYWHRect(x-r,y-r,2*r,2*r),start*180/Math.PI,(end-start)*180/Math.PI)}
 ellipse(x:number,y:number,rx:number,ry:number){this.path.addOval(Skia.XYWHRect(x-rx,y-ry,rx*2,ry*2))}
 fill(){this.c.drawPath(this.path,this.paint())} stroke(){this.c.drawPath(this.path,this.paint(true))}
 setLineDash(d:number[]){this.dash=d}
 createRadialGradient(x:number,y:number,r0:number,_x:number,_y:number,r1:number){return new Gradient(x,y,r0,r1)}
 private text(s:string,x:number,y:number,stroke:boolean){this.face.setSize(Number(this.font.match(/([\d.]+)px/)?.[1]||30));const width=this.face.getGlyphWidths(this.face.getGlyphIDs(s)).reduce((a,b)=>a+b,0);this.c.drawText(s,this.textAlign==='center'?x-width/2:this.textAlign==='right'||this.textAlign==='end'?x-width:x,y,this.paint(stroke),this.face)}
 fillText(s:string,x:number,y:number){this.text(s,x,y,false)} strokeText(s:string,x:number,y:number){this.text(s,x,y,true)}
 drawImage(source:SkImage|NativeLayer,...args:number[]){const layer=source instanceof NativeLayer,im=layer?source.image():source as SkImage;let sx=0,sy=0,sw=im.width(),sh=im.height(),dx=0,dy=0,dw=sw,dh=sh;if(args.length===2)[dx,dy]=args;else if(args.length===4)[dx,dy,dw,dh]=args;else [sx,sy,sw,sh,dx,dy,dw,dh]=args;
  // Skia snapshots paint values into draw commands. Reuse the native paint
  // rather than allocate/dispose one for every visible sprite on every frame.
  const p=cachedPaint('sprite',[],this.filter==='brightness(2)',keep=>{const paint=keep(Skia.Paint());paint.setAntiAlias(true);if(this.filter==='brightness(2)')paint.setColorFilter(keep(Skia.ColorFilter.MakeMatrix([2,0,0,0,0,0,2,0,0,0,0,0,2,0,0,0,0,0,1,0])));return paint});p.setAlphaf(this.globalAlpha);
  if(sw>1000&&sh>1000&&dw>sw*1.4)this.c.drawImageRectCubic(im,Skia.XYWHRect(sx,sy,sw,sh),Skia.XYWHRect(dx,dy,dw,dh),1/3,1/3,p);else this.c.drawImageRectOptions(im,Skia.XYWHRect(sx,sy,sw,sh),Skia.XYWHRect(dx,dy,dw,dh),FilterMode.Linear,MipmapMode.None,p);if(layer)im.dispose()}
}

return {SkiaContext,NativeLayer,releaseImage,shaderFieldBytes:()=>fieldSize*fieldSize*4+[...flowFields.values()].reduce((sum,f)=>sum+f.bytes,0),warmLighting:lighting.warm,disposeLighting:()=>{for(const key of riverSamplerCache.keys())dropRiverSampler(key);for(const key of terrainCache.keys())drop(key);for(const entry of flowFields.values())for(const resource of [...entry.resources].reverse())resource.dispose();flowFields.clear();waterfallEffect.dispose();waterfallSectionEffect.dispose();lighting.dispose();weather.dispose();lightning.dispose();for(const shader of colourSamplers.values())shader.dispose();colourSamplers.clear();colourImage.dispose();groundColour.dispose();roadSection.dispose();roadPilot.dispose();riverEffect.dispose();for(const meshes of roadMeshes.values())for(const mesh of meshes)mesh?.dispose();roadMeshes.clear()}};
}
