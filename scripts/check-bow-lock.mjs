import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'bow-lock-'));
try{
 await build({stdin:{contents:"export * from './src/survival-engine';export * from './src/bow-lock';export * from './src/world-layout';export * from './src/player-gear';export * from './src/field-kit';export * from './src/quick-items';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs')});
 const m=createRequire(import.meta.url)(path.join(temp,'test.cjs'));
 const make=()=>{const w=m.createWorld(m.emptyLayout());Object.assign(w.player,{x:1600,y:1600,direction:'left'});w.animals=[];w.enemies=[];w.breakables=[];m.selectQuickItem(w,'bow');return w};
 const animal=(id,x=1900,y=1710)=>({id,x,y,hp:100,maxHp:100,home:0,moving:false,right:true,flashUntil:0});
 const tick=(w,n=1)=>{for(let i=0;i<n;i++){w.tick++;m.stepBow(w)}};
 const sample=w=>new m.FieldKitController().sample(w);
 const wall=(w,x,y)=>{w.layout.items.push({...m.newPlacement('art_hq_storage_chest',x,y),id:'cover',solid:true,frame:{sourceAssetId:'art_hq_storage_chest',width:8,height:140,anchor:[.5,.5]},collision:{lineWidth:.01,paths:[{closed:true,points:[[0,0],[1,0],[1,1],[0,1]]}]}});m.invalidateLayoutCollision(w.layout)};
 // Precise off-axis acquisition works even when facing away, without snapping flight.
 const w=make();w.animals=[animal(1)];assert(m.toggleBowLock(w));assert.equal(sample(w).bowTarget.label,'WILDLIFE');assert.equal(sample(w).action.label,'SHOOT');assert(m.shootBow(w));assert(Math.abs(w.bowShot.angle-Math.atan2(110,300))<1e-12);assert.equal(w.bowShot.direction,'right');
 tick(w,25);assert.equal(w.gear.bag.arrows,40);tick(w,35);assert.equal(w.animals[0].hp,66);assert.equal(w.gear.bag.arrows,39);assert(m.bowLockTarget(w),'lock persists between shots');
 w.animals.push(animal(2,1650,1600));assert.equal(m.bowLockTarget(w).entity.id,1,'closer target never steals an established lock');
 assert(m.toggleBowLock(w));assert.equal(w.bowLock,undefined);assert.equal(sample(w).bowTarget,undefined);
 // Track the wind-up and lead a moving animal; the released arrow stays straight.
 const moving=make();moving.animals=[animal(4,1970,1630)];assert(m.toggleBowLock(moving));assert(m.shootBow(moving));let releasedAngle;
 for(let i=0;i<75;i++){
  const a=moving.animals[0];if(a)a.y+=1.8;
  tick(moving);
  if(moving.bowArrows.length){if(releasedAngle===undefined)releasedAngle=moving.bowArrows[0].angle;else assert.equal(moving.bowArrows[0].angle,releasedAngle)}
 }
 assert.equal(moving.animals[0].hp,66,'moving target is intercepted');assert.equal(moving.gear.bag.arrows,39);
 // Latest position is used when a target changes position before release.
 const relocated=make();relocated.animals=[animal(7)];m.toggleBowLock(relocated);m.shootBow(relocated);tick(relocated,25);relocated.animals[0].y=1850;tick(relocated);assert(Math.abs(relocated.bowArrows[0].angle-Math.atan2(250,300))<1e-12);
 // Every invalidation clears the selected target and never silently acquires another.
 for(const invalidate of [a=>a.animals[0].hp=0,a=>a.animals[0].x=3000,a=>a.animals=[],a=>a.player.equipped='woodenAxe',a=>a.player.hp=0,a=>a.player.downedUntil=10,a=>a.phase='over',a=>a.stationPanel='storage']){
  const a=make();a.animals=[animal(8)];m.toggleBowLock(a);invalidate(a);tick(a);assert.equal(a.bowLock,undefined);
 }
 const covered=make();covered.animals=[animal(9,1900,1600)];wall(covered,1750,1600);assert(!m.toggleBowLock(covered));assert.equal(covered.bowLock,undefined);assert.match(covered.notice,/No clear target/);
 const interrupted=make();interrupted.animals=[animal(10,1900,1600)];m.toggleBowLock(interrupted);m.shootBow(interrupted);tick(interrupted,20);wall(interrupted,1750,1600);tick(interrupted,80);assert.equal(interrupted.bowLock,undefined);assert.equal(interrupted.animals[0].hp,100,'new cover still blocks the released arrow');
 const empty=make();assert(!m.toggleBowLock(empty));empty.animals=[animal(11,3000,1600),{...animal(12),hp:0}];assert(!m.toggleBowLock(empty));
 const view=make();view.animals=[animal(13,1650,1300),animal(14,1900,1710)];m.setBowTargetView(view,{x:1500,y:1500,width:700,height:400,scale:1});assert(m.toggleBowLock(view));assert.equal(view.bowLock.id,14,'acquisition excludes offscreen animals');
 const noAmmo=make();noAmmo.animals=[animal(15)];noAmmo.gear.bag.arrows=0;assert(m.toggleBowLock(noAmmo));assert(sample(noAmmo).action.disabled);assert(!m.shootBow(noAmmo));assert.equal(noAmmo.gear.bag.arrows,0);
 const sameId=make();sameId.animals=[animal(20)];sameId.enemies=[{...animal(20,2000,1800),path:[],attackAt:999,repathAt:999}];m.toggleBowLock(sameId);sameId.animals=[];tick(sameId);assert.equal(sameId.bowLock,undefined,'target identities include their entity kind');
 console.log('PASS: exact off-axis shots; moving-target interception; fixed projectile heading; release-time tracking/ammo; stable target identity; toggle and lifecycle clearing; thin-cover blocking; visible-only acquisition; empty range and no ammo.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
