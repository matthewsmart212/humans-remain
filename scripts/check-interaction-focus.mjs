import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'interaction-focus-'));
try{
 await build({stdin:{contents:`export * from './src/survival-engine';export * from './src/world-layout';export * from './src/field-kit';export * from './src/field-kit-target';export * from './src/foraging';export * from './src/forage-art';export * from './src/player-gear';export * from './src/expedition-inventory';export * from './src/rock-mining';export * from './src/tree-chopping';export * from './src/resource-focus';export * from './src/ironworks-data';export * from './src/quick-items';export {isProvision} from './src/food-provisions-data';export {BAG_IMAGES} from './src/backpack';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=createRequire(import.meta.url)(path.join(temp,'model.cjs'));
 const make=(items=[])=>{const layout={...m.emptyLayout(),items,spawn:{x:1600,y:1650}},w=m.createWorld(layout);w.enemies=[];w.animals=[];w.loot=[];w.breakables=[];w.combatTest=true;w.editorPreview=true;w.survivalEnabled=true;w.player.direction='up';for(const k of Object.keys(w.gear.bag))w.gear.bag[k]=0;return{w,c:new m.FieldKitController()}};
 const plant=(id,x=1600,y=1600)=>({...m.newPlacement(m.FORAGE_ART[0].id,x,y),id});
 const rock=(id='rock',asset='art_rock_moss_capped_boulder')=>({...m.newPlacement(asset,1600,1600),id});
 // The primary hex must show the actual carried item, including its material
 // tier, even when a threat changes the verb to an attack.
 const loadout=make();
 loadout.w.cooked=1;
 loadout.w.cookedRabbit=1;
 loadout.w.cookedVenison=1;
 for(const item of m.QUICK_ITEMS){
  if(m.isGear(item.id))loadout.w.gear.bag[item.id]=1;
  if(m.isProvision(item.id))m.setItemCount(loadout.w,item.id,1);
 }
 for(const inCombat of [false,true]){
  if(inCombat)loadout.w.enemies.push({id:900,x:1700,y:1690,hp:100,maxHp:100,attackAt:0,path:[],repathAt:0,flashUntil:0});
  for(const item of m.QUICK_ITEMS){
   assert(m.selectQuickItem(loadout.w,item.id),'Can select '+item.label);
   const {action}=loadout.c.sample(loadout.w);
   assert.equal(action.image??m.fieldKitArt(action.icon),item.image,item.label+' action artwork, combat='+inCombat);
   assert(fs.existsSync('public'+item.image),item.label+' has a bundled illustration');
  }
 }
 const dropped=make(),dropItems={pallets:'logs',rawMeat:'raw',rawRabbit:'rabbitRaw',rawVenison:'venisonRaw',cookedMeat:'meal',cookedRabbit:'rabbitMeal',cookedVenison:'venisonMeal'};
 for(const kind of m.INVENTORY_KINDS){
  dropped.w.loot=[{kind,id:100,x:dropped.w.player.x,y:dropped.w.player.y,amount:1}];
  const {action}=dropped.c.sample(dropped.w);
  assert.equal(action.label,'COLLECT',kind);
  assert.equal(action.image,m.BAG_IMAGES[dropItems[kind]??kind],kind+' pickup illustration');
 }
 // Near-equal neighbours must not switch on sub-pixel movement or during cooldown.
 const pair=make([plant('left',1565),plant('right',1635)]),first=pair.c.sample(pair.w).action.target;
 for(const dx of [1,-1,.5,-.5,0]){pair.w.player.x=1600+dx;assert.equal(pair.c.sample(pair.w).action.target.id,first.id)}
 const shown=pair.c.sample(pair.w).action;assert(pair.c.press(pair.w,shown));assert(!pair.c.press(pair.w,shown));
 assert.equal(m.itemCount(pair.w,'berries'),1);assert.equal(pair.c.sample(pair.w).action.target.id,first.id);assert.equal(pair.c.sample(pair.w).action.target.detail,'3 left');pair.c.release();
 pair.w.player.x=1690;assert.equal(pair.c.sample(pair.w).action.target.forageId,'right','Moving decisively selects the reachable neighbour');
 const single=make([plant('only')]);for(let i=0;i<4;i++){const a=single.c.sample(single.w).action;assert(single.c.press(single.w,a));single.c.release();single.w.tick+=30}assert.equal(single.c.sample(single.w).action.target,undefined,'Empty bush loses its focus');
 // A missing tool gets one HUD hint and never interrupts a usable nearby gather.
 const mining=make([rock()]);let a=mining.c.sample(mining.w).action;assert(a.disabled);assert.equal(a.target.detail,'Pickaxe needed');assert(!mining.c.press(mining.w,a));
 mining.w.gear.bag.metalPickaxe=1;mining.w.player.equipped='metalPickaxe';a=mining.c.sample(mining.w).action;assert(!a.disabled);assert.equal(a.target.progress,undefined,'No idle mining bar');assert(mining.c.press(mining.w,a));
 mining.w.tick+=20;m.stepAxe(mining.w);a=mining.c.sample(mining.w).action;assert.equal(a.target.progress,.4,'Held action updates actual mining progress');mining.c.release();mining.w.tick+=100;m.stepAxe(mining.w);assert.equal(mining.c.sample(mining.w).action.target.progress,undefined,'Mining progress fades when no longer working');
 const mixed=make([rock(),plant('food',1665,1650)]);assert.equal(mixed.c.sample(mixed.w).action.target.forageId,'food','Available forage beats unavailable mining');
 const iron=make([rock('iron',m.IRON_BOULDER_ID)]);iron.w.gear.bag.woodenPickaxe=1;iron.w.player.equipped='woodenPickaxe';assert.equal(iron.c.sample(iron.w).action.target.detail,'Metal pickaxe needed');
 // A focused tree and the actual axe contact must refer to the same placement.
 const tree=make([{...m.newPlacement('art_tree_birch',1600,1600),id:'birch'}]);tree.w.gear.bag.axe=1;tree.w.player.equipped='axe';a=tree.c.sample(tree.w).action;assert.equal(a.target.treeId,'birch');assert.equal(a.target.progress,undefined);assert(tree.c.press(tree.w,a));tree.w.tick+=16;m.stepAxe(tree.w);assert(tree.c.sample(tree.w).action.target.progress>0);tree.c.release();
 // A threat clears the resource pin and keeps the attack action authoritative.
 mixed.w.enemies.push({id:900,x:1700,y:1690,hp:100,maxHp:100,attackAt:0,path:[],repathAt:0,flashUntil:0});a=mixed.c.sample(mixed.w).action;assert.equal(a.label,'ATTACK');assert.equal(a.target,undefined);assert.equal(m.getFieldKitTarget(mixed.w),undefined);
 const stale=make([plant('stale')]),old=stale.c.sample(stale.w).action;stale.w.player.x+=500;assert(!stale.c.press(stale.w,old));assert.equal(m.itemCount(stale.w,'berries'),0);
 // One accessible spot receives the field-kit pin at every zoom level.
 const calls=[],ctx=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args])});
 const pin = {id:'forage:focus',label:'PICK',x:410,y:220};
 for(const blocked of [false,true])for(const scale of [.4,1,2]){
  const world={};
  m.setFieldKitTarget(world,{...pin,blocked});
  calls.length=0;
  m.drawFieldKitTarget(ctx,world,scale);
  assert.deepEqual(calls.filter(([op])=>op==='translate'),[['translate',pin.x,pin.y]]);
  assert.deepEqual(calls.filter(([op])=>op==='scale'),[['scale',1/scale,1/scale]],'Pin stays legible at every zoom');
  assert(calls.some(([op])=>op==='fill'),'A filled marker replaces the ground ring');
  assert.equal(calls.some(([op])=>op==='fillRect'),blocked,'Blocked actions use a distinct glyph');
  assert(!calls.some(([op])=>['ellipse','arc','fillText','drawImage'].includes(op)));
  assert(calls.filter(([op])=>op==='lineTo').flatMap(([, ...coords])=>coords).every(Number.isFinite));
 }
 calls.length=0;
 m.drawFieldKitTarget(ctx,{},1);
 assert.equal(calls.length,0,'No marker without an action target');
 console.log('PASS: stable neighbouring focus, one item per press, live counts, tool hints, mining/chopping progress, combat priority, stale reach checks and distinct fixed-size action pins.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
