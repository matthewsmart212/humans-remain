import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'walker-balance-'));
try{
 await build({stdin:{contents:"export * from './src/studio-play';export * from './src/studio-combat';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/combat-model';export * from './src/enemy-types';export * from './src/walker-sprites';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(tmp,'model.cjs'));
 const fresh=()=>{const w=m.createCampPlaySession({...m.emptyLayout(),spawn:{x:1200,y:1200}});w.survivalEnabled=false;w.animals=[];w.loot=[];w.player.equipped='fists';w.tools.bat=true;return w};
 const tick=(w,n=1,held=false)=>{for(let i=0;i<n;i++)m.stepCampPlaySession(w,{x:0,y:0},false,held)};
 const spawn=w=>{assert.equal(m.spawnCombatEnemies(w,'scrap-walker',1).spawned,1);const e=w.enemies[0];Object.assign(e,{x:1200,y:1200,attackAt:0});Object.assign(w.player,{x:1260,y:1200,direction:'left'});return e};
 for(const phase of ['chase','windup','strike','recover']){
  const w=fresh(),e=spawn(w);Object.assign(e.motion,{phase,since:m.timeOf(w),angle:0,direction:'right',resolved:false});const before={hp:e.hp,x:e.x,since:e.motion.since,deadline:e.attackAt};
  assert(m.attack(w));assert.equal(e.hp,before.hp-11,'Fists glance off metal armour');assert.equal(e.motion.phase,phase,'Fists cannot force stagger');assert.equal(e.motion.since,before.since);assert.equal(e.motion.resolved,false);assert.equal(e.attackAt,before.deadline);assert(Math.abs(e.x-before.x)<=2.01,'Fist knockback is resisted');assert.equal(w.combatStats.interrupts,0);
  if(phase==='windup')assert.equal(m.walkerFrame(e,m.timeOf(w)),4,'Damage flash cannot hide the committed punch pose');
 }
 const trade=fresh(),te=spawn(trade);let frames=0;
 while(frames<1200&&trade.player.hp>0&&te.hp>0){tick(trade,1,true);frames++}
 assert.equal(trade.player.hp,0,'Standing still and spamming fists loses against an armoured Walker');assert(te.hp>0);assert.equal(trade.kills,0);assert.equal(trade.combatStats.interrupts,0);assert(trade.combatStats.damageDealt>0,'Fists still deal some damage');
 const armed=fresh(),ae=spawn(armed);armed.gear.bag.axe=1;armed.player.equipped='axe';tick(armed);assert(m.swingAxe(armed));tick(armed,17);assert.equal(ae.hp,m.ENEMY_TYPES['scrap-walker'].health-40,'Weapon damage stays effective');assert.equal(ae.motion.phase,'stagger');assert.equal(armed.combatStats.interrupts,1);assert.equal(armed.player.hp,100);
 const chase=fresh(),ce=spawn(chase);Object.assign(ce,{x:1700,y:1200,attackAt:100});Object.assign(chase.player,{x:1200,y:1200});const before=ce.x;tick(chase,60);assert(Math.abs(before-ce.x-200)<4,'Walker closes about 200 world pixels per second');
 const bomber=fresh();m.spawnCombatEnemies(bomber,'scrap-bomber',1);const be=bomber.enemies[0];Object.assign(be,{x:1200,y:1200});Object.assign(bomber.player,{x:1260,y:1200});assert(m.attack(bomber));assert.equal(be.hp,48,'Bomber fist damage is preserved');
 console.log('PASS: armoured fist damage, resisted shove, no punch stun-lock or deadline reset, full weapon damage/interruption, faster pursuit, unchanged bomber damage. Unarmed trading: player down after '+(frames*m.STEP).toFixed(2)+'s; Walker has '+te.hp+' health.');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
