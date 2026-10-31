import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'wood-axe-'));
try{
 await build({stdin:{contents:`export * from './src/survival-engine';export * from './src/studio-play';export * from './src/world-layout';export * from './src/tree-chopping';export * from './src/player-gear';export * from './src/expedition-inventory';export * from './src/quick-items';export * from './src/backpack';export * from './src/field-kit';export * from './src/camp-station-view';export * from './src/axe-combat';export * from './src/runner-axe-art';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'check.cjs')});
 const m=require(path.join(tmp,'check.cjs'));
 const make=art=>{const tree={...m.newPlacement(art.id,900,1000),id:'tree'},layout={...m.emptyLayout(),spawn:{x:900,y:1100},items:[tree]},w=m.createCampPlaySession(layout);w.animals=[];w.enemies=[];w.loot=[];w.breakables=[];w.survivalEnabled=false;w.editorPreview=false;w.player.direction='up';return {w,tree,layout}};
 let cases=0;
 for(const art of m.TREE_ART.values()){
  const results=[];
  for(const tool of ['fists','woodenAxe','axe']){
   const {w,layout}=make(art),original=JSON.stringify(layout);assert.equal(m.packWeight(w),0);assert.equal(w.player.equipped,null);assert.equal(m.backpackItems(new m.FieldKitController().sample(w)).length,0);assert.deepEqual(m.gear(w).chest,{woodenAxe:1,axe:1});assert(!m.selectQuickItem(w,'axe'));
   if(tool!=='fists'){m.gear(w).bag[tool]=1;m.gear(w).chest[tool]=0;assert(m.selectQuickItem(w,tool))}
   let hits=0;
   while(w.treeChops?.tree.hp!==0&&hits<50){w.tick+=60;w.player.stamina=100;assert(m.attack(w));if(tool!=='fists'){assert.equal(w.axeSwing.tool,tool);w.tick+=16;m.stepAxe(w);w.tick+=30;m.stepAxe(w)}hits++}
   assert.equal(w.treeChops.tree.hp,0);assert.equal(w.loot.filter(l=>l.sourceTreeId==='tree').length,1);assert.equal(w.player.hp,tool==='fists'?100-hits:100);assert.equal(JSON.stringify(layout),original);results.push(hits);cases++;
   w.tick+=120;w.axeSwing=undefined;assert(m.attack(w));if(tool!=='fists'){w.tick+=16;m.stepAxe(w)}assert.equal(w.loot.filter(l=>l.sourceTreeId==='tree').length,1,'No duplicate logs');assert.equal(w.player.hp,tool==='fists'?100-hits:100,'Stumps do not hurt fists');
  }
  assert(results[0]>results[1]&&results[1]>results[2],`${art.id} progression ${results}`);
 }
 const miss=make([...m.TREE_ART.values()][0]).w;miss.player.direction='down';assert(m.attack(miss));assert.equal(miss.player.hp,100);assert.equal(miss.treeChops,undefined);
 const lethal=make([...m.TREE_ART.values()][0]).w;lethal.player.hp=1;assert(m.attack(lethal));assert.equal(lethal.player.hp,0);assert.equal(lethal.phase,'over');
 const chest={...m.newPlacement('art_hq_storage_chest',1600,1600),id:'hq-chest'},layout={...m.emptyLayout(),spawn:{x:1600,y:1690},items:[chest]},w=m.createWorld(layout);w.animals=[];w.enemies=[];w.loot=[];
 assert(m.atHeadquartersChest(w),'Chest reachable');w.stationPanel='storage';assert(m.campStationView(w).sections[0].rows.some(r=>r.id==='woodenAxe'));assert(m.transferAxe(w,'woodenAxe',true));assert(!m.transferAxe(w,'woodenAxe',true),'Cannot duplicate');assert.equal(m.packWeight(w),1.2);w.stationPanel=undefined;assert(m.selectQuickItem(w,'woodenAxe'));assert.equal(m.selectedQuickItem(w),'woodenAxe');w.stationPanel='storage';assert(m.transferAxe(w,'woodenAxe',false));assert.equal(w.player.equipped,null);assert.equal(m.packWeight(w),0);assert(m.transferAxe(w,'axe',true));assert.equal(m.packWeight(w),2);w.player.x+=1000;assert(!m.transferAxe(w,'woodenAxe',true));
 const fresh=m.createWorld(layout);assert.deepEqual(m.gear(fresh).bag,{axe:0,woodenAxe:0});assert.deepEqual(m.gear(fresh).chest,{axe:1,woodenAxe:1});assert.equal(m.packWeight(fresh),0);
 for(const [key,url]of Object.entries(m.RUNNER_AXE_IMAGE_SOURCES))assert(fs.existsSync('public'+url),key);
 console.log(`PASS: ${cases} tree/tool combinations, damage only on tree contact, one log drop per tree, misses/stumps safe, lethal recoil, empty new rounds, HQ transfers/ownership/weight/equipped fallback, all directional assets.`);
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
