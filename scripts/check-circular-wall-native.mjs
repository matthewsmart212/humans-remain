// Focused, offline wall verification. This runs the production native renderer
// through CanvasKit platform shims; it is not a native build or a device test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const require=createRequire(import.meta.url);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'circular-wall-native-'));
const output=process.argv[2]||'docs/qa/circular-wall-ne-v3';
const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
const art=JSON.parse(fs.readFileSync('src/camp-circular-wall-art.json'));
const plan=JSON.parse(fs.readFileSync('src/camp-circular-wall-layout.json'));
const original={fetch:globalThis.fetch,raf:globalThis.requestAnimationFrame,skia:globalThis.__circularWallSkia};
const decoded=new Set();
let renderer,outdoor;
try{
 assert.equal(snapshot.revision,78,'This release uses the latest reviewed editor revision');
 assert.equal(snapshot.layout.items.length,4548,'The original 4,543 placements replace eleven walls with sixteen');
 assert.equal(snapshot.records.length,15,'Include the fresh artwork records');
 const expected=plan.placements.map(p=>p.assetId).sort();
 assert.equal(expected.length,16);
 assert.deepEqual(snapshot.layout.items.filter(p=>p.assetId.startsWith('camp_circular_wall_')).map(p=>p.assetId).sort(),expected);
 assert.equal(snapshot.layout.campPerimeterVersion,7);

 const aliases={
  '@react-native-async-storage/async-storage':'export default {getItem:async()=>null,setItem:async()=>{}};',
  '@shopify/react-native-skia':'export const Skia=globalThis.__circularWallSkia;',
  'react-native':'export const PixelRatio={get:()=>2};',
  'expo-asset':`const asset=uri=>({uri,localUri:uri,downloadAsync:async()=>{}});export const Asset={fromModule:asset,fromURI:asset};`,
 };
 const modules=['world-assets','world-layout','world-tiers','authored-world','studio-play','editor-image-sources','layout-views','placed-world-renderer','outdoor-streaming'];
 await build({stdin:{contents:modules.map(id=>`export * from './src/${id}';`).join('')+"export * from './native/game-world';export * from './native/game-renderer';export * from './native/bundled-art';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error',plugins:[{name:'circular-wall-native-platform',setup(b){
  b.onResolve({filter:/^(@react-native-async-storage\/async-storage|@shopify\/react-native-skia|react-native|expo-asset)$/},a=>({path:a.path,namespace:'native-wall-test'}));
  b.onLoad({filter:/.*/,namespace:'native-wall-test'},a=>({contents:aliases[a.path],loader:'js'}));
  b.onLoad({filter:/\.(webp|png|jpg|ttf)$/},a=>({contents:`module.exports=${JSON.stringify(a.path)};`,loader:'js'}));
 }}]});
 const kit=await require('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});
 const bundle=path.join(temp,'model.cjs'),{JsiSkApi}=require(bundle),api=JsiSkApi(kit);
 globalThis.__circularWallSkia={...api,Data:{fromBytes:bytes=>api.Data.fromBytes(bytes),fromURI:async uri=>{
  assert(fs.existsSync(uri),'Every native QA image and font must resolve to a local bundle file: '+uri);
  decoded.add(uri);return api.Data.fromBytes(fs.readFileSync(uri));
 }},Surface:{...api.Surface,MakeOffscreen:(width,height)=>api.Surface.Make(width,height)}};
 delete require.cache[require.resolve(bundle)];const m=require(bundle);
 globalThis.requestAnimationFrame=fn=>setImmediate(()=>fn(performance.now()));
 globalThis.fetch=async()=>{throw Error('Focused wall QA is offline; no external requests are allowed')};
 const saved=m.validateSavedWorld(snapshot,'Included editor world');
 assert.deepEqual(saved.layout,snapshot.layout,'Native validation preserves the migrated layout');
 assert.equal(m.prepareAuthoredWorld(saved.layout),saved.layout,'The bundled migration is idempotent');
 const wallImages=[];
 for(const entry of art){
  const asset=m.ASSET_BY_ID.get(entry.id),file=m.BUNDLED_ART[entry.image];
  assert(asset&&file&&fs.existsSync(file),'Native wall bundle entry exists: '+entry.id);
  assert.equal(path.resolve(file),path.resolve('public'+entry.image),'The native bundle uses the same final artwork as the web game');
  const data=api.Data.fromBytes(fs.readFileSync(file)),image=api.Image.MakeImageFromEncoded(data);
  try{
   assert(image,'The actual bundled image decodes: '+entry.id);
   assert.deepEqual([image.width(),image.height()],entry.size,'Bundled pixels match the runtime crop: '+entry.id);
   assert.deepEqual(asset.crop,[0,0,...entry.size]);
   wallImages.push({id:entry.id,url:entry.image,width:image.width(),height:image.height(),bytes:fs.statSync(file).size});
  }finally{image?.dispose();data.dispose()}
 }
 const savedWallSources=m.requiredImages(m.WORLD_ASSETS.filter(a=>m.wallIdentity(a.id)).map(a=>a.id));
 const savedWallImages=[];
 for(const url of new Set(Object.values(savedWallSources))){
  const file=m.BUNDLED_ART[url];assert(file&&fs.existsSync(file),'A deferred original wall has a local native bundle file: '+url);
  const data=api.Data.fromBytes(fs.readFileSync(file)),image=api.Image.MakeImageFromEncoded(data);
  try{
   assert(image,'The deferred-wall artwork decodes: '+url);
   if(m.imageDimensions[url])assert.deepEqual([image.width(),image.height()],m.imageDimensions[url]);
   savedWallImages.push({url,width:image.width(),height:image.height()});
  }finally{image?.dispose();data.dispose()}
 }
 assert.equal(savedWallImages.length,24,'Retain eight original walls, eight tier variants and eight foundations');

 const world=m.createCampPlaySession(saved.layout);
 world.enemies=[];world.animals=[];world.loot=[];world.noticeUntil=0;
 Object.assign(world.player,{x:plan.centre[0],y:plan.centre[1]-plan.radius+96,direction:'down'});
 assert(!m.layoutBlocked(world.layout,world.player.x,world.player.y,19),'The reviewed camera position stands on clear ground inside the northern join');
 const view={...m.PLAY_VIEW,zoom:1},sizes=[[844,390],[390,844]];
 const views=sizes.map(([width,height])=>{const c=m.editorCamera(width*2,height*2,world,view,2);return{x:c.x,y:c.y,width:width*2/c.scale,height:height*2/c.scale,scale:c.scale}});
 const localPlacements=new Set(views.flatMap(v=>m.visiblePlacements(saved.layout,v)));
 // Continued v5/custom worlds may still need the previous northeast shapes,
 // even though this fixture installs only the sixteen current sections.
 const retainedCircularSources=m.requiredImages(art.filter(entry=>!expected.includes(entry.id)).map(entry=>entry.id));
 const sources={...m.EDITOR_ENTRY_IMAGES,...m.editorTerrainDetail(saved.layout.terrainImage),...m.requiredImages([...localPlacements].map(p=>p.assetId),saved.layout.terrainImage,{animationFrames:false}),...m.requiredImages(expected),...retainedCircularSources};
 renderer=await m.createNativeRenderer(view);await renderer.warmImages({...sources,...savedWallSources});
 for(const entry of art)assert(decoded.has(m.BUNDLED_ART[entry.image]),'Production native image loader opened '+entry.id);
 for(const {url}of savedWallImages)assert(decoded.has(m.BUNDLED_ART[url]),'Production native image loader opened deferred-wall artwork: '+url);
 outdoor=new m.OutdoorTerrainStream(renderer.warmImages,renderer.releaseImages);
 const left=Math.min(...views.map(v=>v.x)),top=Math.min(...views.map(v=>v.y));
 outdoor.update({x:left,y:top,width:Math.max(...views.map(v=>v.x+v.width))-left,height:Math.max(...views.map(v=>v.y+v.height))-top},world.player);
 await outdoor.settled();assert(!outdoor.error,'The surrounding outdoor ground loaded locally');
 world.outdoorReady=outdoor.ready;

 fs.mkdirSync(output,{recursive:true});
 const pictures=[];
 const capture=async(width,height,file)=>{
  // Request the actual view's streamed detail, then wait only for its bounded
  // terrain queues. No wildlife/combat or unrelated native suite is run.
  await new Promise(resolve=>setTimeout(resolve,160));
  renderer.draw(world,width,height).dispose();
  const deadline=performance.now()+30000;
  while(true){
   const stats=renderer.textureStats(),streams=[stats.roads,stats.camp,stats.rivers];
   assert(streams.every(s=>s.failures===0),'Native terrain preparation did not fail');
   if(streams.every(s=>s.missing===0&&s.pending===0)&&stats.artwork.warming===0)break;
   assert(performance.now()<deadline,'Native terrain settles within the focused QA deadline');
   await new Promise(resolve=>setTimeout(resolve,20));
  }
  const picture=renderer.draw(world,width,height),surface=api.Surface.Make(width,height);
  assert(surface,'Native QA render surface is available');
  let image;
  try{
   surface.getCanvas().drawPicture(picture);surface.flush();image=surface.makeImageSnapshot();
   const bytes=image.encodeToBytes();assert(bytes.length>25000,'The production native renderer produced a complete world frame');
   fs.writeFileSync(path.join(output,file),bytes);
   pictures.push({file,width,height,bytes:bytes.length});
  }finally{image?.dispose();surface.dispose();picture.dispose()}
 };
 for(const [width,height]of sizes)await capture(width,height,`native-wall-${width}x${height}.png`);
 // A durable full-camp proof uses the same production native renderer with
 // its ordinary editor camera. The layout and installed artwork are unchanged.
 Object.assign(view,{playing:false,follow:false,x:plan.centre[0],y:plan.centre[1],zoom:.23});
 const overviewCamera=m.editorCamera(3000,3000,world,view,2);
 const overview={x:overviewCamera.x,y:overviewCamera.y,width:3000/overviewCamera.scale,height:3000/overviewCamera.scale,scale:overviewCamera.scale};
 await renderer.warmImages(m.requiredImages(m.visiblePlacements(saved.layout,overview).map(p=>p.assetId),saved.layout.terrainImage,{animationFrames:false}));
 outdoor.update(overview,world.player);await outdoor.settled();assert(!outdoor.error,'The full-camp overview ground loaded locally');
 await capture(1500,1500,'native-installed-camp-overview.png');
 const report={result:'pass',snapshotRevision:snapshot.revision,placements:snapshot.layout.items.length,artworkRecords:snapshot.records.length,wallCount:wallImages.length,wallImages,savedWallImages,offlineBundle:true,productionNativeRenderer:true,platformShim:'CanvasKit software Skia with file-backed Expo Asset and PixelRatio=2',player:{x:world.player.x,y:world.player.y},pictures,fullNativeTypecheck:false,physicalDeviceTested:false,limitations:['The full native typecheck and Expo/device build were not run because this checkout does not have the native Expo dependency set.','These images exercise the production native rendering code through platform shims; they do not certify physical-device GPU performance.']};
 fs.writeFileSync(path.join(output,'native-verification.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({result:report.result,snapshotRevision:report.snapshotRevision,placements:report.placements,wallCount:report.wallCount,actualBundledImageDimensionsVerified:true,legacyWallImagesRetained:savedWallImages.length,offlineBundle:true,pictures,fullNativeTypecheck:false,physicalDeviceTested:false},null,2));
}finally{
 outdoor?.dispose();renderer?.dispose();
 globalThis.fetch=original.fetch;globalThis.requestAnimationFrame=original.raf;globalThis.__circularWallSkia=original.skia;
 fs.rmSync(temp,{recursive:true,force:true});
}
