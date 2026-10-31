import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'river-complete-')),dir='docs/qa/river-calm-v2';
const original={fetch:globalThis.fetch,window:globalThis.window,type:process.type};fs.mkdirSync(dir,{recursive:true});
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/skia-web';export * from './src/terrain-renderer';export * from './src/terrain-art';export * from './src/outdoor-terrain';export * from './src/east-approach';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/world-ground';export * from './src/world-road-materials';export * from './src/world-road-pilot';export * from './src/river-art';export * from './src/river-collision';export * from './src/waterfalls';export * from './src/editor-image-sources';export * from './src/road-art-stream';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),s=m.EAST_TERRAIN_SCALE;
 assert.equal(m.RIVER_SECTIONS.length,26);assert.equal(m.WATERFALL_LOCATIONS.length,10);assert.equal(Object.keys(m.WATERFALL_SECTION_IMAGES).length,9);assert(!Object.keys(m.EDITOR_ENTRY_IMAGES).some(k=>k.startsWith('river')));
 for(let batch=2;batch<6;batch++){const tiles=m.RIVER_SECTIONS.filter(t=>t.batch===batch);assert.equal(tiles.length,5);for(let i=1;i<5;i++)assert(tiles[i-1].y+tiles[i-1].height-tiles[i].y>=128)}
 const at=(x,y,r=0)=>m.riverWaterBlocked((x-600)*s,(y-600)*s,r*s);
 assert(!at(2400,2400,20));assert(at(-5700,-6100));assert(!at(4200,9000,20),'Future eastern creek must remain walkable');
 for(const b of m.RIVER_BRIDGES)for(let t=0;t<=1;t+=.05)assert(!at(b.from[0]+(b.to[0]-b.from[0])*t,b.from[1]+(b.to[1]-b.from[1])*t,18),b.id+' deck must be walkable');
 const masks=JSON.parse(fs.readFileSync('src/river-extension-water-masks.json','utf8'));let blockedRows=0;
 for(const mask of masks){const b=m.RIVER_BATCHES[mask.batch],end=m.RIVER_BATCHES[mask.batch+1];for(let i=0;i<mask.rows.length;i+=13){const row=mask.rows[i];if(!row)continue;const y=b.source.y+(i+.5)*mask.step;if(y<b.source.y+b.topFade||end&&y>=end.source.y+end.topFade)continue;const x=b.source.x+(row[0]+row[1])/2*mask.step;const bridge=m.RIVER_BRIDGES.some(p=>Math.abs(y-(p.from[1]+p.to[1])/2)<500);if(!bridge){assert(at(x,y),`Water must block ${mask.batch} ${i}`);blockedRows++}}}
 let jobs=[],released=[];const stream=new m.RoadArtStream(src=>new Promise(resolve=>jobs.push({src,resolve})),keys=>released.push(...keys),{patches:m.RIVER_SECTIONS,sources:m.RIVER_DETAIL_IMAGES,limit:3});
 const all={x:-20000,y:-20000,width:50000,height:50000};stream.update(all,1,1000);assert.equal(jobs.length,2);for(let i=0;i<4;i++){const batch=jobs;jobs=[];for(const j of batch)j.resolve();for(let k=0;k<8;k++)await Promise.resolve()}assert.equal(stream.residentCount,3);stream.update(all,.1,1300);assert.equal(stream.residentCount,0);stream.dispose();
 if(process.argv.includes('--data-only')){console.log({result:'pass',collisionSamples:blockedRows,bridges:4,streaming:true});process.exit(0)}
 delete globalThis.CanvasKit;globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;
 globalThis.fetch=async url=>String(url).startsWith('blob:')?original.fetch(url):new Response(fs.readFileSync(path.resolve('public'+String(url))));
 let surface,frame={...m.OUTDOOR_SOURCE_BOUNDS},clock=0,extension=true,falls=true,onlyFall=null;
 const canvas={width:0,height:0,clientWidth:1400,clientHeight:1400,dataset:{}};
 const sources={...m.WORLD_GROUND_MATERIAL_SOURCES,...m.WORLD_ROAD_MATERIAL_SOURCES,...m.ROAD_OVERVIEW_IMAGES,...m.RIVER_DETAIL_IMAGES,...m.RIVER_MOTION_IMAGES,...Object.fromEntries([...m.HOME_TERRAIN_TILES,...m.OUTDOOR_SOURCE_TILES].map(t=>[t.key,t.image]))};
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs)=>{
  ctx.riverTime=onlyFall?0:clock;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/frame.width/s,canvas.height/frame.height/s);ctx.translate((600-frame.x)*s,(600-frame.y)*s);
  const visible=Object.fromEntries(Object.entries(imgs).filter(([k])=>(extension||!k.startsWith('riverExtension')&&!k.startsWith('riverWaterfallMask_riverExtension'))&&(!k.startsWith('riverWaterfallMask_')||falls&&(!onlyFall||k===onlyFall.maskKey))));
  const draw=ctx.drawWaterfallSection;ctx.drawWaterfallSection=(a,b,c,d,t,sampling)=>draw.call(ctx,a,b,c,d,t+(onlyFall?clock:0),sampling);
  m.drawHomeTerrain(ctx,visible,undefined,0,{x:(frame.x-600)*s,y:(frame.y-600)*s,width:frame.width*s,height:frame.height*s});ctx.drawWaterfallSection=draw;ctx.restore();
 },{},{sources,streamRoads:false,streamRivers:false});
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));const world=m.createWorld(m.emptyLayout());
 async function render(name){renderer.draw(world);const snapshot=surface.makeImageSnapshot(),bytes=Buffer.from(snapshot.encodeToBytes());snapshot.delete();if(name)await sharp(bytes).webp({quality:94}).toFile(dir+'/'+name+'.webp');return bytes}
 await sharp(await render('world-overview')).webp({quality:90}).toFile('public/planning/built-river-calm-v2.webp');console.log('World overview rendered');
 frame=m.RIVER_SOURCE;canvas.clientWidth=700;canvas.clientHeight=Math.round(700*frame.height/frame.width);await sharp(await render('entire-river')).webp({quality:92}).toFile('public/planning/river-calm-detail.webp');
 for(let i=1;i<6;i++){const b=m.RIVER_BATCHES[i];frame={x:b.corridor.points[0][0]-900,y:b.source.y-140,width:1800,height:900};canvas.clientWidth=1100;canvas.clientHeight=550;await render('join-'+i)}
 for(const b of m.RIVER_BRIDGES){frame={x:Math.min(b.from[0],b.to[0])-150,y:Math.min(b.from[1],b.to[1])-240,width:Math.abs(b.to[0]-b.from[0])+300,height:Math.abs(b.to[1]-b.from[1])+480};canvas.clientWidth=900;canvas.clientHeight=Math.round(900*frame.height/frame.width);await render(b.id)}
 for(const [name,b]of [['camp',{x:800,y:800,width:1600,height:1600}],['upper-river',{x:-5900,y:-5600,width:1000,height:1000}],['logging-road',{x:-5020,y:-2320,width:480,height:340}]]){frame=b;canvas.clientWidth=500;canvas.clientHeight=500;const before=await render();extension=false;const after=await render();extension=true;assert(before.equals(after),name+' remains pixel-identical')}
 const motion=[];
 for(const p of m.WATERFALL_SECTIONS){
  onlyFall=p;frame=p;canvas.clientWidth=p.sampling.nativeSize[0];canvas.clientHeight=p.sampling.nativeSize[1];clock=0;falls=false;const base=await render();falls=true;const first=await render();clock=.5;const second=await render();clock=1.5;const loop=await render();
  const raw=async b=>sharp(b).removeAlpha().raw().toBuffer(),a=await raw(first),b=await raw(second),z=await raw(base),l=await raw(loop);let changed=0,maxLoop=0,protectedChanged=0;
  const mask=await sharp('public'+p.maskPath).removeAlpha().raw().toBuffer();const width=canvas.clientWidth,height=canvas.clientHeight;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const n=(y*width+x)*3;let delta=0;for(let k=0;k<3;k++){delta=Math.max(delta,Math.abs(a[n+k]-b[n+k]));maxLoop=Math.max(maxLoop,Math.abs(a[n+k]-l[n+k]))}if(delta>3)changed++;
   let support=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<width&&yy>=0&&yy<height)support=Math.max(support,mask[(yy*width+xx)*3])}if(!support&&[0,1,2].some(k=>a[n+k]!==z[n+k]||b[n+k]!==z[n+k]))protectedChanged++;
  }
  assert(changed>30,p.id+' motion');assert(maxLoop<=1,p.id+' loop');assert.equal(protectedChanged,0,p.id+' rocks and banks');motion.push({id:p.id,changed,maxLoop,protectedChanged});
 }
 renderer.dispose();const result={result:'pass',sections:26,retainedWhitewaterAreas:10,previousWhitewaterAreas:31,animatedSections:motion.length,bridges:4,collisionSamples:blockedRows,streamResidentLimit:3,concurrentLoads:2,entryAssetsAdded:0,campPreserved:true,motion,browserAndPhone:'Unavailable; checked using actual CanvasKit software renderer.'};fs.writeFileSync(dir+'/checks.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{globalThis.fetch=original.fetch;globalThis.window=original.window;process.type=original.type;fs.rmSync(temp,{recursive:true,force:true})}
