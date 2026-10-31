import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'river-flow-'));
const dir='docs/qa/river-surface-flow-world-v1';fs.mkdirSync(dir,{recursive:true});
const original={fetch:globalThis.fetch,window:globalThis.window,type:process.type,dpr:globalThis.devicePixelRatio};
try{
 await build({stdin:{contents:"export * from './src/skia-web';export * from './src/river-art';export * from './src/river-detail';export * from './src/river-collision';export * from './src/east-approach';export * from './src/survival-engine';export * from './src/world-layout';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),s=m.EAST_TERRAIN_SCALE;
 const transparent=await sharp({create:{width:1,height:1,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toBuffer();
 globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;delete globalThis.CanvasKit;
 globalThis.fetch=async url=>String(url).startsWith('blob:')?original.fetch(url):new Response(String(url)==='/clearSurface.png'?transparent:fs.readFileSync(path.resolve('public'+String(url))));
 const canvas={width:0,height:0,clientWidth:180,clientHeight:252,dataset:{}};
 let frame={x:0,y:0,width:1000,height:1400},clock=0,mode='after',surface;
 const sources={...m.RIVER_PREVIEW_IMAGES,...Object.fromEntries(Object.entries(m.RIVER_DETAIL_IMAGES).filter(([key])=>!key.startsWith('riverHD'))),riverSurfaceRipples:m.RIVER_MOTION_IMAGES.riverSurfaceRipples,...Object.fromEntries(m.RIVER_SIDE_FEATURES.map(p=>[p.maskKey,p.maskPath])),clearSurface:'/clearSurface.png'};
 const renderer=await m.createWebWorld(canvas,(ctx,_atlas,imgs)=>{
  ctx.riverTime=clock;ctx.drawWaterfallSection=undefined;ctx.drawWaterfallPilot=undefined;
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/frame.width/s,canvas.height/frame.height/s);ctx.translate((600-frame.x)*s,(600-frame.y)*s);
  const shown={...imgs};if(mode==='paint')shown.riverSurfaceRipples=shown.clearSurface;
  m.drawRiverTerrain(ctx,shown,{x:(frame.x-600)*s,y:(frame.y-600)*s,width:frame.width*s,height:frame.height*s});ctx.restore();
 },{},{sources,streamRoads:false,streamRivers:false});
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 const world=m.createWorld(m.emptyLayout());
 const render=()=>{renderer.draw(world);const im=surface.makeImageSnapshot(),bytes=Buffer.from(im.encodeToBytes());im.delete();return bytes};
 const raw=bytes=>sharp(bytes).ensureAlpha().raw().toBuffer();
 const selected=(process.argv.find(a=>a.startsWith('--batches='))?.slice(10)||'0,1,2,3,4,5').split(',').map(Number);
 const masks=[{batch:0,...JSON.parse(fs.readFileSync('src/river-water-mask.json'))},{batch:1,...JSON.parse(fs.readFileSync('src/river-logging-water-mask.json'))},...JSON.parse(fs.readFileSync('src/river-extension-water-masks.json'))];
 const locations=[];
 for(const batch of selected){
  const source=m.RIVER_BATCHES[batch].source,mask=masks.find(x=>x.batch===batch),row=Math.floor(mask.rows.length*.47),r=mask.rows[row];
  assert(r,'A water sample exists in each river reach');
  locations.push({id:'reach-'+batch,batch,point:[source.x+(r[0]+r[1])*mask.step/2,source.y+(row+.5)*mask.step]});
  for(const feature of m.RIVER_SIDE_FEATURES.filter(f=>f.batch===batch))locations.push({id:feature.id,batch,point:feature.focus});
  if(batch){const joinRow=Math.floor(m.RIVER_BATCHES[batch].topFade*.7/mask.step),j=mask.rows[joinRow];assert(j,'A join water sample exists');locations.push({id:'join-'+batch,batch,point:[source.x+(j[0]+j[1])*mask.step/2,source.y+(joinRow+.5)*mask.step]})}
 }
 const reports=[];let previous=[];
 const loadFrame=async(onlyBatch)=>{
  const patches=m.RIVER_DETAIL_PATCHES.filter(p=>(onlyBatch===undefined||p.batch===onlyBatch)&&p.x<frame.x+frame.width&&p.x+p.width>frame.x&&p.y<frame.y+frame.height&&p.y+p.height>frame.y);
  const keys=patches.map(p=>p.key);renderer.releaseImages(previous.filter(k=>!keys.includes(k)));await renderer.loadImages(Object.fromEntries(patches.map(p=>[p.key,p.image])));previous=keys;
 };
 for(const location of locations){
  frame={x:location.point[0]-500,y:location.point[1]-700,width:1000,height:1400};await loadFrame();
  mode='paint';clock=0;const paint=await raw(render());clock=3;assert(paint.equals(await raw(render())),location.id+': the painting and underwater stones stay still');
  mode='after';clock=0;const firstBytes=render(),first=await raw(firstBytes);clock=.5;const later=await raw(render());
  let dry=0,dryChanged=0,water=0,moving=0,shorelineBlendPixels=0;
  for(let n=0;n<first.length;n+=4){const delta=Math.max(...[0,1,2].map(k=>Math.abs(first[n+k]-later[n+k])));
   if(paint[n+3]>250&&paint[n]-paint[n+2]>20){
    // At batch fades a brown final pixel may include translucent bank paint
    // over moving water. Use the existing water mask to separate this wet
    // shoreline blend from dry ground; the whole painting is checked above.
    const pixel=n/4,x=(frame.x+(pixel%180+.5)/180*frame.width-600)*s,y=(frame.y+(Math.floor(pixel/180)+.5)/252*frame.height-600)*s;
    if(m.riverWaterBlocked(x,y,48*s)){if(delta>1)shorelineBlendPixels++}else{dry++;if(delta>1)dryChanged++}
   }
   if(paint[n+3]>250&&paint[n+2]-paint[n]>29&&paint[n+1]-paint[n]>20){water++;if(delta>=3)moving++}
  }
  assert(water>150,location.id+': visible water');assert.equal(dryChanged,0,location.id+': dry banks and bridges stay still');assert(moving/water>.12,location.id+': surface water animates without waterfall layers');
  clock=1/.12;const loop=await raw(render());let loopDelta=0;for(let n=0;n<first.length;n++)loopDelta+=Math.abs(first[n]-loop[n]);loopDelta/=first.length;assert(loopDelta<.03,location.id+': no loop jump');
  await sharp(firstBytes).webp({lossless:true}).toFile(dir+'/'+location.id+'.webp');
  const report={id:location.id,batch:location.batch,waterPixels:water,movingFraction:moving/water,dryPixels:dry,dryChanged,shorelineBlendPixels,loopMeanChannelDelta:loopDelta,paintingStationary:true};reports.push(report);console.log(report);
 }
 let approvedBridgeMeanDelta;
 if(selected.includes(3)){
  // Match the trial's exact detail residency: its small upper overlap used
  // medium batch-2 artwork while only batch 3 was promoted to high detail.
  canvas.clientWidth=300;canvas.clientHeight=480;frame={x:-4900,y:2050,width:1000,height:1600};await loadFrame(3);mode='after';clock=0;
  const currentBytes=render();
  // Compare the bridge's own painting, excluding the upper neighbouring
  // batch overlap. Composite alpha before comparing PNG against WebP so
  // invisible RGB stored in transparent pixels does not affect the metric.
  const core=bytes=>sharp(bytes).extract({left:0,top:80,width:300,height:400}).flatten({background:'#000000'}).raw().toBuffer();
  const current=await core(currentBytes),approved=await core(fs.readFileSync('docs/qa/river-surface-flow-v1/after.webp'));
  await sharp(currentBytes).webp({lossless:true}).toFile(dir+'/approved-bridge.webp');
  let delta=0;for(let i=0;i<current.length;i++)delta+=Math.abs(current[i]-approved[i]);approvedBridgeMeanDelta=delta/current.length;
  console.log({approvedBridgeMeanDelta});assert(approvedBridgeMeanDelta<.03,'The approved bridge look is preserved');
 }
 const shaderFieldBytes=renderer.textureStats().graphics.shaderFieldBytes;
 renderer.dispose();renderer.dispose();
 const meta=await sharp('public'+m.RIVER_SURFACE_FLOW.image).metadata();
 const report={passed:true,batches:selected,locations:reports,approvedBridgeMeanDelta,waterfallOverlaysLoaded:0,sharedSurfaceTextureBytes:meta.width*meta.height*4,shaderFieldBytes,physicalIPhoneTested:false};
 fs.writeFileSync(dir+'/checks-'+selected.join('-')+'.json',JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{globalThis.fetch=original.fetch;globalThis.window=original.window;process.type=original.type;globalThis.devicePixelRatio=original.dpr;fs.rmSync(temp,{recursive:true,force:true})}
