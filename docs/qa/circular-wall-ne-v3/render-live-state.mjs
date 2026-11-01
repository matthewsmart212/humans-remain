// Offline proof of the real mixed-wall draft through the production native renderer.
// Usage from repository root: node docs/qa/circular-wall-ne-v3/render-live-state.mjs before|after [captured-live-world.json]
// Without an optional full capture, reconstruct revision 80 from committed
// snapshot data and the five minimal placement overrides beside this script.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const require=createRequire(import.meta.url), mode=process.argv[2]||'before', fixture=process.argv[3];
assert(['before','after'].includes(mode),'Supply before|after, optionally followed by a captured live-world JSON.');
const root=process.cwd(), output=path.resolve('docs/qa/circular-wall-ne-v3');
const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));
const records=snapshot.records;
const overridesPath=path.join(output,'revision80-layout-overrides.json');
const overrides=JSON.parse(fs.readFileSync(overridesPath,'utf8'));
const updates=new Map(overrides.placements.map(p=>[p.id,p.fields]));
assert.equal(updates.size,overrides.placements.length,'Fixture placement IDs are unique.');
assert(overrides.placements.every(p=>snapshot.layout.items.some(item=>item.id===p.id)),'Every fixture placement exists in the committed snapshot.');
const reconstructed={...structuredClone(snapshot.layout),...overrides.layout};
reconstructed.items=reconstructed.items.map(p=>({...p,...(updates.get(p.id)||{})}));
const source=fixture?JSON.parse(fs.readFileSync(fixture,'utf8')):{revision:overrides.sourceRevision,draft:reconstructed};
const sourceName=path.basename(fixture||overridesPath);
if(fixture&&source.revision===overrides.sourceRevision)assert.deepEqual(reconstructed,source.draft,'The committed overrides reproduce the complete captured revision-80 layout exactly.');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ne-live-render-'));
const original={fetch:globalThis.fetch,raf:globalThis.requestAnimationFrame,skia:globalThis.__neLiveSkia};
const decoded=new Set();
let renderer,outdoor;
try{
 const aliases={
  '@shopify/react-native-skia':'export const Skia=globalThis.__neLiveSkia;',
  'react-native':'export const PixelRatio={get:()=>2};',
  'expo-asset':`const asset=uri=>({uri,localUri:uri,downloadAsync:async()=>{}});export const Asset={fromModule:asset,fromURI:asset};`,
 };
 const modules=['world-assets','world-layout','imported-art','studio-play','editor-image-sources','layout-views','placed-world-renderer','outdoor-streaming','camp-perimeter','run-progression'];
 await build({stdin:{contents:modules.map(id=>`export * from './src/${id}';`).join('')+"export * from './native/game-renderer';export * from './native/bundled-art';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';",resolveDir:root},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error',plugins:[{name:'offline-ne-platform',setup(b){
  b.onResolve({filter:/^(@shopify\/react-native-skia|react-native|expo-asset)$/},a=>({path:a.path,namespace:'ne-platform'}));
  b.onLoad({filter:/.*/,namespace:'ne-platform'},a=>({contents:aliases[a.path],loader:'js'}));
  b.onLoad({filter:/\.(webp|png|jpg|ttf)$/},a=>({contents:`module.exports=${JSON.stringify(a.path)};`,loader:'js'}));
 }}]});
 const kit=await require('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});
 const bundle=path.join(temp,'model.cjs'),{JsiSkApi}=require(bundle),api=JsiSkApi(kit);
 globalThis.__neLiveSkia={...api,Data:{fromBytes:bytes=>api.Data.fromBytes(bytes),fromURI:async uri=>{
  assert(fs.existsSync(uri),'Every proof image must resolve locally: '+uri);
  decoded.add(uri);return api.Data.fromBytes(fs.readFileSync(uri));
 }},Surface:{...api.Surface,Make:(width,height)=>api.Surface.Make(width,height),MakeOffscreen:(width,height)=>api.Surface.Make(width,height)}};
 delete require.cache[require.resolve(bundle)];const m=require(bundle);
 globalThis.requestAnimationFrame=fn=>setImmediate(()=>fn(performance.now()));
 globalThis.fetch=async()=>{throw Error('This proof is offline; external requests are prohibited')};
 m.installImportedArt(records);
 const before=structuredClone(source.draft),layout=mode==='before'?before:m.addApprovedCampPerimeter(before);
 if(mode==='after')assert.equal(layout.campPerimeterVersion,7,'Capture the repaired version-7 migration, not the earlier canonical plan.');
 assert.deepEqual(m.validateLayout(layout).errors,[]);
 const width=1536,height=709,scale=.6,translation={x:-909.2,y:-132.2};
 const player={x:(width*.5-translation.x)/scale,y:(height*.53-translation.y)/scale};
 const world=m.createCampPlaySession(layout,player);
 // The screenshot shows the abandoned camp. Select the production initial
 // restoration state, then retain exactly the captured draft's placements.
 m.startExpedition(world);world.layout=structuredClone(layout);
 world.enemies=[];world.animals=[];world.loot=world.loot.filter(item=>item.placementId);world.notice='';world.noticeUntil=0;
 Object.assign(world.player,{...player,direction:'down',equipped:'woodenAxe'});
 const view={...m.PLAY_VIEW,zoom:scale/Math.max(width/1800,height/900)};
 const camera=m.editorCamera(width*2,height*2,world,view,2);
 const area={x:camera.x,y:camera.y,width:width*2/camera.scale,height:height*2/camera.scale,scale:camera.scale};
 assert(Math.abs(camera.scale/2-scale)<1e-9);
 assert(Math.abs(-camera.x*scale-translation.x)<1e-7&&Math.abs(-camera.y*scale-translation.y)<1e-7,'Match the independently registered screenshot framing.');
 const nearby=m.visiblePlacements(layout,area);
 const sources={...m.EDITOR_ENTRY_IMAGES,...m.editorTerrainDetail(layout.terrainImage),...m.requiredImages(nearby.map(p=>p.assetId),layout.terrainImage,{animationFrames:false})};
 renderer=await m.createNativeRenderer(view);await renderer.warmImages(sources);
 outdoor=new m.OutdoorTerrainStream(renderer.warmImages,renderer.releaseImages);
 outdoor.update(area,world.player);await outdoor.settled();assert(!outdoor.error,'Nearby outdoor terrain is available.');world.outdoorReady=outdoor.ready;
 renderer.draw(world,width,height).dispose();
 const deadline=performance.now()+30000;
 while(true){
  const stats=renderer.textureStats(),streams=[stats.roads,stats.camp,stats.rivers];
  assert(streams.every(s=>s.failures===0),'The actual terrain streams must load without omissions.');
  if(streams.every(s=>s.missing===0&&s.pending===0)&&stats.artwork.warming===0)break;
  assert(performance.now()<deadline,'Terrain loads within the bounded proof deadline.');
  await new Promise(resolve=>setTimeout(resolve,20));
 }
 const picture=renderer.draw(world,width,height),surface=api.Surface.Make(width,height);let image;
 fs.mkdirSync(output,{recursive:true});
 try{
  surface.getCanvas().drawPicture(picture);surface.flush();image=surface.makeImageSnapshot();
  fs.writeFileSync(path.join(output,`${mode}-live-draft.png`),image.encodeToBytes());
 }finally{image?.dispose();surface.dispose();picture.dispose()}
 const wallIds=new Set(['camp-circular-wall-v1-02','camp-circular-wall-v1-03']);
 const report={mode,sourceRevision:source.revision,sourceFile:sourceName,sourcePerimeterVersion:source.draft.campPerimeterVersion,renderedPerimeterVersion:layout.campPerimeterVersion,placementCount:layout.items.length,visiblePlacementCount:nearby.length,wallPair:layout.items.filter(p=>wallIds.has(p.id)),camera:{width,height,scale,translation,world:area},player,decodedImages:decoded.size,productionNativeRenderer:true,terrainStreams:renderer.textureStats(),state:'Initial abandoned-camp restoration state inferred from screenshot, with the captured live draft placements unchanged except the actual migration in after mode. Random expedition loot and wildlife are omitted because the player run state is not part of the captured editor draft.',limitations:['CanvasKit software rendering of the production native renderer; this is not an iPhone device performance test.','React HUD overlays are omitted; the game world, depth ordering, HQ, foliage and terrain use production code.']};
 fs.writeFileSync(path.join(output,`${mode}-live-draft-report.json`),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({mode,sourceRevision:source.revision,renderedPerimeterVersion:layout.campPerimeterVersion,placementCount:layout.items.length,visiblePlacementCount:nearby.length,decodedImages:decoded.size,image:path.join(output,`${mode}-live-draft.png`)}));
}finally{
 outdoor?.dispose();renderer?.dispose();
 globalThis.fetch=original.fetch;globalThis.requestAnimationFrame=original.raf;globalThis.__neLiveSkia=original.skia;
 fs.rmSync(temp,{recursive:true,force:true});
}
