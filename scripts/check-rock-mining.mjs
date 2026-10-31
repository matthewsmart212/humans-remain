import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rock-mining-'));
try{
 await build({stdin:{contents:`export * from './src/rock-mining';export * from './src/pickaxes';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/world-assets';export * from './src/field-kit';export * from './src/expedition-inventory';export * from './src/player-gear';export * from './src/quick-items';export * from './src/backpack';export * from './src/chest-inventory';export * from './src/camp-storage';export * from './src/authored-world';export * from './src/imported-art';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'game.cjs')});
 const m=createRequire(import.meta.url)(path.join(temp,'game.cjs'));
 const make=(id='art_rock_moss_capped_boulder',patch={})=>{
  const layout=m.emptyLayout(),p={...m.newPlacement(id,1600,1600),id:'boulder',...patch};layout.items=[p];layout.spawn={x:1600,y:1710};
  const w=m.createWorld(layout);w.animals=[];w.enemies=[];w.loot=[];w.breakables=[];w.editorPreview=true;w.combatTest=true;w.survivalEnabled=true;w.miningSeed=12345;
  for(const k of Object.keys(w.gear.bag))w.gear.bag[k]=0;
  Object.assign(w.player,layout.spawn,{direction:'up'});return{w,p,layout};
 };
 const strike=w=>{assert(m.attack(w));for(let i=0;i<60;i++){w.tick++;m.stepAxe(w)}};
 const give=(w,tool)=>{w.gear.bag[tool]=1;w.player.equipped=tool};
 for(const tool of [null,'axe','woodenAxe','scrapKnife','metalSpear','metalSword','bow']){
  const{w}=make();if(tool)give(w,tool);assert(!m.mineRock(w,-Math.PI/2),`${tool} cannot mine`);assert.equal(w.rockMining,undefined);
  if(tool===null||tool==='axe'||tool==='woodenAxe')strike(w);
  assert.equal(w.rockMining,undefined,'Other attacks leave rock intact');assert.equal(w.loot.filter(l=>l.kind==='stone').length,0);
 }
 for(const tool of ['woodenPickaxe','metalPickaxe']){
  const{w,p,layout}=make(),before=JSON.stringify(layout);give(w,tool);
  assert(m.nearbyMineableRock(w));assert(m.worldBlocked(w,p.x,p.y-8,3));
  const action=new m.FieldKitController().sample(w).action;assert.equal(action.label,'MINE');assert.equal(action.image,m.PICKAXE_GEAR[tool].image);assert(action.attack);
  let hits=0;while(!w.rockMining||w.rockMining[p.id].hp>0){strike(w);assert(++hits<=6)}
  assert.equal(hits,tool==='woodenPickaxe'?5:3,'Metal tier breaks stone in fewer hits');
  assert.equal(w.loot.filter(l=>l.kind==='stone').length,1);assert.equal(w.loot[0].amount,4);assert.equal(w.loot[0].sourceRockId,p.id);
  assert(!m.worldBlocked(w,p.x,p.y-8,3),'Depleted footprint is walkable');assert(m.layoutBlocked(layout,p.x,p.y-8,3),'Editor footprint remains intact');assert.equal(JSON.stringify(layout),before);
  strike(w);assert.equal(w.loot.filter(l=>l.kind==='stone').length,1,'Depleted node cannot drop twice');
  Object.assign(w.player,w.loot[0]);assert(m.pickup(w));assert.equal(m.itemCount(w,'stone'),4);assert.equal(m.packWeight(w),m.PICKAXE_GEAR[tool].weight+3);
  assert(m.backpackItems(new m.FieldKitController().sample(w)).some(i=>i.id==='stone'&&i.count===4));
  const dropped=m.dropBackpackItem(w,'stone',1);assert(dropped.ok);assert.equal(m.itemCount(w,'stone'),3);assert.equal(w.loot.find(l=>l.kind==='stone').amount,1);
  const fresh=m.createWorld(layout);assert.equal(fresh.rockMining,undefined);assert(m.worldBlocked(fresh,p.x,p.y-8,3));
 }
 const timing=make();give(timing.w,'metalPickaxe');assert(m.attack(timing.w));m.stepAxe(timing.w);assert.equal(timing.w.rockMining,undefined,'No damage before contact');timing.w.tick=20;m.stepAxe(timing.w);const hp=timing.w.rockMining.boulder.hp;m.stepAxe(timing.w);assert.equal(timing.w.rockMining.boulder.hp,hp,'One resolution per swing');assert(!m.selectQuickItem(timing.w,'fists'),'Cannot swap mid-swing');
 const empty=make();empty.w.player.equipped='metalPickaxe';assert(!m.attack(empty.w),'Must own the equipped tool');
 const away=make();give(away.w,'metalPickaxe');away.w.player.direction='down';strike(away.w);assert.equal(away.w.rockMining,undefined,'Cannot mine behind the player');
 const distant=make();give(distant.w,'metalPickaxe');distant.w.player.y+=300;strike(distant.w);assert.equal(distant.w.rockMining,undefined,'Cannot mine out of reach');
 const blocked=make();give(blocked.w,'metalPickaxe');blocked.layout.items.push({...m.newPlacement('art_hq_storage_chest',1600,1650),id:'wall',solid:true,frame:{sourceAssetId:'art_hq_storage_chest',width:300,height:12,anchor:[.5,.5]},collision:{lineWidth:.01,paths:[{closed:true,points:[[0,0],[1,0],[1,1],[0,1]]}]}});assert.equal(m.nearbyMineableRock(blocked.w),null,'Walls block mining');strike(blocked.w);assert.equal(blocked.w.rockMining,undefined);
 const partial=make();give(partial.w,'metalPickaxe');m.setItemCount(partial.w,'scrap',105);for(let i=0;i<3;i++)strike(partial.w);Object.assign(partial.w.player,partial.w.loot[0]);assert(m.pickup(partial.w));assert.equal(m.itemCount(partial.w,'stone'),1);assert.equal(partial.w.loot[0].amount,3,'Full pack leaves uncollected stone on ground');
 for(const patch of [{rotation:37},{flipX:true},{scale:1.4}]){const{w,p}=make(undefined,patch);give(w,'metalPickaxe');assert(m.nearbyMineableRock(w),JSON.stringify(patch));strike(w);assert(w.rockMining[p.id].hp>0)}
 for(const flag of ['dead','downed','over','station','dodge']){const{w}=make();give(w,'metalPickaxe');if(flag==='dead')w.player.hp=0;if(flag==='downed')w.player.downedUntil=10;if(flag==='over')w.phase='over';if(flag==='station')w.stationPanel='storage';if(flag==='dodge')w.dodge={started:0,angle:0};assert(!m.mineRock(w,-Math.PI/2),flag);assert(!m.attack(w),flag)}
 const chest=m.emptyLayout();chest.spawn={x:1600,y:1660};chest.items=[{...m.newPlacement('art_hq_storage_chest',1600,1600),id:'tools'}];const cw=m.createWorld(chest);for(const k of Object.keys(cw.gear.bag))cw.gear.bag[k]=0;
 for(const tool of ['woodenPickaxe','metalPickaxe']){assert(m.chestItems(cw,'chest').some(i=>i.id===tool));assert.equal(m.moveChestItem(cw,tool,'chest',1),1);assert.equal(m.moveChestItem(cw,tool,'chest',1),0);assert(m.selectQuickItem(cw,tool));assert(m.availableQuickItems({axes:cw.gear.bag,cooked:0}).some(i=>i.id===tool));assert.equal(m.moveChestItem(cw,tool,'pack',1),1);assert.equal(cw.player.equipped,null)}
 m.setItemCount(cw,'stone',5);assert.equal(m.moveChestItem(cw,'stone','pack','all'),5);assert.equal(m.storedCount(cw,'stone'),5);assert.equal(m.moveChestItem(cw,'stone','chest',2),2);assert.equal(m.itemCount(cw,'stone'),2);assert.equal(m.storedCount(cw,'stone'),3);
 const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));m.installImportedArt(snapshot.records);const layout=m.prepareAuthoredWorld(snapshot.layout),rocks=layout.items.filter(p=>m.MINEABLE_ROCKS.has(p.assetId));assert(rocks.length>20);
 let accessible=0;for(const p of rocks){const w=m.createWorld(layout);for(let i=0;i<24;i++){const a=i*Math.PI/12;Object.assign(w.player,{x:p.x+Math.cos(a)*180,y:p.y+Math.sin(a)*180});if(!m.worldBlocked(w,w.player.x,w.player.y,19)&&m.nearbyMineableRock(w)?.placement.id===p.id){accessible++;break}}}
 assert(accessible>rocks.length*.6,`Natural boulder approaches: ${accessible}/${rocks.length}`);
 for(const url of Object.values(m.MINING_IMAGES))assert(fs.existsSync('public'+url),url);
 console.log(`PASS: ${rocks.length} existing mineable boulders, ${accessible} sampled clear approaches; pickaxe-only damage; contact timing; 5 vs 3 strikes; single drops; runtime collision; draft isolation; partial packs; backpack/drop/chest transfers; tool ownership, range, cover, rotation, flip and state locks.`);
}finally{fs.rmSync(temp,{recursive:true,force:true})}
