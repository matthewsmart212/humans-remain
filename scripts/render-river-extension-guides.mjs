// Render the actual ground, roads and installed upstream river as edit references.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp');
const configs=JSON.parse(fs.readFileSync('src/river-extension-layout.json','utf8'));
const selected=process.argv[2]===undefined?configs:configs.slice(Number(process.argv[2]),Number(process.argv[2])+1);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'river-extension-guide-'));
const original={fetch:globalThis.fetch,window:globalThis.window,type:process.type};
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/skia-web';export * from './src/terrain-renderer';export * from './src/terrain-art';export * from './src/outdoor-terrain';export * from './src/east-approach';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/world-ground';export * from './src/world-road-materials';export * from './src/world-road-pilot';export * from './src/river-art';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),s=m.EAST_TERRAIN_SCALE;
 delete globalThis.CanvasKit;globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;
 globalThis.fetch=async url=>String(url).startsWith('blob:')?original.fetch(url):new Response(fs.readFileSync(path.resolve('public'+String(url))));
 let surface,frame=selected[0].source;
 const canvas={width:0,height:0,clientWidth:2048,clientHeight:1820,dataset:{}};
 const sources={...m.RIVER_DETAIL_IMAGES,...m.WORLD_GROUND_MATERIAL_SOURCES,...m.WORLD_ROAD_MATERIAL_SOURCES,...m.ROAD_OVERVIEW_IMAGES,...Object.fromEntries([...m.HOME_TERRAIN_TILES,...m.OUTDOOR_SOURCE_TILES].map(t=>[t.key,t.image]))};
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs)=>{
  ctx.riverTime=0;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/frame.width/s,canvas.height/frame.height/s);ctx.translate((600-frame.x)*s,(600-frame.y)*s);
  m.drawHomeTerrain(ctx,imgs,undefined,0,{x:(frame.x-600)*s,y:(frame.y-600)*s,width:frame.width*s,height:frame.height*s});ctx.restore();
 },{},{sources,streamRoads:false,streamRivers:false});
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 const world=m.createWorld(m.emptyLayout());
 for(const config of selected){
  frame=config.source;canvas.clientHeight=Math.round(2048*frame.height/frame.width);
  const dir='docs/qa/'+config.id;fs.mkdirSync(dir,{recursive:true});
  renderer.draw(world);const snapshot=surface.makeImageSnapshot(),bytes=Buffer.from(snapshot.encodeToBytes());snapshot.delete();
  await sharp(bytes).webp({quality:97}).toFile(dir+'/ground-guide.webp');
  const xy=p=>[p[0]-frame.x,p[1]-frame.y],d='M '+config.points.map(p=>xy(p).join(' ')).join(' L ');
  const bridges=config.bridges.map(b=>`<path d="M ${xy(b.from).join(' ')} L ${xy(b.to).join(' ')}" stroke="#a99376" stroke-width="${b.width}" fill="none"/>`).join('');
  const overlay=Buffer.from(`<svg width="2048" height="${canvas.clientHeight}" viewBox="0 0 ${frame.width} ${frame.height}"><path d="${d}" stroke="#736655" stroke-width="500" fill="none" stroke-linejoin="round"/><path d="${d}" stroke="#357991" stroke-width="280" fill="none" stroke-linejoin="round"/>${bridges}</svg>`);
  await sharp(bytes).composite([{input:overlay}]).webp({quality:97}).toFile(dir+'/river-layout-guide.webp');
  console.log(dir);
 }
 renderer.dispose();
}finally{globalThis.fetch=original.fetch;globalThis.window=original.window;process.type=original.type;fs.rmSync(temp,{recursive:true,force:true})}
