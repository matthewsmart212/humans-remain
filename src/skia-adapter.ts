import {createWeatherRenderer,type WeatherView} from './weather-skia';
import {createDrawingPath} from './skia-drawing-path';
import {createGroundLightningRenderer} from './ground-lightning-skia';
import {createLootChestLight} from './loot-chest-skia';
import {createPatchScanLight,PATCH_SCAN_RELIEF} from './patch-scan-light';
import type {LootChestFx} from './loot-chest-fx';
import type {GroundStrike} from './ground-lightning';
import {createArtworkSilhouettes} from './weather-silhouette';
import type {WeatherState} from './weather-model';
import {createNightLighting} from './night-lighting-skia';
import type {CampLight,LightViewport} from './lighting-model';
import {terrainColourPixels,TERRAIN_COLOUR_FIELD_SIZE} from './terrain-colour-field';
import {WORLD_GROUND_BOUNDS,WORLD_GROUND_TEXTURE_SPAN} from './world-ground';
import type {TerrainView} from './outdoor-terrain';
import {WORLD_GROUND_COLOUR_SHADER} from './world-ground-colour';
import {WORLD_ROAD_SECTION_SHADER,ROAD_SECTION_GRADES} from './world-road-materials';
import type {WorldRoad} from './world-roads';
import {ROAD_PILOT_SHADER} from './world-road-pilot';
import {ROCK_SURFACE_SHADER,rockGrades,type RockMaterial,type RockBounds} from './rock-surface';
import {RIVER_SHADER} from './river-art';
import {FISHING_PIER_SURFACE_SHADER} from './fishing-site-surface';
import {RIVER_BATCHES,RIVER_SIDE_FEATURES,type RiverBatch} from './river-layout';
import {EAST_TERRAIN_SCALE} from './east-approach';
import {riverFlowPixels} from './river-flow-field';
import {WATERFALL_SHADER,WATERFALL_SECTION_SHADER} from './waterfall-pilot';
import type {WaterfallSampling} from './waterfalls';
/** Canvas2D subset used by our existing renderer, backed by native Skia. */
import {PaintStyle,BlendMode,TileMode,FilterMode,MipmapMode,VertexMode,ClipOp,AlphaType,ColorType,StrokeCap,StrokeJoin} from '@shopify/react-native-skia/lib/module/skia/types';
import type {SkCanvas,SkImage,SkShader,SkSurface,SkFont,SkPaint,SkData,Skia as SkiaApi} from '@shopify/react-native-skia';
import type {GamePerformanceRecorder} from './performance-recording';
const open=<T,>(name:string,run:()=>T):T=>{try{return run()}catch(e){const error=e instanceof Error?e:Error(String(e));error.message=`${name}: ${error.message}`;throw error}};
/** The existing HUD uses Barlow Condensed Black. Longer dialogue uses the
 * game's Barlow Medium so counters and punctuation are clear at phone size. */
export function createDialogueFont(skia:Pick<typeof SkiaApi,'Typeface'|'Font'>,bytes:SkData){
 const typeface=skia.Typeface.MakeFreeTypeFaceFromData(bytes);
 try{return typeface?skia.Font(typeface,18):undefined}
 finally{typeface?.dispose();bytes.dispose()}
}
export function createSkiaAdapter(Skia:Pick<typeof SkiaApi,'Paint'|'Shader'|'Color'|'Surface'|'Matrix'|'Path'|'PathEffect'|'XYWHRect'|'ColorFilter'|'ImageFilter'|'MakeVertices'|'RuntimeEffect'|'Image'|'Data'>,diagnostics?:GamePerformanceRecorder,dialogueFont?:SkFont){
const lighting=open('Night lighting',()=>createNightLighting(Skia)),weather=open('Weather',()=>createWeatherRenderer(Skia)),silhouettes=open('Silhouettes',()=>createArtworkSilhouettes(Skia,diagnostics)),lightning=open('Lightning',()=>createGroundLightningRenderer(Skia));
const chestLight=createLootChestLight(Skia),scanLight=createPatchScanLight(Skia);
let scanRelief:ReturnType<typeof Skia.RuntimeEffect.Make>;
const groundColour=(()=>{const effect=Skia.RuntimeEffect.Make(WORLD_GROUND_COLOUR_SHADER);if(!effect)throw Error('The terrain colour shader could not compile.');return effect})();
const roadSection=(()=>{const effect=Skia.RuntimeEffect.Make(WORLD_ROAD_SECTION_SHADER);if(!effect)throw Error('The road section shader could not compile.');return effect})();
const roadPilot=(()=>{const effect=Skia.RuntimeEffect.Make(ROAD_PILOT_SHADER);if(!effect)throw Error('The road pilot shader could not compile.');return effect})();
const rockEffect=open('Rock material',()=>{const effect=Skia.RuntimeEffect.Make(ROCK_SURFACE_SHADER);if(!effect)throw Error('The rock surface shader could not compile.');return effect});
const riverEffect=(()=>{const effect=Skia.RuntimeEffect.Make(RIVER_SHADER);if(!effect)throw Error('The river shader could not compile.');return effect})();
const fishingPierEffect=open('Fishing pier surface',()=>{const effect=Skia.RuntimeEffect.Make(FISHING_PIER_SURFACE_SHADER);if(!effect)throw Error('The fishing pier surface shader could not compile.');return effect});
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
// Waterfall masks and animation atlases do not change with the clock. Reuse
// their immutable image samplers; only the small time-varying parent shader
// belongs to a draw. Bound this separately from the larger river pipelines.
const waterfallSamplerCache=new Map<string,{children:SkShader[];images:SkImage[]}>();
const dropWaterfallSampler=(key:string)=>{const entry=waterfallSamplerCache.get(key);if(entry){for(const child of entry.children)child.dispose();waterfallSamplerCache.delete(key)}};
const waterfallSamplers=(artwork:SkImage,mask:SkImage,frames:SkImage)=>{
 const images=[artwork,mask,frames],key=images.map(imageId).join(',');
 const previous=waterfallSamplerCache.get(key);
 if(previous){waterfallSamplerCache.delete(key);waterfallSamplerCache.set(key,previous);return previous.children}
 const children:SkShader[]=[];
 try{for(const image of images)children.push(image.makeShaderOptions(TileMode.Clamp,TileMode.Clamp,FilterMode.Linear,MipmapMode.None))}
 catch(error){for(const child of children)child.dispose();throw error}
 waterfallSamplerCache.set(key,{children,images});
 if(waterfallSamplerCache.size>32)dropWaterfallSampler(waterfallSamplerCache.keys().next().value!);
 return children;
};
let waterPaint:SkPaint|undefined;
const waterDrawPaint=(shader:SkShader,alpha:number)=>{
 if(!waterPaint){waterPaint=Skia.Paint();waterPaint.setAntiAlias(false)}
 waterPaint.setShader(shader);waterPaint.setAlphaf(alpha);return waterPaint;
};
const releaseImage=(image:SkImage)=>{for(const [key,item]of terrainCache)if(item.images.includes(image))drop(key);for(const [key,item]of riverSamplerCache)if(item.images.includes(image))dropRiverSampler(key);for(const [key,item]of waterfallSamplerCache)if(item.images.includes(image))dropWaterfallSampler(key)};
// Skia copies paint values into each recorded command, so one native paint can
// serve every matching draw. Allocating one per fill, stroke or sprite made
// thousands of short-lived native objects a second for the JS collector.
const solidPaints=new Map<string,{paint:SkPaint;colourAlpha:number;dash?:Resource}>();
const solidPaint=(color:string,alpha:number,stroke:boolean,width:number,erase:boolean,dash:readonly number[],rounded=false)=>{
 const dashed=stroke&&dash.length>0,key=(stroke?'s'+width:'f')+(rounded?'r':'')+(erase?'x':'')+(dashed?'d'+dash.join(','):'')+'|'+color;
 // Opacity varies continuously for fades and effects. Skia snapshots a paint
 // into each draw command, so reuse its style and update only effective alpha.
 // Keep the colour's own alpha separately; never multiply an already faded one.
 let entry=solidPaints.get(key);if(entry){solidPaints.delete(key);solidPaints.set(key,entry);entry.paint.setAlphaf(entry.colourAlpha*alpha);return entry.paint}
 const paint=Skia.Paint();paint.setAntiAlias(true);paint.setColor(Skia.Color(color));const colourAlpha=paint.getAlphaf();paint.setAlphaf(colourAlpha*alpha);paint.setStyle(stroke?PaintStyle.Stroke:PaintStyle.Fill);paint.setStrokeWidth(width);paint.setBlendMode(erase?BlendMode.DstOut:BlendMode.SrcOver);
 if(rounded){paint.setStrokeCap(StrokeCap.Round);paint.setStrokeJoin(StrokeJoin.Round)}
 const effect=dashed?Skia.PathEffect.MakeDash([...dash],0)!:undefined;if(effect)paint.setPathEffect(effect);
 solidPaints.set(key,entry={paint,colourAlpha,dash:effect});
 if(solidPaints.size>512){const [oldest,old]=solidPaints.entries().next().value!;solidPaints.delete(oldest);old.paint.dispose();old.dash?.dispose()}
 return paint;
};
const spritePaints:SkPaint[]=[],spriteResources:Resource[]=[];
const spritePaint=(bright:boolean)=>{
 const index=bright?1:0;let paint=spritePaints[index];if(paint)return paint;
 paint=Skia.Paint();paint.setAntiAlias(true);
 if(bright){const filter=Skia.ColorFilter.MakeMatrix([2,0,0,0,0,0,2,0,0,0,0,0,2,0,0,0,0,0,1,0]);spriteResources.push(filter);paint.setColorFilter(filter)}
 return spritePaints[index]=paint;
};
let clearPaint:SkPaint|undefined;
const textWidths=new WeakMap<SkFont,Map<string,number>>();
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
 constructor(public x:number,public y:number,public inner:number,public outer:number,private end?:{x:number;y:number}){}
 addColorStop(at:number,color:string){this.stops.push({at,color})}
 shader():SkShader{
  const stops=[...this.stops].sort((a,b)=>a.at-b.at),colors=stops.map(s=>Skia.Color(s.color)),start={x:this.x,y:this.y};
  if(this.end)return Skia.Shader.MakeLinearGradient(start,this.end,colors,stops.map(s=>s.at),TileMode.Clamp);
  return Skia.Shader.MakeRadialGradient(start,this.outer,colors,stops.map(s=>(this.inner+(this.outer-this.inner)*s.at)/this.outer),TileMode.Clamp);
 }
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
 dispose(){this.trash.forEach(v=>v.dispose());this.trash=[];this.drawing?.dispose();this.drawing=undefined}
 private drawing?:ReturnType<typeof createDrawingPath>;private dash:number[]=[];private states:any[]=[];
 private get path(){return this.drawing??=createDrawingPath(Skia)}
 constructor(private c:SkCanvas,width:number,height:number,private face:SkFont,private softwareTerrain=false){this.canvas={width,height}}
 private paint(stroke=false,rounded=false){const color=stroke?this.strokeStyle:this.fillStyle,erase=this.globalCompositeOperation==='destination-out';if(typeof color==='string')return solidPaint(color,this.globalAlpha,stroke,this.lineWidth,erase,this.dash,rounded);const p=this.keep(Skia.Paint());p.setAntiAlias(true);p.setShader(this.keep(color.shader()));p.setAlphaf(p.getAlphaf()*this.globalAlpha);p.setStyle(stroke?PaintStyle.Stroke:PaintStyle.Fill);p.setStrokeWidth(this.lineWidth);p.setBlendMode(erase?BlendMode.DstOut:BlendMode.SrcOver);if(stroke&&this.dash.length)p.setPathEffect(this.keep(Skia.PathEffect.MakeDash(this.dash,0)!));return p}
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
 drawFishingPierSurface(image:SkImage,crop:readonly number[],b:RockBounds,wet:readonly [number,number]){
  const paint=cachedPaint('fishing-pier',[image],[crop,wet],keep=>{
   const artwork=keep(image.makeShaderOptions(TileMode.Clamp,TileMode.Clamp,FilterMode.Linear,MipmapMode.None));
   const shader=keep(fishingPierEffect.makeShaderWithChildren([...crop,...wet],[artwork]));
   const paint=keep(Skia.Paint());paint.setShader(shader);paint.setAntiAlias(true);return paint;
  });
  paint.setAlphaf(this.globalAlpha);
  this.c.save();this.c.translate(b.x,b.y);this.c.scale(b.width,b.height);
  this.c.drawRect({x:0,y:0,width:1,height:1},paint);this.c.restore();
 }
 drawRockSurface(image:SkImage,crop:readonly number[],b:RockBounds,material:RockMaterial,loose:boolean){
  const paint=cachedPaint('rock',[image],[material,crop,loose],keep=>{
   const art=keep(image.makeShaderOptions(TileMode.Clamp,TileMode.Clamp,FilterMode.Linear,MipmapMode.None));
   const shader=keep(rockEffect.makeShaderWithChildren([...crop,...rockGrades[material],loose ? .90 : .53],[art]));
   const paint=keep(Skia.Paint());paint.setShader(shader);return paint;
  });
  paint.setAlphaf(this.globalAlpha);
  this.c.save();this.c.translate(b.x,b.y);this.c.scale(b.width,b.height);
  this.c.drawRect({x:-.06,y:0,width:1.14,height:1.11},paint);
  this.c.restore();
 }
 artworkSilhouette(image:SkImage,crop?:readonly number[]){return silhouettes.outline(image,crop)}
 drawRoadTerrainPatch(image:SkImage,b:{x:number;y:number;width:number;height:number},scale:number,sample=b,core=b){
  const paint=cachedPaint('road',[image],[b,sample,scale],keep=>{
   const matrix=keep(Skia.Matrix().translate(sample.x,sample.y).scale(sample.width/image.width(),sample.height/image.height()));
   const art=keep(image.makeShaderOptions(TileMode.Clamp,TileMode.Clamp,FilterMode.Linear,MipmapMode.None,matrix));
   const shader=keep(roadPilot.makeShaderWithChildren([b.x,b.y,b.width,b.height,scale],[art]));
   const paint=keep(Skia.Paint());paint.setShader(shader);paint.setAntiAlias(false);return paint;
  });paint.setAlphaf(this.globalAlpha);
  this.c.drawRect({x:core.x,y:core.y,width:core.width,height:core.height},paint);
 }
 drawRiverTerrainPatch(image:SkImage,b:{x:number;y:number;width:number;height:number},scale:number,time:number,sourceY:number,batch:RiverBatch,sideFootprint?:SkImage,sidePoints?:readonly (readonly number[])[],core=b,surfaceRipples?:SkImage){
  const started=diagnostics?.tracing?performance.now():undefined;
  const children=riverSamplers(image,b,scale,batch,sideFootprint,surfaceRipples,sidePoints);
  const source=batch.source;
  const shader=this.keep(riverEffect.makeShaderWithChildren([source.x,source.y,source.width,source.height,scale,time,sourceY,batch.topFade,sideFootprint?1:0,surfaceRipples?1:0],children));
  const paint=waterDrawPaint(shader,this.globalAlpha);
  if(started!==undefined)diagnostics!.phase('shaderBuildMs',performance.now()-started);
  try{this.c.drawRect(core,paint)}finally{paint.setShader(null)}
 }
 drawWaterfallPilot(artwork:SkImage,mask:SkImage,frames:SkImage,b:{x:number;y:number;width:number;height:number},time:number){
  const children=waterfallSamplers(artwork,mask,frames);
  const shader=this.keep(waterfallEffect.makeShaderWithChildren([b.x,b.y,b.width,b.height,time],children));
  const paint=waterDrawPaint(shader,this.globalAlpha);
  // Recorded commands snapshot paint state. Drop the reusable paint's shader
  // reference immediately so it cannot pin streamed images between frames.
  try{this.c.drawRect({x:b.x,y:b.y,width:b.width,height:b.height},paint)}finally{paint.setShader(null)}
 }
 drawWaterfallSection(artwork:SkImage,mask:SkImage,frames:SkImage,b:{x:number;y:number;width:number;height:number},time:number,sampling:WaterfallSampling,core=b){
  const children=waterfallSamplers(artwork,mask,frames);
  const [x,y,w,h]=sampling.region,[width,height]=sampling.nativeSize;
  const uniforms=[b.x,b.y,b.width,b.height,time,width,height,x*artwork.width(),y*artwork.height(),w*artwork.width()/width,h*artwork.height()/height,...sampling.direction];
  const shader=this.keep(waterfallSectionEffect.makeShaderWithChildren(uniforms,children));
  const paint=waterDrawPaint(shader,this.globalAlpha);
  try{this.c.drawRect({x:core.x,y:core.y,width:core.width,height:core.height},paint)}finally{paint.setShader(null)}
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
 // Blend terrain contacts directly on the scene surface.
 drawTerrainTile(image:SkImage,t:TerrainView&{fadeTop:number;fadeBottom:number;fadeRight:number;fadeLeft:number;paintTop:number;paintLeft?:number;paintWidth:number;paintHeight:number;texturePhase?:readonly [number,number];maskBounds?:TerrainView;groundMaterials?:{brown:SkImage;clear:SkImage;scale:number}}){
  const dependencies=t.groundMaterials?[image,t.groundMaterials.brown,t.groundMaterials.clear]:[image];
  const {groundMaterials,...geometry}=t;
  const bounds={x:t.x+(t.paintLeft||0),y:t.y+t.paintTop,width:t.paintWidth,height:t.paintHeight};
  const draw=(rect:TerrainView,source:TerrainView,mode=TileMode.Clamp)=>{
   const paint=cachedPaint('ground',dependencies,[geometry,groundMaterials?.scale,source,mode],keep=>{
    const sample=(im:SkImage)=>{
     const matrix=keep(Skia.Matrix().translate(source.x,source.y).scale(source.width/im.width(),source.height/im.height()));
     return keep(im.makeShaderOptions(mode,mode,FilterMode.Linear,MipmapMode.None,matrix));
    };
    let shader=sample(image);
    if(groundMaterials){
     const {brown,clear,scale:s}=groundMaterials;
     const brownMask=keep(Skia.Shader.MakeRadialGradient({x:1800*s,y:1800*s},12000*s,[0,0,.8].map(a=>new Float32Array([1,1,1,a])),[0,.27,1],TileMode.Clamp));
     const woodland=keep(Skia.Shader.MakeBlend(BlendMode.DstIn,sample(brown),brownMask));
     const terrain=keep(Skia.Shader.MakeBlend(BlendMode.SrcOver,shader,woodland));
     shader=keep(groundColour.makeShaderWithChildren([],[terrain,sample(clear),colourSampler(s)]));
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
    const result=keep(Skia.Paint());result.setAntiAlias(false);result.setShader(shader);
    return result;
   });
   paint.setAlphaf(this.globalAlpha);
   this.c.drawRect(rect,paint);
  };
  if(!groundMaterials){draw(bounds,{x:t.x,y:t.y,width:t.width,height:t.height});return}

  const [phaseX,phaseY]=t.texturePhase||[0,0];
  const width=t.width*WORLD_GROUND_TEXTURE_SPAN,height=t.height*WORLD_GROUND_TEXTURE_SPAN;
  const source={x:t.x-phaseX*width,y:t.y-phaseY*height,width,height};
  if(!this.softwareTerrain){draw(bounds,source,TileMode.Repeat);return}

  // Pre-feathered repeats share their painted edges. Draw each source rect
  // with clamped sampling to keep CanvasKit's software path inexpensive.
  const right=bounds.x+bounds.width,bottom=bounds.y+bounds.height;
  for(let y=source.y;y<bottom;y+=height)for(let x=source.x;x<right;x+=width){
   const left=Math.max(x,bounds.x),top=Math.max(y,bounds.y);
   const w=Math.min(right,x+width)-left,h=Math.min(bottom,y+height)-top;
   if(w>0&&h>0)draw({x:left,y:top,width:w,height:h},{x,y,width,height});
  }
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
  // Native saveLayer keeps only a raw pointer to the bounds: pass a Skia rect.
  this.c.saveLayer(paint,Skia.XYWHRect(bounds.x,bounds.y,bounds.width,bounds.height));
  try{draw()}finally{this.c.restore()}
 }
 // Intersect the animated outline with the alpha of the actual foreground
 // draw calls. Transparent branches, open gates and roof cutaways leave gaps.
 drawMaskedSpriteOutline(draw:()=>void,mask:()=>void,bounds:{x:number;y:number;width:number;height:number},alpha:number,width:number){
  const rect=Skia.XYWHRect(bounds.x,bounds.y,bounds.width,bounds.height);
  const intersect=cachedPaint('outline-mask',[],0,keep=>{
   const p=keep(Skia.Paint());p.setBlendMode(BlendMode.DstIn);return p;
  });
  this.c.save();
  try{
   this.c.clipRect(rect,ClipOp.Intersect,false);
   this.c.saveLayer(undefined,rect);
   try{
    this.drawSpriteOutline(draw,bounds,alpha,width);
    this.c.saveLayer(intersect,rect);
    try{mask()}finally{this.c.restore()}
   }finally{this.c.restore()}
  }finally{this.c.restore()}
 }
 drawGroundLightning(strike:GroundStrike|undefined,age:number,reduced:boolean){lightning.draw(this.c,strike,age,reduced)}
 drawPatchScanLight(aperture:{x:number;y:number},angle:number,halfAngle:number,radius:number,reach:number){
  return scanLight.draw(this.c,aperture,angle,halfAngle,radius,reach,this.globalAlpha);
 }
 drawPatchScanPrint(image:SkImage,crop:readonly [number,number,number,number],width:number,height:number){
  scanRelief??=Skia.RuntimeEffect.Make(PATCH_SCAN_RELIEF);
  if(!scanRelief)return false;
  const effect=scanRelief;
  const paint=cachedPaint('patch-track',[image],null,keep=>{
   const art=keep(image.makeShaderOptions(TileMode.Clamp,TileMode.Clamp,FilterMode.Linear,MipmapMode.None));
   const shaded=keep(effect.makeShaderWithChildren([],[art]));
   const paint=keep(Skia.Paint());paint.setShader(shaded);return paint;
  });
  paint.setAlphaf(this.globalAlpha);
  const [x,y,w,h]=crop;
  this.c.save();this.c.translate(-width/2,-height/2);this.c.scale(width/w,height/h);this.c.translate(-x,-y);
  this.c.drawRect({x,y,width:w,height:h},paint);this.c.restore();
  return true;
 }
 drawLootChestLight(x:number,y:number,fx:LootChestFx,front:boolean){chestLight.draw(this.c,x,y,fx,front)}
 drawWeather(state:WeatherState|undefined,view:WeatherView,night:number,shelters:readonly (readonly [number,number][])[]){weather.draw(this.c,state,view,night,shelters)}
 drawNightLighting(lights:CampLight[],amount:number,view:LightViewport,torch?:import('./torch').TorchBeam,warningLights:CampLight[]=[],rescueLight?:CampLight){lighting.draw(this.c,lights,amount,view,torch,warningLights,rescueLight)}
 clearRect(x:number,y:number,w:number,h:number){if(!clearPaint){clearPaint=Skia.Paint();clearPaint.setBlendMode(BlendMode.Clear)}this.c.drawRect({x,y,width:w,height:h},clearPaint)}
 fillRect(x:number,y:number,w:number,h:number){this.c.drawRect({x,y,width:w,height:h},this.paint())}
 strokeRect(x:number,y:number,w:number,h:number){this.c.drawRect({x,y,width:w,height:h},this.paint(true))}
 beginPath(){this.drawing?.reset()}
 moveTo(x:number,y:number){this.path.moveTo(x,y)}lineTo(x:number,y:number){this.path.lineTo(x,y)}closePath(){this.path.close()}
 clip(){this.c.clipPath(this.path.path(),ClipOp.Intersect,true)}
 clipOutsidePath(){this.c.clipPath(this.path.path(),ClipOp.Difference,true)}
 clipOutsideRect(x:number,y:number,width:number,height:number){this.c.clipRect({x,y,width,height},ClipOp.Difference,false)}
 arc(x:number,y:number,r:number,start:number,end:number){this.path.addArc({x:x-r,y:y-r,width:2*r,height:2*r},start*180/Math.PI,(end-start)*180/Math.PI)}
 ellipse(x:number,y:number,rx:number,ry:number){this.path.addOval({x:x-rx,y:y-ry,width:rx*2,height:ry*2})}
 fill(){this.c.drawPath(this.path.path(),this.paint())} stroke(){this.c.drawPath(this.path.path(),this.paint(true))}
 strokeRounded(){this.c.drawPath(this.path.path(),this.paint(true,true))}
 setLineDash(d:number[]){this.dash=d}
 createLinearGradient(x:number,y:number,ex:number,ey:number){return new Gradient(x,y,0,1,{x:ex,y:ey})}
 createRadialGradient(x:number,y:number,r0:number,_x:number,_y:number,r1:number){return new Gradient(x,y,r0,r1)}
 private get textFace(){return dialogueFont&&this.font.endsWith("'Barlow'")?dialogueFont:this.face}
 measureText(s:string){
  const size=Number(this.font.match(/([\d.]+)px/)?.[1]||30);
  const face=this.textFace;face.setSize(size);
  let widths=textWidths.get(face);
  if(!widths)textWidths.set(face,widths=new Map());
  const key=size+'|'+s;let width=widths.get(key);
  if(width===undefined){
   width=face.getGlyphWidths(face.getGlyphIDs(s)).reduce((sum,n)=>sum+n,0);
   if(widths.size>=1024)widths.clear();
   widths.set(key,width);
  }
  return {width};
 }
 private text(s:string,x:number,y:number,stroke:boolean){
  const {width}=this.measureText(s);
  this.c.drawText(s,this.textAlign==='center'?x-width/2:this.textAlign==='right'||this.textAlign==='end'?x-width:x,y,this.paint(stroke),this.textFace);
 }
 fillText(s:string,x:number,y:number){this.text(s,x,y,false)} strokeText(s:string,x:number,y:number){this.text(s,x,y,true)}
 drawImage(source:SkImage|NativeLayer,...args:number[]){const layer=source instanceof NativeLayer,im=layer?source.image():source as SkImage;let sx=0,sy=0,sw:number,sh:number,dx=0,dy=0,dw:number,dh:number;
  // Sprite sheets always pass a source rectangle; only ask native for the size otherwise.
  if(args.length===2){sw=dw=im.width();sh=dh=im.height();[dx,dy]=args}else if(args.length===4){sw=im.width();sh=im.height();[dx,dy,dw,dh]=args}else [sx,sy,sw,sh,dx,dy,dw,dh]=args;
  const p=spritePaint(this.filter==='brightness(2)');p.setAlphaf(this.globalAlpha);
  const src={x:sx,y:sy,width:sw,height:sh},dst={x:dx,y:dy,width:dw,height:dh};
  if(sw>1000&&sh>1000&&dw>sw*1.4)this.c.drawImageRectCubic(im,src,dst,1/3,1/3,p);else this.c.drawImageRectOptions(im,src,dst,FilterMode.Linear,MipmapMode.None,p);if(layer)im.dispose()}
}

return {SkiaContext,NativeLayer,releaseImage,shaderFieldBytes:()=>fieldSize*fieldSize*4+[...flowFields.values()].reduce((sum,f)=>sum+f.bytes,0),warmLighting:lighting.warm,disposeLighting:()=>{waterPaint?.dispose();waterPaint=undefined;for(const key of waterfallSamplerCache.keys())dropWaterfallSampler(key);for(const key of riverSamplerCache.keys())dropRiverSampler(key);for(const key of terrainCache.keys())drop(key);for(const entry of flowFields.values())for(const resource of [...entry.resources].reverse())resource.dispose();flowFields.clear();waterfallEffect.dispose();waterfallSectionEffect.dispose();lighting.dispose();weather.dispose();lightning.dispose();chestLight.dispose();scanLight.dispose();scanRelief?.dispose();for(const shader of colourSamplers.values())shader.dispose();colourSamplers.clear();colourImage.dispose();groundColour.dispose();rockEffect.dispose();roadSection.dispose();roadPilot.dispose();riverEffect.dispose();fishingPierEffect.dispose();for(const meshes of roadMeshes.values())for(const mesh of meshes)mesh?.dispose();roadMeshes.clear();for(const {paint,dash}of solidPaints.values()){paint.dispose();dash?.dispose()}solidPaints.clear();for(const paint of spritePaints.splice(0))paint?.dispose();for(const resource of spriteResources.splice(0))resource.dispose();clearPaint?.dispose();clearPaint=undefined}};
}
