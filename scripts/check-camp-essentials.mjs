import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-essentials-check-'));
try{
 await build({stdin:{contents:`export * from './src/world-assets';export * from './src/world-layout';export * from './src/catalogue-model';export * from './src/imported-art';export * from './src/asset-collision';export * from './src/artwork-reskins';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'check.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'check.mjs')));
 for(const id of ['base_well_t1','base_medical_t2']){
  const a=m.ASSET_BY_ID.get(id),e=m.entries.find(e=>e.id===id);
  assert(a&&e.art&&e.exportComplete&&e.image===a.image,`${id} is available in both library and editor`);
  const meta=await sharp('public'+a.image).metadata();assert(meta.hasAlpha);assert.deepEqual(a.crop,[0,0,meta.width,meta.height]);
  for(const url of Object.values(m.requiredImages([id])))assert(fs.existsSync('public'+url));
  assert.deepEqual(m.validateLayout({...m.emptyLayout(),items:[m.newPlacement(id,2200,2200)]}).errors,[]);
 }
 const p=m.newPlacement('base_medical_t2',2200,2200),a=m.ASSET_BY_ID.get(p.assetId),layout={...m.emptyLayout(),items:[p]},b=m.placementBounds(p);
 assert.equal(m.collisionError(a.collision),'');
 // Check a continuous character-width approach, including radius at the bed edges.
 const route=[[.47,.95],[.47,.88],[.47,.80],[.47,.75],[.49,.70],[.51,.66]];
 for(let i=1;i<route.length;i++)for(let n=0;n<=10;n++){
  const q=n/10,x=route[i-1][0]*(1-q)+route[i][0]*q,y=route[i-1][1]*(1-q)+route[i][1]*q;
  assert(!m.layoutBlocked(layout,b.x+x*b.width,b.y+y*b.height,19),`Character can approach between beds at ${x},${y}`);
 }
 assert(m.layoutBlocked(layout,b.x+.32*b.width,b.y+.68*b.height,19),'Bed footprint blocks movement');
 assert(m.layoutBlocked(layout,b.x+.79*b.width,b.y+.78*b.height,19),'Medical supplies block movement');
 const file={id:'0f5d7810-ce86-4fbc-837b-e5f2ad8aac9f',url:'/api/asset-files/0f5d7810-ce86-4fbc-837b-e5f2ad8aac9f',name:'camp-well-t1.png',mime:'image/png',width:1091,height:1012,bytes:1843358};
 const config={kind:'sprite',base:file,frames:[],fps:8,worldWidth:138,anchor:[471/1091,995/1012],solid:true,footprint:{width:.6,depth:.2},collision:{lineWidth:.012,paths:[{closed:true,points:[[.1,.6],[.8,.6],[.5,.98]]}]}};
 const record={id:'base_well_t1',revision:1,updatedAt:'2026-10-06T19:02:53.703Z',config},reskin=m.resolveArtworkReskin(record);
 assert.equal(reskin.config.base.url,m.ASSET_BY_ID.get(record.id).image);
 for(const key of ['anchor','worldWidth','collision','footprint'])assert.deepEqual(reskin.config[key],config[key],`Saved well ${key} preserved`);
 assert.equal(reskin.config.base.width,file.width);assert.equal(reskin.config.base.height,file.height);
 const imported=m.importedWorldAsset(record);assert.equal(imported.width,138);assert.equal(imported.role,'well');assert.deepEqual(imported.anchor,[471,995]);
 assert.equal(m.withImportedArt(m.entries.find(e=>e.id===record.id),record).image,reskin.config.base.url);
 const future={...record,config:{...config,base:{...file,id:'future-user-upload',url:'/api/asset-files/future-user-upload'}}};
 assert.equal(m.resolveArtworkReskin(future),future,'A future replacement upload takes priority');
 console.log('PASS: library/editor artwork, alpha dimensions, placement validation, continuous 38-unit-wide treatment approach, bed/supply blockers, preserved imported-well geometry and future upload priority.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
