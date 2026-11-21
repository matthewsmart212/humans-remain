import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'iron-mine-'));
try {
 const modules=['world-scenes','survival-engine','studio-play','authored-world','imported-art','scene-travel','scene-terrain',
  'player-map','player-map-labels','rock-mining','world-layout','camp-gates','loot-chest','run-save','expedition-inventory','play-interaction','outdoor-terrain','world-master-plan','river-collision','east-approach'];
 const outfile=path.join(temp,'game.cjs');
 await build({stdin:{contents:modules.map(name=>`export * from './src/${name}'`).join('\n'),resolveDir:process.cwd()},
  outfile,bundle:true,platform:'node',format:'cjs'});
 const game=createRequire(import.meta.url)(outfile);
 const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));
 game.installImportedArt(snapshot.records);
 const layout=game.prepareAuthoredWorld(snapshot.layout);
 const camp=game.createCampPlaySession(layout,undefined,'survival');
 camp.outdoorReady=new Set(game.OUTDOOR_TILES.map(tile=>tile.key));
 const entrance=game.scenePortals(camp).find(p=>p.destination.sceneId==='iron-mine');
 assert(entrance,'The northwest entrance is available in a new expedition');
 assert(entrance.returnSpawn.x<layout.spawn.x && entrance.returnSpawn.y<layout.spawn.y);
 const features=game.playerMapFeatures(camp.layout),scene=game.playerMapScene(camp);
 const minePin=features.landmarks.find(mark=>mark.kind==='mine');
 assert(minePin,'The authored world has a mapped iron mine entrance');
 assert.equal(minePin.x,entrance.returnSpawn.x,'Mine marker sits on the walkable entrance approach x');
 assert.equal(minePin.y,entrance.returnSpawn.y,'Mine marker sits on the walkable entrance approach y');
 for(const [width,height] of [[390,844],[844,390],[320,568]]){
  const view=game.playerMapView(scene.bounds,width,height,1);
  for(const artReady of [true,false]){
   const label=game.playerMapLabels(features,view,width,height,1,camp.player,artReady).find(label=>label.mark.id===minePin.id);
   assert(label?.box&&label.opacity===1&&!label.illustrated,'The overview shows a named mine pin with or without atlas art');
  }
 }
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const centroid=points=>({x:points.reduce((s,p)=>s+p[0],0)/points.length,y:points.reduce((s,p)=>s+p[1],0)/points.length});
 const advance=(travel,n)=>{for(let i=0;i<n;i++)travel.tick(game.STEP)};
 const enter=(travel,portal)=>{
  const from=travel.current,goal=centroid(portal.area);
  for(let i=0;i<250 && travel.current===from;i++){
   if(!travel.busy){
    const dx=goal.x-from.player.x,dy=goal.y-from.player.y,d=Math.hypot(dx,dy);
    if(d>1)game.stepCampPlaySession(from,{x:dx/d,y:dy/d},false,false);
   }
   travel.tick(game.STEP);
  }
  assert.notEqual(travel.current,from,'Walking through '+portal.id+' travels successfully: '+travel.error);
  advance(travel,80);
 };
 const resources={ready:()=>true,prepare:async()=>{},pin:()=>{}};
 const travel=new game.SceneTravel(camp,resources);
 const legacy=JSON.parse(game.encodeRun(travel));
 const legacyLayout=legacy.worlds[0][1].layout;
 legacyLayout.items=legacyLayout.items.filter(p=>p.id!=='northwest-iron-mine');
 delete legacyLayout.ironMineVersion;
 const continuedCamp=game.decodeRun(JSON.stringify(legacy)).worlds[0][1];
 assert.equal(game.scenePortals(continuedCamp).filter(p=>p.destination.sceneId==='iron-mine').length,1,
  'Continuing an expedition created before the mine adds the entrance once');
 const bridge=game.RIVER_BRIDGES.find(b=>b.id==='logging-bridge');
 const [x,y]=game.sourcePointToWorld(bridge.to,game.EAST_TERRAIN_SCALE);
 const approachFromBridge=game.pathTo({x,y},entrance.returnSpawn,camp,Infinity,19);
 assert(approachFromBridge.length && dist(approachFromBridge.at(-1),entrance.returnSpawn)<65,
  'The logging bridge connects to the mine approach on the authored terrain');
 assert(!game.worldBlocked(camp,entrance.returnSpawn.x,entrance.returnSpawn.y));
 Object.assign(camp.player,entrance.returnSpawn);
 enter(travel,entrance);
 const mine=travel.current,entry=mine.scene.spawns.entrance;
 assert.equal(mine.scene.id,'iron-mine');
 const tiles=mine.scene.terrain.tiles,images=game.sceneImages(mine.scene);
 assert.equal(tiles.length,6);
 const atlas=game.playerMapScene(mine);
 assert.equal(atlas.images.length,1,'The mine atlas loads one overview texture');
 assert.equal(atlas.images[0].url,mine.scene.terrain.url);
 assert.equal(fs.readFileSync('public'+atlas.images[0].url).toString('ascii',8,12),'WEBP','The compact mine overview is packaged');
 for(const [index,tile] of tiles.entries()){
  const row=Math.floor(index/3),column=index%3;
  const width=mine.scene.width/3,height=mine.scene.height/2,x=column*width,y=row*height;
  const draws=[];
  game.drawSceneTerrain({drawImage:(...args)=>draws.push(args)},images,mine.scene,{x:x+100,y:y+100,width:200,height:200});
  assert.deepEqual(draws,[[tile.url,x,y,width,height]],'The visible detail tile is loaded at its registered position');
  assert.equal(fs.readFileSync('public'+tile.url).toString('ascii',8,12),'WEBP','Tile is packaged as WebP');
 }
 assert(!game.worldBlocked(mine,mine.player.x,mine.player.y));
 for(let i=0;i<30;i++){
  game.stepCampPlaySession(mine,{x:0,y:1},false,false);
  travel.tick(game.STEP);
 }
 assert.equal(travel.current,mine);
 assert(mine.player.y>entry.y+100,'Holding down walks from the entrance into the mine');
 const doors=mine.layout.items.filter(p=>p.id.startsWith('mine-door-'));
 const deposits=mine.layout.items.filter(p=>game.MINEABLE_ROCKS.has(p.assetId));
 const chest=mine.layout.items.find(p=>p.id==='mine-survey-cache');
 assert(doors.length>=3 && deposits.length>=10 && chest,'Multiple chambers, ore seams and the cache exist');
 assert(!game.placedLootChestVisible(mine,chest),'The unopened chest is hidden from the entrance');
 const routeTo=(point)=>game.pathTo(entry,point,mine,Infinity,19);
 const reaches=(point)=>{const end=routeTo(point).at(-1);return !!end && dist(end,point)<68};
 const southernSide=door=>({x:door.x,y:door.y+110});
 for(const door of doors)assert(!reaches(southernSide(door)),'Closed chamber bypass: '+door.id);
 assert(!reaches(chest),'The cache is concealed beyond a closed chamber');
 for(const door of doors){
  const [postA,postB]=game.gateColliders(door,0);
  const threshold={x:(postA.x+postB.x)/2,y:(postA.y+postB.y)/2};
  assert(game.worldBlocked(mine,threshold.x,threshold.y));
  const approach={x:threshold.x,y:threshold.y-52};
  assert(reaches(approach) && !game.worldBlocked(mine,approach.x,approach.y),'Reachable latch: '+door.id);
  Object.assign(mine.player,approach);
  assert.equal(game.nearbyGate(mine)?.id,door.id);
  const action=game.playInteraction(mine);
  assert.equal(action?.shortLabel,'OPEN');
  assert.equal(action.target.id,'gate:'+door.id);
  assert(action.perform());
  assert(!game.worldBlocked(mine,threshold.x,threshold.y));
  game.moveBody(mine,mine.player,0,110);
  assert(mine.player.y>threshold.y+45,'Player can cross the opened threshold');
  assert(reaches(southernSide(door)),'Chamber opens: '+door.id);
 }
 const approachInteraction=(placement,match)=>{
  for(let radius=24;radius<=180;radius+=12){
   for(let i=0;i<24;i++){
    const point={x:placement.x+Math.cos(i*Math.PI/12)*radius,y:placement.y+Math.sin(i*Math.PI/12)*radius};
    if(game.worldBlocked(mine,point.x,point.y))continue;
    Object.assign(mine.player,point);
    const result=match();
    if(result && reaches(point))return result;
   }
  }
  assert.fail('No accessible interaction for '+placement.id);
 };
 mine.gear.bag.metalPickaxe=1;
 mine.player.equipped='metalPickaxe';
 const locateRock=p=>approachInteraction(p,()=>{
  const target=game.nearbyMineableRock(mine);
  return target?.placement.id===p.id && target;
 });
 for(const p of deposits)assert(locateRock(p).ore>0,'Iron seam must yield ore: '+p.id);
 const rock=deposits.at(-1),target=locateRock(rock);
 const dx=target.point.x-mine.player.x,dy=target.point.y-mine.player.y;
 mine.player.direction=game.facing(dx,dy);
 let swings=0;
 do {
  assert(game.attack(mine),'A pickaxe swing starts');
  for(let i=0;i<60;i++){mine.tick++;game.stepAxe(mine)}
  assert(++swings<=12 && mine.rockMining?.[rock.id],'The swing contacts this seam');
 } while(mine.rockMining[rock.id].hp);
 const ore=mine.loot.find(drop=>drop.sourceRockId===rock.id && drop.kind==='ironOre');
 assert(ore && ore.amount>0);
 const oreAmount=ore.amount;
 mine.tick+=60;
 Object.assign(mine.player,ore);
 assert(game.pickup(mine));
 assert.equal(game.itemCount(mine,'ironOre'),oreAmount);
 const latch=approachInteraction(chest,()=>game.nearbyLootChest(mine));
 assert(game.placedLootChestVisible(mine,chest),'The unopened chest becomes visible at its latch');
 const chestAction=game.playInteraction(mine);
 assert.equal(chestAction?.target.id,'rare-chest:'+latch.id);
 assert(chestAction.perform());
 mine.tick+=90;game.stepLootChest(mine);
 assert.equal(mine.stationPanel,'rare-cache');
 assert.equal(game.lootChestName(latch.id),'Surveyor’s lockbox');
 assert.deepEqual(game.lootChestContents(mine,latch.id),{ironIngot:2,beans:2,energyBar:1});
 const ingotsBefore=game.itemCount(mine,'ironIngot');
 assert.equal(game.takeLootChestReward(mine,'ironIngot',1),1);
 assert.equal(game.itemCount(mine,'ironIngot'),ingotsBefore+1);
 const oldCache={lootChests:{[latch.id]:{openedAt:0,contents:{beans:0,energyBar:1}}}};
 assert.equal(game.lootChestRemaining(oldCache,latch.id),1,'An older, opened cache keeps its original supplies');
 const remaining={...game.lootChestContents(mine,latch.id)};
 mine.stationPanel=undefined;
 Object.assign(mine.player,entry);
 const saved=game.encodeRun(travel);
 assert(saved);
 const resume=new game.SceneTravel(camp,resources);
 const snapshotToResume=game.decodeRun(saved);
 const savedCamp=snapshotToResume.worlds.find(([id])=>id==='camp')[1];
 savedCamp.outdoorReady=new Set(); // The outdoor stream releases these tiles underground.
 await resume.restore(snapshotToResume);
 const restored=resume.current;
 assert.equal(restored.scene.id,'iron-mine');
 for(const door of doors)assert(game.gateIsOpen(restored,door.id));
 assert.equal(restored.rockMining[rock.id].hp,0);
 assert.deepEqual(game.lootChestContents(restored,latch.id),remaining);
 assert(dist(restored.player,mine.player)<1,'Continue keeps the player at the saved mine position');
 advance(resume,80);
 enter(resume,restored.scene.portals.find(p=>'return' in p.destination));
 assert.equal(game.sceneId(resume.current),'camp');
 assert(dist(resume.current.player,entrance.returnSpawn)<1);
 assert.equal(game.itemCount(resume.current,'ironOre'),game.itemCount(restored,'ironOre'));
 assert(!resume.current.rockMining?.[rock.id],'Underground depletion is local');
 assert(game.worldBlocked(resume.current,resume.current.player.x,resume.current.player.y),'Outdoor movement still waits for streamed ground');
 savedCamp.outdoorReady=new Set(game.OUTDOOR_TILES.map(tile=>tile.key));
 enter(resume,entrance);
 assert.equal(resume.current,restored,'Re-entry preserves the visited mine');
 travel.dispose();resume.dispose();
 console.log(`PASS: northwest entrance and return, ${doors.length} sealed/openable chambers, ${deposits.length} reachable iron deposits, pickaxe mining and collection, concealed chest, saved state and re-entry.`);
} finally {
 fs.rmSync(temp,{recursive:true,force:true});
}
