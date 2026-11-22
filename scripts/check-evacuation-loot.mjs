import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const temp=mkdtempSync(join(tmpdir(),'evacuation-loot-'));
try{
 const modules=['evacuation-van-art','wooden-loot-art','world-layout','world-assets','survival-engine','studio-play','play-interaction','station-access','expedition-inventory','player-gear','backpack','chest-animation','loot-chest','run-save','scene-travel'];
 const file=join(temp,'model.mjs');
 await build({stdin:{contents:modules.map(name=>`export * from './src/${name}';`).join('\n')+"\nexport * from './native/run-save-store';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:file,logLevel:'error'});
 const m=await import(pathToFileURL(file));
 const van={...m.newPlacement(m.EVACUATION_VAN_ID,1400,1450),id:m.EVACUATION_VAN_PLACEMENT_ID};
 const backpack={...m.newPlacement(m.EVACUATION_BACKPACK_ID,2200,1500),id:m.EVACUATION_BACKPACK_PLACEMENT_ID};
 const copiedVan={...m.newPlacement(m.EVACUATION_VAN_ID,2800,2100),rotation:37,flipX:true,scale:.9};
 const copiedBackpack={...m.newPlacement(m.EVACUATION_BACKPACK_ID,950,2400),rotation:331,flipY:true,scale:1.15};
 const wooden=m.newPlacement(m.WOODEN_LOOT_ID,2800,800);
 const layout={...m.emptyLayout(),spawn:{x:500,y:500},items:[van,backpack,copiedVan,copiedBackpack,wooden]};
 const world=m.createCampPlaySession(layout,undefined,'survival');
 for(const id of Object.keys(m.GEAR))m.gear(world).bag[id]=0;
 for(const kind of m.INVENTORY_KINDS)m.setItemCount(world,kind,0);
 const resources={pin(){},prepare:async()=>{},ready:()=>true};
 const active=snapshot=>snapshot.worlds.find(([id])=>id===snapshot.currentId)[1];
 const saveWorld=w=>m.encodeRun(new m.SceneTravel(w,resources));
 const latch=p=>m.placementArtPoint(p,...(p.assetId===m.EVACUATION_VAN_ID?m.EVACUATION_VAN_LATCH:p.assetId===m.EVACUATION_BACKPACK_ID?m.EVACUATION_BACKPACK_LATCH:m.WOODEN_LOOT_LATCH));
 const standBy=(w,p)=>{
  const face=latch(p);
  const standing=[28,40,54].flatMap(radius=>Array.from({length:72},(_,i)=>({x:face.x+radius*Math.sin(i*Math.PI/36),y:face.y+radius*Math.cos(i*Math.PI/36)})))
   .find(point=>!m.worldBlocked(w,point.x,point.y,19)&&m.lineClear(point,face,w,-1,5));
  assert(standing,`Reachable standing room at ${p.assetId}`);
  Object.assign(w.player,standing);
  assert.equal(m.nearbyLootChest(w)?.id,m.placedLootContainerId(p));
 };
 const search=(w,p,label)=>{
  w.stationPanel=undefined;standBy(w,p);
  const id=m.placedLootContainerId(p),opened=m.lootChestOpened(w,id),before=m.lootChestContents(w,id);
  const action=m.playInteraction(w);
  assert.equal(action?.label,opened?'View supplies':label);
  assert.equal(action?.shortLabel,opened?'LOOT':'SEARCH');
  assert.equal(action?.target?.label,p.assetId===m.EVACUATION_VAN_ID?'Evacuation van':'Abandoned backpack');
  assert.equal(action.perform(),true);
  assert.equal(w.stationPanel,'rare-cache','Static cargo opens immediately');
  assert.equal(w.rareCacheMenuAt,undefined,'No invisible lid-animation wait');
  assert.equal(m.atStation(w),true);
  assert.equal(m.openLootChest(w,id),false,'Repeated search cannot reopen an active menu');
  if(opened)assert.deepEqual(m.lootChestContents(w,id),before,'Reopening never restocks a container');
  return id;
 };
 for(const p of [van,copiedVan]){
  const body=m.placementArtPoint(p,.44,.61),door=m.placementArtPoint(p,.185,.611);
  assert(m.worldBlocked(world,body.x,body.y,19),'The painted chassis blocks movement');
  assert(m.worldBlocked(world,door.x,door.y,19),'The open door foot blocks movement');
  assert(Math.hypot(body.x-latch(p).x,body.y-latch(p).y)<m.ACTION_REACH);
  Object.assign(world.player,body);
  assert.equal(m.nearbyLootChest(world),null,'Even within reach, the chassis cannot be searched through');
  assert.equal(m.openLootChest(world,m.placedLootContainerId(p)),false);
 }
 const vanId=search(world,van,'Search van');
 assert.equal(vanId,m.EVACUATION_VAN_CACHE_ID);
 assert.deepEqual(m.lootChestContents(world,vanId),{beans:2,energyBar:2,repairHammer:1,woodenAxe:1,scrap:5});
 assert.equal(m.lootChestRemaining(world,vanId),11);
 assert.equal(m.takeLootChestReward(world,'beans',1),1);
 m.setItemCount(world,'stone',31);
 assert.equal(m.takeLootChestReward(world,'scrap',5),1,'Only one piece of scrap fits beside the stone and beans');
 assert.equal(m.itemCount(world,'scrap'),1);
 assert.equal(m.lootChestContents(world,vanId).scrap,4);
 assert(m.packWeight(world)<=m.PACK_CAPACITY);
 m.setItemCount(world,'stone',40);
 const retained={...m.lootChestContents(world,vanId)};
 assert.equal(m.takeAllLootChestRewards(world),0,'A full backpack leaves all remaining supplies in place');
 assert.deepEqual(m.lootChestContents(world,vanId),retained);
 m.setItemCount(world,'stone',0);
 const position={x:world.player.x,y:world.player.y};
 world.player.x+=300;
 assert.equal(m.takeLootChestReward(world,'beans'),0,'A stale open menu cannot take supplies from a distance');
 Object.assign(world.player,position);

 // Both platform save formats preserve the same partial inventory and clear only menu state.
 const web=active(m.decodeRun(saveWorld(world)));
 assert.deepEqual(web.lootChests,world.lootChests);
 assert.equal(web.stationPanel,undefined);
 const values=new Map(),storage={async getItem(key){return values.get(key)??null},async setItem(key,value){values.set(key,value)}};
 const store=new m.NativeRunSaveStore(storage),prepared=store.prepare(new m.SceneTravel(world,resources));
 assert(prepared);await store.save(prepared);assert.equal(store.error,'');
 const native=active(await new m.NativeRunSaveStore(storage).load());
 assert.deepEqual(native.lootChests,web.lootChests,'Native and web keep the same finite cargo');
 assert.equal(native.stationPanel,undefined);
 for(const restored of [web,native]){
  search(restored,van,'Search van');
  assert.equal(m.takeAllLootChestRewards(restored),9);
  assert.equal(m.takeAllLootChestRewards(restored),0);
  assert.equal(m.gear(restored).bag.repairHammer,1);
  assert.equal(m.gear(restored).bag.woodenAxe,1);
  assert.equal(restored.tools.hammer,true);
  assert.equal(m.itemCount(restored,'beans'),2);
  assert.equal(m.itemCount(restored,'energyBar'),2);
  assert.equal(m.itemCount(restored,'scrap'),5);
  const depleted=active(m.decodeRun(saveWorld(restored)));
  search(depleted,van,'Search van');assert.equal(m.takeAllLootChestRewards(depleted),0,'Continue cannot refill empty cargo');
 }
 const packId=search(web,backpack,'Search backpack');
 assert.equal(packId,m.EVACUATION_BACKPACK_CACHE_ID);
 assert.deepEqual(m.lootChestContents(web,packId),{beans:1,energyBar:1,scrap:2});
 assert.equal(m.takeLootChestReward(web,'energyBar',1),1);
 assert.equal(m.lootChestRemaining(web,vanId),0,'Backpack supplies do not share the cargo inventory');
 search(web,backpack,'Search backpack');assert.equal(m.takeAllLootChestRewards(web),3);
 const copyVanId=search(web,copiedVan,'Search van');
 assert.notEqual(copyVanId,vanId);
 assert.equal(m.lootChestRemaining(web,copyVanId),11,'An arbitrary editor UUID gets van supplies');
 assert.equal(m.takeLootChestReward(web,'scrap',2),2);
 const copyPackId=search(web,copiedBackpack,'Search backpack');
 assert.notEqual(copyPackId,packId);
 assert.equal(m.lootChestRemaining(web,copyPackId),4,'A mirrored backpack copy has independent supplies');
 const copyReload=active(m.decodeRun(saveWorld(web)));
 assert.equal(m.lootChestRemaining(copyReload,copyVanId),9);
 assert.equal(m.lootChestRemaining(copyReload,copyPackId),4);
 assert.equal(m.lootChestRemaining(copyReload,vanId),0);

 // Shared loot changes must preserve the existing physical lid/reveal timing.
 web.stationPanel=undefined;standBy(web,wooden);
 let action=m.playInteraction(web);assert.equal(action?.label,'Open loot chest');assert.equal(action.perform(),true);
 assert.equal(web.stationPanel,undefined);
 assert.equal(web.rareCacheMenuAt,web.tick+m.WOODEN_LOOT_OPEN_TICKS+12);
 web.tick=web.rareCacheMenuAt-1;m.stepLootChest(web);assert.equal(web.stationPanel,undefined);
 web.tick++;m.stepLootChest(web);assert.equal(web.stationPanel,'rare-cache');
 web.stationPanel=undefined;web.camp.hearth.x=500;web.camp.hearth.y=2800;
 const rare=m.campLootChest(web);Object.assign(web.player,{x:rare.x,y:rare.y+60});
 assert.equal(m.nearbyLootChest(web)?.id,m.LOOT_CHEST_ID);
 assert.equal(m.openLootChest(web),true);assert.equal(web.stationPanel,undefined);
 assert.equal(web.rareCacheMenuAt,web.tick+m.LOOT_CHEST_OPEN_TICKS+m.LOOT_CHEST_REVEAL_HOLD_TICKS);
 web.tick=web.rareCacheMenuAt;m.stepLootChest(web);assert.equal(web.stationPanel,'rare-cache');
 assert.equal(m.lootChestRemaining(web),3);
 assert.equal(m.lootChestEmptyMessage(vanId),'Cargo empty');
 assert.equal(m.lootChestEmptyMessage(packId),'Backpack empty');
 for(const id of [vanId,packId])for(const reward of m.lootChestRewards(id))assert(existsSync('public'+m.BAG_IMAGES[reward.kind]),`Menu artwork exists for ${reward.kind}`);
 console.log('PASS: van/backpack prompts, instant search, finite independent inventories, capacity, transformed editor copies, web/native saves, menu artwork, and existing chest animation timing.');
}finally{rmSync(temp,{recursive:true,force:true})}
