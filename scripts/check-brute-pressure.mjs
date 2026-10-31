import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'brute-pressure-'));
try{
 await build({stdin:{contents:"export * from './src/studio-play';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/play-spawns';export * from './src/brute-model';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(tmp,'model.cjs')),results=[];
 for(const radius of [90,165,260])for(const sign of [-1,1]){
  const w=m.createCampPlaySession({...m.emptyLayout(),spawn:{x:2200,y:2200}});w.survivalEnabled=false;w.animals=[];w.loot=[];m.spawnPlayCreature(w,'iron-brute',1);const e=w.enemies[0];Object.assign(e,{x:2200,y:2200,attackAt:0});Object.assign(w.player,{x:2200+radius,y:2200});let firstHit;
  for(let i=0;i<14.3/m.STEP&&w.player.hp>0;i++){
   const dx=w.player.x-e.x,dy=w.player.y-e.y,d=Math.hypot(dx,dy)||1,radial=Math.max(-.75,Math.min(.75,(radius-d)/35));
   m.stepCampPlaySession(w,{x:-dy/d*sign+dx/d*radial,y:dx/d*sign+dy/d*radial},false,false);
   if(w.player.hp<100&&firstHit===undefined)firstHit=m.timeOf(w);
  }
  const result={radius,sign,health:w.player.hp,damage:w.combatStats.damageTaken,firstHit};results.push(result);
  if(!process.argv.includes('--baseline'))assert(result.damage>0,'Continuous walking around the Brute must no longer avoid every attack: '+JSON.stringify(result));
 }
 console.log(JSON.stringify(results));if(!process.argv.includes('--baseline'))console.log('PASS: real movement simulation pressures clockwise and counterclockwise walkers at close, medium and claw range over the recording’s 14.3 seconds.');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
