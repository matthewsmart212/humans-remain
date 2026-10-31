import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {build} from 'esbuild';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'river-quality-'));
const original={fetch:globalThis.fetch,window:globalThis.window,type:process.type,dpr:globalThis.devicePixelRatio};
const dir='docs/qa/river-quality-v5';fs.mkdirSync(dir,{recursive:true});
try{
 const before=JSON.parse(fs.readFileSync('.qa/river-quality/geometry-before.json'));for(const [file,content]of Object.entries(before))assert.equal(fs.readFileSync(file,'utf8'),content,'Map geometry remains unchanged: '+file);
 await build({stdin:{contents:"export * from './src/river-art';export * from './src/river-detail';export * from './src/terrain-art-streams';export * from './src/road-art-stream';export * from './src/world-assets';export * from './src/imported-art';export * from './src/studio-play';export * from './src/survival-engine';export * from './src/skia-web';export * from './src/placed-world-renderer';export * from './src/editor-image-sources';export * from './src/outdoor-terrain';export * from './src/river-collision';export * from './src/east-approach';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),s=m.EAST_TERRAIN_SCALE,manifest=JSON.parse(fs.readFileSync('src/river-detail-manifest.json'));
 assert.equal(manifest.batches.length,6);assert.equal(manifest.sections.length,26);assert(m.RIVER_DETAIL_PATCHES.length>100);assert(Math.max(...m.RIVER_DETAIL_PATCHES.map(p=>p.bytes))<=528*528*4);
 const art=JSON.parse(fs.readFileSync(dir+'/artwork.json'));assert.equal(art.batches.reduce((n,b)=>n+b.generatedTiles,0),21);assert(art.batches.every(b=>b.shoreClassificationChanged===0&&b.detailNative[0]===b.previousNative[0]*2));
 for(const bridge of m.RIVER_BRIDGES)for(let t=0;t<=1;t+=.1)assert(!m.riverWaterBlocked((bridge.from[0]+(bridge.to[0]-bridge.from[0])*t-600)*s,(bridge.from[1]+(bridge.to[1]-bridge.from[1])*t-600)*s,18*s),'Existing bridge remains walkable');
 // Exercise actual shared priority, lookahead, completion and eviction logic.
 const loaded=new Set(),released=[],streams=m.createTerrainArtStreams(async src=>{for(const key of Object.keys(src))loaded.add(key)},keys=>{released.push(...keys);keys.forEach(k=>loaded.delete(k))});
 let now=100000,peak=0;
 for(const batch of m.RIVER_BATCHES){const source=batch.source;for(let i=0;i<5;i++){
  const density=1.88,view={x:(source.x+source.width*.5-600)*s-208,y:(source.y+source.height*(.1+i*.18)-600)*s-450,width:416,height:900};streams.rivers.update(view,density,now+=201);
  for(let n=0;n<100;n++)await Promise.resolve();peak=Math.max(peak,streams.rivers.residentBytes+streams.rivers.pendingBytes);assert.equal(streams.rivers.visibleMissing,0,'Visible river detail loads');assert(peak<=20*1048576,'River texture budget stays within 20 MiB during gameplay');
 }}streams.dispose();assert.equal(loaded.size,0,'Stream textures released on dispose');
 globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;delete globalThis.CanvasKit;
 globalThis.fetch=async url=>String(url).startsWith('blob:')?original.fetch(url):new Response(fs.readFileSync(String(url).startsWith('/__riverqa/')?'.qa/river-quality/'+String(url).slice(11):path.resolve('public'+String(url))));
 const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));m.installImportedArt(snapshot.records);const world=m.createCampPlaySession(snapshot.layout),view={x:0,y:0,zoom:1,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true};
 let mode='after',clock=0,surface;
 const canvas={width:0,height:0,clientWidth:390,clientHeight:844,dataset:{}},oldImages={};
 for(const p of m.RIVER_SECTIONS){const feature=m.RIVER_SIDE_FEATURES.some(f=>f.batch===p.batch);oldImages['riverBefore:'+p.key]=`/survival/${feature?'river-features-v4':'river-calm-v2'}/${m.RIVER_BATCHES[p.batch].id}-${p.id}.webp`}
 const sources={...m.EDITOR_IMAGE_SOURCES,...m.editorTerrainDetail(snapshot.layout.terrainImage),...m.requiredImages(snapshot.layout.items.map(p=>p.assetId),snapshot.layout.terrainImage),...Object.fromEntries(m.OUTDOOR_TILES.map(t=>[t.key,t.image])),...Object.fromEntries(Object.entries(m.RIVER_DETAIL_IMAGES).filter(([key])=>!key.startsWith('riverHD'))),...oldImages};
 const redirect=Object.assign({},...['lossless-artwork','retired-road','calm-river','river-features'].map(n=>JSON.parse(fs.readFileSync(`server/${n}-redirects.json`))));
 const fetchFiles=globalThis.fetch;globalThis.fetch=async url=>{if(String(url).startsWith('blob:')||String(url).startsWith('/__riverqa/'))return fetchFiles(url);let u=String(url);const backup='.qa/river-quality/retired-before'+u;if(fs.existsSync(backup))return new Response(fs.readFileSync(backup));if(u.startsWith('/api/asset-files/'))return new Response(fs.readFileSync('native/assets/world/'+u.split('/').pop()+'.png'));while(redirect[u])u=redirect[u];return fetchFiles(u)};
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs,w)=>{
  ctx.riverTime=clock;ctx.requestRiverArtwork=undefined;ctx.requestRoadArtwork=undefined;ctx.requestCampArtwork=undefined;
  let shown=imgs;
  if(mode==='before'){shown=Object.fromEntries(Object.entries(imgs).filter(([key])=>!key.startsWith('riverHD')));for(const p of m.RIVER_SECTIONS)shown[p.key]=imgs['riverBefore:'+p.key]}
  // Isolate calm-water motion so a waterfall's whitewater cannot mask a frozen
  // surface. The bank/bridge art still follows the production draw path.
  const falls=ctx.drawWaterfallSection,pilot=ctx.drawWaterfallPilot;if(mode==='motion'){ctx.drawWaterfallSection=undefined;ctx.drawWaterfallPilot=undefined}
  m.drawWorldEditor(ctx,atlas,shown,w,view);ctx.drawWaterfallSection=falls;ctx.drawWaterfallPilot=pilot;
 },{},{sources,streamRoads:false,streamRivers:false});
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 const render=async()=>{renderer.draw(world);const im=surface.makeImageSnapshot(),bytes=Buffer.from(im.encodeToBytes());im.delete();return bytes};
 const raw=async bytes=>sharp(bytes).ensureAlpha().raw().toBuffer();
 const reports=[];let previous=[];
 const selected=(process.argv.find(a=>a.startsWith('--batches='))?.slice(10)||'0,1,2,3,4,5').split(',').map(Number);
 for(const batch of selected){
  canvas.clientWidth=390;canvas.clientHeight=844;
  const source=m.RIVER_BATCHES[batch].source,feature=m.RIVER_SIDE_FEATURES.find(f=>f.batch===batch),focus=feature?feature.focus:[source.x+source.width*.48,source.y+source.height*.42];
  const wetPoint={x:(focus[0]-600)*s,y:(focus[1]-600)*s};let bank;
  for(let r=50;r<1300&&!bank;r+=20)for(let a=0;a<32;a++){const p={x:wetPoint.x+Math.cos(a*Math.PI/16)*r,y:wetPoint.y+Math.sin(a*Math.PI/16)*r};if(!m.worldBlocked(world,p.x,p.y,19)){bank=p;break}}
  assert(bank,'Dry bank in every reach');world.player.x=bank.x;world.player.y=bank.y;const distance=Math.hypot(wetPoint.x-bank.x,wetPoint.y-bank.y);view.x=bank.x+(wetPoint.x-bank.x)/distance*65;view.y=bank.y+(wetPoint.y-bank.y)/distance*65;
  const c=m.editorCamera(390,844,world,view),frame={x:c.x,y:c.y,width:390/c.scale,height:844/c.scale};
  const tiles=m.RIVER_DETAIL_PATCHES.filter(t=>m.terrainIntersects({x:(t.sample.x-600)*s,y:(t.sample.y-600)*s,width:t.sample.width*s,height:t.sample.height*s},frame,32));
  const keys=tiles.map(t=>t.key);renderer.releaseImages(previous.filter(k=>!keys.includes(k)));await renderer.loadImages(Object.fromEntries(tiles.map(t=>[t.key,t.image])));previous=keys;
  clock=1.5;mode='before';const beforeImage=await render();mode='after';const afterImage=await render();assert(!beforeImage.equals(afterImage),'Higher detail reaches the actual scene');
  await sharp(beforeImage).webp({quality:97}).toFile(`${dir}/${batch}-before.webp`);await sharp(afterImage).webp({quality:97}).toFile(`${dir}/${batch}-after.webp`);
  canvas.clientWidth=240;canvas.clientHeight=520;mode='motion';clock=0;const a=await raw(await render());clock=.75;const b=await raw(await render());let water=0,moving=0,dry=0,dryChanged=0;
  for(let n=0;n<a.length;n+=4){const delta=Math.max(Math.abs(a[n]-b[n]),Math.abs(a[n+1]-b[n+1]),Math.abs(a[n+2]-b[n+2]));if(a[n+3]>250&&a[n+2]-a[n]>29&&a[n+1]-a[n]>20){water++;if(delta>=4)moving++}if(a[n+3]>250&&a[n]-a[n+2]>20&&a[n]-a[n+1]>10){dry++;if(delta>1)dryChanged++}}
  assert(water>1000,'Visible water '+batch);assert(moving/water>.12,'Calm water animates '+batch);assert.equal(dryChanged,0,'Dry banks remain still '+batch);
  reports.push({batch,visibleChunks:keys.length,waterPixels:water,movingFraction:moving/water,dryChanged});console.log(reports.at(-1));
 }
 renderer.dispose();const result={passed:true,riverAreas:6,tiles:m.RIVER_DETAIL_PATCHES.length,lossless:true,geometryAndCrossingsUnchanged:true,peakGameplayRiverBytes:peak,chunkBytesMax:Math.max(...m.RIVER_DETAIL_PATCHES.map(p=>p.bytes)),motion:reports,physicalIPhoneTested:false};
 fs.writeFileSync(dir+'/checks-'+selected.join('-')+'.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{globalThis.fetch=original.fetch;globalThis.window=original.window;globalThis.devicePixelRatio=original.dpr;process.type=original.type;fs.rmSync(temp,{recursive:true,force:true})}
