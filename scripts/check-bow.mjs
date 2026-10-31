import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'bow-check-'));
try{
 await build({stdin:{contents:`export * from './src/survival-engine';export * from './src/studio-play';export * from './src/world-layout';export * from './src/quick-items';export * from './src/player-gear';export * from './src/backpack';export * from './src/chest-inventory';export * from './src/field-kit';export * from './src/bow-combat';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs')});
 const m=require(path.join(temp,'test.cjs'));
 const make=()=>{const w=m.createWorld(m.emptyLayout());Object.assign(w.player,{x:1600,y:1600,direction:'right'});w.animals=[];w.breakables=[];w.enemies=[];return w};
 const enemy=(id,x,y=1600)=>({id,x,y,hp:100,maxHp:100,attackAt:999,path:[],repathAt:999,flashUntil:0});
 const tick=(w,n=1)=>{for(let i=0;i<n;i++){w.tick++;m.stepBow(w)}};
 const snapshot=w=>new m.FieldKitController().sample(w);
 const w=make();assert(m.selectQuickItem(w,'bow'));assert.equal(snapshot(w).action.label,'SHOOT');
 assert(m.backpackItems(snapshot(w)).some(i=>i.id==='arrows'&&i.count===40));assert(m.availableQuickItems(snapshot(w)).some(i=>i.id==='bow'));
 w.enemies=[enemy(1,1850),enemy(2,1930)];assert(m.attack(w));assert(!m.selectQuickItem(w,'fists'));
 tick(w,25);assert.equal(w.gear.bag.arrows,40);assert(w.enemies.every(e=>e.hp===100));
 tick(w);assert.equal(w.gear.bag.arrows,39);assert.equal(w.bowArrows.length,1);assert(w.enemies.every(e=>e.hp===100));
 tick(w,25);assert.equal(w.enemies[0].hp,66);assert.equal(w.enemies[1].hp,100);assert.equal(w.bowArrows.length,0);assert(!w.bowShot);assert.equal(w.gear.bag.arrows,39);
 tick(w,4);assert(m.selectQuickItem(w,'fists'));assert(m.selectQuickItem(w,'bow'));w.gear.bag.arrows=0;
 assert(!m.attack(w));assert.equal(snapshot(w).action.disabled,true);assert(m.availableQuickItems(snapshot(w)).some(i=>i.id==='bow'),'empty bow remains selectable');assert.equal(m.quickItemCount('bow',0,0,0,0),0);
 for(const direction of Object.keys(m.DIRECTION_ANGLES)){
  const a=make(),angle=m.DIRECTION_ANGLES[direction];a.player.direction=direction;m.selectQuickItem(a,'bow');a.enemies=[enemy(1,1600+Math.cos(angle)*240,1600+Math.sin(angle)*240)];assert(m.attack(a));
  const start={x:a.player.x,y:a.player.y};m.movePlayer(a,{x:1,y:0},true);assert.deepEqual({x:a.player.x,y:a.player.y},start);assert.equal(a.player.direction,direction);
  tick(a,55);assert.equal(a.enemies[0].hp,66,'direction '+direction);m.movePlayer(a,{x:1,y:0});assert(a.player.moving,'movement resumes after recovery');
 }
 for(const interrupt of [a=>a.player.equipped=null,a=>a.player.downedUntil=10,a=>a.player.hp=0]){
  const a=make();m.selectQuickItem(a,'bow');m.attack(a);interrupt(a);tick(a,35);assert(!a.bowShot);assert.equal(a.gear.bag.arrows,40);assert.equal(a.bowArrows.length,0);
 }
 const wall=make();m.selectQuickItem(wall,'bow');wall.enemies=[enemy(1,1830)];
 wall.layout.items.push({...m.newPlacement('art_hq_storage_chest',1700,1600),id:'wall',solid:true,frame:{sourceAssetId:'art_hq_storage_chest',width:8,height:120,anchor:[.5,.5]},collision:{lineWidth:.01,paths:[{closed:true,points:[[0,0],[1,0],[1,1],[0,1]]}]}});m.invalidateLayoutCollision(wall.layout);
 m.attack(wall);tick(wall,100);assert.equal(wall.enemies[0].hp,100);assert.equal(wall.bowArrows.length,0);
 const hunting=make();m.selectQuickItem(hunting,'bow');hunting.animals=[{id:22,x:1850,y:1600,hp:34,home:0,moving:false,right:true,flashUntil:0}];m.attack(hunting);tick(hunting,80);assert.equal(hunting.loot.filter(l=>l.kind==='rawMeat').length,1);tick(hunting,80);assert.equal(hunting.loot.filter(l=>l.kind==='rawMeat').length,1);
 const miss=make();m.selectQuickItem(miss,'bow');m.attack(miss);tick(miss,110);assert.equal(miss.bowArrows.length,0,'miss expires at range');assert.equal(miss.gear.bag.arrows,39);
 const chest={...m.newPlacement('art_hq_storage_chest',1600,1600),id:'chest'};
 const storage=m.createWorld({...m.emptyLayout(),spawn:{x:1600,y:1690},items:[chest]});storage.animals=[];
 assert.equal(m.moveChestItem(storage,'arrows','pack','all'),40);assert.equal(storage.gear.bag.arrows,0);assert.equal(m.moveChestItem(storage,'arrows','chest',25),25);assert.equal(storage.gear.bag.arrows,25);assert(!m.equipGear(storage,'arrows'));
 for(const step of [a=>m.stepWorld(a,{x:0,y:0}),a=>m.stepCampPlaySession(a,{x:0,y:0},false,false)]){
  const a=make();m.selectQuickItem(a,'bow');a.enemies=[enemy(1,1850)];m.attack(a);for(let i=0;i<55;i++)step(a);assert.equal(a.enemies[0].hp,66,'shared simulation loop fires delayed projectile');
 }
 const native=fs.readFileSync('native/bow-art.ts','utf8');for(const dir of ['up','up-right','right','down-right','down'])assert(native.includes('/'+dir+'.webp'));for(const dir of ['up-left','left','down-left'])assert(!native.includes('/'+dir+'.webp'));
 assert.equal(m.arrowCircleHit({x:0,y:0},{x:100,y:0},{x:50,y:0},5),.45);assert.equal(m.arrowCircleHit({x:0,y:0},{x:100,y:0},{x:50,y:20},5),undefined);
 console.log('PASS: eight-direction projectiles, timed ammo/release, nearest single target, swept collision, walls, hunting drops, interruption, no-ammo behavior, movement recovery, bulk chest ammo and both shared simulation loops.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
