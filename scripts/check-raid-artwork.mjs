import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'raid-art-'));
try{
 await build({stdin:{contents:`export * from './src/editor-image-sources';export * from './src/gameplay-artwork';export * from './src/camp-siege';export * from './src/play-spawns';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temp,'test.cjs')),loaded={};let release;
 const ready=new Promise(resolve=>release=resolve);let prepared=false;
 const stream=new m.GameplayArtwork(async sources=>{await ready;Object.assign(loaded,sources)},()=>{});
 const w={player:{x:0,y:0},loot:[],animals:[],enemies:[],effects:[],progression:{},round:1,phase:'day'};
 const task=stream.update(m.gameplayImageSources(w)).then(()=>prepared=true);
 await Promise.resolve();assert.equal(prepared,false,'Play must wait for its current wave artwork');release();await task;
 for(let night=1;night<=m.NIGHT_WAVES.length;night++){
  w.round=night;await stream.update(m.gameplayImageSources(w));
  for(const kind of new Set(m.wavePlan(night)))for(const [key,url]of Object.entries(m.spawnImages(kind))){assert.equal(loaded[key],url,kind+' body prepared before this wave');assert.equal(m.EDITOR_IMAGE_SOURCES[key],url,'Native gameplay loads the same body');assert(fs.existsSync('public'+url));assert(!(key in m.EDITOR_ENTRY_IMAGES),'Robot loading must not block Build startup');}
 }
 stream.dispose();console.log('PASS: Each upcoming night wave prepares every robot direction before spawning; future waves do not block Build/Play startup.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
