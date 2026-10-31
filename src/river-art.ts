import sections from './river-sections.json';
import loggingSections from './river-logging-sections.json';
import extensionSections from './river-extension-sections.json';
import {RIVER_BATCHES,RIVER_SIDE_FEATURES,type RiverBatch} from './river-layout';
export {RIVER_SOURCE,RIVER_HEADWATERS_SOURCE,RIVER_LOGGING_SOURCE,RIVER_BATCHES,RIVER_SIDE_FEATURES} from './river-layout';
import {EAST_TERRAIN_SCALE} from './east-approach';
import {terrainIntersects,type TerrainView} from './outdoor-terrain';
import {WATERFALL_IMAGES,WATERFALL_PILOT} from './waterfall-pilot';
import {WATERFALL_SECTIONS,WATERFALL_SECTION_IMAGES,type WaterfallSampling} from './waterfalls';
import {RIVER_DETAIL_PATCHES,RIVER_DETAIL_BY_BATCH,RIVER_DETAIL_CHUNK_IMAGES,RIVER_MEDIUM_IMAGES,RIVER_HIGH_PREVIEW_IMAGES} from './river-detail';
import {RIVER_SURFACE_FLOW} from './river-surface-flow';
export {RIVER_SURFACE_FLOW} from './river-surface-flow';

export const RIVER_SECTIONS=[...sections.map(p=>({...p,batch:0})),...(loggingSections as typeof sections).map(p=>({...p,batch:1})),...(extensionSections as (typeof sections[number]&{batch:number})[])];
export const RIVER_DETAIL_IMAGES:Record<string,string>={...RIVER_MEDIUM_IMAGES,...RIVER_DETAIL_CHUNK_IMAGES};
export const RIVER_PREVIEW_IMAGES:Record<string,string>={...RIVER_HIGH_PREVIEW_IMAGES};
export const RIVER_MOTION_IMAGES={riverSurfaceRipples:RIVER_SURFACE_FLOW.image,...WATERFALL_IMAGES,...WATERFALL_SECTION_IMAGES,...Object.fromEntries(RIVER_SIDE_FEATURES.map(p=>[p.maskKey,p.maskPath]))};

// Each batch is cropped from one continuous painting. A common source origin and
// clock preserve the approved animation across both tile and batch joins.
export const RIVER_SHADER=`
uniform shader artwork;
uniform shader sideFootprint;
uniform shader surfaceRipples;
uniform shader flowField;
uniform shader branchField;
uniform float4 master;
uniform float scale;
uniform float clock;
uniform float sourceY;
uniform float topFade;
uniform float hasSideFeature;
uniform float hasSurface;
float waterAmount(half4 colour){
 return smoothstep(.025,.11,colour.b-colour.r)*smoothstep(.015,.075,colour.g-colour.r);
}
half4 main(float2 p){
 float2 source=p/scale+float2(600.);
 float2 q=source-float2(-6256.,-6200.);
 float2 local=source-master.xy;
 float outer=smoothstep(0.,96.,min(min(local.x,master.z-local.x),master.w-local.y));
 float join=sourceY>0.?smoothstep(0.,128.,local.y-sourceY):1.;
 if(topFade>0.)outer*=smoothstep(0.,topFade,local.y);
 if(outer<=0.||join<=0.)return half4(0.);
 half4 flow=flowField.eval(p);
 float side=hasSideFeature>0.?sideFootprint.eval(p).r:0.;
 outer*=max(float(flow.b),side);
 if(outer<=0.)return half4(0.);
 half4 base=artwork.eval(p);
 float water=waterAmount(base);
 half3 surfaceColour=base.rgb;
 if(hasSurface>0.&&water>0.){
  float2 direction=float2(flow.rg)*2.-1.;
  if(side>.01){half4 branch=branchField.eval(p);direction=mix(direction,float2(branch.rg)*2.-1.,side*float(branch.b));}
  float travel=fract(clock*.12),next=fract(travel+.5);
  half4 a=surfaceRipples.eval((q-direction*travel*160.)*float2(.96,1.2));
  half4 b=surfaceRipples.eval((q-direction*next*160.)*float2(.96,1.2));
  half4 light=mix(a,b,abs(travel*2.-1.));
  float highlight=sqrt(max(float(light.a),0.));
  surfaceColour+=half3(.34,.66,.72)*(highlight*water*.32);
 }
 return half4(clamp(surfaceColour,half3(0.),half3(1.)),base.a)*(outer*join);
}`;

type RiverContext=CanvasRenderingContext2D&{
 riverTime?:number;
 requestRiverArtwork?:(v:TerrainView)=>void;
 drawRiverTerrainPatch?:(image:HTMLImageElement,b:TerrainView,scale:number,time:number,sourceY:number,batch:RiverBatch,sideFootprint?:HTMLImageElement,sidePoints?:readonly (readonly number[])[],core?:TerrainView,surfaceRipples?:HTMLImageElement)=>void;
 drawWaterfallSection?:(artwork:HTMLImageElement,mask:HTMLImageElement,frames:HTMLImageElement,b:TerrainView,time:number,sampling:WaterfallSampling,core?:TerrainView)=>void;
 drawWaterfallPilot?:(artwork:HTMLImageElement,mask:HTMLImageElement,frames:HTMLImageElement,b:TerrainView,time:number)=>void;
};
function detailedWaterfall(target:RiverContext,imgs:Record<string,HTMLImageElement>,batch:number,artwork:HTMLImageElement,mask:HTMLImageElement,frames:HTMLImageElement,b:TerrainView,time:number,sampling:WaterfallSampling){
 const s=EAST_TERRAIN_SCALE,patches=(RIVER_DETAIL_BY_BATCH.get(batch)||[]).filter(p=>terrainIntersects({x:(p.x-600)*s,y:(p.y-600)*s,width:p.width*s,height:p.height*s},b));
 if(!patches.some(p=>!!imgs[p.key])){target.drawWaterfallSection?.(artwork,mask,frames,b,time,sampling);return}
 for(const p of patches){
  const x=Math.max(b.x,(p.x-600)*s),y=Math.max(b.y,(p.y-600)*s),core={x,y,width:Math.min(b.x+b.width,(p.x+p.width-600)*s)-x,height:Math.min(b.y+b.height,(p.y+p.height-600)*s)-y};
  if(core.width<=0||core.height<=0)continue;
  const high=imgs[p.key],sample={x:(p.sample.x-600)*s,y:(p.sample.y-600)*s,width:p.sample.width*s,height:p.sample.height*s};
  const region=[(b.x-sample.x)/sample.width,(b.y-sample.y)/sample.height,b.width/sample.width,b.height/sample.height];
  target.drawWaterfallSection?.(high||artwork,mask,frames,b,time,high?{...sampling,region}:sampling,core);
 }
}
export function drawRiverTerrain(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,view?:TerrainView){
 const target=ctx as RiverContext,s=EAST_TERRAIN_SCALE;
 if(view)target.requestRiverArtwork?.(view);
 const time=target.riverTime??performance.now()/1000;
 for(const p of RIVER_SECTIONS){
  const image=imgs[p.key]||imgs[p.key+'Preview'];if(!image)continue;
  const b={x:(p.x-600)*s,y:(p.y-600)*s,width:p.width*s,height:p.height*s};
  if(view&&!terrainIntersects(b,view))continue;
  const feature=RIVER_SIDE_FEATURES.find(f=>f.batch===p.batch);
  const detail=RIVER_DETAIL_BY_BATCH.get(p.batch)||[];
  if(!detail.some(t=>!!imgs[t.key])){target.drawRiverTerrainPatch?.(image,b,s,time,p.sourceY,RIVER_BATCHES[p.batch],feature?imgs[feature.maskKey]:undefined,feature?.points,undefined,imgs.riverSurfaceRipples);continue}
  for(const t of detail){
   const core={x:Math.max(b.x,(t.x-600)*s),y:Math.max(b.y,(t.y-600)*s),width:0,height:0};
   core.width=Math.min(b.x+b.width,(t.x+t.width-600)*s)-core.x;core.height=Math.min(b.y+b.height,(t.y+t.height-600)*s)-core.y;
   if(core.width<=0||core.height<=0||view&&!terrainIntersects(core,view))continue;
   const high=imgs[t.key],sample=high?{x:(t.sample.x-600)*s,y:(t.sample.y-600)*s,width:t.sample.width*s,height:t.sample.height*s}:b;
   target.drawRiverTerrainPatch?.(high||image,sample,s,time,p.sourceY,RIVER_BATCHES[p.batch],feature?imgs[feature.maskKey]:undefined,feature?.points,core,imgs.riverSurfaceRipples);
  }
 }
 for(const p of WATERFALL_SECTIONS){
  const b={x:(p.x-600)*s,y:(p.y-600)*s,width:p.width*s,height:p.height*s};
  if(view&&!terrainIntersects(b,view))continue;
  // A reference at the batch join must also wait for its surrounding river.
  if(!imgs[p.tile]&&!imgs[p.tile+'Preview'])continue;
  const artwork=imgs[p.artworkKey]||imgs[p.artworkKey+'Preview'],mask=imgs[p.maskKey],frames=imgs.riverWaterfallFrames;
  if(artwork&&mask&&frames)detailedWaterfall(target,imgs,p.batch,artwork,mask,frames,b,time+p.phase,p.sampling);
 }
 const p=WATERFALL_PILOT,b={x:(p.x-600)*s,y:(p.y-600)*s,width:p.width*s,height:p.height*s};
 if((!view||terrainIntersects(b,view))&&imgs.riverWaterfallArtwork&&imgs.riverWaterfallMask&&imgs.riverWaterfallFrames){
  if(RIVER_DETAIL_PATCHES.some(p=>p.batch===0&&!!imgs[p.key]))detailedWaterfall(target,imgs,0,imgs.riverWaterfallArtwork,imgs.riverWaterfallMask,imgs.riverWaterfallFrames,b,time,{nativeSize:[280,260],region:[0,0,1,1],direction:[0,1]});
  else target.drawWaterfallPilot?.(imgs.riverWaterfallArtwork,imgs.riverWaterfallMask,imgs.riverWaterfallFrames,b,time);
 }
}
