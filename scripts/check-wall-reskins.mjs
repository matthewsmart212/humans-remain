import {build} from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),sharp=require('sharp');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wall-reskins-'));
try{
 await build({stdin:{contents:`export * from './src/artwork-reskins';export * from './src/imported-art';export * from './src/world-assets';`,resolveDir:process.cwd()},outfile:path.join(dir,'test.mjs'),bundle:true,platform:'node',format:'esm'});
 const m=await import(pathToFileURL(path.join(dir,'test.mjs')));
 const manifest=JSON.parse(fs.readFileSync('src/wall-artwork-replacements.json'));
 const records=JSON.parse(fs.readFileSync(process.argv[2])).records;
 assert.equal(manifest.length,8);
 for(const target of manifest){
  const r=records.find(r=>r.id===target.entryId);assert(r);
  const saved=JSON.stringify(r),resolved=m.resolveArtworkReskin(r);
  assert.equal(JSON.stringify(r),saved,'resolution must not mutate saved artwork');
  assert.equal(resolved.id,r.id);assert.equal(resolved.revision,r.revision);
  assert.deepEqual({...resolved.config,base:r.config.base},r.config,'all gameplay settings retained');
  assert.equal(resolved.config.base.width,target.width);
  assert.equal(resolved.config.base.height,target.height);
  const before=m.importedWorldAsset({...r,config:{...r.config,base:{...r.config.base,id:'future-upload'}}}),after=m.importedWorldAsset(r);
  for(const key of ['width','height','solid','body','collision','allowTransparency','role'])assert.deepEqual(after[key],before[key],`${target.name}: ${key} changed`);
  assert.equal(after.anchor[0]/after.crop[2],before.anchor[0]/before.crop[2]);assert.equal(after.anchor[1]/after.crop[3],before.anchor[1]/before.crop[3]);
  const replacement={...r,config:{...r.config,base:{...r.config.base,id:'new-user-file',url:'/api/asset-files/new-user-file'}}};
  assert.equal(m.resolveArtworkReskin(replacement),replacement,'later user uploads take priority');
  const image=sharp('public'+target.url),meta=await image.metadata(),stats=await image.stats();
  assert.equal(meta.width,target.width);assert.equal(meta.height,target.height);assert(meta.hasAlpha);assert.equal(stats.channels[3].min,0);assert.equal(stats.channels[3].max,255);
  assert.equal(fs.statSync('public'+target.url).size,target.bytes);
 }
 m.installImportedArt(records);
 for(const t of manifest){const asset=m.ASSET_BY_ID.get(t.entryId);assert.equal(asset.image,t.url);assert.equal(m.requiredImages([t.entryId])[m.assetImageKey(t.url)],t.url);assert.deepEqual(m.imageDimensions[t.url],[t.width,t.height]);}
 console.log('All 8 wall reskins: transparent 2× canvases, unchanged world sizes/anchors/collisions, same placement IDs, cached records resolve correctly, future uploads remain replaceable.');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
