// Focused production-renderer views for the regional colour pass.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const dir='docs/qa/world-ground-v3',temp=fs.mkdtempSync(path.join(os.tmpdir(),'ground-colour-')),require=createRequire(import.meta.url),sharp=require('sharp');fs.mkdirSync(dir,{recursive:true});
const oldFetch=globalThis.fetch,oldWindow=globalThis.window,oldType=process.type;
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/skia-web';export * from './src/east-approach';export * from './src/outdoor-terrain';export * from './src/world-layout';export * from './src/survival-engine';export * from './src/placed-world-renderer';export * from './src/editor-image-sources';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),s=m.EAST_TERRAIN_SCALE;
 delete globalThis.CanvasKit;globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;
 globalThis.fetch=async url=>String(url).startsWith('blob:')?oldFetch(url):new Response(fs.readFileSync(path.resolve('public'+String(url))));
 let surface;const canvas={width:0,height:0,clientWidth:844,clientHeight:390,dataset:{}},view={x:0,y:0,zoom:1,follow:true,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true},world=m.createWorld(m.emptyLayout());world.editorPreview=true;world.outdoorReady=new Set(m.OUTDOOR_TILES.map(t=>t.key));
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs,w)=>m.drawWorldEditor(ctx,atlas,imgs,w,view,0),{...m.editorTerrainDetail(),...Object.fromEntries(m.OUTDOOR_SOURCE_TILES.map(t=>[t.key,t.image]))},{sources:m.EDITOR_IMAGE_SOURCES});
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 const captures=[];const shot=async(name,x,y,detail=false)=>{
  Object.assign(world.player,{x:(x-600)*s,y:(y-600)*s});view.zoom=detail?1/(s*Math.max(canvas.clientWidth/1800,canvas.clientHeight/900)):1;
  renderer.draw(world);const image=surface.makeImageSnapshot(),bytes=Buffer.from(image.encodeToBytes());image.delete();
  await sharp(bytes).webp({quality:95}).toFile(path.join(dir,name+'.webp'));
  const {channels}=await sharp(bytes).stats();captures.push({name,sourcePosition:[x,y],size:[canvas.clientWidth,canvas.clientHeight],meanRGB:channels.slice(0,3).map(c=>+c.mean.toFixed(2))});
 };
 for(const row of [['camp',2422,2269],['logging-brown',-5300,-2500],['village-earth',4300,-2100],['factory-brown',10000,-2300],['waterworks-earth',-3900,8000],['scrapyard-brown',8100,8400],['southern-meadow-earth',2200,11200],['western-transition',-1500,3200],['southern-transition',2000,6500],['four-square-contact',-2150,3800]])await shot(...row);
 await shot('meadow-detail',2200,11200,true);await shot('brown-detail',-5300,-2500,true);await shot('camp-edge-detail',200,2750,true);
 canvas.clientWidth=390;canvas.clientHeight=844;await shot('meadow-portrait',2200,11200);world.nightAmount=1;world.phase='night';await shot('meadow-night',2200,11200);
 const mean=name=>captures.find(c=>c.name===name).meanRGB;
 for(const name of ['southern-meadow-earth','waterworks-earth','village-earth','logging-brown','factory-brown'])assert(mean(name)[0]>mean(name)[1]*1.15,`${name} must read earthy, without a green tint`);

 assert(mean('camp')[0]>mean('camp')[1]*1.2,'Camp must retain warm earth');
 assert(mean('logging-brown')[0]<mean('camp')[0]*0.8,'Woodland must be visibly deeper brown');
 renderer.dispose();const result={result:'pass',renderer:'Production CanvasKit software surface',captures,checks:['Clear soil and rocky ground rendered in each district','Former green areas now read as earth','Deeper brown woodland','Camp-edge and four-square contacts rendered','Portrait and night views rendered'],limitations:'No browser automation or physical iPhone performance test.'};fs.writeFileSync(path.join(dir,'render-checks.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{globalThis.fetch=oldFetch;globalThis.window=oldWindow;process.type=oldType;fs.rmSync(temp,{recursive:true,force:true})}
