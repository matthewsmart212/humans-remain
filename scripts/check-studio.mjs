import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-studio-'));
try {
 await build({stdin:{contents:`export * from './src/studio-play'; export * from './src/world-layout'; export * from './src/world-assets'; export * from './src/imported-art'; export * from './src/chest-animation'; export {doAction,campAction,worldBlocked,STEP} from './src/survival-engine';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'studio.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'studio.mjs')));
 const archive='docs/archive/asset-library-cleanup-2026-10-10';
 const artwork=JSON.parse(fs.readFileSync(`${archive}/artwork.json`));
 m.installImportedArt(artwork.records);
 const draft=JSON.parse(fs.readFileSync(`${archive}/draft.json`)).draft;
 const before=JSON.stringify(draft),play=m.createCampPlaySession(draft);
 assert.equal(play.layout.items.length,22);
 assert.deepEqual(play.layout.items,draft.items,'Play uses every current placement with all transform and collision settings');
 assert.notEqual(play.layout,draft);assert.notEqual(play.layout.items[0],draft.items[0]);
 assert.equal(play.bag.rawMeat,3);assert.equal(play.player.x,draft.spawn.x);
 // The authored camp has no generator/shared store. It must still launch.
 assert(!draft.items.some(p=>p.role==='generator'));
 assert.equal(m.validateLayout(draft,true).errors.length>0,true);
 const moved={...draft,spawn:{x:150,y:150},items:[...draft.items]};
 const moving=m.createCampPlaySession(moved),start=moving.player.x;
 for(let i=0;i<30;i++)m.stepCampPlaySession(moving,{x:1,y:0},false,false);
 assert(moving.player.x>start+40,'The actual movement engine runs in play mode');
 const sprinting=m.createCampPlaySession(moved);
 for(let i=0;i<30;i++)m.stepCampPlaySession(sprinting,{x:1,y:0},true,false);
 assert(sprinting.player.x>moving.player.x,'Sprint uses the existing faster animation and movement');
 // No retired night / generator game starts after a full old shift duration.
 for(let i=0;i<60*360;i++)m.stepCampPlaySession(play,{x:0,y:0},false,false);
 assert.equal(play.phase,'day');assert.equal(play.enemies.length,0);assert.equal(play.player.hp,100);assert.equal(play.generator.fuel,35);
 assert(Math.abs(play.hunger-82)<.001);assert(Math.abs(play.thirst-73)<.001);
 const chest=draft.items.find(p=>m.ASSET_BY_ID.get(p.assetId)?.openFrames?.length);
 assert(chest);m.toggleChest(play,chest.id);for(let i=0;i<30;i++)m.stepCampPlaySession(play,{x:0,y:0},false,false);
 assert(m.chestIsOpen(play,chest.id));assert.equal(m.chestAmount(play,chest.id),1);
 const hearth=play.camp.hearth;
 Object.assign(play.player,{x:hearth.x,y:hearth.y+65});
 assert.equal(m.campInteraction(play)?.action,'cook');assert(m.performCampInteraction(play));assert.equal(play.bag.rawMeat,2);
 for(let i=0;i<410;i++)m.stepCampPlaySession(play,{x:0,y:0},false,false);
 const meal=play.loot.find(l=>l.kind==='cookedMeat');assert(meal,'Cooking throws cooked meat onto the authored camp');
 assert(!m.worldBlocked(play,meal.x,meal.y,24),'Meal lands on walkable ground');
 Object.assign(play.player,{x:meal.x,y:meal.y});assert(m.performCampInteraction(play));assert.equal(play.cooked,1);
 assert(m.doAction(play,'eat'));assert.equal(play.cooked,0);assert.equal(play.hunger,100);
 Object.assign(play.player,{x:play.camp.well.x,y:play.camp.well.y+65});
 assert.equal(m.campInteraction(play)?.action,'drink');assert(m.performCampInteraction(play));assert.equal(play.thirst,100);
 assert.equal(JSON.stringify(draft),before,'Playing, cooking, opening chests, eating and drinking never mutate the draft');
 const restarted=m.createCampPlaySession(draft);assert.equal(restarted.bag.rawMeat,3);assert.equal(restarted.cooked,0);assert(!m.chestIsOpen(restarted,chest.id));assert.equal(restarted.tick,0);
 // Collision lines drawn on an object are identical in editor and game.
 const wall=draft.items.find(p=>p.solid&&m.placementBodies(p).length);
 const body=m.placementBodies(wall)[0];const x=body.shape==='polygon'?body.points[0][0]:body.x,y=body.shape==='polygon'?body.points[0][1]:body.y;
 assert(m.worldBlocked(restarted,x,y,19));
 assert.throws(()=>m.createCampPlaySession({...draft,spawn:{x,y}}),/player start is blocked/);
 // Recent unsaved changes, including a removed object, are used immediately.
 const unsaved={...draft,name:'Unsaved test camp',items:draft.items.slice(1)};
 assert.equal(m.createCampPlaySession(unsaved).layout.items.length,draft.items.length-1);
 assert.equal(m.createCampPlaySession(unsaved).layout.name,'Unsaved test camp');
 console.log('PASS: current 22-object camp launches without factory requirements; walk/sprint, collisions, chest animation, cooking, food pickup, eating and water work; restart resets runtime; draft stays byte-for-byte identical; unsaved additions/removals feed Play.');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
