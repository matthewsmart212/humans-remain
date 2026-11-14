import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'furnace-art-'));
try{
 const modules=['world-assets','world-layout','furnace-animation-art','furnace-renderer','camp-restoration','run-progression','studio-play','authored-world','imported-art','expedition-inventory','camp-materials','camp-furnace','ironworks-data','editor-image-sources','placed-world-renderer'];
 await build({stdin:{contents:modules.map(id=>`export * from './src/${id}';`).join(''),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error'});
 const m=require(path.join(temp,'model.cjs'));
 const saved=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
 m.installImportedArt(saved.records);
 const layout=m.prepareAuthoredWorld(saved.layout),world=m.createCampPlaySession(layout);
 const p=layout.items.find(item=>item.assetId===m.FURNACE_ID),original=JSON.stringify(p);
 const asset=m.ASSET_BY_ID.get(p.assetId);
 assert.equal(asset.image,m.FURNACE_COLD_IMAGE);
 const sources={...m.EDITOR_IMAGE_SOURCES,...m.requiredImages([p.assetId])};
 const images=Object.fromEntries(Object.entries(sources).map(([key,src])=>[key,{src}]));
 const station=m.furnaceState(world,p.id);
 const render=()=>{
  const calls=[];
  const ctx=new Proxy({globalAlpha:1,drawImage:image=>calls.push(image.src)},{get:(object,key)=>key in object?object[key]:()=>{}});
  m.placedDrawables(ctx,images,{...world,layout:{...layout,items:[p]}}).forEach(item=>item.draw());
  return calls;
 };
 assert(render().includes(m.FURNACE_COLD_IMAGE),'Repaired empty furnace stays cold');
 station.fuel=60;station.queue=[{id:1,recipe:'ore',remaining:20}];
 for(let i=0;i<16;i++){
  world.tick=i*14.4+.01;
  assert(render().includes(m.FURNACE_ACTIVE_FRAMES[i]),`Working frame ${i}`);
 }
 assert(m.furnaceLights(world).length>0);
 world.weather.reducedMotion=true;world.tick=100;
 assert(render().includes(m.FURNACE_ACTIVE_FRAMES[0]),'Reduced motion uses a stable working frame');
 world.weather.reducedMotion=false;station.fuel=0;
 assert(render().includes(m.FURNACE_COLD_IMAGE),'Fuel exhaustion extinguishes the furnace');
 assert.equal(m.furnaceLights(world).length,0);
 station.fuel=60;station.queue=[];station.ready=2;
 assert(render().includes(m.FURNACE_COLD_IMAGE),'Finished batches stop fire and smoke');
 assert(render().includes(m.IRONWORKS_IMAGES.ironIngot),'Finished ingots remain visible');
 m.startExpedition(world);
 world.progression.campLevel=2;
 world.progression.furnaceRestored=false;
 world.progression.restoredBuildings=m.CAMP_BUILDING_IDS.filter(id=>id!=='furnace');
 assert(render().includes(m.FURNACE_BROKEN_IMAGE),'Broken furnace uses the approved ruin');
 world.player.equipped='repairHammer';world.stationPanel=undefined;
 Object.assign(world.player,m.campRepairSite(world,'furnace'));
 for(const [id,count] of Object.entries(m.CAMP_REPAIRS.furnace.cost))m.setItemCount(world,id,count);
 assert(m.restoreCampBuilding(world,'furnace'),'Existing repair action restores the furnace');
 assert(render().includes(m.FURNACE_COLD_IMAGE));
 assert.equal(JSON.stringify(p),original,'Artwork states retain the saved footprint');
 const kit=await require('canvaskit-wasm')({locateFile:file=>path.join(path.dirname(require.resolve('canvaskit-wasm')),file)});
 const native=fs.readFileSync('native/furnace-animation-art.ts','utf8');
 for(const url of [m.FURNACE_COLD_IMAGE,m.FURNACE_BROKEN_IMAGE,...m.FURNACE_ACTIVE_FRAMES]){
  assert(Object.values(sources).includes(url),`Preloaded ${url}`);
  assert(native.includes(`require('../public${url}')`),`Bundled offline ${url}`);
  const image=kit.MakeImageFromEncoded(fs.readFileSync('public'+url));
  assert(image);assert.equal(image.width(),627);assert.equal(image.height(),627);image.delete();
 }
 console.log('PASS: broken/repair/cold/working/ready states, all 16 frames, fuel shutdown, reduced motion, unchanged placement, offline mappings and Skia decoding.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
