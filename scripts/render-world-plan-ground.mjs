// Small plan-only overview rendered by the actual terrain shader. The game
// continues to stream its original detail textures; this does not replace them.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'plan-ground-')),require=createRequire(import.meta.url),sharp=require('sharp');
const oldFetch=globalThis.fetch,oldWindow=globalThis.window,oldType=process.type;
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/skia-web';export * from './src/terrain-renderer';export * from './src/terrain-art';export * from './src/outdoor-terrain';export * from './src/east-approach';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/world-ground';export * from './src/world-road-materials';export * from './src/world-road-pilot';export * from './src/river-art';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs'));
 delete globalThis.CanvasKit;globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;
 globalThis.fetch=async url=>String(url).startsWith('blob:')?oldFetch(url):new Response(fs.readFileSync(path.resolve('public'+String(url))));
 let surface;const width=1726,height=Math.round(width*m.OUTDOOR_SOURCE_BOUNDS.height/m.OUTDOOR_SOURCE_BOUNDS.width),canvas={width:0,height:0,clientWidth:width,clientHeight:height,dataset:{}},scale=width/m.OUTDOOR_SOURCE_BOUNDS.width;
 const sources={...m.ROAD_OVERVIEW_IMAGES,...m.RIVER_PREVIEW_IMAGES,...m.WORLD_GROUND_MATERIAL_SOURCES,...m.WORLD_ROAD_MATERIAL_SOURCES,...Object.fromEntries([...m.HOME_TERRAIN_TILES,...m.OUTDOOR_SOURCE_TILES].map(t=>[t.key,t.image]))};
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs)=>{ctx.clearRect(0,0,width,height);ctx.save();ctx.scale(scale/m.EAST_TERRAIN_SCALE,scale/m.EAST_TERRAIN_SCALE);ctx.translate((600-m.OUTDOOR_SOURCE_BOUNDS.x)*m.EAST_TERRAIN_SCALE,(600-m.OUTDOOR_SOURCE_BOUNDS.y)*m.EAST_TERRAIN_SCALE);ctx.riverTime=0;m.drawHomeTerrain(ctx,imgs);ctx.restore();},{},{sources,streamRoads:false,streamRivers:false});
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 renderer.draw(m.createWorld(m.emptyLayout()));const snapshot=surface.makeImageSnapshot();fs.mkdirSync('public/planning',{recursive:true});
 await sharp(Buffer.from(snapshot.encodeToBytes())).webp({quality:86,effort:6}).toFile('public/planning/built-river-logging-v1.webp');snapshot.delete();renderer.dispose();
 await sharp('artwork-archive/world-guide/world-overview.jpeg').webp({quality:83,effort:6}).toFile('public/planning/world-guide.webp');
 console.log('Rendered the current '+m.OUTDOOR_SOURCE_TILES.length+'-piece ground overview with registered western origin for the planning page.');
}finally{globalThis.fetch=oldFetch;globalThis.window=oldWindow;process.type=oldType;fs.rmSync(temp,{recursive:true,force:true})}
