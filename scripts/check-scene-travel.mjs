import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'scene-travel-'));
try{
 await build({stdin:{contents:`export * from './src/scene-travel';export * from './src/scene-resources';export * from './src/world-scenes';export * from './src/scene-collision';export * from './src/world-layout';export * from './src/world-assets';export * from './src/imported-art';export * from './src/studio-play';export * from './src/player-presentation';export {worldBlocked,createWorld,movePlayer,STEP} from './src/survival-engine';export {placedAnimationFrame} from './src/step-on-animation';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=createRequire(import.meta.url)(path.join(temp,'model.cjs'));
 const fixture=JSON.parse(fs.readFileSync('scripts/fixtures/bunker-step-on.json')),record=fixture.record,savedLayout=process.argv[3]?JSON.parse(fs.readFileSync(process.argv[3])).draft:null,placement=savedLayout?.items.find(p=>p.assetId===fixture.placement.assetId)??fixture.placement;m.installImportedArt(process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2])).records:[record]);
 const point=(p,u,v)=>{const b=m.placementBounds(p),[x,y]=m.placementPoint(p,b.x+u*b.width,b.y+v*b.height);return{x,y}};
 const outside=point(placement,.26,.9),step=point(placement,.47,.70),door=point(placement,.59,.61);
 const layout={...(savedLayout??{...m.emptyLayout(),items:[placement]}),spawn:outside},before=JSON.stringify(layout),camp=m.createCampPlaySession(layout);
 const resources={ready:()=>true,prepare:async()=>{},pin:()=>{}},travel=new m.SceneTravel(camp,resources);
 const tick=(n=1,input={x:0,y:0})=>{for(let i=0;i<n;i++){if(!travel.busy)m.stepCampPlaySession(travel.current,input,false,false);travel.tick(m.STEP)}};
 const walk=(target,scene,limit=600)=>{for(let i=0;i<limit;i++){const w=travel.current;if(m.sceneId(w)!==scene||Math.hypot(target.x-w.player.x,target.y-w.player.y)<4)return;const dx=target.x-w.player.x,dy=target.y-w.player.y,len=Math.hypot(dx,dy);tick(1,{x:dx/len,y:dy/len})}assert.fail('Unreachable '+scene+' '+JSON.stringify(target)+' from '+JSON.stringify({x:travel.current.player.x,y:travel.current.player.y}))};
 tick(120);assert.equal(travel.location,'Camp');walk(step,'camp');tick(80);assert.equal(travel.location,'Camp','Stepping on the bottom stairs only opens the bunker');
 assert.equal(m.placedAnimationFrame(camp,placement,m.ASSET_BY_ID.get(record.id)),2);
 camp.player.hp=73;camp.bag.rawMeat=2;camp.stock.scrap=17;camp.cooked=1;camp.hunger=62;camp.thirst=55;camp.phase='night';camp.nightAmount=1;
 const needsTick=camp.tick;camp.survival.healthRecoveryAt=1e9;
 camp.loot.push({id:1234,x:600,y:600,kind:'cookedMeat',amount:1});camp.chestMotions={chest:{from:0,target:1,started:1}};camp.gateMotions={gate:{amount:1,target:1}};
 walk(door,'camp');tick(40);
 assert.equal(travel.location,'Emergency bunker','Walking to the real outdoor door enters the interior');
 const inside=travel.current;assert(!m.worldBlocked(inside,inside.player.x,inside.player.y,19));
 assert.equal(inside.player.hp,73);assert.equal(inside.bag.rawMeat,2);assert.equal(inside.stock.scrap,17);assert.equal(inside.cooked,1);assert(Math.abs(inside.hunger-(62-(inside.tick-needsTick)*m.STEP*.05))<.001);assert(Math.abs(inside.thirst-(55-(inside.tick-needsTick)*m.STEP*.075))<.001);assert.equal(inside.survival,camp.survival);assert(inside.survivalEnabled);
 assert.equal(inside.phase,'night');assert.equal(inside.nightAmount,1);assert.equal(inside.scene.lighting,'baked','Indoor lighting remains independent of the outdoor night');
 assert.equal(inside.loot.length,0);assert.equal(inside.layout.items.length,0);assert.notEqual(inside.layout,camp.layout);
 tick(120);assert.equal(travel.current,inside,'Arrival cannot bounce straight back');
 walk({x:640,y:670},'bunker');assert.equal(travel.current,inside);assert(Math.hypot(inside.player.x-640,inside.player.y-670)<5);
 for(const [x,y]of [[100,100],[360,550],[460,460],[600,415],[817,505],[770,1030]])assert(m.worldBlocked(inside,x,y,19),'Walls/furniture block '+x+','+y);
 walk({x:936,y:649},'bunker');walk({x:969,y:492},'bunker');tick(40);
 assert.equal(travel.current,camp,'Walking up the interior stairs returns to the same camp');
 assert.equal(camp.phase,'night');assert.equal(camp.nightAmount,1,'Return preserves the outdoor lighting');
 const exit=m.scenePortals(camp)[0].returnSpawn;assert(Math.hypot(camp.player.x-exit.x,camp.player.y-exit.y)<1);assert.equal(camp.player.hp,73);assert(camp.loot.some(l=>l.id===1234));assert.equal(camp.chestMotions.chest.target,1);assert.equal(camp.gateMotions.gate.amount,1,'Gate state survives a bunker trip');
 tick(120);assert.equal(travel.current,camp,'Return cannot immediately re-enter');
 for(let i=0;i<5;i++){
  walk(door,'camp');tick(40);assert.equal(travel.current,inside,'Revisit retains the interior instance');
  tick(60);walk({x:969,y:492},'bunker');tick(40);assert.equal(travel.current,camp);tick(60);
 }
 assert.equal(JSON.stringify(layout),before,'Trips never mutate the authored draft');
 // Geometry follows artwork changes, including copies, frozen dimensions and flips.
 for(const rotation of [0,37,90,231])for(const flipX of [false,true])for(const flipY of [false,true]){
  const p={...placement,rotation,flipX,flipY,scale:.65},w=m.createWorld({...layout,items:[p]});
  const portal=m.scenePortals(w)[0],a=point(p,.59,.61),b=point(p,.42,.75);assert(m.inSceneArea(portal.area,a.x,a.y));assert.equal(portal.returnSpawn.x,b.x);assert.equal(portal.returnSpawn.y,b.y);
 }
 // A destination is kept invisible until it is ready; errors leave the source usable.
 let finish,failed=false;const pendingResources={ready:()=>false,prepare:()=>new Promise((resolve,reject)=>{finish=()=>failed?reject(Error('offline')):resolve()}),pin:()=>{}};
 const source=m.createCampPlaySession(layout);Object.assign(source.player,door);source.stepOnMotions={[placement.id]:{position:2,active:true}};
 const slow=new m.SceneTravel(source,pendingResources);slow.tick(m.STEP);assert.equal(slow.phase,'loading');slow.tick(1);assert.equal(slow.opacity,0);assert.equal(slow.current,source);
 failed=true;finish();await new Promise(r=>setTimeout(r,0));assert.equal(slow.phase,'idle');assert.match(slow.error,/offline/);assert.equal(slow.current,source);
 failed=false;slow.retry();slow.tick(m.STEP);finish();await new Promise(r=>setTimeout(r,0));for(let i=0;i<30;i++)slow.tick(m.STEP);assert.equal(slow.location,'Emergency bunker');slow.returnToCamp();assert.equal(slow.current,source);assert.equal(slow.opacity,0);
 const cancelled=new m.SceneTravel(source,pendingResources);Object.assign(source.player,door);cancelled.tick(m.STEP);cancelled.returnToCamp();finish();await new Promise(r=>setTimeout(r,0));assert.equal(cancelled.current,source);assert.equal(cancelled.phase,'idle','A late load cannot undo Build/Stop');cancelled.dispose();slow.dispose();

 const blockedRoom={...m.BUNKER_SCENE,blockers:[m.BUNKER_SCENE.walkable]};
 const blockedSource=m.createCampPlaySession(layout);Object.assign(blockedSource.player,door);blockedSource.stepOnMotions={[placement.id]:{position:2,active:true}};
 const blockedTravel=new m.SceneTravel(blockedSource,resources,()=>{},()=>{},new Map([['bunker',blockedRoom]]));
 for(let i=0;i<60;i++)blockedTravel.tick(m.STEP);assert.equal(blockedTravel.current,blockedSource);assert.match(blockedTravel.error,/blocked/);assert.equal(blockedTravel.opacity,0);blockedTravel.dispose();
 // A new registry map with different dimensions uses the same travel and physics.
 const room={...m.BUNKER_SCENE,id:'large',name:'Large future map',width:5000,height:4500,walkable:[[0,0],[5000,0],[5000,4500],[0,4500]],blockers:[],foreground:[],spawns:{entry:{x:4000,y:4000,direction:'up'}},portals:[]};
 const large=m.createWorld({...m.emptyLayout(),spawn:room.spawns.entry});large.scene=room;large.editorPreview=true;
 assert(!m.worldBlocked(large,4000,4000));assert(m.worldBlocked(large,4990,4000));

 // Forward and return destinations are registry data, including nested maps.
 const second={...room,id:'second',name:'Second room',width:1254,height:1254,walkable:[[0,0],[1254,0],[1254,1254],[0,1254]],spawns:{entry:{x:600,y:700,direction:'down'}},portals:[{id:'back',area:[[500,400],[700,400],[700,600],[500,600]],destination:{return:true},returnSpawn:{x:600,y:700,direction:'down'}}]};
 const first={...m.BUNKER_SCENE,portals:[...m.BUNKER_SCENE.portals,{id:'next',area:[[500,600],[700,600],[700,800],[500,800]],destination:{sceneId:'second',spawnId:'entry'},returnSpawn:{x:800,y:700,direction:'right'}}]};
 const nestedSource=m.createCampPlaySession(layout);Object.assign(nestedSource.player,door);nestedSource.stepOnMotions={[placement.id]:{position:2,active:true}};
 const nested=new m.SceneTravel(nestedSource,resources,()=>{},()=>{},new Map([['bunker',first],['second',second]]));
 const idle=(n=100)=>{for(let i=0;i<n;i++)nested.tick(m.STEP)};idle();assert.equal(nested.location,'Emergency bunker');Object.assign(nested.current.player,{x:600,y:700});idle();assert.equal(nested.location,'Second room');Object.assign(nested.current.player,{x:600,y:500});idle();assert.equal(nested.location,'Emergency bunker');assert.equal(nested.current.player.x,800);Object.assign(nested.current.player,{x:969,y:492});idle();assert.equal(nested.current,nestedSource);nested.dispose();
 const old=m.samplePlayer(camp);Object.assign(large.player,{x:old.x+1,y:old.y+1});assert.equal(m.presentPlayer(large,old,0),large,'Map changes never interpolate through the old scene');
 // LRU releases only unused image keys, and never current/return maps.
 const scene=(id,key='terrain:'+id)=>({...room,id,terrain:{key,url:'/map-'+id},layout:undefined});
 const scenes=new Map(['a','b','c'].map(id=>[id,scene(id)])),loads=[],releases=[];
 const cache=new m.SceneResourceCache(scenes,async s=>{loads.push(Object.keys(s))},keys=>releases.push(...keys),2);
 cache.pin(['a']);await Promise.all([cache.prepare('a'),cache.prepare('a')]);assert.equal(loads.length,1);await cache.prepare('b');await cache.prepare('c');assert(cache.ready('a'));assert(cache.ready('c'));assert(!cache.ready('b'));assert(releases.includes('terrain:b'));assert(!releases.includes('terrain:a'));await cache.prepare('a');assert.equal(loads.length,3);cache.dispose();assert(releases.includes('terrain:a'));
 const sharedScenes=new Map([['a',scene('a','shared')],['b',scene('b','shared')],['c',scene('c')]]),sharedReleases=[];
 const sharedCache=new m.SceneResourceCache(sharedScenes,async()=>{},keys=>sharedReleases.push(...keys),2);sharedCache.pin(['b']);await sharedCache.prepare('a');await sharedCache.prepare('b');await sharedCache.prepare('c');assert(!sharedReleases.includes('shared'),'Evicting one map cannot dispose another map’s shared texture');sharedCache.dispose();assert(sharedReleases.includes('shared'));
 travel.dispose();
 console.log('PASS: actual bunker entry and stair return, open-animation gating, blocked walls/furniture, 6 repeated round trips, shared player state, isolated map entities, unchanged draft, transformed portals, safe arrival, slow/failing/cancelled loads, bounded/shared image cache and independent map dimensions.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
