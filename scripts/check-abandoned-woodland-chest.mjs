import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const dir=mkdtempSync(join(tmpdir(),'woodland-chest-'));
try{
 const modules=['imported-art','authored-world','abandoned-camp-art','world-layout','world-assets','survival-engine','studio-play','play-interaction','station-access','expedition-inventory','chest-animation','loot-chest','run-save','scene-travel'];
 const file=join(dir,'model.mjs');
 await build({stdin:{contents:modules.map(name=>"export * from './src/"+name+"';").join('\n'),resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:file,logLevel:'error'});
 const m=await import(pathToFileURL(file));
 const snapshot=JSON.parse(readFileSync('native/assets/world-snapshot.json','utf8'));
 m.installImportedArt(snapshot.records);
 const currentWorld=m.createCampPlaySession(m.prepareAuthoredWorld(snapshot.layout),undefined,'survival');
 const campsite=snapshot.layout.items.find(p=>p.assetId===m.ABANDONED_CAMP_ID);
 assert(campsite,'The published camp must include its northwest woodland camp');
 // Follow the northwest road into the clearing and between the lean-to and cold hearth.
 const approach=[[440,180],[599,368],[155,524],[143,764],[107,848],[-49,860],[-133,776],[-145,752],[-150,736],[-196,733]];
 for(let i=1;i<approach.length;i++){
  const [ax,ay]=approach[i-1],[bx,by]=approach[i];
  const steps=Math.ceil(Math.hypot(bx-ax,by-ay)/2);
  for(let j=0;j<=steps;j++){
   const x=ax+(bx-ax)*j/steps,y=ay+(by-ay)*j/steps;
   assert(!m.worldBlocked(currentWorld,x,y,19),`Northwest chest approach must stay clear at ${x}, ${y}`);
  }
 }
 const [x,y]=approach.at(-1);
 Object.assign(currentWorld.player,{x,y});
 assert.equal(m.nearbyLootChest(currentWorld)?.id,m.placedLootChestId(campsite.id));
 assert.equal(m.playInteraction(currentWorld)?.target?.label,'Wooden chest');
 const first=m.newPlacement(m.ABANDONED_CAMP_ID,1400,1400);
 const second={...m.newPlacement(m.ABANDONED_CAMP_ID,2500,1500),rotation:20,flipX:true,scale:1.15};
 const layout={...m.emptyLayout(),items:[first,second]};
 const w=m.createCampPlaySession(layout,undefined,'survival');
 const resources={pin(){},prepare:async()=>{},ready:()=>true};
 const open=(world,p)=>{
  const latch=m.placementArtPoint(p,...m.ABANDONED_CAMP_LATCH);
  // Walk up to clear ground near the actual latch, respecting the authored feet.
  const standing=Array.from({length:36},(_,i)=>({x:latch.x+40*Math.sin(i*Math.PI/18),y:latch.y+40*Math.cos(i*Math.PI/18)}))
   .find(point=>!m.worldBlocked(world,point.x,point.y,19)&&m.lineClear(point,latch,world,-1,5));
  assert(standing,'A survivor can reach the chest face');
  Object.assign(world.player,standing);
  assert.equal(m.nearbyChest(world),null,'The abandoned camp never opens HQ storage');
  const action=m.playInteraction(world);
  assert.equal(action?.target?.label,'Wooden chest');
  assert.equal(action.perform(),true);
  assert.equal(m.chestFrame(world,p.id,2),1);
  if(world.rareCacheMenuAt!==undefined){world.tick=world.rareCacheMenuAt;m.stepLootChest(world)}
  assert.equal(world.stationPanel,'rare-cache');
  assert(m.atStation(world));
 };
 const id=m.placedLootChestId(first.id);
 open(w,first);
 assert.equal(m.lootChestRemaining(w,id),3);
 assert.equal(m.chestFrame(w,second.id,2),0);
 const prior=m.itemCount(w,'beans');
 assert.equal(m.takeLootChestReward(w,'beans',1),1);
 assert.equal(m.itemCount(w,'beans'),prior+1);
 m.setItemCount(w,'stone',100);
 assert.equal(m.takeAllLootChestRewards(w),0);
 assert.equal(m.lootChestRemaining(w,id),2);
 m.setItemCount(w,'stone',0);
 const travel=new m.SceneTravel(w,resources);
 const saved=m.encodeRun(travel);
 const restored=m.decodeRun(saved).worlds.find(([scene])=>scene===travel.capture().currentId)[1];
 assert.equal(restored.stationPanel,undefined);
 assert.equal(restored.lootChestId,undefined);
 assert.equal(m.chestFrame(restored,first.id,2),1);
 assert.equal(m.lootChestRemaining(restored,id),2);
 open(restored,first);
 assert.equal(m.takeAllLootChestRewards(restored),2);
 assert.equal(m.takeAllLootChestRewards(restored),0);
 Object.assign(restored.player,m.placementArtPoint(second,...m.ABANDONED_CAMP_LATCH));
 assert.equal(m.atStation(restored),false,'Walking to a second chest invalidates the first panel');
 restored.stationPanel=undefined;
 open(restored,second);
 assert.equal(m.takeAllLootChestRewards(restored),3);
 assert.equal(m.lootChestOpened(restored),false,'The starter cache keeps its own state');
 restored.stationPanel=undefined;
 open(restored,first);
 assert.equal(m.lootChestRemaining(restored,id),0);
 assert.equal(m.takeAllLootChestRewards(restored),0);
 console.log('PASS: wooden chest opens from clear ground, survives a saved run, obeys pack weight and keeps independent loot for transformed camp copies.');
}finally{rmSync(dir,{recursive:true,force:true})}
