// Read-only game fixtures; never writes the hosted world or a player's save.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'circular-wall-runtime-'));
try{
 const modules=['world-assets','world-layout','imported-art','camp-perimeter','camp-collision','circular-wall-depth','placed-world-renderer','studio-play','survival-engine','run-save','scene-travel','world-scenes'];
 await build({stdin:{contents:modules.map(id=>`export * from './src/${id}';`).join(''),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temp,'model.cjs'));
 const fixture=process.argv[2]??'docs/qa/circular-wall-v1';
 const saved={layout:JSON.parse(fs.readFileSync(path.join(fixture,'source-world.json'))).draft,records:JSON.parse(fs.readFileSync(path.join(fixture,'source-artwork.json'))).records};
 m.installImportedArt(saved.records);
 const original=JSON.stringify(saved.layout),layout=m.addApprovedCampPerimeter(saved.layout);
 assert.equal(JSON.stringify(saved.layout),original,'Migration never mutates its input');
 assert.equal(layout.campPerimeterVersion,5);
 const walls=layout.items.filter(p=>p.assetId.startsWith('camp_circular_wall_'));
 assert.equal(walls.length,16);
 assert.deepEqual(m.validateLayout(layout).errors,[]);
 for(const p of walls){
  const a=m.ASSET_BY_ID.get(p.assetId);
  assert(a&&a.perimeterCurve?.length>2&&a.perimeter==='wall');
  assert(a.solid&&a.body.length===0&&a.collision.paths.length>0);
  assert(a.collision.paths.every(p=>p.closed&&p.points.length<=64),'Bounded curved collision paths');
  assert(fs.existsSync('public'+a.image),a.image);
  assert(Object.values(m.requiredImages([p.assetId])).includes(a.image));
  assert(m.placementBodies(p).every(c=>c.shape==='polygon'),'The wall must not gain a large rectangular blocker');
 }
 assert.equal(new Set(m.WORLD_ASSETS.map(a=>a.id)).size,m.WORLD_ASSETS.length,'No duplicate auto-registered wall assets');

 // The last leg of a bend must take part in fading and depth, not just its
 // first chord. This is an independent shape, not a copy of production data.
 const bent=m.circularWallDepth([[0,0],[100,0],[100,300]],{x:110,y:220},180);
 assert(bent.obscuresPlayer&&bent.depth>220&&bent.depth<320);
 assert(!m.circularWallDepth([[0,0],[100,0],[100,300]],{x:400,y:400},180).obscuresPlayer);

 const imgs=Object.fromEntries(walls.map(p=>{const a=m.ASSET_BY_ID.get(p.assetId);return[m.assetImageKey(a.image),{id:p.assetId}]}));
 const calls=[],stack=[];
 const ctx={globalAlpha:1,save(){stack.push(this.globalAlpha)},restore(){this.globalAlpha=stack.pop()},drawImage(image){calls.push({id:image.id,alpha:this.globalAlpha})}};
 const render=(player,viewport)=>{
  calls.length=0;
  const world={layout:{...layout,items:walls},player};
  const draws=m.placedDrawables(ctx,imgs,world,true,viewport);
  draws.push({y:player.y,draw:()=>calls.push({id:'player',alpha:1})});
  draws.sort(m.compareWorldDrawables).forEach(o=>o.draw());
  return calls.map(c=>({...c}));
 };
 const expected=walls.map(p=>m.ASSET_BY_ID.get(p.assetId)).sort((a,b)=>a.perimeterDrawOrder-b.perimeterDrawOrder).map(a=>a.id);
 const atCentre=render(layout.spawn);
 assert.deepEqual(atCentre.filter(c=>c.id!=='player').map(c=>c.id),expected,'Actual draw calls preserve the approved overlapping-post order');
 const reviewed=[];
 for(const id of ['camp_circular_wall_01','camp_circular_wall_08','camp_circular_wall_09','camp_circular_wall_16']){
  const p=walls.find(p=>p.assetId===id),a=m.ASSET_BY_ID.get(id),ground=a.perimeterCurve[Math.floor(a.perimeterCurve.length/2)];
  for(const behind of [true,false]){
   const player={x:p.x+ground[0]*p.scale,y:p.y+ground[1]*p.scale+(behind?-80:80)};
   const result=render(player),wall=result.find(c=>c.id===id),wallIndex=result.findIndex(c=>c.id===id),playerIndex=result.findIndex(c=>c.id==='player');
   assert.equal(wall.alpha,behind?.48:1,id+' fades only when the survivor is behind its face');
   assert.equal(wallIndex>playerIndex,behind,id+' interleaves at the local ground depth');
   assert.deepEqual(result.filter(c=>c.id!=='player').map(c=>c.id),expected,'Nearby depth changes cannot reopen the northern joins');
  }
  reviewed.push(id);
 }
 for(const id of ['camp_circular_wall_04','camp_circular_wall_05','camp_circular_wall_12','camp_circular_wall_13']){
  const p=walls.find(p=>p.assetId===id),a=m.ASSET_BY_ID.get(id),ground=a.perimeterCurve[Math.floor(a.perimeterCurve.length/2)];
  const player={x:p.x+ground[0]*p.scale-60,y:p.y+ground[1]*p.scale-70};
  const result=render(player);assert(result.some(c=>c.id===id));assert.deepEqual(result.filter(c=>c.id!=='player').map(c=>c.id),expected);
 }
 assert.equal(render(layout.spawn,{x:100000,y:100000,width:100,height:100,scale:1}).length,1,'Off-screen walls do not draw');
 const moved=structuredClone(walls[0]);moved.x+=50;
 assert.notEqual(m.circularWallGroup(m.ASSET_BY_ID.get(moved.assetId).perimeterCurve,moved),m.circularWallGroup(m.ASSET_BY_ID.get(walls[0].assetId).perimeterCurve,walls[0]),'A moved editor piece does not inherit the original circle sorting constraints');

 // Saved runs retain gameplay state. Force a saved foot position and an
 // interior return landing into a newly added wall to exercise safe migration.
 const make=()=>m.createCampPlaySession(saved.layout,undefined,'survival');
 const resources={pin(){},prepare:async()=>{},ready:()=>true};
 const blockedWall=walls.find(p=>p.assetId==='camp_circular_wall_01'),blockedArt=m.ASSET_BY_ID.get(blockedWall.assetId),mid=blockedArt.perimeterCurve[Math.floor(blockedArt.perimeterCurve.length/2)];
 const occupied={x:blockedWall.x+mid[0],y:blockedWall.y+mid[1]};
 const protectedState=w=>JSON.stringify({progression:w.progression,bag:w.bag,stock:w.stock,gear:w.gear,cycle:w.cycle,tick:w.tick,phase:w.phase,phaseLeft:w.phaseLeft,round:w.round,hunger:w.hunger,thirst:w.thirst,hp:w.player.hp});
 const before=make();before.bag.pallets=7;before.stock.scrap=12;Object.assign(before.player,occupied);
 const state=protectedState(before),encoded=m.encodeRun(new m.SceneTravel(before,resources));
 const resumed=m.decodeRun(encoded),camp=resumed.worlds.find(([id])=>id===m.CAMP_SCENE_ID)[1];
 assert.equal(camp.layout.campPerimeterVersion,5);assert.equal(protectedState(camp),state);
 assert(!m.layoutBlocked(camp.layout,camp.player.x,camp.player.y,19));
 const displacement=Math.hypot(camp.player.x-occupied.x,camp.player.y-occupied.y);assert(displacement>0&&displacement<=480,'Only a bounded nearby landing correction is allowed');
 const second=m.decodeRun(m.encodeRun(new m.SceneTravel(camp,resources))).worlds[0][1];
 assert.equal(second.player.x,camp.player.x);assert.equal(second.player.y,camp.player.y,'A migrated save does not nudge the player again');

 const interiorSnapshot=JSON.parse(encoded),interior=structuredClone(interiorSnapshot.worlds[0][1]);
 interior.layout=structuredClone(m.BUNKER_SCENE.layout??m.emptyLayout());interior.player.x=936;interior.player.y=649;
 interiorSnapshot.worlds.push([m.BUNKER_SCENE.id,interior]);interiorSnapshot.currentId=m.BUNKER_SCENE.id;
 interiorSnapshot.route=[{sceneId:m.CAMP_SCENE_ID,spawn:{...occupied,direction:'down'}}];
 const inside=m.decodeRun(JSON.stringify(interiorSnapshot)),home=inside.worlds.find(([id])=>id===m.CAMP_SCENE_ID)[1],active=inside.worlds.find(([id])=>id===m.BUNKER_SCENE.id)[1];
 assert.equal(inside.currentId,m.BUNKER_SCENE.id);assert.equal(active.player.x,936);assert.equal(active.player.y,649);
 assert.equal(protectedState(active),state);assert.equal(home.layout.campPerimeterVersion,5);
 assert(!m.layoutBlocked(home.layout,inside.route[0].spawn.x,inside.route[0].spawn.y,19));assert.equal(inside.route[0].spawn.direction,'down');

 // If a custom return landing cannot be cleared, a previously planned player
 // adjustment must not leak out of the deferred migration.
 const deferred=make(),south=walls.find(p=>p.assetId==='camp_circular_wall_08');
 Object.assign(deferred.player,{x:south.x,y:south.y});
 deferred.layout={...deferred.layout,items:[...deferred.layout.items,{id:'qa-obstructed-return',assetId:'camp_circular_wall_01',x:occupied.x,y:occupied.y,scale:1,solid:true,role:'prop',roof:'auto',frame:{sourceAssetId:'camp_circular_wall_01',width:1200,height:1200,anchor:[.5,.5]},collision:{lineWidth:.008,paths:[{closed:true,points:[[0,0],[1,0],[1,1],[0,1]]}]}}]};
 const deferredRoute=[{sceneId:m.CAMP_SCENE_ID,spawn:{...occupied,direction:'down'}}],beforeDeferral=JSON.stringify({world:deferred,route:deferredRoute});
 assert.equal(m.migrateSavedCampPerimeter(deferred,deferredRoute),false);
 assert.equal(JSON.stringify({world:deferred,route:deferredRoute}),beforeDeferral,'A deferred migration leaves the layout, player, return route and run state unchanged');
 const deferredSnapshot={currentId:m.BUNKER_SCENE.id,worlds:[[m.CAMP_SCENE_ID,deferred],[m.BUNKER_SCENE.id,active]],route:deferredRoute};
 let resumedSources;
 await m.prepareSavedCampArtwork(deferredSnapshot,async sources=>{resumedSources=sources});
 const oldWalls=JSON.parse(fs.readFileSync('src/wall-artwork-replacements.json'));
 const placedOriginalWalls=oldWalls.filter(old=>deferred.layout.items.some(p=>p.assetId===old.entryId));
 assert(placedOriginalWalls.length>0,'The deferred fixture contains original wall artwork');
 for(const old of placedOriginalWalls)assert(Object.values(resumedSources).includes(old.url),'A saved interior also prepares its deferred original camp wall: '+old.url);
 await assert.rejects(m.prepareSavedCampArtwork(deferredSnapshot,async()=>{throw Error('artwork unavailable')}),/artwork unavailable/,'Restore must report image failure so the caller can keep the original save');
 assert.equal(JSON.stringify({world:deferred,route:deferredRoute}),beforeDeferral,'Artwork preparation never rewrites saved game data');
 console.log(JSON.stringify({result:'pass',assets:walls.length,groundShape:'annular polygons',requiredImageURLsResolve:true,reviewedFrontBehind:reviewed,cardinalSides:true,drawOrder:expected,continuedCampRun:true,continuedInteriorRun:true,resourcesHealthAndProgressPreserved:true,occupiedLandingAdjustment:displacement,deferredMigrationPreservesAllState:true,savedCampArtworkPreparedFromInterior:true},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
