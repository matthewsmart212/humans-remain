import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'terrain-v2-'));
const out='docs/qa/map-streaming-v2';fs.mkdirSync(out,{recursive:true});
const tick=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
await build({stdin:{contents:"export * from './src/world-assets';export * from './src/road-art-stream';export * from './src/terrain-stream-art';export * from './src/east-approach';export * from './src/river-art';export * from './src/world-road-pilot';export * from './src/terrain-renderer';export * from './src/skia-web';export * from './src/skia-adapter';export * from './src/artwork-loading';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/layout-views';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs')});
const m=require(path.join(tmp,'model.cjs')),s=m.EAST_TERRAIN_SCALE;
const configs=[{name:'roads',patches:m.streamPatches('road'),sources:m.TERRAIN_CHUNK_IMAGES,maxBytes:48*1048576},{name:'camp',patches:m.streamPatches('camp'),sources:m.TERRAIN_CHUNK_IMAGES,maxBytes:24*1048576},{name:'rivers',patches:m.RIVER_SECTIONS.map(p=>({...p,bytes:m.RIVER_TEXTURE_SIZES.get(p.key).bytes,minPixelsPerWorldUnit:m.RIVER_TEXTURE_SIZES.get(p.key).previewDensity/s*1.15})),sources:m.RIVER_DETAIL_IMAGES,maxBytes:20*1048576}];
const coverage=[];
for(const config of configs){
 let jobs=[],peak=0,views=0,maxVisible=0,now=Date.now(),visibleLoads=0;
 const stream=new m.RoadArtStream((src,priority)=>new Promise(resolve=>{if(priority==='foreground')visibleLoads++;jobs.push(resolve)}),()=>{},config);
 for(const p of config.name==='camp'?[{x:2400,y:2400,width:0,height:0},...m.CAMP_CHUNKS.filter((_,i)=>i%10===0)]:m.ROAD_TERRAIN_PATCHES){
  for(const ppu of [.15,.25,.4,.6,1,2]){
   const width=1024/ppu,height=1800/ppu,view={x:(p.x+p.width/2-600)*s-width/2,y:(p.y+p.height/2-600)*s-height/2,width,height};
   stream.update(view,ppu,now+=201);maxVisible=Math.max(maxVisible,stream.visibleMissing);
   for(let n=0;jobs.length&&n<1000;n++){peak=Math.max(peak,stream.residentBytes+stream.pendingBytes);const batch=jobs;jobs=[];batch.forEach(r=>r());await tick()}
   assert.equal(stream.visibleMissing,0,`${config.name} leaves no visible preview stranded at ${JSON.stringify(view)}`);views++;
  }
 }
 stream.dispose();coverage.push({layer:config.name,views,maxVisible,peakMiB:+(peak/1048576).toFixed(2),visibleLoads});
}
// A visible texture overtakes a backlog, and a pending speculative texture can
// be promoted without downloading or decoding it again.
let complete,decoded=[];const loader=m.createArtworkLoader(url=>new Promise(r=>{decoded.push(url);complete=()=>r(url)}),()=>{},1);
const background=loader.load({a:'/a',b:'/b',c:'/c',d:'/d'},undefined,'background');
const visible=loader.load({visible:'/visible'},undefined,'foreground');complete();await tick();assert.equal(decoded[1],'/visible');complete();await visible;await tick();
loader.promote({d:'/d'});complete();await tick();assert.equal(decoded[3],'/d');complete();await tick();complete();await background;assert.deepEqual(decoded,['/a','/visible','/b','/d','/c']);loader.dispose();
// Check culling against transformed artwork corners, including large roofs.
const assets=[...m.ASSET_BY_ID.values()].filter(a=>!a.foliage).slice(0,120);
let cullingCases=0;
for(const a of assets){for(const rotation of [0,47,180]){const p={...m.newPlacement(a.id,1000,2000),rotation,flipX:true},layout={...m.emptyLayout(),items:[p]},b=m.placementBounds(p);for(const [x,y]of [[b.x,b.y],[b.x+b.width,b.y+b.height]]){const [wx,wy]=m.placementPoint(p,x,y);assert(m.visiblePlacements(layout,{x:wx-2,y:wy-2,width:4,height:4,scale:1}).includes(p));cullingCases++}assert.equal(m.visiblePlacements(layout,{x:-100000,y:-100000,width:50,height:50,scale:1}).length,0)}}
if(process.argv.includes('--coverage-only')){console.log(JSON.stringify({result:'pass',coverage,cullingCases,foregroundQueue:true,scope:'Streaming coverage/priority only; retired original painting comparison skipped.'},null,2));fs.rmSync(tmp,{recursive:true,force:true});process.exit(0)}
// Production CanvasKit raster comparison: original painting vs independently
// streamed chunks across internal seams and the global camp feather.
globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;delete globalThis.createImageBitmap;delete globalThis.CanvasKit;
const originalFetch=globalThis.fetch;globalThis.fetch=async url=>String(url).startsWith('blob:')?originalFetch(url):new Response(fs.readFileSync(path.resolve('public'+String(url))));
const canvas={width:0,height:0,clientWidth:700,clientHeight:600,dataset:{}},world=m.createWorld(m.emptyLayout());
const parent=m.ROAD_TERRAIN_PATCHES.find(p=>p.key==='roadComplete2'),roadChunks=m.ROAD_CHUNKS.filter(t=>t.parent===parent.key),campChunks=m.CAMP_CHUNKS.filter(t=>t.x<1536&&t.y<1536);
const sources={roadOriginal:m.ROAD_PILOT_IMAGES[parent.key],homeGround:'/survival/camp-ground-v3/full-4800.webp',...Object.fromEntries([...roadChunks,...campChunks].map(t=>[t.levels[0].key,t.levels[0].url]))};
let surface,kind='road',chunked=false;
const renderer=await m.createWebWorld(canvas,(ctx,_atlas,imgs)=>{
 ctx.clearRect(0,0,700,600);ctx.fillStyle='#33291e';ctx.fillRect(0,0,700,600);ctx.save();ctx.scale(.7,.7);
 if(kind==='road'){
  const b={x:(parent.x-600)*s,y:(parent.y-600)*s,width:parent.width*s,height:parent.height*s};ctx.translate(-b.x,-b.y);
  if(!chunked)ctx.drawRoadTerrainPatch(imgs.roadOriginal,b,s);
  else for(const t of roadChunks){const toWorld=r=>({x:(r.x-600)*s,y:(r.y-600)*s,width:r.width*s,height:r.height*s});ctx.drawRoadTerrainPatch(imgs[t.levels[0].key],b,s,toWorld(t.sample),toWorld(t))}
 }else{
  ctx.translate(400,400);const view={x:-400,y:-400,width:1000,height:858};
  if(chunked){ctx.requestCampArtwork=()=>{};m.drawHomeTerrain(ctx,imgs,undefined,0,view)}
  else{const r={x:-600*s,y:-600*s,width:4800*s,height:4800*s},fade=220*s;ctx.drawTerrainTile(imgs.homeGround,{...r,maskBounds:{x:-480*s,y:-480*s,width:4560*s,height:4560*s},paintTop:0,paintWidth:r.width,paintHeight:r.height,fadeTop:fade,fadeBottom:fade,fadeLeft:fade,fadeRight:fade})}
 }ctx.restore();
},{},{sources,streamRoads:false,streamRivers:false});
globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
const snapshot=()=>{const image=surface.makeImageSnapshot(),png=Buffer.from(image.encodeToBytes());image.delete();return png};
const pixels=[];
for(kind of ['road','camp']){
 chunked=false;renderer.draw(world);const original=snapshot();chunked=true;renderer.draw(world);const chunks=snapshot();fs.writeFileSync(`${out}/${kind}-chunks.png`,chunks);
 const a=await sharp(original).ensureAlpha().raw().toBuffer(),b=await sharp(chunks).ensureAlpha().raw().toBuffer();
 const tiles=kind==='road'?roadChunks:campChunks;
 const seamsX=tiles.flatMap(t=>[t.x,t.x+t.width]).map(x=>kind==='road'?(x-parent.x)*s*.7:((x-600)*s+400)*.7),seamsY=tiles.flatMap(t=>[t.y,t.y+t.height]).map(y=>kind==='road'?(y-parent.y)*s*.7:((y-600)*s+400)*.7);
 let sum=0,square=0,max=0,seamSquare=0,seamChannels=0;
 for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]),pixel=Math.floor(i/4),x=pixel%700,y=Math.floor(pixel/700);sum+=d;square+=d*d;max=Math.max(max,d);if(seamsX.some(s=>Math.abs(x-s)<2)||seamsY.some(s=>Math.abs(y-s)<2)){seamSquare+=d*d;seamChannels++}}
 const mae=sum/a.length,rms=Math.sqrt(square/a.length),psnr=20*Math.log10(255/rms),seamRms=Math.sqrt(seamSquare/seamChannels);
 assert(mae<3&&psnr>33,`${kind} image quality: mean error ${mae}, PSNR ${psnr}`);
 assert(seamRms<rms*1.75+1,`${kind} must not concentrate errors at chunk edges: ${seamRms} vs ${rms}`);
 pixels.push({layer:kind,meanChannelError:mae,maxChannelError:max,psnr,seamRms,wholeImageRms:rms});
}
renderer.dispose();globalThis.fetch=originalFetch;
const report={result:'pass',coverage,textureChunks:m.TERRAIN_CHUNKS.length,largestChunkMiB:Math.max(...m.TERRAIN_CHUNKS.flatMap(t=>t.levels.map(l=>l.bytes)))/1048576,foregroundQueue:true,cullingCases,pixels,scope:'Production CanvasKit software rendering; physical iPhone and browser GPU frame rates unverified.'};
fs.writeFileSync(`${out}/checks.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));fs.rmSync(tmp,{recursive:true,force:true});
