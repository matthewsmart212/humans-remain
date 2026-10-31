// Render the real game path, test branch collision gaps, and measure water
// motion with all waterfall overlays deliberately absent.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'river-features-qa-')),dir='docs/qa/river-features-v4';fs.mkdirSync(dir,{recursive:true});
const original={fetch:globalThis.fetch,window:globalThis.window,type:process.type};
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/skia-web';export * from './src/terrain-renderer';export * from './src/terrain-art';export * from './src/outdoor-terrain';export * from './src/east-approach';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/world-ground';export * from './src/world-road-materials';export * from './src/world-road-pilot';export * from './src/river-art';export * from './src/river-collision';export * from './src/waterfalls';export * from './src/editor-image-sources';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),s=m.EAST_TERRAIN_SCALE;
 assert.equal(m.RIVER_SIDE_FEATURES.length,4);assert.equal(m.RIVER_SECTIONS.length,26);assert.equal(m.WATERFALL_LOCATIONS.length,10);assert(!Object.keys(m.EDITOR_ENTRY_IMAGES).some(k=>k.startsWith('river')));
 const at=(x,y,r=0)=>m.riverWaterBlocked((x-600)*s,(y-600)*s,r*s);
 for(const b of m.RIVER_BRIDGES)for(let t=0;t<=1;t+=.05)assert(!at(b.from[0]+(b.to[0]-b.from[0])*t,b.from[1]+(b.to[1]-b.from[1])*t,18),b.id+' deck must be walkable');
 const nativePoint=(f,p)=>{const b=m.RIVER_BATCHES[f.batch].source;return [b.x+p[0]/f.nativeSize[0]*b.width,b.y+p[1]/f.nativeSize[1]*b.height]};
 const testPoints={'logging-stream':{wet:[220,520],dry:[400,480]},'western-stream':{wet:[1180,780],dry:[1100,650]},'lower-lake':{wet:[1000,585],dry:[1000,950]},'southern-stream':{wet:[1140,350],dry:[820,480]}};
 for(const f of m.RIVER_SIDE_FEATURES){assert(at(...nativePoint(f,testPoints[f.id].wet)),f.id+' water blocks walking');assert(!at(...nativePoint(f,testPoints[f.id].dry),12),f.id+' dry bank or peninsula remains walkable')}
 delete globalThis.CanvasKit;globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;
 globalThis.fetch=async url=>String(url).startsWith('blob:')?original.fetch(url):new Response(fs.readFileSync(path.resolve('public'+String(url))));
 let surface,frame={...m.OUTDOOR_SOURCE_BOUNDS},clock=0,ground=true,reflections=true,preview=false,river=true,batchKeys=new Set();
 const canvas={width:0,height:0,clientWidth:1400,clientHeight:1400,dataset:{}};
 const sources={...m.WORLD_GROUND_MATERIAL_SOURCES,...m.WORLD_ROAD_MATERIAL_SOURCES,...m.ROAD_OVERVIEW_IMAGES,...m.RIVER_DETAIL_IMAGES,...m.RIVER_PREVIEW_IMAGES,...m.RIVER_MOTION_IMAGES,...Object.fromEntries([...m.HOME_TERRAIN_TILES,...m.OUTDOOR_SOURCE_TILES].map(t=>[t.key,t.image]))};
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs)=>{
  ctx.riverTime=clock;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/frame.width/s,canvas.height/frame.height/s);ctx.translate((600-frame.x)*s,(600-frame.y)*s);
  const visible=Object.fromEntries(Object.entries(imgs).filter(([k])=>ground?(river||!k.startsWith('river')):((k==='riverFoam'||batchKeys.has(k)||k.startsWith('riverSideMask'))&&(reflections||k!=='riverFoam')&&(!preview||!Object.hasOwn(m.RIVER_DETAIL_IMAGES,k)))));
  const view={x:(frame.x-600)*s,y:(frame.y-600)*s,width:frame.width*s,height:frame.height*s};
  if(ground)m.drawHomeTerrain(ctx,visible,undefined,0,view);else m.drawRiverTerrain(ctx,visible,view);ctx.restore();
 },{},{sources,streamRoads:false,streamRivers:false});
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));const world=m.createWorld(m.emptyLayout());
 async function render(name){renderer.draw(world);const snapshot=surface.makeImageSnapshot(),bytes=Buffer.from(snapshot.encodeToBytes());snapshot.delete();if(name)await sharp(bytes).webp({quality:94}).toFile(dir+'/'+name+'.webp');return bytes}
 const raw=async b=>sharp(b).ensureAlpha().raw().toBuffer();
 const report=[];
 const selected=process.argv.find(a=>a.startsWith('--feature='))?.slice(10);
 for(const f of m.RIVER_SIDE_FEATURES.filter(f=>!selected||f.id===selected)){
  const source=m.RIVER_BATCHES[f.batch].source,[rx,ry,rw,rh]=f.roi;
  const [x,y]=nativePoint(f,[rx-60,ry-60]);frame={x,y,width:(rw+120)/f.nativeSize[0]*source.width,height:(rh+120)/f.nativeSize[1]*source.height};canvas.clientWidth=850;canvas.clientHeight=Math.round(850*frame.height/frame.width);ground=true;clock=0;await render(f.id);console.log('Rendered '+f.id);
  ground=false;batchKeys=new Set(m.RIVER_SECTIONS.filter(p=>p.batch===f.batch).flatMap(p=>[p.key,p.key+'Preview']));
  // Measure the new pool itself, not just existing main-river water inside the
  // overview frame. Keep conservative brown-bank samples off antialiased edges.
  const motionPoint=nativePoint(f,testPoints[f.id].wet);frame={x:motionPoint[0]-400,y:motionPoint[1]-400,width:800,height:800};canvas.clientWidth=450;canvas.clientHeight=450;
  for(const mode of ['detail','without-atlas','preview']){
   reflections=mode!=='without-atlas';preview=mode==='preview';clock=0;const a=await raw(await render());clock=.75;const b=await raw(await render());let water=0,moving=0,dry=0,dryChanged=0;
   for(let n=0;n<a.length;n+=4){const delta=Math.max(...[0,1,2].map(k=>Math.abs(a[n+k]-b[n+k])));if(a[n+3]>250&&a[n+2]-a[n]>29&&a[n+1]-a[n]>20){water++;if(delta>=4)moving++}if(a[n+3]>250&&(a[n]-a[n+2]>15||a[n]-a[n+1]>15)){dry++;if(delta>1)dryChanged++}}
   console.log({id:f.id,mode,water,moving,percent:+(100*moving/water).toFixed(1),dryChanged});
   assert(water>300,f.id+' visible water');assert(moving/water>.18,f.id+' '+mode+' visibly flowing water');assert.equal(dryChanged,0,f.id+' still banks');report.push({id:f.id,mode,water,moving,dry,dryChanged});
  }
  preview=false;reflections=true;
 }
 ground=true;clock=0;canvas.clientWidth=1400;canvas.clientHeight=1400;frame={...m.OUTDOOR_SOURCE_BOUNDS};await sharp(await render('world-overview')).webp({quality:90}).toFile('public/planning/built-river-features-v4.webp');console.log('World overview rendered');
 frame=m.RIVER_SOURCE;canvas.clientWidth=700;canvas.clientHeight=Math.round(700*frame.height/frame.width);await sharp(await render('entire-river')).webp({quality:92}).toFile('public/planning/river-features-detail.webp');console.log('Entire river rendered');
 frame={x:800,y:800,width:1600,height:1600};canvas.clientWidth=500;canvas.clientHeight=500;const camp=await render();river=false;assert(camp.equals(await render()),'Camp unchanged');river=true;
 renderer.dispose();const result={result:'pass',streams:3,lakes:1,waterfalls:10,bridges:4,campPreserved:true,waterAndDryLandCollision:true,entryAssetsAdded:0,motion:report,browserAndPhone:'Unavailable; actual CanvasKit software rendering used.'};fs.writeFileSync(dir+'/checks.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{globalThis.fetch=original.fetch;globalThis.window=original.window;process.type=original.type;fs.rmSync(temp,{recursive:true,force:true})}
