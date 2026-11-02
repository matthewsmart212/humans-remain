// Runs the real native renderer with file-backed Expo assets and CanvasKit.
// This verifies drawing/asset compatibility; it is not a physical iPhone test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'hq-native-'));
const output=process.argv[2]||'.qa/headquarters-cutaway';
const original={skia:globalThis.__hqSkia,raf:globalThis.requestAnimationFrame,fetch:globalThis.fetch};
let renderer,outdoor;
try{
 const aliases={
  '@shopify/react-native-skia':'export const Skia=globalThis.__hqSkia;',
  'react-native':'export const PixelRatio={get:()=>2};',
  'expo-asset':'const asset=uri=>({uri,localUri:uri,downloadAsync:async()=>{}});export const Asset={fromModule:asset,fromURI:asset};',
 };
 const modules=['world-assets','world-layout','headquarters-south-art','run-progression','studio-play','editor-image-sources','layout-views','placed-world-renderer','outdoor-streaming','headquarters-cutaway'];
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
 globalThis.fetch=async()=>{throw Error('Headquarters native QA must stay offline')};
 const saved=m.loadGameWorld(),hall=saved.layout.items.find(p=>p.assetId==='base_shelter_t1'),b=m.placementBounds(hall);
 const world=m.createCampPlaySession(saved.layout);world.enemies=[];world.animals=[];world.loot=[];
 world.weather=undefined;m.startExpedition(world);
 const width=1536,height=864,view={...m.PLAY_VIEW,follow:false,x:hall.x,y:b.y+b.height*.52,zoom:1};
 const c=m.editorCamera(width*2,height*2,world,view,2),viewport={x:c.x,y:c.y,width:width*2/c.scale,height:height*2/c.scale,scale:c.scale};
 const sources={...m.EDITOR_ENTRY_IMAGES,...m.editorTerrainDetail(saved.layout.terrainImage),...m.requiredImages(m.visiblePlacements(saved.layout,viewport).map(p=>p.assetId),saved.layout.terrainImage,{animationFrames:false})};
 renderer=await m.createNativeRenderer(view);await renderer.warmImages(sources);
 for(const url of [m.HQ_SOUTH_INTERIOR,m.HQ_SOUTH_RUIN_INTERIOR,m.HQ_SOUTH_ROOF,m.HQ_SOUTH_RUIN])assert(decoded.has(m.BUNDLED_ART[url]),'Native loader decoded '+url);
 outdoor=new m.OutdoorTerrainStream(renderer.warmImages,renderer.releaseImages);outdoor.update(viewport,world.player);await outdoor.settled();assert(!outdoor.error);world.outdoorReady=outdoor.ready;
 fs.mkdirSync(output,{recursive:true});const pictures=[];
 for(const broken of [false,true])for(const position of [1.08,.97,.94,.91,.875,.84,.81,.78,.70,.60]){
  const inside=position===.60;
  world.progression.restoredBuildings=broken?[]:['headquarters'];world.progression.campLevel=broken?0:1;
  Object.assign(world.player,{x:hall.x,y:b.y+b.height*position,equipped:null,direction:'up'});
  renderer.draw(world,width,height).dispose();
  const deadline=performance.now()+30000;
  while(true){const stats=renderer.textureStats(),streams=[stats.roads,stats.camp,stats.rivers];assert(streams.every(s=>s.failures===0));if(streams.every(s=>s.missing===0&&s.pending===0)&&stats.artwork.warming===0)break;assert(performance.now()<deadline,'Native terrain preparation completes');await new Promise(resolve=>setTimeout(resolve,20));}
  const picture=renderer.draw(world,width,height),surface=api.Surface.Make(width,height);let image;
  try{surface.getCanvas().drawPicture(picture);surface.flush();image=surface.makeImageSnapshot();const bytes=image.encodeToBytes();assert(bytes.length>25000);const file=`native-${broken?'ruined':'repaired'}-${position===1.08?'exterior':inside?'interior':'step-'+String(position).replace('.','-')}.png`;fs.writeFileSync(path.join(output,file),bytes);pictures.push(file)}finally{image?.dispose();surface.dispose();picture.dispose()}
 }
 const report={passed:true,snapshotRevision:saved.revision,headquartersScale:hall.scale,productionNativeRenderer:true,offline:true,pictures,physicalIPhoneTested:false};
 fs.writeFileSync(path.join(output,'native-verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{outdoor?.dispose();renderer?.dispose();globalThis.__hqSkia=original.skia;globalThis.requestAnimationFrame=original.raf;globalThis.fetch=original.fetch;fs.rmSync(temp,{recursive:true,force:true})}
