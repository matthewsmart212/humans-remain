import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'evacuation-van-'));
try{
 const modules=['evacuation-van-art','evacuation-van-placement','layout-limits','world-layout',
  'world-assets','world-bounds','authored-world','imported-art','foliage-composition',
  'river-collision','studio-play','survival-engine','outdoor-terrain','player-map',
  'player-map-labels','run-save','scene-travel','loot-chest','camp-collision'];
 const outfile=path.join(temp,'game.cjs');
 await build({stdin:{contents:modules.map(name=>`export * from './src/${name}';`).join('\n')+
  "\nexport {handlePublishedWorld} from './server/world-layout';",resolveDir:process.cwd()},
  outfile,bundle:true,platform:'node',format:'cjs',logLevel:'error'});
 const m=createRequire(import.meta.url)(outfile);
 const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));
 m.installImportedArt(snapshot.records);
 const ownIds=new Set([m.EVACUATION_VAN_PLACEMENT_ID,m.EVACUATION_BACKPACK_PLACEMENT_ID]);
 const ownAssets=new Set([m.EVACUATION_VAN_ID,m.EVACUATION_BACKPACK_ID]);
 const base=structuredClone(snapshot.layout);
 base.items=base.items.filter(p=>!ownIds.has(p.id)&&!ownAssets.has(p.assetId));
 delete base.evacuationVanVersion;
 const original=JSON.stringify(base),layout=m.placeEvacuationVan(base);
 const van=layout.items.find(p=>p.id===m.EVACUATION_VAN_PLACEMENT_ID);
 const backpack=layout.items.find(p=>p.id===m.EVACUATION_BACKPACK_PLACEMENT_ID);
 assert(van&&backpack,'The authored world gains both approved assets');
 assert.equal(layout.evacuationVanVersion,1);
 assert.deepEqual([van.x,van.y,backpack.x,backpack.y],[1000,5400,1300,5200],
  'Use the surveyed southern clearing and separate northeast backpack');
 assert.equal(JSON.stringify(base),original,'The source world remains immutable');
 assert.deepEqual(layout.items.filter(p=>!ownIds.has(p.id)),base.items,
  'Every existing camp, road, tree and POI placement is preserved exactly');
 assert.equal(layout.updatedAt,base.updatedAt,'Migration retains the publication timestamp');
 assert.equal(m.placeEvacuationVan(layout),layout,'Repeated migration is a no-op');
 assert.equal(m.prepareAuthoredWorld(layout).items.filter(p=>ownIds.has(p.id)).length,2,
  'The fresh-game pipeline does not duplicate the site');
 assert.equal(m.validateLayout(layout).layout?.evacuationVanVersion,1,'Validation retains the marker');
 assert(m.validateLayout({...layout,evacuationVanVersion:2}).errors.some(e=>/evacuation van/.test(e)),
  'Unknown migration versions fail validation');

 const edited={...layout,items:layout.items.map(p=>ownIds.has(p.id)?{...p,x:p.x+137,y:p.y-83,rotation:27}:p)};
 assert.equal(m.placeEvacuationVan(edited),edited,'Authored moves, rotation and separate offsets survive');
 for(const removed of [[van.id],[backpack.id],[van.id,backpack.id]]){
  const without={...layout,items:layout.items.filter(p=>!removed.includes(p.id))};
  assert.equal(m.placeEvacuationVan(without),without,'Intentional removal is never restored');
 }
 const unmarked=structuredClone(edited);delete unmarked.evacuationVanVersion;
 assert.deepEqual(m.placeEvacuationVan(unmarked).items,edited.items,'Existing unversioned artwork is respected');
 const custom={...base,terrainImage:{...base.terrainImage,url:'/survival/custom-owner-ground.webp'}};
 assert.equal(m.placeEvacuationVan(custom),custom,'Unrelated custom worlds stay untouched');
 const full={...base,items:[...base.items]};
 while(full.items.length<m.MAX_LAYOUT_ITEMS-1)full.items.push({...base.items[0],id:'capacity-'+full.items.length});
 assert.equal(m.placeEvacuationVan(full),full,'Do not partially add a site when only one slot remains');
 const obstruction=(x,y,id)=>({...base.items.find(p=>p.solid),id,x,y,scale:1});
 const primaryBlocked={...base,items:[...base.items,obstruction(1000,5400,'owner-new-building')]};
 const fallback=m.placeEvacuationVan(primaryBlocked);
 assert.deepEqual(fallback.items.filter(p=>!ownIds.has(p.id)),primaryBlocked.items,'Fallback preserves the obstruction');
 assert.deepEqual(fallback.items.filter(p=>p.id===van.id).map(p=>[p.x,p.y]),[[-600,5600]],
  'An occupied primary site selects the surveyed southwest fallback');
 const blocked={...primaryBlocked,items:[...primaryBlocked.items,
  obstruction(-600,5600,'owner-southwest-building'),obstruction(3000,5600,'owner-southeast-building')]};
 assert.equal(m.placeEvacuationVan(blocked),blocked,'Defer safely if every candidate is occupied');

 const world=m.createCampPlaySession(layout,undefined,'survival');
 world.outdoorReady=new Set(m.OUTDOOR_TILES.map(t=>t.key));
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const findApproach=(w,p)=>{
  const latch=m.placementArtPoint(p,...(p.assetId===m.EVACUATION_VAN_ID?m.EVACUATION_VAN_LATCH:m.EVACUATION_BACKPACK_LATCH));
  for(let radius=24;radius<=60;radius+=6)for(let i=0;i<48;i++){
   const point={x:latch.x+Math.cos(i*Math.PI/24)*radius,y:latch.y+Math.sin(i*Math.PI/24)*radius};
   if(m.worldBlocked(w,point.x,point.y,19)||!m.lineClear(point,latch,w,-1,5))continue;
   Object.assign(w.player,point);
   if(m.nearbyLootChest(w)?.id===m.placedLootContainerId(p))return point;
  }
  assert.fail('No reachable interaction beside '+p.id);
 };
 for(const p of [van,backpack]){
  const b=m.foliageEnvelope(p);
  for(const u of [0,.25,.5,.75,1])for(const v of [0,.25,.5,.75,1]){
   const x=b.x+b.width*u,y=b.y+b.height*v;
   assert(m.campContains(layout,x,y,25)&&!m.riverWaterBlocked(x,y,25),'Complete site stays on dry ground');
  }
  const standing=findApproach(world,p),route=m.pathTo(layout.spawn,standing,world,Infinity,19);
  assert(route.length&&distance(route.at(-1),standing)<68,'The camp connects to '+p.id);
 }
 const between=m.pathTo(findApproach(world,van),findApproach(world,backpack),world,Infinity,19);
 assert(between.length&&distance(between.at(-1),world.player)<68,'Both supplies are connected by walkable ground');
 assert(m.placementBodies(van).length,'The van has an actual chassis blocker');

 // Cargo/backpack interaction follows editor transforms, not baked world points.
 for(const source of [van,backpack])for(const transform of [
  {rotation:90,flipX:true,scale:.8},{rotation:225,flipY:true,scale:1.25},
 ]){
  const p={...source,...transform};
  const changed={...layout,items:layout.items.map(item=>item.id===p.id?p:item)};
  const w=m.createCampPlaySession(changed,undefined,'survival');
  w.outdoorReady=new Set(m.OUTDOOR_TILES.map(t=>t.key));
  findApproach(w,p);
 }

 const features=m.playerMapFeatures(layout),pin=features.landmarks.find(p=>p.id===van.id);
 assert(pin&&pin.kind==='vehicle'&&pin.label==='Evacuation van','The map identifies the van explicitly');
 assert(!features.illustrations.some(p=>p.id===van.id),'The van is not drawn as a warehouse');
 assert(!features.landmarks.some(p=>p.id===backpack.id),'The small backpack does not clutter the map');
 for(const [width,height] of [[390,844],[844,390],[320,568]])for(const artReady of [true,false]){
  const view=m.playerMapView(m.campBounds(layout),width,height,1);
  const label=m.playerMapLabels(features,view,width,height,1,layout.spawn,artReady).find(l=>l.mark.id===van.id);
  assert(label?.box&&label.opacity===1&&!label.illustrated,'The vehicle pin is visible at overview scale');
 }

 // Old runs receive the same addition, keeping progress and moving occupied
 // player/return points only far enough to clear the newly introduced chassis.
 const old=m.createCampPlaySession(base,undefined,'survival');
 const hull=m.placementBodies(van);
 let occupied;
 const b=m.foliageEnvelope(van);
 for(let y=b.y;y<=b.y+b.height&&!occupied;y+=8)for(let x=b.x;x<=b.x+b.width;x+=8){
  if(hull.some(c=>m.hitCollider(c,x,y,4))&&!m.layoutBlocked(base,x,y,19)){occupied={x,y};break}
 }
 assert(occupied,'A previously walkable point exists beneath the new van');
 Object.assign(old.player,occupied);
 old.bag.beans=3;old.stock.wood=17;
 const beforeBag=structuredClone(old.bag),beforeStock=structuredClone(old.stock),beforeGear=structuredClone(old.gear);
 const route=[{sceneId:'camp',spawn:{...occupied}}];
 assert(m.migrateSavedCampPerimeter(old,route),'A pre-feature run is migrated');
 assert.equal(old.layout.evacuationVanVersion,1);
 assert(!m.layoutBlocked(old.layout,old.player.x,old.player.y,19),'Continued survivor stands outside the new van');
 assert(!m.layoutBlocked(old.layout,route[0].spawn.x,route[0].spawn.y,19),'The mine return point also remains safe');
 assert(distance(old.player,occupied)<480,'The continued survivor remains near their saved location');
 assert.deepEqual(old.bag,beforeBag);assert.deepEqual(old.stock,beforeStock);assert.deepEqual(old.gear,beforeGear);
 const resources={pin(){},prepare:async()=>{},ready:()=>true};
 const continued=m.decodeRun(m.encodeRun(new m.SceneTravel(old,resources))).worlds.find(([id])=>id==='camp')[1];
 assert.equal(continued.layout.items.filter(p=>ownIds.has(p.id)).length,2,'Save/reload keeps one site');
 assert.deepEqual(continued.bag,beforeBag);assert.deepEqual(continued.stock,beforeStock);

 // A newer owner-published D1 layout gets the feature without being replaced by
 // the bundled baseline. Once marked, removing the site stays respected there too.
 const database=layout=>({prepare(sql){const statement={bind(){return statement},all:async()=>({results:
  sql.includes('SELECT applied_json')?[{applied_json:JSON.stringify(layout)}]:[]}),run:async()=>{throw Error('Read-only endpoint attempted a write')}};return statement}});
 const published={...base,updatedAt:'2099-01-01T00:00:00.000Z',name:'Owner edited publication'};
 const response=await m.handlePublishedWorld(new Request('https://example.test/api/published-world'),database(published));
 assert.equal(response.status,200);
 const payload=await response.json();
 assert.equal(payload.layout.name,published.name);assert.equal(payload.layout.updatedAt,published.updatedAt);
 assert.equal(payload.layout.evacuationVanVersion,1);
 assert.deepEqual(payload.layout.items.filter(p=>!ownIds.has(p.id)),published.items);
 const removed={...payload.layout,items:payload.layout.items.filter(p=>!ownIds.has(p.id))};
 const removedPayload=await (await m.handlePublishedWorld(new Request('https://example.test/api/published-world'),database(removed))).json();
 assert(!removedPayload.layout.items.some(p=>ownIds.has(p.id)),'Published owner deletion survives');

 console.log('PASS: evacuation van/backpack placement, immutable owner world, fallback/capacity guards, dry connected approaches, transformed interactions, vehicle map pins, continued-run safety and read-only published-world migration.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
