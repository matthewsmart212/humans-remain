import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const require=createRequire(import.meta.url);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'workshop-art-'));
try{
 const modules=['world-assets','world-layout','workshop-animation-art','camp-restoration','run-progression','studio-play','authored-world','imported-art','expedition-inventory','camp-materials','camp-smithy','headquarters-model','placed-world-renderer','step-on-animation'];
 await build({stdin:{contents:modules.map(id=>`export * from './src/${id}';`).join(''),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error'});
 const m=require(path.join(temp,'model.cjs'));
 const saved=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
 m.installImportedArt(saved.records);
 const layout=m.prepareAuthoredWorld(saved.layout);
 const world=m.createCampPlaySession(layout,undefined,'survival');
 const placement=layout.items.find(p=>p.assetId==='base_workshop_t1');
 const originalPlacement=JSON.stringify(placement);
 const asset=m.ASSET_BY_ID.get(placement.assetId);
 assert.equal(asset.image,m.WORKSHOP_IDLE_FRAMES[0]);
 assert.equal(asset.frames.length,16);
 assert.equal(asset.fps,25/6);
 assert.equal(m.campBuildingArt(world,placement.assetId).image,m.WORKSHOP_BROKEN_IMAGE);
 const images=Object.fromEntries(Object.entries(m.requiredImages([placement.assetId])).map(([key,src])=>[key,{src}]));
 const draw=()=>{
  const calls=[];
  const ctx=new Proxy({globalAlpha:1,drawImage:(image)=>calls.push(image.src)},{get:(object,key)=>key in object?object[key]:()=>{}});
  m.placedDrawables(ctx,images,{...world,layout:{...world.layout,items:[placement]}}).forEach(item=>item.draw());
  return calls;
 };
 assert(draw().includes(m.WORKSHOP_BROKEN_IMAGE));
 assert(!draw().some(url=>m.WORKSHOP_IDLE_FRAMES.includes(url)));
 Object.assign(world.player,m.headquartersDock(m.headquartersBench(world)));
 assert(m.openHeadquarters(world));
 m.setItemCount(world,'pallets',4);
 assert(m.restoreCampBuilding(world,'headquarters'));
 world.stationPanel=undefined;
 world.player.equipped='repairHammer';
 Object.assign(world.player,m.campRepairSite(world,'workshop'));
 m.setItemCount(world,'pallets',3);
 assert(m.restoreCampBuilding(world,'workshop'));
 assert(m.buildingRestored(world,'workshop'));
 assert.equal(m.campBuildingArt(world,placement.assetId),undefined);
 for(let frame=0;frame<16;frame++){
  world.tick=frame*14.4+.01;
  assert(draw().includes(m.WORKSHOP_IDLE_FRAMES[frame]),`Repaired frame ${frame}`);
 }
 world.progression.buildingHp.workshop=0;
 assert(draw().includes(m.WORKSHOP_BROKEN_IMAGE),'Destroyed workshop returns to broken art');
 assert.equal(JSON.stringify(placement),originalPlacement,'Repair and animation retain authored geometry');
 const native=fs.readFileSync('native/workshop-animation-art.ts','utf8');
 const kit=await require('canvaskit-wasm')({locateFile:file=>path.join(path.dirname(require.resolve('canvaskit-wasm')),file)});
 for(const url of [...m.WORKSHOP_IDLE_FRAMES,m.WORKSHOP_BROKEN_IMAGE]){
  assert(Object.values(images).some(image=>image.src===url),`Preload ${url}`);
  assert(native.includes(`require('../public${url}')`),`Offline iOS module ${url}`);
  const image=kit.MakeImageFromEncoded(fs.readFileSync('public'+url));
  assert(image,`Skia decodes ${url}`);
  assert.equal(image.width(),627);assert.equal(image.height(),627);image.delete();
 }
 console.log('PASS: repair flow, all 16 rendered idle frames, destruction fallback, unchanged placement, full preload, offline iOS mappings and Skia decoding.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
