import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'food-integration-'));
try{
 await build({stdin:{contents:[
  'survival-engine','world-layout','imported-art','studio-play','food-chest-stock','food-provisions',
  'expedition-inventory','chest-inventory','backpack','quick-items','field-kit','station-access',
  'camp-stations','camp-kitchen','pickup-visibility','food-provisions-art','editor-image-sources',
 ].map(name=>`export * from './src/${name}';`).join('\n'),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'game.cjs')});
 const m=require(path.join(temp,'game.cjs')),saved=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
 m.installImportedArt(saved.records);
 const fresh=m.createCampPlaySession(saved.layout);
 for(const [kind,count]of Object.entries(m.FOOD_CHEST_STOCK)){
  assert.equal(m.storedCount(fresh,kind),count,`${kind} starts in the chest`);
  assert.equal(m.itemCount(fresh,kind),0,`${kind} is not silently added to the backpack`);
 }
 const ids=['berries','apple','beans','energyBar','raw','meal','venisonRaw','venisonMeal','huntersMeal'];
 assert.deepEqual(m.chestItems(fresh,'chest').filter(i=>i.category==='Food').map(i=>i.id).sort(),[...ids].sort());
 // Use a clear, reachable headquarters chest to test the actual transfer path.
 const chest={...m.newPlacement('art_hq_storage_chest',1600,1600),id:'food-check-chest'};
 const w=m.createWorld({...m.emptyLayout(),spawn:{x:1600,y:1690},items:[chest]});
 w.loot=[];w.enemies=[];w.animals=[];m.stockFoodChest(w);w.stationPanel='storage';
 for(const key of Object.keys(w.gear.bag))w.gear.bag[key]=0;
 assert(m.atStorage(w));
 for(const id of ids){
  const original=m.chestItemCount(w,id,'chest');
  assert.equal(m.moveChestItem(w,id,'chest',1),1,`withdraw ${id}`);
  assert.equal(m.chestItemCount(w,id,'chest'),original-1);
  assert.equal(m.chestItemCount(w,id,'pack'),1);
 }
 const taken=JSON.stringify(w.kit.provisions.chest);m.chestItems(w,'chest');m.chestItems(w,'chest');
 assert.equal(JSON.stringify(w.kit.provisions.chest),taken,'Opening or rendering chest does not refill food');
 w.stationPanel=undefined;Object.assign(w.player,{x:1900,y:1900});
 const controller=new m.FieldKitController();
 for(const id of m.PROVISION_IDS){
  w.tick+=600;w.hunger=20;w.thirst=20;w.player.hp=30;w.player.stamina=20;
  assert(m.availableQuickItems(controller.sample(w)).some(i=>i.id===id));
  assert(m.selectQuickItem(w,id));assert(!m.attack(w),'Held food does not attack');
  let s=controller.sample(w);assert.equal(s.selected,id);assert.equal(s.action.label,'EAT');assert.equal(s.action.disabled,false);
  assert(m.dropBackpackItem(w,id,'all').ok);assert.equal(w.player.equipped,null);
  const drop=w.loot.find(l=>l.kind===id);assert(drop);assert(m.visiblePickupCues(w,{x:drop.x-100,y:drop.y-100,width:200,height:200,scale:1}).includes(drop),'Dropped food has a nearby pickup cue');
  assert(m.pickup(w));assert.equal(m.itemCount(w,id),1,'Dropped food is recollected once');
  assert(m.selectQuickItem(w,id));s=controller.sample(w);
  assert(controller.press(w,s.action));controller.release();assert.equal(m.itemCount(w,id),0);
  assert.equal(w.player.equipped,null);assert(!m.availableQuickItems(controller.sample(w)).some(i=>i.id===id));
 }
 assert.equal(m.useBackpackItem(w,'raw'),false,'Raw chicken is a cooking ingredient');
 assert.equal(m.useBackpackItem(w,'venisonRaw'),false,'Raw meat is a cooking ingredient');
 // Existing hunting/cooking IDs still consume the right ingredient and produce the right meal.
 const cook=m.createWorld();cook.bag.rawMeat=1;cook.bag.rawVenison=1;cook.camp.hearth.fuel=180;
 Object.assign(cook.player,m.stationFront(cook.camp,'hearth'));
 assert(m.doAction(cook,'cook','chicken'));assert(m.doAction(cook,'cook','venison'));
 assert.equal(cook.bag.rawMeat,0);assert.equal(cook.bag.rawVenison,0);
 cook.tick=1800;m.stepKitchen(cook);assert.equal(m.collectFood(cook),2);
 assert.equal(cook.cooked,1);assert.equal(cook.cookedVenison,1);
 for(const id of ids){const url=m.BAG_IMAGES[id];assert(fs.existsSync('public'+url),`Artwork exists: ${id}`)}
 for(const id of m.PROVISION_IDS)assert.equal(m.EDITOR_IMAGE_SOURCES[m.provisionImageKey(id)],m.PROVISIONS[id].image);
 console.log('PASS: all nine foods stocked in fresh rounds; chest transfer and no refill; usable quick slots; held-food attack guards; drop/recollect conservation; final-stack fallback; raw-food cooking; shared artwork registration.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
