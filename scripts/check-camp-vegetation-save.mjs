// Read-only regression fixtures. Never writes the hosted world or a player's save.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-vegetation-save-'));
try{
 const modules=['world-assets','world-layout','imported-art','authored-world','camp-vegetation','studio-play','run-save','scene-travel','world-scenes','player-map'];
 await build({stdin:{contents:modules.map(id=>`export * from './src/${id}';`).join('')+"export * from './native/game-world';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temp,'model.cjs'));
 // Read the committed fixture so an in-progress native snapshot update cannot
 // silently replace the migration input. Clear only this migration's marker
 // so the regression also exercises a pre-version save after future commits.
 const saved=JSON.parse(execFileSync('git',['show','HEAD:native/assets/world-snapshot.json'],{encoding:'utf8',maxBuffer:32*1024*1024}));
 delete saved.layout.campVegetationVersion;
 m.installImportedArt(saved.records);
 const original=JSON.stringify(saved),expected=m.refineCampVegetation(saved.layout);
 assert.equal(expected.campVegetationVersion,1);
 assert(expected.items.length<saved.layout.items.length,'The old camp fixture contains vegetation to remove');
 assert.equal(JSON.stringify(saved),original,'Migrating never mutates the source snapshot');
 assert.equal(m.refineCampVegetation(expected),expected,'A marked layout is not thinned a second time');

 const validated=m.validateLayout(JSON.parse(JSON.stringify(expected)));
 assert.deepEqual(validated.errors,[]);
 assert.equal(validated.layout.campVegetationVersion,1,'Validation preserves the migration marker for server/local/native round trips');
 assert.deepEqual(validated.layout.items,expected.items);
 assert.equal(m.refineCampVegetation(validated.layout),validated.layout);
 assert(m.validateLayout({...expected,campVegetationVersion:2}).errors.length,'Unknown migration versions are rejected');
 const native=m.validateSavedWorld(saved,'Vegetation regression fixture');
 assert.equal(native.layout.campVegetationVersion,1,'The production iOS new-run loader applies the migration');
 assert.deepEqual(native.layout.items,expected.items);
 assert.equal(m.prepareAuthoredWorld(native.layout),native.layout,'Full authored preparation remains idempotent');

 const resources={pin(){},prepare:async()=>{},ready:()=>true};
 const before=m.createCampPlaySession(saved.layout,undefined,'survival');
 before.bag.pallets=7;before.stock.scrap=12;before.gear.bag.arrows=23;
 before.tick=420;before.phaseLeft=137;before.hunger=63;before.thirst=58;
 Object.assign(before.player,{hp:73,stamina:61,direction:'down-right',moving:false,sprinting:false,hurtUntil:12});
 const tree=before.layout.items.find(p=>m.ASSET_BY_ID.get(p.assetId)?.id.startsWith('art_tree_'));
 if(tree)before.treeChops={[tree.id]:{hp:0,hitAt:2,direction:1,felledAt:2}};
 const forage=before.layout.items.find(p=>p.assetId.startsWith('art_forage_'));
 if(forage)before.forage={[forage.id]:{remaining:0,regrowRound:before.round+2,pickedAt:3,picked:1,to:{x:before.player.x,y:before.player.y}}};
 const protectedState=w=>JSON.stringify({player:w.player,progression:w.progression,bag:w.bag,stock:w.stock,gear:w.gear,tools:w.tools,cycle:w.cycle,tick:w.tick,phase:w.phase,phaseLeft:w.phaseLeft,round:w.round,survived:w.survived,hunger:w.hunger,thirst:w.thirst,treeChops:w.treeChops,forage:w.forage,loot:w.loot,fire:w.fire});
 const expectedRun=m.refineCampVegetation(before.layout);
 const state=protectedState(before),encoded=m.encodeRun(new m.SceneTravel(before,resources));
 assert(encoded);
 const raw=JSON.parse(encoded);
 raw.route=[{sceneId:m.CAMP_SCENE_ID,spawn:{...saved.layout.spawn,direction:'down'}}];
 const oldText=JSON.stringify(raw),resumed=m.decodeRun(oldText),camp=resumed.worlds.find(([id])=>id===m.CAMP_SCENE_ID)[1];
 assert.equal(camp.layout.campVegetationVersion,1,'Existing expeditions receive the vegetation update');
 assert.deepEqual(camp.layout.items,expectedRun.items,'Runtime expedition placements survive alongside the reduced authored scenery');
 assert.equal(protectedState(camp),state,'Migration preserves the survivor, progress, inventory, harvests and local drops');
 assert.deepEqual(resumed.route,raw.route,'Vegetation removal never shifts return landings');
 assert.deepEqual(camp.layout.spawn,saved.layout.spawn);
 assert(!m.layoutBlocked(camp.layout,camp.player.x,camp.player.y,19),'The current survivor remains on clear ground');
 const again=m.decodeRun(oldText).worlds.find(([id])=>id===m.CAMP_SCENE_ID)[1];
 assert.deepEqual(again.layout.items,camp.layout.items,'The same old save always migrates to the same placements');

 const travel=new m.SceneTravel(camp,resources);
 await travel.restore(resumed);
 const secondText=m.encodeRun(travel),second=m.decodeRun(secondText),secondCamp=second.worlds.find(([id])=>id===m.CAMP_SCENE_ID)[1];
 assert.equal(JSON.parse(secondText).worlds[0][1].layout.campVegetationVersion,1,'Normal save encoding persists the marker');
 assert.deepEqual(secondCamp.layout,camp.layout,'Loading a migrated save never thins or changes it again');
 assert.equal(protectedState(secondCamp),state);
 assert.deepEqual(second.route,resumed.route);

 const interiorRaw=JSON.parse(oldText),interior=structuredClone(interiorRaw.worlds[0][1]);
 interior.layout=structuredClone(m.BUNKER_SCENE.layout??m.emptyLayout());
 Object.assign(interior.player,{x:936,y:649});
 const interiorLayout=JSON.stringify(interior.layout),interiorState=protectedState(interior);
 interiorRaw.worlds.push([m.BUNKER_SCENE.id,interior]);interiorRaw.currentId=m.BUNKER_SCENE.id;
 const inside=m.decodeRun(JSON.stringify(interiorRaw)),home=inside.worlds.find(([id])=>id===m.CAMP_SCENE_ID)[1],active=inside.worlds.find(([id])=>id===m.BUNKER_SCENE.id)[1];
 assert.equal(inside.currentId,m.BUNKER_SCENE.id,'A survivor in an interior stays there');
 assert.equal(home.layout.campVegetationVersion,1,'The inactive camp snapshot is upgraded too');
 assert.deepEqual(home.layout.items,expectedRun.items);
 assert.equal(protectedState(home),state);assert.equal(protectedState(active),interiorState);
 assert.equal(JSON.stringify(active.layout),interiorLayout,'Interior placements are untouched');
 assert.deepEqual(inside.route,interiorRaw.route);

 // The atlas derives vegetation from the replaced layout, rather than retaining
 // paths cached for the old placement set.
 const oldFeatures=m.playerMapFeatures(saved.layout),newFeatures=m.playerMapFeatures(camp.layout);
 assert.notEqual(newFeatures,oldFeatures);
 const parts=(features,id)=>features.paths.find(p=>p.id===id)?.parts.length??0;
 assert(parts(newFeatures,'foliage')<parts(oldFeatures,'foliage'),'The map reflects removed foliage');
 assert.equal(m.playerMapFeatures(camp.layout),newFeatures,'The migrated layout still benefits from the map cache');
 assert.equal(JSON.stringify(saved),original,'All loader/save checks leave the authored source untouched');
 console.log('PASS: native new runs and existing camp/interior saves receive one vegetation migration; validation, repeat loads and map caches retain it; player, progression, inventory, harvests and return routes are preserved.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
