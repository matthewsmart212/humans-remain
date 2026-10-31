import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'river-qa-')),require=createRequire(import.meta.url),sharp=require('sharp');
const dir='docs/qa/river-logging-v1';fs.mkdirSync(dir,{recursive:true});
const original={fetch:globalThis.fetch,window:globalThis.window,type:process.type};
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/skia-web';export * from './src/terrain-renderer';export * from './src/terrain-art';export * from './src/outdoor-terrain';export * from './src/east-approach';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/world-ground';export * from './src/world-road-materials';export * from './src/world-road-pilot';export * from './src/river-art';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),s=m.EAST_TERRAIN_SCALE;
 delete globalThis.CanvasKit;globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;
 globalThis.fetch=async url=>String(url).startsWith('blob:')?original.fetch(url):new Response(fs.readFileSync(path.resolve('public'+String(url))));
 let surface;let frame={x:-5376,y:-4096,width:2816,height:2816};
 const canvas={width:0,height:0,clientWidth:1408,clientHeight:1408,dataset:{}};
 const sources={...m.RIVER_DETAIL_IMAGES,...m.WORLD_GROUND_MATERIAL_SOURCES,...m.WORLD_ROAD_MATERIAL_SOURCES,...m.ROAD_OVERVIEW_IMAGES,...Object.fromEntries([...m.HOME_TERRAIN_TILES,...m.OUTDOOR_SOURCE_TILES].map(t=>[t.key,t.image]))};
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs)=>{ctx.riverTime=0;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/frame.width/s,canvas.height/frame.height/s);ctx.translate((600-frame.x)*s,(600-frame.y)*s);m.drawHomeTerrain(ctx,imgs,undefined,0,{x:(frame.x-600)*s,y:(frame.y-600)*s,width:frame.width*s,height:frame.height*s});ctx.restore();},{},{sources,streamRoads:false,streamRivers:false});
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 renderer.draw(m.createWorld(m.emptyLayout()));const snapshot=surface.makeImageSnapshot();
 const bytes=Buffer.from(snapshot.encodeToBytes());snapshot.delete();renderer.dispose();
 await sharp(bytes).webp({quality:97}).toFile(dir+'/ground-guide.webp');
 const points=[[716,396],[876,896],[2076,1896],[2226,2416]];
 const d='M '+points.map(p=>p.join(' ')).join(' L ');
 const overlay=Buffer.from(`<svg width="1408" height="1408" viewBox="0 0 2816 2816"><path d="${d}" stroke="#736655" stroke-width="450" fill="none" stroke-linejoin="round"/><circle cx="2226" cy="2416" r="240" fill="#736655"/><path d="${d}" stroke="#357991" stroke-width="260" fill="none" stroke-linejoin="round"/><circle cx="2226" cy="2416" r="190" fill="#357991"/></svg>`);
 await sharp(bytes).composite([{input:overlay}]).webp({quality:97}).toFile(dir+'/river-layout-guide.webp');
 console.log('Rendered river ground and alignment guide');
}finally{globalThis.fetch=original.fetch;globalThis.window=original.window;process.type=original.type;fs.rmSync(temp,{recursive:true,force:true})}
