import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-foliage-'));
try{
 await build({stdin:{contents:`export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/foliage-trial';export * from './src/foliage-motion';export * from './src/foliage-renderer';export * from './src/studio-play';export * from './src/survival-engine';export * from './src/weather-model';export * from './src/placed-world-renderer';export {libraryAssets} from './src/asset-library-policy';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'test.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'test.mjs')));
 const source=JSON.parse(fs.readFileSync('docs/qa/foliage-v1/camp-before.json')).draft;
 m.installImportedArt(JSON.parse(fs.readFileSync('docs/qa/foliage-v1/artwork-before.json')).records);
 const original=JSON.stringify(source),layout=m.addApprovedFoliageTrial(source),plants=layout.items.filter(p=>p.id.startsWith(m.FOLIAGE_TRIAL_PREFIX)),fire=layout.items.find(p=>p.role==='hearth');
 assert.equal(plants.length,12);assert.deepEqual(layout.items.slice(0,source.items.length),source.items);assert.equal(JSON.stringify(source),original);
 assert.deepEqual(layout.spawn,source.spawn);assert.deepEqual(layout.terrainImage,source.terrainImage);assert.equal(layout.terrainBorder,source.terrainBorder);
 assert.equal(m.addApprovedFoliageTrial(layout),layout);assert.equal(m.addApprovedFoliageTrial({...layout,items:layout.items.filter(p=>!plants.includes(p))}).items.length,source.items.length,'Deleted foliage never respawns');
 assert.equal(m.addApprovedFoliageTrial(m.emptyLayout()).items.length,0,'Never decorate unrelated worlds');
 const changed={...source,items:source.items.map(p=>p===fire?{...p,x:1000}:p)};assert.equal(m.addApprovedFoliageTrial(changed),changed,'Do not guess if the bonfire moved away');
 assert.deepEqual(m.validateLayout(layout).errors,[]);assert.equal(m.validateLayout(layout).layout.foliageTrialVersion,1);
 assert(m.validateLayout({...layout,foliageTrialVersion:4}).errors.length);assert.equal(m.libraryAssets(m.WORLD_ASSETS).filter(a=>a.foliage).length,18);
 const files=m.requiredImages(plants.map(p=>p.assetId));assert.equal(Object.keys(files).length,3,'Repeated plants reuse just three textures');
 for(const p of plants){
  assert.equal(p.solid,false);assert.equal(p.layer,0);assert.deepEqual(m.placementBodies(p),[]);
  const b=m.placementBounds(p);assert(b.height<75,'Below waist height');
  assert(b.x+b.width<fire.x-170,'Food drop area stays visually clear');
 }
 for(let x=1200;x<1600;x+=8)for(let y=1550;y<1880;y+=8)assert.equal(m.layoutBlocked(layout,x,y),m.layoutBlocked(source,x,y),'All routes remain passable');
 const testPlant={...m.newPlacement('art_foliage_fern',600,600),id:'spring-test'},testLayout={...m.emptyLayout(),spawn:{x:550,y:600},items:[testPlant]},testBefore=JSON.stringify(testLayout);
 function pushed(sprint=false){const w=m.createCampPlaySession(testLayout);Object.assign(w.player,{x:584,y:600,moving:true,sprinting:sprint,direction:'right'});for(let i=0;i<32;i++){w.tick++;m.stepFoliage(w,m.STEP)}return w}
 const walk=pushed(),run=pushed(true);assert(walk.foliageMotions[testPlant.id].x>.1);assert(run.foliageMotions[testPlant.id].x>walk.foliageMotions[testPlant.id].x*1.4,'Sprint pushes further');
 Object.assign(walk.player,{x:1000,y:1000,moving:false});for(let i=0;i<240;i++){walk.tick++;m.stepFoliage(walk,m.STEP)}assert.equal(walk.foliageMotions,undefined,'Settled plants sleep without retaining active state');
 m.setWorldWeather(run,m.CLEAR_WEATHER,true);m.stepFoliage(run,m.STEP);assert.equal(run.foliageMotions,undefined,'Reduced motion suppresses contact motion');
 const w=m.createCampPlaySession(testLayout);for(let i=0;i<90;i++)m.stepCampPlaySession(w,{x:1,y:0},false,false);assert(w.player.x>850,'Can walk straight through plants');
 assert.equal(JSON.stringify(testLayout),testBefore,'Playing never changes the saved plant');assert(!testLayout.foliageMotions,'Springs never become saved placement state');
 const a=m.ASSET_BY_ID.get(testPlant.assetId),zero=structuredClone(m.foliageMesh(testPlant,a,{x:0,y:0},0,true)),bent=m.foliageMesh(testPlant,a,{x:1,y:.5},.9);
 for(let i=25;i<35;i++)assert.deepEqual(bent.positions[i],zero.positions[i],'Roots and lower contact pixels stay fixed');
 assert(bent.positions[2].x>zero.positions[2].x+10);assert.equal(bent.positions.length,35);assert.equal(bent.indices.length,144);
 assert.equal(m.foliageVisible(testPlant,{x:0,y:0,width:50,height:50}),false);assert(m.foliageVisible({...testPlant,rotation:45},{x:500,y:500,width:200,height:200}));
 const drawWorld=m.createCampPlaySession(testLayout),calls=[],ctx={save(){},restore(){},drawTexturedMesh(){calls.push('plant')},drawImage(){calls.push('plant')},translate(){},rotate(){},scale(){}};
 const images={[m.assetImageKey(a.image)]:{}};let draws=m.placedDrawables(ctx,images,drawWorld,true,{x:0,y:0,width:100,height:100});assert.equal(draws.length,0,'Offscreen plants issue no draw');
 for(const playerY of [590,610]){calls.length=0;drawWorld.player.y=playerY;draws=m.placedDrawables(ctx,images,drawWorld,true);draws.push({y:playerY,draw:()=>calls.push('player')});draws.sort(m.compareWorldDrawables).forEach(d=>d.draw());assert.deepEqual(calls,playerY<600?['player','plant']:['plant','player'],'Natural front/behind ordering');}
 const deleted={...drawWorld.layout,items:[]};drawWorld.foliageMotions={'spring-test':{x:1,y:0,vx:0,vy:0,lastTouch:0}};drawWorld.layout=deleted;m.stepFoliage(drawWorld,m.STEP);assert.equal(drawWorld.foliageMotions,undefined);
 // No decoding surfaces or image readback in foliage; validate real alpha once here.
 let totalBytes=0;for(const url of Object.values(files)){const file='public'+url,metadata=await sharp(file).metadata();assert(metadata.hasAlpha);assert(metadata.width<=384);totalBytes+=fs.statSync(file).size;const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let x=0;x<info.width;x++){assert.equal(data[x*4+3],0);assert.equal(data[((info.height-1)*info.width+x)*4+3],0)}}
 assert(totalBytes<300000);
 // A large future scene still touches only a local handful of plants.
 const many={...m.emptyLayout(),items:Array.from({length:600},(_,i)=>({...testPlant,id:'many-'+i,x:100+(i%25)*130,y:100+Math.floor(i/25)*130}))};
 const manyWorld=m.createCampPlaySession(many);Object.assign(manyWorld.player,{x:230,y:230,moving:true});const started=performance.now();for(let i=0;i<1200;i++){manyWorld.tick++;m.stepFoliage(manyWorld,m.STEP)}const elapsed=performance.now()-started;assert(Object.keys(manyWorld.foliageMotions).length>0);assert(Object.keys(manyWorld.foliageMotions).length<10);
 fs.mkdirSync('.qa',{recursive:true});fs.writeFileSync('.qa/camp-with-foliage.json',JSON.stringify(layout));
 fs.writeFileSync('docs/qa/foliage-v1/verification.json',JSON.stringify({result:'pass',preservedPlacements:source.items.length,plants:plants.length,sharedTextures:3,runtimeTextureBytes:totalBytes,simulationStress:{plants:600,steps:1200,totalMilliseconds:Math.round(elapsed*100)/100,note:'Container CPU microbenchmark, not iPhone FPS'},renderer:'Fixed-root mesh with 35 vertices/48 triangles; viewport culled; automatic feet-depth sorting',limits:'No real iPhone or browser QA in this environment'},null,2)+'\n');
 console.log(`PASS foliage: 12 plants, ${source.items.length} existing placements unchanged; passability, drop clearance, three library textures (${totalBytes} bytes), spring/sprint/recovery, reduced motion, fixed roots, culling, depth, save/import marker and deletion persistence. 600-plant / 1200-step CPU check: ${elapsed.toFixed(2)}ms (not device FPS).`);
}finally{fs.rmSync(temp,{recursive:true,force:true})}
