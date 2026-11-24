import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'stillwater-fishing-'));
const nativeCache=new Map(),previousNativeStorage=globalThis.__fishingNativeStorage;
globalThis.__fishingNativeStorage={getItem:async key=>nativeCache.get(key)??null,setItem:async(key,value)=>{nativeCache.set(key,value)}};
try{
 const modules=['fishing-site-art','fishing-site-placement','fishing-site-geometry','fishing-site-metadata','fishing-site-renderer',
  'layout-limits','world-layout','world-assets','world-bounds','authored-world',
  'imported-art','river-collision','studio-play','survival-engine','outdoor-terrain',
  'player-map','player-map-labels','player-map-camp-wall','run-save','scene-travel'];
 const outfile=path.join(temp,'game.cjs');
 await build({stdin:{contents:modules.map(name=>`export * from './src/${name}';`).join('\n')+
  "\nexport {nativeMapLabel} from './native/map-presentation';"+
  "\nexport {loadPublishedGameWorld} from './native/game-world';export {WORLD_URL} from './native/config';"+
  "\nexport {handlePublishedWorld} from './server/world-layout';",resolveDir:process.cwd()},
  outfile,bundle:true,platform:'node',format:'cjs',logLevel:'error',plugins:[{name:'fishing-native-storage',setup(builder){
   builder.onResolve({filter:/^@react-native-async-storage\/async-storage$/},args=>({path:args.path,namespace:'fishing-storage'}));
   builder.onLoad({filter:/.*/,namespace:'fishing-storage'},()=>({contents:'module.exports=globalThis.__fishingNativeStorage;',loader:'js'}));
  }}]});
 const m=createRequire(import.meta.url)(outfile);
 const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));
 m.installImportedArt(snapshot.records);
 const ownIds=new Set([m.FISHING_PIER_PLACEMENT_ID,...m.FISHING_REEDS_PLACEMENT_IDS]);
 const ownAssets=new Set([m.FISHING_PIER_ID,m.FISHING_REEDS_ID]);
 const base=structuredClone(snapshot.layout);
 base.items=base.items.filter(p=>!ownIds.has(p.id)&&!ownAssets.has(p.assetId));
 delete base.fishingSiteVersion;
 const original=JSON.stringify(base),layout=m.placeStillwaterFishingSite(base);
 const pier=layout.items.find(p=>p.id===m.FISHING_PIER_PLACEMENT_ID);
 const reeds=layout.items.filter(p=>m.FISHING_REEDS_PLACEMENT_IDS.includes(p.id));
 assert(pier&&reeds.length===2,'The authored world gains the pier and two sparse reed clusters');
 assert.equal(layout.fishingSiteVersion,1);
 assert.deepEqual([pier.x,pier.y],[-1470,6500],'Use the surveyed camp-facing Stillwater bank');
 assert.equal(JSON.stringify(base),original,'The source layout remains immutable');
 assert.deepEqual(layout.items.filter(p=>!ownIds.has(p.id)),base.items,
  'Every existing camp, road, tree, water feature and POI placement is preserved');
 assert.equal(layout.updatedAt,base.updatedAt,'Keep the owner publication timestamp');
 assert.equal(m.placeStillwaterFishingSite(layout),layout,'Repeated migration is a no-op');
 assert.equal(m.prepareAuthoredWorld(base).items.filter(p=>ownIds.has(p.id)).length,3,
  'A fresh-game preparation installs the same complete site');
 assert.equal(m.prepareAuthoredWorld(layout).items.filter(p=>ownIds.has(p.id)).length,3,
  'Fresh-game preparation never duplicates the site');
 assert.equal(m.validateLayout(layout).layout?.fishingSiteVersion,1,'Validation retains the version marker');
 for(const value of [0,2,true,'1',null,{}]){
  const invalid={...base,fishingSiteVersion:value};
  assert(m.validateLayout(invalid).errors.some(e=>/fishing site/.test(e)),'Reject an unsupported version');
  assert.equal(m.placeStillwaterFishingSite(invalid),invalid,'Do not alter an unknown-version world');
 }

 const edited={...layout,items:layout.items.map(p=>ownIds.has(p.id)?{...p,x:p.x+137,y:p.y-83,rotation:27,flipX:true}:p)};
 assert.equal(m.placeStillwaterFishingSite(edited),edited,'Owner positions and transforms survive');
 for(const removed of [[pier.id],[reeds[0].id],[...ownIds]]){
  const without={...layout,items:layout.items.filter(p=>!removed.includes(p.id))};
  assert.equal(m.placeStillwaterFishingSite(without),without,'Intentional removal is never restored');
 }
 const unmarked={...edited};delete unmarked.fishingSiteVersion;
 assert.deepEqual(m.placeStillwaterFishingSite(unmarked).items,edited.items,'Respect unmarked authored artwork');
 const custom={...base,terrainImage:{...base.terrainImage,url:'/survival/custom-owner-ground.webp'}};
 assert.equal(m.placeStillwaterFishingSite(custom),custom,'Unrelated custom terrain stays untouched');
 const full={...base,items:[...base.items]};
 while(full.items.length<m.MAX_LAYOUT_ITEMS-2)full.items.push({...base.items[0],id:'capacity-'+full.items.length});
 assert.equal(m.placeStillwaterFishingSite(full),full,'Do not partially add the three-piece site');
 const obstruction=(x,y,id)=>({...base.items.find(p=>p.solid),id,x,y,scale:1,
  frame:{sourceAssetId:base.items.find(p=>p.solid).assetId,width:32,height:32,anchor:[.5,.5]},
  collision:{lineWidth:.01,paths:[{closed:true,points:[[0,0],[1,0],[1,1],[0,1]]}]}});
 const primaryBlocked={...base,items:[...base.items,obstruction(-1470,6500,'owner-lakeshore-object')]};
 const fallback=m.placeStillwaterFishingSite(primaryBlocked);
 assert.deepEqual(fallback.items.filter(p=>!ownIds.has(p.id)),primaryBlocked.items,'Keep owner obstructions intact');
 assert.deepEqual(fallback.items.filter(p=>p.id===pier.id).map(p=>[p.x,p.y]),[[-1330,6800]],
  'An occupied main site selects the next clear point on the same bank');
 const blocked={...primaryBlocked,items:[...primaryBlocked.items,
  obstruction(-1330,6800,'owner-middle-shore-object'),obstruction(-1430,7000,'owner-south-shore-object')]};
 assert.equal(m.placeStillwaterFishingSite(blocked),blocked,'Defer safely when every surveyed site is occupied');

 assert(!m.riverWaterBlocked(pier.x,pier.y,35),'The pier entrance is entirely on dry land');
 assert(!m.layoutBlocked(layout,pier.x,pier.y,19),'Posts leave the entrance open');
 assert(reeds.every(p=>!p.solid&&m.placementBodies(p).length===0),'Reeds are walkable decoration');
 const b=m.fishingPierGeometry(pier).deckBounds;
 let waterDeck;
 for(let y=b.y+19;y<b.y+b.height-19&&!waterDeck;y+=14)for(let x=b.x+19;x<b.x+b.width-19;x+=14){
  if(m.fishingPierDeckContains(pier,x,y,19)&&m.riverWaterBlocked(x,y,19)){waterDeck={x,y};break}
 }
 assert(waterDeck,'The walkable jetty extends over the existing lake');
 assert(!m.riverWaterBlocked(waterDeck.x,waterDeck.y,19,layout),'The placed deck supports a survivor over water');
 const world=m.createCampPlaySession(layout,undefined,'survival');
 world.outdoorReady=new Set(m.OUTDOOR_TILES.map(t=>t.key));
 const route=m.pathTo(layout.spawn,{x:pier.x,y:pier.y},world,Infinity,19);
 assert(route.length&&Math.hypot(route.at(-1).x-pier.x,route.at(-1).y-pier.y)<68,
  'The camp connects to the dry bank entry without altering scenery');

 const features=m.playerMapFeatures(layout),pin=features.landmarks.find(p=>p.id===pier.id);
 assert(pin&&pin.kind==='fishing'&&pin.label==='Stillwater Lake','The map clearly identifies Stillwater');
 assert(!features.illustrations.some(p=>p.id===pier.id),'The jetty does not borrow a building illustration');
 assert(!features.landmarks.some(p=>m.FISHING_REEDS_PLACEMENT_IDS.includes(p.id)),'Reeds do not clutter the map');
 for(const [width,height] of [[390,844],[844,390],[320,568]])for(const artReady of [true,false]){
  const view=m.playerMapView(m.campBounds(layout),width,height,1);
  for(const mark of features.landmarks.filter(p=>p.kind==='fishing'||p.kind==='vehicle')){
   const label=m.playerMapLabels(features,view,width,height,1,layout.spawn,artReady).find(l=>l.mark.id===mark.id);
   assert(label?.box&&label.opacity===1&&!label.illustrated,'Web landmarks are visible at overview scale');
   const native=m.nativeMapLabel(mark,view,width,height,m.CAMP_MAP_WALL.radius*2);
   assert.equal(native.opacity,1,'Native worklet keeps the overview icon visible');
   assert.equal(native.labelOpacity,1,'Native worklet keeps the overview caption visible');
  }
 }

 const old=m.createCampPlaySession(base,undefined,'survival');
 old.bag.beans=3;old.stock.wood=17;
 const beforeBag=structuredClone(old.bag),beforeStock=structuredClone(old.stock),beforeGear=structuredClone(old.gear);
 const beforePlayer={x:old.player.x,y:old.player.y};
 const savedRoute=[{sceneId:'camp',spawn:{...base.spawn}}];
 assert(m.migrateSavedCampPerimeter(old,savedRoute),'Continue adds the site to pre-feature saves');
 assert.equal(old.layout.fishingSiteVersion,1);
 assert.deepEqual({x:old.player.x,y:old.player.y},beforePlayer,'A survivor safely at camp stays put');
 assert.deepEqual(old.bag,beforeBag);assert.deepEqual(old.stock,beforeStock);assert.deepEqual(old.gear,beforeGear);
 const resources={pin(){},prepare:async()=>{},ready:()=>true};
 const encoded=m.encodeRun(new m.SceneTravel(old,resources));
 const continued=m.decodeRun(encoded).worlds.find(([id])=>id==='camp')[1];
 assert.equal(continued.layout.items.filter(p=>ownIds.has(p.id)).length,3,'Save/reload retains one site');
 assert.deepEqual(continued.bag,beforeBag);assert.deepEqual(continued.stock,beforeStock);assert.deepEqual(continued.gear,beforeGear);
 const removedRun=JSON.parse(encoded);
 removedRun.worlds.find(([id])=>id==='camp')[1].layout.items=layout.items.filter(p=>!ownIds.has(p.id));
 assert(!m.decodeRun(JSON.stringify(removedRun)).worlds.find(([id])=>id==='camp')[1].layout.items.some(p=>ownIds.has(p.id)),
  'Continued owner deletion stays respected');
 const invalidRun=JSON.parse(encoded);
 invalidRun.worlds.find(([id])=>id==='camp')[1].layout.fishingSiteVersion=2;
 assert.throws(()=>m.decodeRun(JSON.stringify(invalidRun)),/fishing site version/,'Continue validates the marker before migration');

 const database=layout=>({prepare(sql){const statement={bind(){return statement},all:async()=>({results:
  sql.includes('SELECT applied_json')?[{applied_json:JSON.stringify(layout)}]:[]}),run:async()=>{throw Error('Read-only endpoint attempted a write')}};return statement}});
 const published={...base,updatedAt:'2099-01-01T00:00:00.000Z',name:'Owner edited publication'};
 const response=await m.handlePublishedWorld(new Request('https://example.test/api/published-world'),database(published));
 assert.equal(response.status,200);
 const payload=await response.json();
 assert.equal(payload.layout.name,published.name);assert.equal(payload.layout.updatedAt,published.updatedAt);
 assert.equal(payload.layout.fishingSiteVersion,1);
 assert.deepEqual(payload.layout.items.filter(p=>!ownIds.has(p.id)),published.items);
 const removed={...payload.layout,items:payload.layout.items.filter(p=>!ownIds.has(p.id))};
 const removedPayload=await (await m.handlePublishedWorld(new Request('https://example.test/api/published-world'),database(removed))).json();
 assert(!removedPayload.layout.items.some(p=>ownIds.has(p.id)),'Published owner deletion survives');

 // A published artwork replacement must use the loaded texture and the same
 // dimensions/anchor as the editor, including after geometry has been cached.
 m.fishingPierGeometry(pier);
 const replacement={id:m.FISHING_PIER_ID,revision:1,updatedAt:layout.updatedAt,config:{
  kind:'sprite',base:{id:'fishing-test-art',url:'/survival/owner-pier-test.webp',name:'Owner pier',mime:'image/webp',width:1800,height:1100,bytes:1},
  frames:[],fps:1,worldWidth:880,anchor:[.74,.31],solid:true,footprint:{width:0,depth:0},collision:m.FISHING_PIER_COLLISION,
 }};
 // An offline/published v1 artwork record must refresh with the wider asset;
 // later owner uploads and explicitly edited dimensions/collision remain theirs.
 const legacy={...replacement,config:{...replacement.config,
  base:{...replacement.config.base,url:'/survival/stillwater-fishing-v1/pier.webp',width:1614,height:975},
  worldWidth:740,anchor:[...m.FISHING_PIER_ANCHOR],collision:undefined,
 }};
 const legacyBefore=JSON.stringify(legacy);
 try{
  m.installImportedArt([...snapshot.records,legacy]);
  assert.equal(m.fishingPierMetadata().image,m.FISHING_PIER_IMAGE,'Known old artwork receives the new landing');
  assert.equal(m.fishingPierMetadata().width,m.FISHING_PIER_WIDTH,'Default saved width follows the wider deck');
  assert.deepEqual(m.ASSET_BY_ID.get(m.FISHING_PIER_ID).collision,m.FISHING_PIER_COLLISION,'Saved default collision follows the actual new posts');
  assert.equal(JSON.stringify(legacy),legacyBefore,'Artwork refresh does not mutate an owner record');
  const customCollision={lineWidth:.02,paths:[{closed:true,points:[[.1,.2],[.2,.2],[.2,.3]]}]};
  const ownerGeometry={...legacy,config:{...legacy.config,worldWidth:920,anchor:[.7,.25],collision:customCollision}};
  m.installImportedArt([...snapshot.records,ownerGeometry]);
  assert.equal(m.fishingPierMetadata().width,920,'Owner sizing survives the art refresh');
  assert.deepEqual(m.fishingPierMetadata().anchor,[.7,.25]);
  assert.deepEqual(m.ASSET_BY_ID.get(m.FISHING_PIER_ID).collision,customCollision,'Owner collision survives the art refresh');
 }finally{m.installImportedArt(snapshot.records)}
 try{
  m.installImportedArt([...snapshot.records.filter(r=>r.id!==m.FISHING_PIER_ID),replacement]);
  const metadata=m.fishingPierMetadata(),expected=m.placementBounds(pier),geometry=m.fishingPierGeometry(pier);
  assert.equal(metadata.image,replacement.config.base.url);
  assert.deepEqual(geometry.bounds,expected,'Imported dimensions and anchor replace cached geometry');
  const actual=m.fishingPierPoint(pier,.2,.7),reference=m.placementArtPoint(pier,.2,.7);
  assert(Math.hypot(actual.x-reference.x,actual.y-reference.y)<1e-8,'Walking surface uses the active artwork transform');
  const sources=m.requiredImages([m.FISHING_PIER_ID]),image={},draws=[];
  const ctx={save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(...args){draws.push(args)}};
  m.drawFishingSiteGround(ctx,Object.fromEntries(Object.keys(sources).map(key=>[key,image])),
   {layout:{...layout,items:[pier]},tick:0},{x:expected.x-20,y:expected.y-20,width:expected.width+40,height:expected.height+40,scale:.1});
  assert.equal(draws.length,1,'A fresh published load paints the replacement instead of hiding the deck');
  assert.equal(draws[0][0],image);assert.deepEqual(draws[0].slice(1,5),metadata.crop);
  assert.deepEqual(draws[0].slice(5),[expected.x,expected.y,expected.width,expected.height]);
  // Exercise a cached owner world from before Patch. Every existing item,
  // including the replacement pier, must survive the approved site migration.
  const approvedPatchSite=[
   {id:'stillwater-maintenance-station',assetId:'art_patch_maintenance_station',x:-3850,y:7000,
    scale:1,solid:true,allowTransparency:false,role:'prop',roof:'auto'},
   {id:'stillwater-maintenance-locker',assetId:'art_patch_service_locker',x:-4090,y:6840,
    scale:1,solid:true,allowTransparency:false,role:'prop',roof:'auto'},
  ];
  const patchIds=new Set(approvedPatchSite.map(p=>p.id));
  const offlineLayout={...layout,items:layout.items.filter(p=>!patchIds.has(p.id)),name:'Cached owner lake',updatedAt:'2099-01-01T00:00:00.000Z'};
  delete offlineLayout.patchSiteVersion;
  const offlineOwner={...snapshot,layout:offlineLayout,
   records:[...snapshot.records.filter(r=>r.id!==m.FISHING_PIER_ID),replacement]};
  nativeCache.set('humans-remain-published-world-v1:'+m.WORLD_URL,JSON.stringify(offlineOwner));
  const previousFetch=globalThis.fetch,previousWarn=console.warn;
  try{
   globalThis.fetch=async()=>{throw Error('Offline fixture')};console.warn=()=>{};
   const loaded=await m.loadPublishedGameWorld();
   assert.equal(loaded.source,'Cached published world');assert.equal(loaded.layout.name,offlineOwner.layout.name);
   assert.deepEqual(loaded.layout.items,[...offlineOwner.layout.items,...approvedPatchSite],
    'Offline loading preserves every owner placement and appends only the approved Patch site');
   assert.equal(loaded.layout.patchSiteVersion,1,'The offline site migration is recorded once');
   assert.equal(m.ASSET_BY_ID.get(m.FISHING_PIER_ID).image,replacement.config.base.url,
    'Comparing bundle timestamps does not overwrite cached owner artwork');
   assert.equal(m.fishingPierMetadata().image,replacement.config.base.url);
   assert.equal(m.fishingPierMetadata().width,880,'Offline cached pier dimensions remain active');
   const loadedPier=loaded.layout.items.find(p=>p.id===m.FISHING_PIER_PLACEMENT_ID);
   assert.deepEqual(m.fishingPierGeometry(loadedPier).bounds,m.placementBounds(loadedPier));
  }finally{globalThis.fetch=previousFetch;console.warn=previousWarn}
 }finally{m.installImportedArt(snapshot.records)}
 assert.equal(m.fishingPierMetadata().width,m.FISHING_PIER_WIDTH,'Removing a replacement restores approved metadata');

 console.log('PASS: Stillwater visual-site placement, unchanged scenery/timestamps, owner edits/deletions, capacity/fallback guards, dry connected bank, existing-water deck, web/native overview markers, Continue preservation, published migration, active artwork replacement and offline cached owner metadata.');
}finally{fs.rmSync(temp,{recursive:true,force:true});if(previousNativeStorage===undefined)delete globalThis.__fishingNativeStorage;else globalThis.__fishingNativeStorage=previousNativeStorage}
