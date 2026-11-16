import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
const modules=['studio-play','authored-world','imported-art','potato-farming','crop-art','potato-planting','expedition-inventory','food-provisions','foraging','world-assets','world-layout','run-save','quick-items','world-scenes'];
const compiled=await build({stdin:{contents:modules.map(m=>`export * from './src/${m}';`).join(''),resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
fs.mkdirSync('.qa/vegetable-crops',{recursive:true});
fs.writeFileSync('.qa/vegetable-crops/game-check.mjs',compiled.outputFiles[0].text);
const m=await import('../.qa/vegetable-crops/game-check.mjs?'+Date.now());
const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));
m.installImportedArt(snapshot.records);
const layout=m.prepareAuthoredWorld(snapshot.layout);
const game=m.createCampPlaySession(layout,undefined,'survival');
game.tick=6000;
const site=m.gardenLocation(game);Object.assign(game.player,{x:site.x,y:site.y});
m.addInventory(game,'potato',3);m.addInventory(game,'carrot',3);
assert.equal(m.plantPotato(game,'carrot'),false,'Broken patch cannot be planted');
game.progression.restoredBuildings.push('headquarters','garden');game.progression.campLevel=1;
for(const kind of ['potato','carrot','potato','carrot']){
 game.player.equipped=kind;
 assert.equal(m.potatoPatchAction(game).crop,kind,'Quick bar selects crop to plant');
 assert(m.potatoPatchAction(game).perform());
}
assert.deepEqual(m.gardenBeds(game).map(c=>c.kind),['potato','carrot','potato','carrot']);
const inventory=m.itemCount(game,'potato');
assert(!m.plantPotato(game,'potato'),'Full patch rejects planting');
assert.equal(m.itemCount(game,'potato'),inventory,'Full patch consumes nothing');
game.tick=339*60;assert.equal(m.readyPotatoes(game),0);assert(!m.harvestPotatoes(game));
assert.deepEqual([0,.25,.6,1].map(m.cropStage),[0,1,2,3]);
game.tick=340*60;assert.equal(m.readyPotatoes(game),4);
const action=m.potatoPatchAction(game),other=m.gardenBeds(game)[1];
assert(action.perform());assert.equal(m.itemCount(game,'potato'),inventory+4);
assert.equal(m.gardenBeds(game)[0],null);
assert.equal(m.gardenBeds(game)[1],other,'Harvest does not move any other bed');
assert(!action.perform(),'Double tap cannot harvest another bed');
assert(m.plantPotato(game,'carrot'));assert.equal(m.gardenBeds(game)[0].kind,'carrot');
assert.equal(m.gardenBeds(game)[1],other,'Replant fills only the empty bed');
const ripe=m.gardenBeds(game)[1];
m.setItemCount(game,'pallets',99);
assert(!m.harvestPotatoes(game,1),'Full pack keeps the ripe crop');assert.equal(m.gardenBeds(game)[1],ripe);
m.setItemCount(game,'pallets',0);
assert(m.harvestPotatoes(game,1));
for(const kind of ['potato','carrot']){
 const count=m.itemCount(game,kind);game.hunger=40;game.tick+=120;
 assert(m.consumeProvision(game,kind));assert.equal(game.hunger,52);assert.equal(m.itemCount(game,kind),count-1);
}
const old={...game,potatoPatch:{tier:2,plantedAt:[0,20,30]}};
assert.deepEqual(m.gardenBeds(old).map(c=>c?.kind??null),['potato','potato','potato',null]);
assert.equal(old.potatoPatch.tier,1);
const save=m.encodeRun({busy:false,current:game,capture:()=>({currentId:m.CAMP_SCENE_ID,worlds:[[m.CAMP_SCENE_ID,game]],route:[]})});
const restored=m.decodeRun(save);
const saved=restored.worlds[0][1];
assert.deepEqual(m.gardenBeds(saved),m.gardenBeds(game),'Serialized run preserves kinds, bed positions and growth times');
assert.equal(m.validateLayout(layout).layout.carrotForageVersion,1,'World source retains carrot migration');
assert.equal(m.addWildCarrots(layout),layout,'Wild carrots do not duplicate on world preparation');
assert.equal(layout.items.filter(p=>p.assetId==='art_forage_wild_carrot').length,24);
for(const kind of ['potato','carrot']){
 const plants=layout.items.filter(p=>p.assetId===`art_forage_wild_${kind}`);assert(plants.length);
 let target;
 for(const p of plants){
  for(let i=0;i<8;i++){
   Object.assign(game.player,{x:p.x+Math.cos(i*Math.PI/4)*45,y:p.y+Math.sin(i*Math.PI/4)*45});
   if(m.layoutBlocked(layout,game.player.x,game.player.y,19))continue;
   target=m.nearbyForageTargets(game).find(t=>t.placement.id===p.id&&t.remaining);if(target)break;
  }
  if(target)break;
 }
 assert(target,`${kind} has a reachable wild plant`);
 game.tick+=120;game.attackUntil=0;game.player.hurtUntil=0;
 const count=m.itemCount(game,kind);
 assert(m.pickForage(game,target.placement.id));assert.equal(m.itemCount(game,kind),count+1);
 assert.equal(m.forageRemaining(game,target.placement),0);game.tick+=120;game.round+=5;
 assert(!m.pickForage(game,target.placement.id),'Picked wild roots cannot be repeatedly farmed');
 const images=m.requiredImages([target.placement.assetId]);
 assert(images[m.assetImageKey(m.cropPickedUrl(kind))],'Picked texture preloads');
}
const images=m.requiredImages(['art_camp_garden_t1']);
for(const url of m.CROP_IMAGES){
 assert(images[m.assetImageKey(url)],'All growth states preload');
 assert(fs.existsSync('public'+url),'Runtime art exists');
 assert(fs.readFileSync('native/crop-art.ts','utf8').includes(url),'iOS bundles the texture locally');
}
console.log('PASS: mixed crops, four stable beds, growth timing, repair gate, atomic harvest, full pack, eating, old saves, wild pickup, idempotent world migration and native art.');
