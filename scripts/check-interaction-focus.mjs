import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'interaction-focus-'));
try{
 await build({stdin:{contents:`export * from './src/survival-engine';export * from './src/world-layout';export * from './src/field-kit';export * from './src/field-kit-target';export * from './src/foraging';export * from './src/forage-art';export * from './src/player-gear';export * from './src/expedition-inventory';export * from './src/rock-mining';export * from './src/tree-chopping';export * from './src/resource-focus';export * from './src/ironworks-data';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=createRequire(import.meta.url)(path.join(temp,'model.cjs'));
 const make=(items=[])=>{const layout={...m.emptyLayout(),items,spawn:{x:1600,y:1690}},w=m.createWorld(layout);w.enemies=[];w.animals=[];w.loot=[];w.breakables=[];w.combatTest=true;w.editorPreview=true;w.survivalEnabled=true;w.player.direction='up';for(const k of Object.keys(w.gear.bag))w.gear.bag[k]=0;return{w,c:new m.FieldKitController()}};
 const plant=(id,x=1600,y=1600)=>({...m.newPlacement(m.FORAGE_ART[0].id,x,y),id});
 const rock=(id='rock',asset='art_rock_moss_capped_boulder')=>({...m.newPlacement(asset,1600,1600),id});
 // Near-equal neighbours must not switch on sub-pixel movement or during cooldown.
 const pair=make([plant('left',1565),plant('right',1635)]),first=pair.c.sample(pair.w).action.target;
 for(const dx of [1,-1,.5,-.5,0]){pair.w.player.x=1600+dx;assert.equal(pair.c.sample(pair.w).action.target.id,first.id)}
 const shown=pair.c.sample(pair.w).action;assert(pair.c.press(pair.w,shown));assert(!pair.c.press(pair.w,shown));
 assert.equal(m.itemCount(pair.w,'berries'),1);assert.equal(pair.c.sample(pair.w).action.target.id,first.id);assert.equal(pair.c.sample(pair.w).action.target.detail,'3 left');pair.c.release();
 pair.w.player.x=1710;assert.equal(pair.c.sample(pair.w).action.target.forageId,'right','Moving decisively selects the reachable neighbour');
 const single=make([plant('only')]);for(let i=0;i<4;i++){const a=single.c.sample(single.w).action;assert(single.c.press(single.w,a));single.c.release();single.w.tick+=30}assert.equal(single.c.sample(single.w).action.target,undefined,'Empty bush loses its focus');
 // A missing tool gets one HUD hint and never interrupts a usable nearby gather.
 const mining=make([rock()]);let a=mining.c.sample(mining.w).action;assert(a.disabled);assert.equal(a.target.detail,'Pickaxe needed');assert(!mining.c.press(mining.w,a));
 mining.w.gear.bag.metalPickaxe=1;mining.w.player.equipped='metalPickaxe';a=mining.c.sample(mining.w).action;assert(!a.disabled);assert.equal(a.target.progress,undefined,'No idle mining bar');assert(mining.c.press(mining.w,a));
 mining.w.tick+=20;m.stepAxe(mining.w);a=mining.c.sample(mining.w).action;assert.equal(a.target.progress,.4,'Held action updates actual mining progress');mining.c.release();mining.w.tick+=100;m.stepAxe(mining.w);assert.equal(mining.c.sample(mining.w).action.target.progress,undefined,'Mining progress fades when no longer working');
 const mixed=make([rock(),plant('food',1680,1690)]);assert.equal(mixed.c.sample(mixed.w).action.target.forageId,'food','Available forage beats unavailable mining');
 const iron=make([rock('iron',m.IRON_BOULDER_ID)]);iron.w.gear.bag.woodenPickaxe=1;iron.w.player.equipped='woodenPickaxe';assert.equal(iron.c.sample(iron.w).action.target.detail,'Metal pickaxe needed');
 // A focused tree and the actual axe contact must refer to the same placement.
 const tree=make([{...m.newPlacement('art_tree_birch',1600,1600),id:'birch'}]);tree.w.gear.bag.axe=1;tree.w.player.equipped='axe';a=tree.c.sample(tree.w).action;assert.equal(a.target.treeId,'birch');assert.equal(a.target.progress,undefined);assert(tree.c.press(tree.w,a));tree.w.tick+=16;m.stepAxe(tree.w);assert(tree.c.sample(tree.w).action.target.progress>0);tree.c.release();
 // A threat clears the resource ring and keeps the attack action authoritative.
 mixed.w.enemies.push({id:900,x:1700,y:1690,hp:100,maxHp:100,attackAt:0,path:[],repathAt:0,flashUntil:0});a=mixed.c.sample(mixed.w).action;assert.equal(a.label,'ATTACK');assert.equal(a.target,undefined);assert.equal(m.getFieldKitTarget(mixed.w),undefined);
 const stale=make([plant('stale')]),old=stale.c.sample(stale.w).action;stale.w.player.x+=500;assert(!stale.c.press(stale.w,old));assert.equal(m.itemCount(stale.w,'berries'),0);
 // One selected ring only, with no text or item badges at any zoom.
 const calls=[],ctx=new Proxy({save(){},restore(){}},{get:(o,k)=>o[k]??((...args)=>calls.push([k,...args])),set:(o,k,v)=>(o[k]=v,true)});
 for(const scale of [.4,1,2]){calls.length=0;m.drawFieldKitTarget(ctx,pair.w,scale);assert.equal(calls.filter(c=>c[0]==='stroke').length,2);assert(!calls.some(c=>c[0]==='fillText'||c[0]==='drawImage'));assert(calls.filter(c=>c[0]==='lineTo').flatMap(c=>c.slice(1)).every(Number.isFinite))}
 console.log('PASS: stable neighbouring focus, one item per press and live HUD count, empty-plant clearing, available-action priority, missing/tiered tool hints, real mining/chopping progress and fade, combat priority, stale reach checks, one text-free ground ring at both zoom limits.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
