import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'river-check-')),dir='docs/qa/river-logging-v1';
const original={fetch:globalThis.fetch,window:globalThis.window,type:process.type};
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/skia-web';export * from './src/terrain-renderer';export * from './src/terrain-art';export * from './src/outdoor-terrain';export * from './src/east-approach';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/world-ground';export * from './src/world-road-materials';export * from './src/world-road-pilot';export * from './src/river-art';export * from './src/river-collision';export * from './src/editor-image-sources';export * from './src/road-art-stream';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),s=m.EAST_TERRAIN_SCALE;
 assert(!Object.keys(m.EDITOR_ENTRY_IMAGES).some(k=>k.startsWith('river')),'River must not delay editor entry');
 assert(m.RIVER_SECTIONS.length===6);
 const sections=m.RIVER_SECTIONS;
 for(let batch=0;batch<2;batch++){
  const group=sections.filter(p=>p.batch===batch),source=m.RIVER_BATCHES[batch].source;
  assert.equal(group.length,3);
  for(let i=1;i<group.length;i++){
   assert(group[i-1].y+group[i-1].height-group[i].y>=128-1e-6);
   assert(Math.abs((group[i].y-source.y)-group[i].sourceY)<.00001,'Shared source alignment');
  }
 }
 const at=(x,y,r=0)=>m.riverWaterBlocked((x-600)*s,(y-600)*s,r);
 assert(at(-5700,-6100),'Headwater should block walking');
 assert(!at(-6200,-5000,19),'Bank ground should remain open');
 assert(!at(2400,2400,19),'Camp is outside the river');
 assert(!at(-3200,8000,19),'Future water remains walkable');
 assert(!at(-3100,-1100,19),'Reserved crossing remains open');
 assert(!at(-4800,-2000,19),'Logging arrival road stays open');
 assert(at(-4500,-3350),'New outlet water blocks walking');
 assert(at(-3400,-2450),'Logging bend water blocks walking');
 assert(at(-3050,-1700),'New southern pool blocks walking');
 const mask=JSON.parse(fs.readFileSync('src/river-water-mask.json','utf8'));
 const firstWet=mask.rows.findIndex(row=>row),span=mask.rows[firstWet];
 const w=m.createWorld(m.emptyLayout());
 assert(m.worldBlocked(w,(-6256+(span[0]+span[1])*4-600)*s,(-6200+firstWet*8+4-600)*s,0),'World movement uses water mask');
 // Same streaming scheduler: three resident river images, two concurrent loads.
 let jobs=[],released=[];
 const stream=new m.RoadArtStream(src=>new Promise(resolve=>jobs.push({src,resolve})),keys=>released.push(...keys),{patches:sections,sources:m.RIVER_DETAIL_IMAGES,limit:3});
 const all={x:-10000,y:-10000,width:16000,height:16000};
 stream.update(all,1,1000);assert.equal(jobs.length,2);
 for(let i=0;i<4;i++){const batch=jobs;jobs=[];for(const job of batch){assert(Object.values(job.src)[0].includes('/river-'));job.resolve()}for(let j=0;j<8;j++)await Promise.resolve()}
 assert.equal(stream.residentCount,3);stream.update(all,.1,1300);assert.equal(stream.residentCount,0);assert.equal(released.length,3);stream.dispose();
 delete globalThis.CanvasKit;globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;
 globalThis.fetch=async url=>String(url).startsWith('blob:')?original.fetch(url):new Response(fs.readFileSync(path.resolve('public'+String(url))));
 let surface,frame={...m.RIVER_SOURCE},clock=0,includeRiver=true,includeExtension=true,motion=true;
 const canvas={width:0,height:0,clientWidth:1024,clientHeight:1363,dataset:{}};
 const sources={...m.WORLD_GROUND_MATERIAL_SOURCES,...m.WORLD_ROAD_MATERIAL_SOURCES,...m.ROAD_OVERVIEW_IMAGES,...m.RIVER_DETAIL_IMAGES,...m.RIVER_MOTION_IMAGES,...Object.fromEntries([...m.HOME_TERRAIN_TILES,...m.OUTDOOR_SOURCE_TILES].map(t=>[t.key,t.image]))};
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs)=>{
  ctx.riverTime=clock;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/frame.width/s,canvas.height/frame.height/s);ctx.translate((600-frame.x)*s,(600-frame.y)*s);
  const extensionKeys=sections.filter(p=>p.batch===1).map(p=>p.key);
  const visible=Object.fromEntries(Object.entries(imgs).filter(([key])=>(includeRiver||!key.startsWith('river'))&&(includeExtension||!extensionKeys.includes(key))&&(motion||key!=='riverFoam')));
  m.drawHomeTerrain(ctx,visible,undefined,0,{x:(frame.x-600)*s,y:(frame.y-600)*s,width:frame.width*s,height:frame.height*s});ctx.restore();
 },{},{sources,streamRoads:false,streamRivers:false});
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 async function render(name){renderer.draw(w);const snapshot=surface.makeImageSnapshot(),bytes=Buffer.from(snapshot.encodeToBytes());snapshot.delete();if(name)await sharp(bytes).webp({quality:94}).toFile(dir+'/'+name+'.webp');return bytes}
 await render('installed-six-sections');console.log('Rendered all six sections');
 frame={x:-5200,y:-4250,width:1400,height:1400};canvas.clientWidth=800;canvas.clientHeight=800;await render('pool-connection');
 frame={x:-5020,y:-2320,width:480,height:340};canvas.clientWidth=480;canvas.clientHeight=340;const roadWith=await render();includeExtension=false;const roadWithout=await render();assert(roadWith.equals(roadWithout),'Logging road remains pixel-identical');includeExtension=true;
 frame={x:-5900,y:-5600,width:1000,height:1000};canvas.clientWidth=500;canvas.clientHeight=500;const upstreamWith=await render();includeExtension=false;const upstreamWithout=await render();assert(upstreamWith.equals(upstreamWithout),'Approved upper river remains pixel-identical');includeExtension=true;
 frame={x:-4650,y:-3100,width:1000,height:1000};canvas.clientWidth=900;canvas.clientHeight=900;
 motion=false;const still=await render();motion=true;const a=await render('water-motion-0');clock=.45;const b=await render('water-motion-1');clock=.9;await render('water-motion-2');
 const ra=await sharp(a).removeAlpha().raw().toBuffer(),rb=await sharp(b).removeAlpha().raw().toBuffer();
 const rs=await sharp(still).removeAlpha().raw().toBuffer();
 let waterChanged=0,landChanged=0;
 for(let i=0;i<ra.length;i+=3){if(ra[i]===rb[i]&&ra[i+1]===rb[i+1]&&ra[i+2]===rb[i+2])continue;if(rs[i+2]>rs[i]+6&&rs[i+1]>rs[i]+3)waterChanged++;else if(Math.max(Math.abs(ra[i]-rb[i]),Math.abs(ra[i+1]-rb[i+1]),Math.abs(ra[i+2]-rb[i+2]))>2)landChanged++}
 console.log({waterChanged,landChanged});assert(waterChanged>2000,'Water must animate');assert(landChanged<250,'Ground and rocks must stay still');
 frame={x:800,y:800,width:1600,height:1600};canvas.clientWidth=500;canvas.clientHeight=500;clock=0;
 const campWith=await render();includeRiver=false;const campWithout=await render();assert(campWith.equals(campWithout),'Original camp remains pixel-identical');
 renderer.dispose();
 const result={result:'pass',sections:6,addedSections:3,approvedHeadwatersIdentical:true,loggingRoadIdentical:true,sharedMotionAtlas:true,continuousCropMapping:true,waterChangedPixels:waterChanged,landChangedPixels:landChanged,campIdentical:true,riverEntryImages:0,residentLimit:3,concurrentLoads:2,waterCollision:true,unbuiltWaterWalkable:true,browserAndPhoneCheck:'Not available in this environment; real CanvasKit software renderer used.'};
 fs.writeFileSync(dir+'/checks.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{globalThis.fetch=original.fetch;globalThis.window=original.window;process.type=original.type;fs.rmSync(temp,{recursive:true,force:true})}
