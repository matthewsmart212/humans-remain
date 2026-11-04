// Runs the real native renderer with file-backed Expo assets and CanvasKit.
// This verifies drawing/asset compatibility; it is not a physical iPhone test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'hq-native-'));
const output=process.argv[2]||'.qa/camp-craft-v2';
const original={skia:globalThis.__hqSkia,raf:globalThis.requestAnimationFrame,fetch:globalThis.fetch};
let renderer,outdoor;
try{
 const aliases={
  '@shopify/react-native-skia':'export const Skia=globalThis.__hqSkia;',
  'react-native':'export const PixelRatio={get:()=>2};',
  'expo-asset':'const asset=uri=>({uri,localUri:uri,downloadAsync:async()=>{}});export const Asset={fromModule:asset,fromURI:asset};',
 };
 const modules=['world-assets','world-layout','headquarters-south-art','camp-worksites-art','camp-worksites-placement','authored-world','warehouse','camp-furnace','ironworks-data','run-save','run-progression','studio-play','editor-image-sources','layout-views','placed-world-renderer','outdoor-streaming','headquarters-cutaway'];
 await build({stdin:{contents:modules.map(id=>`export * from './src/${id}';`).join('')+"export * from './native/game-world';export * from './native/game-renderer';export * from './native/bundled-art';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error',plugins:[{name:'hq-native-platform',setup(b){
  b.onResolve({filter:/^(@shopify\/react-native-skia|react-native|expo-asset)$/},a=>({path:a.path,namespace:'hq-native'}));
  b.onLoad({filter:/.*/,namespace:'hq-native'},a=>({contents:aliases[a.path],loader:'js'}));
  b.onLoad({filter:/\.(webp|png|jpg|ttf)$/},a=>({contents:`module.exports=${JSON.stringify(a.path)};`,loader:'js'}));
 }}]});
 const kit=await require('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});
 const bundle=path.join(temp,'model.cjs'),{JsiSkApi}=require(bundle),api=JsiSkApi(kit),decoded=new Set();
 globalThis.__hqSkia={...api,Data:{fromBytes:bytes=>api.Data.fromBytes(bytes),fromURI:async uri=>{
  assert(fs.existsSync(uri),'Native bundle resolves locally: '+uri);decoded.add(uri);return api.Data.fromBytes(fs.readFileSync(uri));
 }},Surface:{...api.Surface,Make:(width,height)=>api.Surface.Make(width,height),MakeOffscreen:(width,height)=>api.Surface.Make(width,height)}};
 delete require.cache[require.resolve(bundle)];const m=require(bundle);
 globalThis.requestAnimationFrame=fn=>setImmediate(()=>fn(performance.now()));
 globalThis.fetch=async()=>{throw Error('Worksites native QA must stay offline')};
 const saved=m.loadGameWorld(),layout=saved.layout;
 const furnace=layout.items.find(p=>p.assetId===m.FURNACE_ID),warehouse=layout.items.find(p=>p.assetId===m.WAREHOUSE_ASSET_ID);
 assert(furnace&&warehouse);assert.equal(layout.campWorksitesVersion,3);
 assert.equal(m.prepareAuthoredWorld(layout),layout,'Repeated loads preserve later editor edits');
 const moved={...layout,items:layout.items.map(p=>p===furnace?{...p,x:p.x+20}:p)};
 assert.equal(m.prepareAuthoredWorld(moved),moved);
 const removed={...layout,items:layout.items.filter(p=>p!==furnace)};
 assert.equal(m.prepareAuthoredWorld(removed),removed,'A removed worksite stays removed');
 const custom={...moved,campWorksitesVersion:1};const customNext=m.placeCampWorksites(custom);assert.equal(customNext.items.find(p=>p.id===furnace.id).x,furnace.x+20,'An earlier refit preserves a later owner move');
 const beforeWorld={...layout,campWorksitesVersion:undefined,items:layout.items.map(p=>p===furnace?{...p,x:1064.329,y:965.305}:p===warehouse?{...p,x:2920.633,y:1790.824}:p)};
 const continued=m.createCampPlaySession(beforeWorld);continued.stock.pallets=17;continued.ironworks={stations:{[furnace.id]:{level:1,fuel:45,queue:[{id:3,recipe:'ore',remaining:9}],ready:2,updatedAt:0}}};Object.assign(continued.player,{x:furnace.x,y:furnace.y-15});
 const savedFuel=JSON.stringify(continued.ironworks);m.migrateSavedCampPerimeter(continued,[]);assert.equal(continued.layout.campWorksitesVersion,3);assert.equal(continued.stock.pallets,17);assert.equal(JSON.stringify(continued.ironworks),savedFuel);assert(!m.layoutBlocked(continued.layout,continued.player.x,continued.player.y,19),'Resumed player is safe when a worksite moves');
 const validated=m.validateLayout(layout);assert.deepEqual(validated.errors,[]);assert.equal(validated.layout.campWorksitesVersion,3);
 for(const [p,dock] of [[furnace,m.furnaceDock(furnace)],[warehouse,m.warehouseDock(warehouse)]]){
  assert(!m.layoutBlocked(layout,dock.x,dock.y,19),p.assetId+' dock clear');
  for(let dy=0;dy<=120;dy+=20)assert(!m.layoutBlocked(layout,dock.x,dock.y+dy,19),p.assetId+' approach clear');
 }
 const world=m.createCampPlaySession(layout);world.enemies=[];world.animals=[];world.loot=[];world.weather=undefined;m.startExpedition(world);
 world.progression.campLevel=2;world.progression.restoredBuildings=['headquarters','furnace','warehouse','workshop','well','fire','bunker','garden','treatment'];world.progression.furnaceRestored=true;
 Object.assign(world.player,m.furnaceDock(furnace));assert.equal(m.nearbyFurnace(world)?.placement.id,furnace.id);
 Object.assign(world.player,m.warehouseDock(warehouse));assert.equal(m.nearbyWarehouse(world)?.placement.id,warehouse.id);
 const width=1536,height=1024,view={...m.PLAY_VIEW,follow:false,x:1750,y:1000,zoom:.7};
 renderer=await m.createNativeRenderer(view);
 outdoor=new m.OutdoorTerrainStream(renderer.warmImages,renderer.releaseImages);
 fs.mkdirSync(output,{recursive:true});const pictures=[];
 const views=[{name:'camp-overview',x:1760,y:1160,zoom:.44,playing:false},{name:'furnace',x:900,y:690,zoom:1.10,playing:true},{name:'warehouse',x:2920,y:1570,zoom:1.1,playing:true}];
 for(const v of views){
  Object.assign(view,v);
  const c=m.editorCamera(width*2,height*2,world,view,2),viewport={x:c.x,y:c.y,width:width*2/c.scale,height:height*2/c.scale,scale:c.scale};
  await renderer.warmImages({...m.EDITOR_IMAGE_SOURCES,...m.editorTerrainDetail(layout.terrainImage),...m.requiredImages(m.visiblePlacements(layout,viewport).map(p=>p.assetId),layout.terrainImage,{animationFrames:false})});
  outdoor.update(viewport,world.player);await outdoor.settled();assert(!outdoor.error);world.outdoorReady=outdoor.ready;
  for(const state of v.name==='camp-overview'?['repaired']:['repaired','partial','active','ruined']){
   world.progression.restoredBuildings=state==='ruined'?['headquarters']:['headquarters','furnace','warehouse','workshop','well','fire','bunker','garden','treatment'];world.progression.furnaceRestored=state!=='ruined';
   Object.assign(world.player,v.name==='warehouse'?m.warehouseDock(warehouse):m.furnaceDock(furnace));world.player.y+=55;world.player.equipped=null;world.player.direction='up';
   world.stock.pallets=state==='active'?25:state==='partial'?5:0;world.stock.scrap=state==='active'?60:state==='partial'?15:0;world.stock.stone=state==='active'?40:state==='partial'?10:0;
   const f=m.furnaceState(world,furnace.id);f.fuel=state==='active'?60:0;f.queue=state==='active'?[{id:1,recipe:'ore',remaining:20}]:[];
   renderer.draw(world,width,height).dispose();const deadline=performance.now()+30000;
   while(true){const stats=renderer.textureStats(),streams=[stats.roads,stats.camp,stats.rivers];assert(streams.every(s=>s.failures===0));if(streams.every(s=>s.missing===0&&s.pending===0)&&stats.artwork.warming===0)break;assert(performance.now()<deadline,'Native terrain preparation completes');await new Promise(resolve=>setTimeout(resolve,20));}
   const picture=renderer.draw(world,width,height),surface=api.Surface.Make(width,height);let image;
   try{surface.getCanvas().drawPicture(picture);surface.flush();image=surface.makeImageSnapshot();const bytes=image.encodeToBytes();assert(bytes.length>25000);const file=`${v.name}-${state}.png`;fs.writeFileSync(path.join(output,file),bytes);pictures.push(file)}finally{image?.dispose();surface.dispose();picture.dispose()}
  }
 }
 for(const url of [m.IRONWORKS_IMAGES.campFurnace,...Object.values(m.WAREHOUSE_ARTWORK),m.WORKSITE_ROOT+'/furnace-broken.webp',m.WORKSITE_ROOT+'/warehouse-broken.webp'])assert(decoded.has(m.BUNDLED_ART[url]),'Native loader decoded '+url);
 const report={passed:true,snapshotRevision:saved.revision,placements:layout.items.length,productionNativeRenderer:true,offline:true,pictures,physicalIPhoneTested:false};
 fs.writeFileSync(output+'/native-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

}finally{outdoor?.dispose();renderer?.dispose();globalThis.__hqSkia=original.skia;globalThis.requestAnimationFrame=original.raf;globalThis.fetch=original.fetch;fs.rmSync(temp,{recursive:true,force:true})}
