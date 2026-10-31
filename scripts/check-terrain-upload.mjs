import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {File} from 'node:buffer';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'safety-last-terrain-'));
try{
 await build({entryPoints:['src/terrain-upload.ts'],outfile:path.join(dir,'check.mjs'),bundle:true,platform:'node',format:'esm'});
 const {prepareTerrainUpload}=await import(pathToFileURL(path.join(dir,'check.mjs')));
 for(const [name,type,size] of [['existing.webp','image/webp',100],['terrain-4800.png','image/png',49_891_187],['terrain.jpg','image/jpeg',14_000_000]]){
  const file=new File([new Uint8Array(size)],name,{type});assert.equal(await prepareTerrainUpload(file),file,'original bytes retained, with no iPhone canvas conversion');
 }
 await assert.rejects(prepareTerrainUpload(new File([new Uint8Array(1)],'tiles.zip',{type:'application/zip'})),/Unzip tile packs/);
 await assert.rejects(prepareTerrainUpload(new File([],'empty.png',{type:'image/png'})),/empty/);
 await assert.rejects(prepareTerrainUpload({type:'image/png',size:65*1024*1024}),/64 MB/);
 console.log('Terrain upload checks passed: 49.9MB PNG and standard raster uploads unchanged; no canvas/downscaling; type, empty-file and size guards.');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
