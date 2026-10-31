// Validate the rendered road layout, including the six original camp exits.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const dir='docs/qa/world-roads-v3',temp=fs.mkdtempSync(path.join(os.tmpdir(),'world-roads-')),require=createRequire(import.meta.url),sharp=require('sharp');fs.mkdirSync(dir,{recursive:true});
const oldFetch=globalThis.fetch,oldWindow=globalThis.window,oldType=process.type;
const focus=process.argv.includes('--focus')?new Set(['camp-southeast','camp-northwest','village-junction','east-junction','logging-dark-earth','factory-gravel','salvage-gravel','stone-to-earth','camp-preserved']):null;
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/skia-web';export * from './src/terrain-renderer';export * from './src/terrain-art';export * from './src/east-approach';export * from './src/outdoor-terrain';export * from './src/world-ground';export * from './src/world-roads';export * from './src/world-road-materials';export * from './src/editor-image-sources';export * from './src/world-master-plan';export * from './src/world-plan-geometry';export * from './src/survival-engine';export * from './src/world-layout';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),s=m.EAST_TERRAIN_SCALE;
 const campPatches=JSON.parse(fs.readFileSync('src/camp-road-patches.json','utf8'));
 const districtPatches=JSON.parse(fs.readFileSync('src/district-road-patches.json','utf8'));
 const completePatches=JSON.parse(fs.readFileSync('src/complete-road-patches.json','utf8'));
 const pilotSource={roadTerrainPilotSE:'/survival/road-pilot-v1/southeast.webp',...(!process.argv.includes('--camp-sources')?Object.fromEntries(campPatches.map(p=>[p.key,`/survival/camp-road-patches-v1/${p.id}.webp`])):{})};
 if(process.argv.includes('--district-check')||process.argv.includes('--complete-sources')||process.argv.includes('--complete-check'))Object.assign(pilotSource,Object.fromEntries(districtPatches.map(p=>[p.key,`/survival/district-road-patches-v1/${p.id}.webp`])));
 for(const p of campPatches)assert(!(p.key in m.EDITOR_ENTRY_IMAGES),'Camp road patch blocks editor entry');
 assert(!('roadTerrainPilotSE' in m.EDITOR_ENTRY_IMAGES),'Pilot artwork blocks editor entry');
 for(const key of Object.keys(m.WORLD_ROAD_MATERIAL_SOURCES))assert(!(key in m.EDITOR_ENTRY_IMAGES),'Road artwork blocks editor entry');
 assert.deepEqual(m.validateWorldPlan(),[]);
 const reached=m.connectedPlanNodes();for(const d of m.WORLD_PLAN_DISTRICTS)assert(reached.has(d.node),'Disconnected district '+d.id);
 const crossings=[];
 for(const road of m.WORLD_ROADS){
  assert(road.sourceOutline.every(p=>p.every(Number.isFinite)&&m.insideRect(p,m.WORLD_PLAN_BOUNDS)),road.id+' has invalid road edges');
  assert(road.mesh.positions.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),road.id+' has invalid mesh vertices');
  assert(road.mesh.indices.every(i=>i>=0&&i<road.mesh.positions.length),road.id+' has invalid mesh indices');
  assert(road.mesh.uv.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),road.id+' has invalid artwork coordinates');
  assert(road.mesh.materials.every(w=>w.every(v=>Number.isFinite(v)&&v>=0&&v<=1)&&Math.abs(w.reduce((s,v)=>s+v,0)-1)<1e-8),road.id+' has invalid material weights');
  // Validate the rounded, rendered centre line, not just the older straight survey.
  const p=road.sourcePoints;
  assert.deepEqual(p[0],m.WORLD_PLAN_NODES[road.from]);assert.deepEqual(p.at(-1),m.WORLD_PLAN_NODES[road.to]);
  for(let i=1;i<p.length;i++)for(const river of m.WORLD_PLAN_RIVERS)for(let j=1;j<river.points.length;j++){
   if(m.segmentIntersection(p[i-1],p[i],river.points[j-1],river.points[j])){assert.equal(road.kind,'bridge','Unreserved crossing '+road.id);crossings.push(road.id)}
  }
  for(const quiet of m.WORLD_PLAN_QUIET){
   assert(!road.sourceOutline.some(p=>m.pointInPolygon(p,quiet.polygon)),road.id+' enters quiet area '+quiet.id);
   for(let i=0;i<road.sourceOutline.length;i++)for(let j=0;j<quiet.polygon.length;j++)assert(!m.segmentIntersection(road.sourceOutline[i],road.sourceOutline[(i+1)%road.sourceOutline.length],quiet.polygon[j],quiet.polygon[(j+1)%quiet.polygon.length]),road.id+' crosses quiet area '+quiet.id);
  }
 }
 assert.equal(new Set(crossings).size,6);
 delete globalThis.CanvasKit;globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;
 globalThis.fetch=async url=>String(url).startsWith('blob:')?oldFetch(url):new Response(fs.readFileSync(path.resolve('public'+String(url))));
 let surface,frame={x:0,y:0,width:844,height:390},hideRoads=false,hideDistrict=false;
 const canvas={width:0,height:0,clientWidth:844,clientHeight:390,dataset:{}};
 const sources={...m.WORLD_GROUND_MATERIAL_SOURCES,...m.WORLD_ROAD_MATERIAL_SOURCES,...(!process.argv.includes('--pilot-source')?pilotSource:{}),...Object.fromEntries([...m.HOME_TERRAIN_TILES,...m.OUTDOOR_SOURCE_TILES].map(t=>[t.key,t.image]))};
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs)=>{
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();
  ctx.scale(canvas.width/frame.width/s,canvas.height/frame.height/s);ctx.translate((600-frame.x)*s,(600-frame.y)*s);
  const fill=ctx.fill,roads=ctx.drawRoadSurfaces,pilot=ctx.drawRoadTerrainPatch;if(hideRoads){ctx.fill=function(){if(this.fillStyle!=='#8d704d')fill.call(this)};ctx.drawRoadSurfaces=()=>{};ctx.drawRoadTerrainPatch=()=>{}};
  const visibleImages=hideDistrict?Object.fromEntries(Object.entries(imgs).filter(([key])=>!districtPatches.some(p=>p.key===key))):imgs;
  m.drawHomeTerrain(ctx,visibleImages,undefined,0,{x:(frame.x-600)*s,y:(frame.y-600)*s,width:frame.width*s,height:frame.height*s});ctx.fill=fill;ctx.drawRoadSurfaces=roads;ctx.drawRoadTerrainPatch=pilot;ctx.restore();
 },{},{sources,streamRoads:false});
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 const world=m.createWorld(m.emptyLayout()),captures=[];
 const shot=async(name,rect,width=844,height=390,write=true)=>{
  if(write&&focus&&!focus.has(name))return Buffer.alloc(0);
  frame=rect;canvas.clientWidth=width;canvas.clientHeight=height;renderer.draw(world);
  const image=surface.makeImageSnapshot(),bytes=Buffer.from(image.encodeToBytes());image.delete();
  if(write){await sharp(bytes).webp({quality:94}).toFile(path.join(dir,name+'.webp'));captures.push({name,sourceBounds:rect})}return bytes;
 };
 if(process.argv.includes('--pilot-source')){
  const rect={x:4100,y:4000,width:1536,height:1024};
  await shot('pilot-guide',rect,1536,1024);
  hideRoads=true;await shot('pilot-ground',rect,1536,1024);hideRoads=false;
  renderer.dispose();process.exit(0);
 }
 if(process.argv.includes('--complete-check')){
  const [start,end]=(process.argv.find(a=>a.startsWith('--range='))?.slice(8)||'0:999').split(':').map(Number);
  const intersects=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  for(const p of completePatches.slice(start,end)){
   assert(!(p.key in m.EDITOR_ENTRY_IMAGES),'Full road blocks entry');
   if(process.argv.includes('--resume')&&fs.existsSync(path.join(dir,'installed-'+p.id+'.webp'))){captures.push({name:'installed-'+p.id,sourceBounds:p,reused:true});continue}
   const nearby=completePatches.filter(q=>intersects(p,q));
   renderer.releaseImages(completePatches.filter(q=>!nearby.includes(q)).map(q=>q.key));
   await renderer.loadImages(Object.fromEntries(nearby.map(q=>[q.key,`/survival/complete-roads-v1/${q.id}.webp`])));
   await shot('installed-'+p.id,p,p.width,p.height);console.log('Rendered '+p.id);
  }
  const camp={x:350,y:350,width:4100,height:4100};
  await renderer.loadImages(Object.fromEntries(completePatches.filter(q=>intersects(camp,q)).map(q=>[q.key,`/survival/complete-roads-v1/${q.id}.webp`])));
  hideRoads=true;const before=await shot('camp-before',camp,1000,1000,false);hideRoads=false;
  const after=await shot('complete-camp-preserved',camp,1000,1000,false);
  assert((await sharp(before).raw().toBuffer()).equals(await sharp(after).raw().toBuffer()),'Original camp changed');
  const coverage=JSON.parse(fs.readFileSync('docs/qa/complete-roads-v1/coverage.json','utf8'));
  assert.equal(coverage.routes.length,m.WORLD_ROADS.length);assert(coverage.routes.every(r=>r.uncovered===0));
  const result={result:'pass',range:[start,Math.min(end,completePatches.length)],captures:captures.length,campInteriorPixelIdentical:true,routes:m.WORLD_ROADS.length,bridgeReservations:new Set(crossings).size,quietAreas:m.WORLD_PLAN_QUIET.length,coverageSamples:coverage.routes.reduce((n,r)=>n+r.samples,0),uncovered:0};
  fs.writeFileSync(`docs/qa/complete-roads-v1/checks-${start}-${Math.min(end,completePatches.length)}.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));renderer.dispose();process.exit(0);
 }
 if(process.argv.includes('--complete-sources')){
  const [start,end]=(process.argv.find(a=>a.startsWith('--range='))?.slice(8)||'0:999').split(':').map(Number);
  for(const p of completePatches.slice(start,end)){if(fs.existsSync(path.join(dir,'source-'+p.id+'.webp')))continue;await shot('source-'+p.id,p,p.width,p.height);console.log('Captured '+p.id)}
  renderer.dispose();process.exit(0);
 }
 if(process.argv.includes('--camp-sources')){
  for(const patch of JSON.parse(fs.readFileSync('src/camp-road-patches.json','utf8'))){
   await shot('source-'+patch.id,patch,patch.width,patch.height);
   console.log('Captured '+patch.id);
  }
  renderer.dispose();process.exit(0);
 }
 if(process.argv.includes('--district-sources')||process.argv.includes('--district-check')){
  const installed=process.argv.includes('--district-check');
  const selected=process.argv.find(a=>a.startsWith('--patch='))?.slice(8);
  for(const p of districtPatches.filter(p=>!selected||p.id===selected)){
   assert(!(p.key in m.EDITOR_ENTRY_IMAGES),'District artwork blocks editor entry');
   await shot((installed?'installed-':'source-')+p.id,p,p.width,p.height);console.log('Rendered '+p.id);
  }
  if(installed){
   const seCore={x:4196,y:4096,width:1344,height:832};
   hideDistrict=true;const oldCore=await shot('exit-core-before',seCore,1008,624,false);hideDistrict=false;
   const newCore=await shot('district-southeast-core-preserved',seCore,1008,624);
   assert((await sharp(oldCore).raw().toBuffer()).equals(await sharp(newCore).raw().toBuffer()),'Approved southeast core changed');
   const camp={x:350,y:350,width:4100,height:4100};
   hideRoads=true;const before=await shot('camp-before',camp,1000,1000,false);hideRoads=false;
   const after=await shot('district-camp-preserved',camp,1000,1000);
   assert((await sharp(before).raw().toBuffer()).equals(await sharp(after).raw().toBuffer()),'Original camp interior changed');
   const result={result:'pass',newSections:districtPatches.length,renderedSelection:selected||'all',campInteriorPixelIdentical:true,approvedSoutheastCorePixelIdentical:true,addedEntryImages:0,roadSections:m.WORLD_ROADS.length,bridgeReservations:new Set(crossings).size,quietAreas:m.WORLD_PLAN_QUIET.length,limitations:'Renderer validation only; no browser or physical iPhone test. Outer exit feathering intentionally blends into the new extensions.'};
   fs.writeFileSync('docs/qa/district-road-patches-v1-checks.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
  }
  renderer.dispose();process.exit(0);
 }
 if(process.argv.includes('--camp-check')){
  for(const p of campPatches){await shot('installed-'+p.id,p,p.width,p.height);console.log('Rendered '+p.id)}
  const seRect={x:4000,y:3900,width:1800,height:1224};
  const se=await shot('approved-southeast-preserved',seRect,1500,1020);
  const encoded=await sharp(se).webp({quality:94}).toBuffer();
  assert(encoded.equals(fs.readFileSync(path.join(dir,'pilot-installed.webp'))),'Approved southeast rendering changed');
  const camp={x:350,y:350,width:4100,height:4100};
  hideRoads=true;const before=await shot('camp-before',camp,1000,1000,false);hideRoads=false;
  const after=await shot('all-exits-camp-preserved',camp,1000,1000);
  assert((await sharp(before).raw().toBuffer()).equals(await sharp(after).raw().toBuffer()),'Original camp interior changed');
  const result={result:'pass',campExitPatches:6,campInteriorPixelIdentical:true,approvedSoutheastPixelIdentical:true,addedEntryImages:0,roadSections:m.WORLD_ROADS.length,bridgeReservations:new Set(crossings).size,quietAreas:m.WORLD_PLAN_QUIET.length,limitations:'Renderer validation only; no browser or physical iPhone test.'};
  fs.writeFileSync('docs/qa/camp-road-patches-v1-checks.json',JSON.stringify(result,null,2)+'\n');
  renderer.dispose();console.log(JSON.stringify(result));process.exit(0);
 }
 if(process.argv.includes('--pilot-check')){
  const rect={x:4000,y:3900,width:1800,height:1224};
  await shot('pilot-installed',rect,1500,1020);
  const camp={x:350,y:350,width:4100,height:4100};
  hideRoads=true;const before=await shot('camp-before',camp,1000,1000,false);hideRoads=false;
  const after=await shot('pilot-camp-preserved',camp,1000,1000);
  assert((await sharp(before).raw().toBuffer()).equals(await sharp(after).raw().toBuffer()),'Pilot changes original camp interior');
  renderer.dispose();console.log(JSON.stringify({result:'pass',campInteriorPixelIdentical:true,pilotSourceBounds:{x:4100,y:4000,width:1536,height:1024},addedEntryImages:0,roadSections:m.WORLD_ROADS.length,bridgeReservations:new Set(crossings).size,quietAreas:m.WORLD_PLAN_QUIET.length}));process.exit(0);
 }
 await shot('world-overview',m.WORLD_PLAN_BOUNDS,1726,1726);
 for(const [name,x,y] of [['camp-northwest',230,90],['camp-northeast',4440,110],['camp-west',120,2720],['camp-southwest',110,4530],['camp-south',2620,4650],['camp-southeast',4590,4560],['village-junction',5100,-500],['east-junction',6600,4240],['logging-crossing',-3100,-1100],['southern-trail',2400,10100]])await shot(name,{x:x-600,y:y-300,width:1200,height:600},1000,500);
 for(const [name,x,y] of [['camp-stone-extension',5100,4540],['village-stone',4300,-2100],['logging-dark-earth',-5300,-2500],['waterworks-damp-earth',-3900,8000],['factory-gravel',10000,-2300],['salvage-gravel',8100,8400],['stone-to-earth',-1100,2770]])await shot(name,{x:x-600,y:y-300,width:1200,height:600},1000,500);
 // Original camp interior must remain exactly the same, including its painted roads.
 const camp={x:350,y:350,width:4100,height:4100};hideRoads=true;const before=await shot('camp-before',camp,1000,1000,false);hideRoads=false;const after=await shot('camp-preserved',camp,1000,1000);
 assert((await sharp(before).raw().toBuffer()).equals(await sharp(after).raw().toBuffer()),'The original camp interior was painted over');
 renderer.dispose();
 const result={result:'pass',stage:m.WORLD_ROAD_STAGE,roadSections:m.WORLD_ROADS.length,districtsConnected:m.WORLD_PLAN_DISTRICTS.length,bridgeReservations:new Set(crossings).size,quietAreas:m.WORLD_PLAN_QUIET.length,campInteriorPixelIdentical:true,addedEntryImages:0,backgroundRoadImages:m.WORLD_ROAD_MATERIALS.length,renderer:'Production CanvasKit software surface',captures,limitations:'No browser automation or physical iPhone test. Water, bridge artwork and district buildings remain future work.'};
 fs.writeFileSync(path.join(dir,'checks.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{globalThis.fetch=oldFetch;globalThis.window=oldWindow;process.type=oldType;fs.rmSync(temp,{recursive:true,force:true})}
