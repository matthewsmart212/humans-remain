import {EARTH_SHOULDER_SKSL} from './world-ground-colour';
import sections from './river-sections.json';
import loggingSections from './river-logging-sections.json';
import extensionSections from './river-extension-sections.json';
import bridges from './river-bridges.json';
import {RIVER_BATCHES,RIVER_SIDE_FEATURES,type RiverBatch} from './river-layout';
export {RIVER_SOURCE,RIVER_HEADWATERS_SOURCE,RIVER_LOGGING_SOURCE,RIVER_BATCHES,RIVER_SIDE_FEATURES} from './river-layout';
import {EAST_TERRAIN_SCALE} from './east-approach';
import {terrainIntersects,type TerrainView} from './outdoor-terrain';
import {WATERFALL_IMAGES,WATERFALL_PILOT} from './waterfall-pilot';
import {WATERFALL_SECTIONS,WATERFALL_SECTION_IMAGES,type WaterfallSampling} from './waterfalls';
import {RIVER_DETAIL_PATCHES,RIVER_DETAIL_BY_BATCH,RIVER_DETAIL_CHUNK_IMAGES,RIVER_MEDIUM_IMAGES,RIVER_HIGH_PREVIEW_IMAGES} from './river-detail';
import {RIVER_SURFACE_FLOW} from './river-surface-flow';
import {STILLWATER_LAKE_PAINT_SKSL,STILLWATER_LAKE_WATER_SKSL} from './stillwater-lake-art';
export {RIVER_SURFACE_FLOW} from './river-surface-flow';

export const RIVER_SECTIONS=[...sections.map(p=>({...p,batch:0})),...(loggingSections as typeof sections).map(p=>({...p,batch:1})),...(extensionSections as (typeof sections[number]&{batch:number})[])];
export const RIVER_DETAIL_IMAGES:Record<string,string>={...RIVER_MEDIUM_IMAGES,...RIVER_DETAIL_CHUNK_IMAGES};
export const RIVER_PREVIEW_IMAGES:Record<string,string>={...RIVER_HIGH_PREVIEW_IMAGES};
export const RIVER_MOTION_IMAGES={riverSurfaceRipples:RIVER_SURFACE_FLOW.image,...WATERFALL_IMAGES,...WATERFALL_SECTION_IMAGES,...Object.fromEntries(RIVER_SIDE_FEATURES.map(p=>[p.maskKey,p.maskPath]))};

// The walkable span is narrower than the painted railings, posts and stone
// abutments. Keep those dry, including where two river paintings overlap.
const bridgeDeckMasks=bridges.map(({from,to,width})=>
 `deck=max(deck,bridgeMask(source,float2(${from}),float2(${to}),${width}));`
).join('\n');
const stillwaterSource=RIVER_BATCHES[RIVER_SIDE_FEATURES.find(feature=>feature.id==='lower-lake')!.batch].source;

// Each batch is cropped from one continuous painting. A common source origin and
// clock preserve the approved animation across both tile and batch joins.
export const RIVER_SHADER=`
${EARTH_SHOULDER_SKSL}
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
float bridgeMask(float2 source,float2 a,float2 b,float width){
 float radius=width+20.;
 if(source.y<min(a.y,b.y)-radius-30.||source.y>max(a.y,b.y)+radius+30.)return 0.;
 float2 span=b-a;
 float along=clamp(dot(source-a,span)/max(dot(span,span),1.),0.,1.);
 return 1.-smoothstep(radius,radius+30.,length(source-a-along*span));
}
float onPaintedBridge(float2 source){
 float deck=0.;
 ${bridgeDeckMasks}
 return deck;
}
// Damp stone is darker at the waterline. Sample the painted water itself so
// this follows individual boulders, islands and the banks of narrow streams.
// The radius fits inside even the smallest high-detail tile's sample margin.
half3 riverbankColour(float2 p,half4 base,float dryBank){
 if(dryBank<=0.)return base.rgb;
 float radius=5.*scale;
 float nearby=(waterAmount(artwork.eval(p+float2(0.,-radius)))+
               waterAmount(artwork.eval(p+float2(.866,.5)*radius))+
               waterAmount(artwork.eval(p+float2(-.866,.5)*radius)))/3.;
 float wet=dryBank*smoothstep(.04,.62,nearby);
 return base.rgb*half3(mix(float3(1.),float3(.69,.80,.86),wet));
}
// Two phases of the same moving pattern crossfade while their individual
// offsets reset. Coordinates stay anchored to the whole river at every LOD.
float rippleAt(float2 uv,float2 velocity,float phase){
 float next=fract(phase+.5);
 float a=surfaceRipples.eval(uv-velocity*phase).a;
 float b=surfaceRipples.eval(uv-velocity*next).a;
 return mix(a,b,abs(phase*2.-1.));
}
${STILLWATER_LAKE_PAINT_SKSL}
${STILLWATER_LAKE_WATER_SKSL}
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
 float lakeBatch=abs(master.x-(${stillwaterSource.x}.))<.5&&abs(master.y-(${stillwaterSource.y}.))<.5?1.:0.;
 float calmLake=lakeBatch*smoothstep(.01,.60,side);
 float repaintedLake=lakeBatch*stillwaterPaintAmount(source);
 float lakeWater=lakeBatch*stillwaterWaterAmount(source);
 float dryBank=(1.-water)*(1.-onPaintedBridge(source));
 half3 surfaceColour=riverbankColour(p,base,dryBank);
 if(water>0.){
  // Keep the submerged stone and sand visible through the shallows. Give
  // the deeper blue channels a little of the surrounding woodland green.
  float depth=1.-smoothstep(.25,.65,float(base.g));
  half3 tint=half3(base.g*.13,base.b*.12+base.g*.03,base.g*.16);
  half3 waterColour=mix(base.rgb,base.rgb*half3(.83,.88,.73)+tint,.58+.32*depth);
  // Stillwater's sheltered fishing shore has subdued woodland-green water.
  // Keep painted shallows visible while softening the broad baked highlights.
  half3 lakeColour=half3(.07,.18,.17)+waterColour*half3(.35,.30,.22);
  waterColour=mix(waterColour,lakeColour,calmLake*.92);
  // The registered repaint already supplies its emerald depth and sandy
  // shallows. Preserve that material instead of tinting it as old blue water.
  waterColour=mix(waterColour,base.rgb,repaintedLake);
  // Carry the old painting's reflected light through the material transition.
  // The registered repaint already contains this woodland palette, so its
  // own colour remains exact instead of receiving a second darkening pass.
  waterColour=mix(waterColour,stillwaterWaterColour(base.rgb),lakeWater*(1.-repaintedLake));
  surfaceColour=mix(surfaceColour,waterColour,water);
  if(hasSurface>0.){
   float2 velocity=float2(flow.rg)*2.-1.;
   if(side>.01){
    half4 branch=branchField.eval(p);
    velocity=mix(velocity,float2(branch.rg)*2.-1.,side*float(branch.b));
   }
   float speed=length(velocity);
   float lakeMotion=max(repaintedLake,lakeWater);
   velocity*=mix(1.,.46,lakeMotion);
   float phase=fract(clock*.12);
   float crest=rippleAt(q*mix(float2(.86,1.16),float2(.30,.43),lakeMotion),velocity*float2(181.,244.),phase);
   // A wider swell moves beneath the short crests. Vary their strength
   // together so the glints gather in short runs instead of a uniform shimmer.
   float2 broadUv=q*mix(float2(.46,.57),float2(.16,.21),lakeMotion)+float2(71.,137.);
   float swell=rippleAt(broadUv,velocity*float2(62.,77.),fract(phase+.29));
   float sheen=sqrt(crest)*(.15+.19*speed)+sqrt(swell)*.10;
   surfaceColour+=water*(half3(.47,.70,.65)*sheen+half3(.32,.30,.21)*smoothstep(.28,.72,crest)*(.18+.22*swell))*mix(mix(1.,.23,calmLake),.11,lakeMotion);
  }
 }
 // The old river paintings carry saturated ochre gravel into their margins.
 // Reveal some local ground through it while keeping the pale stone faces.
 float ochre=(base.r-base.b)/max(float(base.r),.001);
 float gravel=smoothstep(.54,.88,ochre)*smoothstep(.06,.26,float(base.r-base.g));
 half4 bank=blendEarthShoulder(half4(clamp(surfaceColour,half3(0.),half3(1.)),base.a));
 return bank*(outer*join*(1.-.40*gravel*dryBank));
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
