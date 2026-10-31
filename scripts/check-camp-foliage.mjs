import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const sharp=createRequire(import.meta.url)('sharp'),out='docs/qa/foliage-v4',temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-foliage-check-'));
fs.mkdirSync(out,{recursive:true});
try{
 await build({stdin:{contents:`export * from './src/world-assets';export * from './src/world-layout';export * from './src/layout-limits';export * from './src/imported-art';export * from './src/foliage-trial';export * from './src/camp-foliage';export * from './src/foliage-motion';export * from './src/foliage-renderer';export * from './src/layout-views';export * from './src/studio-play';export * from './src/placed-world-renderer';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'test.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'test.mjs')));
 m.installImportedArt(JSON.parse(fs.readFileSync('docs/qa/foliage-v3/artwork-before.json')).records);
 const prior=m.addApprovedTerrainFoliage(JSON.parse(fs.readFileSync('docs/qa/foliage-v3/camp-before.json')).draft);
 const ownerExtra={...m.newPlacement('art_foliage_fern',1490,1800),id:'owner-extra-placement',scale:1.17};
 const before={...prior,name:'Current owner draft',items:[...prior.items,ownerExtra]};
 const encoded=JSON.stringify(before),layout=m.addApprovedCampFoliage(before),newPlants=layout.items.filter(p=>p.id.startsWith(m.CAMP_FOLIAGE_PREFIX));
 assert(newPlants.length>1700&&newPlants.length<3500,newPlants.length);
 assert.equal(JSON.stringify(before),encoded,'Input never mutated');
 assert.deepEqual(layout.items.slice(0,before.items.length),before.items,'Every existing object and edit survives');
 for(const key of ['name','spawn','terrainImage','terrainBorder','foliageTrialVersion','hqPropsVersion','campCentreVersion'])assert.deepEqual(layout[key],before[key]);
 assert.equal(layout.terrainFoliageVersion,1);assert.equal(m.addApprovedCampFoliage(layout),layout);
 assert.deepEqual(m.validateLayout(layout).errors,[]);assert.equal(m.validateLayout(JSON.parse(JSON.stringify(layout))).layout.terrainFoliageVersion,1);
 const deleted={...layout,items:layout.items.filter(p=>!p.id.startsWith(m.CAMP_FOLIAGE_PREFIX))};assert.equal(m.addApprovedCampFoliage(deleted),deleted,'No deleted plant resurrection');
 const moved={...layout,items:layout.items.map((p,i)=>i===layout.items.length-1?{...p,x:p.x+3,scale:1.22}:p)};assert.equal(m.addApprovedCampFoliage(moved),moved);
 assert.equal(m.addApprovedCampFoliage(m.emptyLayout()).items.length,0);
 const custom={...before,terrainImage:{...before.terrainImage,url:'/api/asset-files/other-terrain'}};assert.equal(m.addApprovedCampFoliage(custom),custom);
 assert(m.validateLayout({...layout,terrainFoliageVersion:3}).errors.length);
 assert(m.validateLayout({...layout,items:Array.from({length:m.MAX_LAYOUT_ITEMS+1},(_,i)=>({...newPlants[0],id:'overflow-'+i}))}).errors.length);
 assert(newPlants.some(p=>p.x<0||p.y<0||p.x>3394||p.y>3394),'Outer scenery is planted too');
 assert(m.validateLayout({...layout,items:[{...newPlants[0],assetId:'base_hearth_t1',x:-100}]}).errors.length,'Only foliage uses scenery bounds');
 for(const p of newPlants){assert.equal(p.solid,false);assert.equal(p.allowTransparency,false);assert.deepEqual(m.placementBodies(p),[]);assert(m.placementEditable(p,{x:p.x+1}));}
 for(let y=25;y<3370;y+=45)for(let x=25;x<3370;x+=45)assert.equal(m.layoutBlocked(layout,x,y),m.layoutBlocked(before,x,y),'Collision map unchanged');
 const target=newPlants.filter(p=>p.x>200&&p.x<3100&&p.y>200&&p.y<3100&&!m.layoutBlocked(layout,p.x,p.y)).sort((a,b)=>Math.hypot(a.x-650,a.y-2600)-Math.hypot(b.x-650,b.y-2600))[0];assert(target);
 const view={x:target.x-425,y:target.y-325,width:850,height:650,scale:1},visible=m.visiblePlacements(layout,view);
 assert(visible.length<layout.items.length*.25,'Viewport query is bounded');
 const expected=layout.items.filter(p=>!m.ASSET_BY_ID.get(p.assetId)?.foliage||m.foliageVisible(p,view));
 assert.deepEqual(new Set(visible.map(p=>p.id)),new Set(expected.map(p=>p.id)),'Conservative index matches visibility');
 assert.equal(new Set(visible.map(p=>p.id)).size,visible.length,'No duplicate draws at cell edges');
 const leafAssets=[...m.ASSET_BY_ID.values()].filter(a=>a.foliage);assert.equal(leafAssets.length,18);
 const newAssets=leafAssets.filter(a=>a.image.includes('foliage-v4'));assert.equal(newAssets.length,8);let bytes=0;
 for(const a of newAssets){const file='public'+a.image,meta=await sharp(file).metadata();assert(meta.hasAlpha);assert(meta.width<=384&&meta.height<=384);bytes+=fs.statSync(file).size;const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let x=0;x<info.width;x++){assert.equal(data[x*4+3],0);assert.equal(data[((info.height-1)*info.width+x)*4+3],0)}}
 assert(bytes<850000);
 const w=m.createCampPlaySession(layout);
 Object.assign(w.player,{x:target.x-16,y:target.y,moving:true,direction:'right'});for(let i=0;i<35;i++){w.tick++;m.stepFoliage(w,1/60)}assert(w.foliageMotions[target.id].x>0,'Contact pushes leaves');
 for(const a of newAssets){const p={...target,assetId:a.id},flat=structuredClone(m.foliageMesh(p,a,{x:0,y:0},0,true)),bent=m.foliageMesh(p,a,{x:.8,y:.3},1);for(let i=25;i<35;i++)assert.deepEqual(bent.positions[i],flat.positions[i]);}
 const images=Object.fromEntries(leafAssets.map(a=>[m.assetImageKey(a.image),{}]));let mesh=0,sprites=0;const ctx={save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(){sprites++},drawTexturedMesh(){mesh++}};
 for(const d of m.placedDrawables(ctx,images,w,true,{x:-600,y:-600,width:4600,height:4600,scale:.2}))d.draw();assert.equal(mesh,0,'Whole map avoids deformation meshes');assert(sprites>1700);
 sprites=mesh=0;for(const d of m.placedDrawables(ctx,images,w,true,view))d.draw();assert(mesh>0&&mesh<=220+Object.keys(w.foliageMotions).length);assert(mesh+sprites<500);
 w.weather={...w.weather,reducedMotion:true};m.stepFoliage(w,1/60);assert.equal(w.foliageMotions,undefined);
 const exportBytes=Buffer.byteLength(JSON.stringify(layout,null,2));assert(exportBytes<m.MAX_LAYOUT_BYTES);
 const report={result:'pass',fixture:'Version 100 reconstruction plus one simulated owner addition; live layout is migrated at runtime, never overwritten by this fixture.',preservedPlacements:before.items.length,newPlants:newPlants.length,totalPlants:layout.items.filter(p=>m.ASSET_BY_ID.get(p.assetId)?.foliage).length,totalObjects:layout.items.length,designs:18,newDesigns:8,newRuntimeBytes:bytes,formattedExportBytes:exportBytes,visibleObjects:visible.length,nearbyMeshDraws:mesh,checks:['all existing placements and metadata retained','idempotence and deletion','outer scenery bounds','unchanged collision map','exact conservative viewport query','rooted contact motion','reduced motion','whole-map static detail level','JSON round trip and limit enforcement'],limitations:'Software renderer only; live uploaded building textures and iPhone browser/device QA unavailable.'};
 fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(out+'/camp-after.json',JSON.stringify({fixtureNote:report.fixture,draft:layout})+'\n');
 console.log(JSON.stringify(report));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
