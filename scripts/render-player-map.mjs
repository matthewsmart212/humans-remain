// Reproducible navigation ground, rendered by the actual production Skia pass.
// Deliberately excludes planning-only rivers/districts and mutable placements.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'player-map-render-'));
const original={fetch:globalThis.fetch,window:globalThis.window,type:process.type,devicePixelRatio:globalThis.devicePixelRatio};
let renderer;
try{
 await build({stdin:{contents:"export * from './src/skia-web';export * from './src/terrain-renderer';export * from './src/terrain-art';export * from './src/outdoor-terrain';export * from './src/east-approach';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/world-ground';export * from './src/world-road-materials';export * from './src/world-road-pilot';export * from './src/river-art';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error'});
 const m=require(path.join(temp,'model.cjs')),frame=m.OUTDOOR_SOURCE_BOUNDS,s=m.EAST_TERRAIN_SCALE;
 delete globalThis.CanvasKit;globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;
 const loaded=new Set();
 globalThis.fetch=async url=>{
  if(String(url).startsWith('blob:'))return original.fetch(url);
  const file=path.resolve('public'+String(url));loaded.add(String(url));
  if(!fs.existsSync(file))throw Error('Missing map source '+url);
  return new Response(fs.readFileSync(file));
 };
 const width=2048,height=Math.round(width*frame.height/frame.width);
 const canvas={width:0,height:0,clientWidth:width,clientHeight:height,dataset:{}};
 const sources={homeGround:m.HOME_TERRAIN.image,...m.WORLD_GROUND_MATERIAL_SOURCES,...m.WORLD_ROAD_MATERIAL_SOURCES,...m.ROAD_OVERVIEW_IMAGES,...m.RIVER_PREVIEW_IMAGES,
  ...Object.fromEntries(m.RIVER_SIDE_FEATURES.map(p=>[p.maskKey,p.maskPath])),
  ...Object.fromEntries(m.OUTDOOR_SOURCE_TILES.map(t=>[t.key,t.image]))};
 let surface;
 renderer=await m.createWebWorld(canvas,(ctx,_atlas,imgs)=>{
  // The production wrapper normally attaches view streaming; this static
  // export already loaded every required overview texture above.
  ctx.requestCampArtwork=undefined;ctx.riverTime=0;
  ctx.fillStyle=m.HOME_TERRAIN.outsideColor;ctx.fillRect(0,0,width,height);
  ctx.save();ctx.scale(width/frame.width/s,height/frame.height/s);ctx.translate((600-frame.x)*s,(600-frame.y)*s);
  m.drawHomeTerrain(ctx,imgs,undefined,0,{x:(frame.x-600)*s,y:(frame.y-600)*s,width:frame.width*s,height:frame.height*s});ctx.restore();
 },{},{sources,streamRoads:false,streamRivers:false});
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 renderer.draw(m.createWorld(m.emptyLayout()));
 const shot=surface.makeImageSnapshot();
 fs.mkdirSync('public/maps',{recursive:true});
 await sharp(Buffer.from(shot.encodeToBytes())).webp({quality:87,effort:6}).toFile('public/maps/world-terrain.webp');shot.delete();
 const report={version:1,renderer:'Production drawHomeTerrain / CanvasKit',image:'/maps/world-terrain.webp',pixels:{width,height},sourceBounds:frame,
  worldBounds:{x:(frame.x-600)*s,y:(frame.y-600)*s,width:frame.width*s,height:frame.height*s},sourceOriginOffset:600,sourceScale:s,
  terrainTiles:m.OUTDOOR_SOURCE_TILES.length,roadPatches:m.ROAD_TERRAIN_PATCHES.length,riverSections:m.RIVER_SECTIONS.length,sideFeatures:m.RIVER_SIDE_FEATURES.length,
  sourceFiles:loaded.size,bytes:fs.statSync('public/maps/world-terrain.webp').size,placements:'Live per-layout overlay; not baked into ground'};
 fs.writeFileSync('public/maps/world-terrain.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{
 renderer?.dispose();globalThis.fetch=original.fetch;globalThis.window=original.window;process.type=original.type;globalThis.devicePixelRatio=original.devicePixelRatio;
 fs.rmSync(temp,{recursive:true,force:true});
}
