// Exercise the real river shader with every waterfall overlay absent. This
// catches a visually frozen calm river even when the falls still animate.
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'river-surface-')),dir='docs/qa/river-surface-v3';fs.mkdirSync(dir,{recursive:true});
const original={fetch:globalThis.fetch,window:globalThis.window,type:process.type};
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/skia-web';export * from './src/river-art';export * from './src/east-approach';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/waterfalls';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),s=m.EAST_TERRAIN_SCALE;
 assert.equal(m.WATERFALL_LOCATIONS.length,10,'The reduction in waterfalls must remain');
 delete globalThis.CanvasKit;globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;
 globalThis.fetch=async url=>String(url).startsWith('blob:')?original.fetch(url):new Response(fs.readFileSync(path.resolve('public'+String(url))));
 let surface,clock=0,frame,reflections=true,preview=false,batchKeys=new Set();
 const canvas={width:0,height:0,clientWidth:450,clientHeight:450,dataset:{}};
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs)=>{
  ctx.riverTime=clock;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/frame.width/s,canvas.height/frame.height/s);ctx.translate((600-frame.x)*s,(600-frame.y)*s);
  // Isolate each painting so a translucent batch join cannot classify moving
  // water behind another painting's bank as movement of that dry bank itself.
  const visible=Object.fromEntries(Object.entries(imgs).filter(([key])=>(key==='riverFoam'||batchKeys.has(key))&&(reflections||key!=='riverFoam')&&(!preview||!Object.hasOwn(m.RIVER_DETAIL_IMAGES,key))));
  m.drawRiverTerrain(ctx,visible,{x:(frame.x-600)*s,y:(frame.y-600)*s,width:frame.width*s,height:frame.height*s});ctx.restore();
 },{},{sources:{...m.RIVER_DETAIL_IMAGES,...m.RIVER_PREVIEW_IMAGES,riverFoam:m.RIVER_MOTION_IMAGES.riverFoam},streamRoads:false,streamRivers:false});
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 const world=m.createWorld(m.emptyLayout());
 const render=()=>{renderer.draw(world);const image=surface.makeImageSnapshot(),bytes=Buffer.from(image.encodeToBytes());image.delete();return bytes};
 const raw=async b=>sharp(b).ensureAlpha().raw().toBuffer();
 const blue=(r,g,b)=>b-r>29&&g-r>20;
 const balance=JSON.parse(fs.readFileSync('src/river-flow-balance.json','utf8'));
 const definitions=[...JSON.parse(fs.readFileSync('src/waterfall-sections.json','utf8')),...JSON.parse(fs.readFileSync('src/river-extension-waterfalls.json','utf8'))];
 const names=['headwaters','logging','western','waterworks','lower','southern'];
 const report=[];let previewFrames=[];
 for(let batch=0;batch<6;batch++){
  batchKeys=new Set(m.RIVER_SECTIONS.filter(p=>p.batch===batch).flatMap(p=>[p.key,p.key+'Preview']));
  const source=m.RIVER_BATCHES[batch].source;
  const {data,info}=await sharp(`artwork-archive/river-calm-v2/${names[batch]}.png`).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const falls=definitions.filter(p=>p.batch===batch&&balance.areas[p.id]).map(p=>balance.areas[p.id]);if(batch===0)falls.push([460,430,130,130]);
  let best={score:0,x:0,y:0};
  for(let y=170;y<info.height-150;y+=15){
   if(falls.some(([,cy,,ry])=>Math.abs(cy-y)<ry+75))continue;
   let sum=0,count=0;
   for(let x=60;x<info.width-60;x++){const n=(y*info.width+x)*info.channels;if(blue(...data.subarray(n,n+3))){sum+=x;count++}}
   if(count>best.score)best={score:count,x:sum/count,y};
  }
  assert(best.score>20,names[batch]+' has a calm-water sample');
  frame={x:source.x+best.x/info.width*source.width-420,y:source.y+best.y/info.height*source.height-420,width:840,height:840};
  for(const mode of ['detail','without-atlas',...(batch===0?['preview']:[])]){
   reflections=mode!=='without-atlas';preview=mode==='preview';clock=0;const first=render();clock=.75;const next=render();
   const a=await raw(first),b=await raw(next);let water=0,moving=0,dry=0,dryChanged=0,totalDelta=0;
   for(let n=0;n<a.length;n+=4){
    const delta=Math.max(...[0,1,2].map(k=>Math.abs(a[n+k]-b[n+k])));
    if(a[n+3]>250&&blue(...a.subarray(n,n+3))){water++;if(delta>=4)moving++;totalDelta+=delta}
    if(a[n+3]>250&&(a[n+2]<=a[n]||a[n+1]<=a[n])){dry++;if(delta>1)dryChanged++}
   }
   assert(water>300,names[batch]+' visible water');assert(moving/water>.18,`${names[batch]} ${mode} must visibly flow: ${moving}/${water}`);
   assert.equal(dryChanged,0,names[batch]+' banks and bridges stay still');
   report.push({reach:names[batch],mode,waterPixels:water,movingPixels:moving,meanDelta:+(totalDelta/water).toFixed(2),dryPixels:dry,dryChanged});
   if(mode==='detail')await sharp(first).webp({quality:92}).toFile(`${dir}/${names[batch]}.webp`);
  }
  if(batch===3){reflections=true;preview=false;for(let i=0;i<12;i++){clock=i*.25;previewFrames.push(await raw(render()))}}
 }
 await sharp(Buffer.concat(previewFrames),{raw:{width:450,height:450*12,channels:4,pageHeight:450}}).gif({delay:Array(12).fill(250),loop:0}).toFile(dir+'/calm-water-motion.gif');
 renderer.dispose();const result={result:'pass',waterfallAreas:10,waterfallOverlaysLoaded:0,checks:report,browserAndPhone:'Unavailable; actual CanvasKit software rendering used.'};fs.writeFileSync(dir+'/checks.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{globalThis.fetch=original.fetch;globalThis.window=original.window;process.type=original.type;fs.rmSync(temp,{recursive:true,force:true})}
