import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'play-spawns-'));
try{
 await build({stdin:{contents:`export * from './src/play-spawns';export * from './src/studio-play';export * from './src/survival-engine';export * from './src/world-layout';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'test.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(tmp,'test.cjs')),fresh=()=>{const w=m.createCampPlaySession({...m.emptyLayout(),spawn:{x:1500,y:1500}});w.animals=[];w.loot=[];return w};
 assert.equal(m.SPAWNABLES.length,11);assert(m.SPAWNABLES.some(s=>s.id==='scrap-walker'),'Humanoid Walker is spawnable');assert(m.SPAWNABLES.some(s=>s.id==='skitter'),'Laser Skitter is spawnable');assert(m.SPAWNABLES.some(s=>s.id==='iron-brute'),'Iron Brute is spawnable');assert(m.SPAWNABLES.some(s=>s.id==='scrap-hound'),'Scrap Hound is spawnable');
 for(const entry of m.SPAWNABLES){
  const w=fresh(),snapshot=JSON.stringify(w.layout),r=m.spawnPlayCreature(w,entry.id,3);assert.equal(r.spawned,3,entry.id);
  const entities=entry.group==='Robots'?w.enemies:w.animals;assert.equal(entities.length,3);
  for(const e of entities){assert(e.hp>0);assert(!m.worldBlocked(w,e.x,e.y,entry.group==='Robots'?18:26));assert(m.distance(e,w.player)>=160);assert(m.lineClear(w.player,e,w));if(entry.group==='Animals'){assert(e.spawnedForTest);assert(!e.wildlife,'Test animals have no habitat respawn slot');assert(e.chicken||e.rabbit||e.deer||e.predator)}}
  for(let i=0;i<50;i++)m.stepCampPlaySession(w,{x:0,y:0},false,false);assert.equal(JSON.stringify(w.layout),snapshot,'Spawn is isolated from authored map');
  assert(Object.keys(m.spawnImages(entry.id)).length>0);assert(fs.existsSync('public'+entry.image),'Thumbnail exists');
  m.clearPlaySpawns(w);assert.equal(w.enemies.length,0);assert.equal(w.animals.length,0);
 }
 const natural=fresh();natural.animals=[{x:1800,y:1800,id:natural.serial++,home:0,hp:32,maxHp:32,moving:false,right:false,flashUntil:0}];const id=natural.animals[0].id;m.spawnPlayCreature(natural,'rabbit',3);m.clearPlaySpawns(natural);assert.equal(natural.animals.length,1);assert.equal(natural.animals[0].id,id,'Clear preserves natural wildlife');
 const capped=fresh();for(let i=0;i<12;i++)m.spawnPlayCreature(capped,'rabbit',5);assert(capped.animals.length<=m.TEST_ANIMAL_LIMIT);assert(capped.animals.length>0);assert.equal(new Set(capped.animals.map(a=>a.id)).size,capped.animals.length);
 const stopped=fresh();stopped.phase='over';assert.equal(m.spawnPlayCreature(stopped,'wolf',1).spawned,0);assert.equal(m.spawnPlayCreature(m.createWorld(m.emptyLayout()),'rabbit',1).spawned,0);assert.equal(m.spawnPlayCreature(fresh(),'rabbit',5,{x:0,y:0,width:50,height:50}).spawned,0,'No offscreen fallback');
 console.log('PASS: all six animals, bomber, humanoid walker laser Skitter, Iron Brute and Scrap Hound spawn with active motion/state; visible clear positions, spacing, unique identities, cap, reset, thumbnail/image sources and unchanged authored map; clearing preserves natural wildlife.');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
