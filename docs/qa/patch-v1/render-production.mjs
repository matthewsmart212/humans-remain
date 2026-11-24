// Actual native renderer QA, with SHA-verified local asset/platform adapters.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile,execFileSync} from 'node:child_process';
import {promisify} from 'node:util';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const root=process.cwd(),phase='after';
const directory=path.resolve('.qa/patch-v1'),output=path.join(directory,phase);fs.mkdirSync(output,{recursive:true});
const baseFile=path.join(directory,'baseline-ref.txt');if(!fs.existsSync(baseFile))fs.writeFileSync(baseFile,execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}));
const requestedBaseline=process.argv.find(a=>a.startsWith('--baseline='))?.slice(11);
if(requestedBaseline){assert(/^[a-f0-9]{7,40}$/.test(requestedBaseline),'Use a Git commit SHA for --baseline');fs.writeFileSync(baseFile,requestedBaseline)}
const baseline=fs.readFileSync(baseFile,'utf8').trim(),sourceRef=phase==='before'?baseline:'HEAD';
const git=(...args)=>execFileSync('git',args,{maxBuffer:32*1024*1024,stdio:['ignore','pipe','pipe']});
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const require=createRequire(import.meta.url),run=promisify(execFile),nativeSkia=path.resolve('native/node_modules/@shopify/react-native-skia');
const nativeRequire=createRequire(path.join(nativeSkia,'package.json')),model=path.join(directory,'model-'+phase+'.cjs');
const modules=['studio-play','world-assets','world-layout','layout-views','outdoor-streaming','outdoor-terrain','placed-world-renderer','survivor-art','river-art','river-collision','world-ground','weather-model','fishing-site-art','fishing-site-geometry','fishing-site-renderer','terrain-art','east-approach','waterfalls','survival-engine','patch-placement','patch-art','patch-quest','loot-chest'];
const aliases={
 '@react-native-async-storage/async-storage':'export default {getItem:async()=>null,setItem:async()=>{}};',
 '@shopify/react-native-skia':'export const Skia=globalThis.__patchSkia;',
 'react-native':'export const PixelRatio={get:()=>2};',
 'expo-asset':'const asset=uri=>({uri,localUri:uri,downloadAsync:async()=>{}});export const Asset={fromModule:asset,fromURI:asset};',
};
if(!process.argv.includes('--reuse-model')||!fs.existsSync(model))await build({
 stdin:{contents:modules.map(id=>`export * from './src/${id}';`).join('\n')+"\nexport * from './native/game-world';export * from './native/game-renderer';export * from './native/bundled-art';export {JsiSkApi} from "+JSON.stringify(path.join(nativeSkia,'lib/module/skia/web/JsiSkia.js'))+';',resolveDir:root},
 bundle:true,platform:'node',format:'cjs',outfile:model,logLevel:'error',
 plugins:[{name:'patch-native-platform',setup(b){
  b.onResolve({filter:/^(@react-native-async-storage\/async-storage|@shopify\/react-native-skia|react-native|expo-asset)$/},a=>({path:a.path,namespace:'patch-native'}));
  b.onLoad({filter:/.*/,namespace:'patch-native'},a=>({contents:aliases[a.path],loader:'js'}));
  b.onLoad({filter:/\.(webp|png|jpg|jpeg|ttf)$/},a=>({contents:`module.exports=${JSON.stringify(a.path)};`,loader:'js'}));
  if(phase==='before')b.onLoad({filter:/\/(src|native)\/.*\.(ts|tsx|json)$/},a=>{
   if(a.path.includes('/node_modules/'))return;
   return {contents:git('show',baseline+':'+path.relative(root,a.path)).toString(),loader:path.extname(a.path).slice(1)};
  });
 }}],
});
console.log('Compiled '+phase+' model '+sha256(fs.readFileSync(model)));
if(process.argv.includes('--compile-only'))process.exit(0);
const beforeBytes=new Map(),specifications=new Map(),verified=new Map(),assetReport=new Map(),decodedFiles=new Set();
const readFile=file=>{if(phase!=='before')return fs.readFileSync(file);const rel=path.relative(root,file);if(!beforeBytes.has(rel))beforeBytes.set(rel,git('show',baseline+':'+rel));return beforeBytes.get(rel)};
const redirects=Object.assign({},...['lossless-artwork','retired-road','calm-river','river-features','river-quality'].map(n=>JSON.parse(readFile(path.resolve('server/'+n+'-redirects.json')))));
const canonical=url=>{const seen=new Set();while(redirects[url]&&!seen.has(url)){seen.add(url);url=redirects[url]}return url};
const pointer=bytes=>{if(!bytes.subarray(0,48).toString().startsWith('version https://git-lfs.github.com/'))return;const text=bytes.toString();const oid=text.match(/oid sha256:([a-f0-9]{64})/)?.[1],size=Number(text.match(/size (\d+)/)?.[1]);assert(oid&&size);return{oid,size}};
const lfsRoot=path.resolve(git('rev-parse','--git-path','lfs/objects').toString().trim());
const cachePath=oid=>path.join(lfsRoot,oid.slice(0,2),oid.slice(2,4),oid);
function specification(file){file=path.resolve(file);if(specifications.has(file))return specifications.get(file);assert(file.startsWith(root+path.sep));const bytes=readFile(file),expected=pointer(bytes),result={file,relative:path.relative(root,file),expected,bytes:expected?undefined:bytes};specifications.set(file,result);return result}
let fetching=Promise.resolve();
async function hydrate(files){
 const specs=[...new Set(files)].map(specification);
 fetching=fetching.then(async()=>{
  const needed=specs.filter(s=>s.expected&&!fs.existsSync(cachePath(s.expected.oid)));
  if(needed.length){
   // GitHub's public media endpoint serves the exact LFS object. The batch
   // endpoint can stall in the managed runner; verify every direct response
   // against both byte length and SHA-256 from the committed pointer.
   const revision=git('rev-parse',sourceRef).toString().trim();console.log('Fetching '+needed.length+' SHA-verified public LFS assets');
   let next=0;
   await Promise.all(Array.from({length:Math.min(6,needed.length)},async()=>{
    for(;;){const spec=needed[next++];if(!spec)return;
     const {oid,size}=spec.expected,destination=cachePath(oid);if(fs.existsSync(destination))continue;
     const temporary=path.join(directory,'patch-download-'+oid+'-'+crypto.randomBytes(5).toString('hex'));
     const url='https://media.githubusercontent.com/media/matthewsmart212/humans-remain/'+revision+'/'+spec.relative.split('/').map(encodeURIComponent).join('/');
     try{
      await run('curl',['--fail','--silent','--show-error','--location','--max-time','60','--retry','2','--output',temporary,url],{maxBuffer:1024*1024});
      const bytes=fs.readFileSync(temporary);assert.equal(bytes.length,size,spec.relative);assert.equal(sha256(bytes),oid,spec.relative);
      fs.mkdirSync(path.dirname(destination),{recursive:true});fs.renameSync(temporary,destination);
     }finally{fs.rmSync(temporary,{force:true})}
    }
   }));
  }
 });await fetching;
 for(const spec of specs){
  if(spec.expected){const {oid,size}=spec.expected;if(!verified.has(oid)){const bytes=fs.readFileSync(cachePath(oid));assert.equal(bytes.length,size,spec.relative);assert.equal(sha256(bytes),oid,spec.relative);verified.set(oid,true)}
   if(pointer(fs.readFileSync(spec.file)))fs.copyFileSync(cachePath(oid),spec.file);
   assetReport.set(spec.relative,{sha256:oid,bytes:size,verifiedLfs:true});
  }else assetReport.set(spec.relative,{sha256:sha256(spec.bytes),bytes:spec.bytes.length,verifiedLfs:false});
 }
}
function uriFile(uri){return uri.startsWith('http')?path.join(root,'public',canonical(new URL(uri).pathname)):path.resolve(uri)}
async function assetBytes(uri){const file=uriFile(uri);decodedFiles.add(file);await hydrate([file]);const spec=specification(file);return spec.expected?fs.readFileSync(cachePath(spec.expected.oid)):spec.bytes}
let renderer,outdoor;
try{
 const kit=await nativeRequire('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(nativeRequire.resolve('canvaskit-wasm')),f)});
 const {JsiSkApi}=require(model),api=JsiSkApi(kit);
 globalThis.__patchSkia={...api,Data:{fromBytes:b=>api.Data.fromBytes(b),fromURI:async uri=>api.Data.fromBytes(await assetBytes(uri))},Surface:{...api.Surface,Make:(w,h)=>api.Surface.Make(w,h),MakeOffscreen:(w,h)=>api.Surface.Make(w,h)}};
 delete require.cache[require.resolve(model)];const m=require(model);
 globalThis.requestAnimationFrame=fn=>setImmediate(()=>fn(performance.now()));globalThis.fetch=async()=>{throw Error('Native QA uses verified local artwork only')};
 const saved=m.loadGameWorld(),world=m.createCampPlaySession(saved.layout,undefined,'survival');
 const site=m.patchQuestSite(world.layout),chest=m.campLootChest(world);assert(site&&chest,'The published world has both quest endpoints');
 Object.assign(world,{enemies:[],animals:[],loot:[],effects:[],noticeUntil:0,stationPanel:undefined,tick:0,phase:'day',nightAmount:0,phaseLeft:180});
 const discovery={x:site.robot.x+65,y:site.robot.y+22},home={x:chest.x+78,y:chest.y+70};
 const views=[
  {id:'discovery',x:site.station.x,y:site.station.y-25,zoom:1,stage:'damaged'},
  {id:'discovery-night',x:site.station.x,y:site.station.y-25,zoom:1,stage:'damaged',night:true},
  {id:'repair',x:site.robot.x,y:site.robot.y-18,zoom:1.55,stage:'repair'},
  {id:'following',x:site.robot.x,y:site.robot.y-18,zoom:1.2,stage:'repaired'},
  {id:'homecoming',x:chest.x,y:chest.y+35,zoom:1,stage:'home'},
 ];
 const filter=process.argv.find(a=>a.startsWith('--views='))?.slice(8)?.split(',');
 const selected=filter?views.filter(v=>filter.includes(v.id)):views;assert(selected.length);
 const view={...m.PLAY_VIEW,follow:false,fullZoom:true,...selected[0]};
 const cameraFor=v=>{const c=m.editorCamera(1688,780,world,{...view,...v},2);return{...c,width:1688/c.scale,height:780/c.scale}};
 const cameras=selected.map(cameraFor),visible=[...new Map(cameras.flatMap(c=>m.visiblePlacements(world.layout,c)).map(p=>[p.id,p])).values()];
 const sources={...m.WORLD_GROUND_MATERIAL_SOURCES,...m.requiredImages(visible.map(p=>p.assetId),world.layout.terrainImage,{animationFrames:false}),
  ...m.PATCH_IMAGES,...m.LOOT_CHEST_IMAGES,survivorBase:m.SURVIVOR_IMAGE_SOURCES.survivorBase,survivorRear:m.SURVIVOR_IMAGE_SOURCES.survivorRear,
  riverSurfaceRipples:m.RIVER_MOTION_IMAGES.riverSurfaceRipples};
 const intersects=p=>cameras.some(c=>m.terrainIntersects({x:(p.x-600)*m.EAST_TERRAIN_SCALE,y:(p.y-600)*m.EAST_TERRAIN_SCALE,width:p.width*m.EAST_TERRAIN_SCALE,height:p.height*m.EAST_TERRAIN_SCALE},c));
 const batches=new Set();for(const section of m.RIVER_SECTIONS)if(intersects(section)){sources[section.key+'Preview']=m.RIVER_PREVIEW_IMAGES[section.key+'Preview'];batches.add(section.batch)}
 for(const feature of m.RIVER_SIDE_FEATURES)if(batches.has(feature.batch))sources[feature.maskKey]=feature.maskPath;
 for(const fall of m.WATERFALL_SECTIONS)if(intersects(fall)){sources[fall.maskKey]=fall.maskPath;sources.riverWaterfallFrames=m.RIVER_MOTION_IMAGES.riverWaterfallFrames}
 const localFiles=Object.values(sources).map(url=>m.BUNDLED_ART[url]??path.join(root,'public',canonical(url)));localFiles.push(path.join(root,'public/fonts/barlow-condensed-black.ttf'));
 const manifest=JSON.parse(readFile(path.resolve('src/river-detail-manifest.json'))),near=p=>cameras.some(c=>m.terrainIntersects({x:(p.x-600)*m.EAST_TERRAIN_SCALE,y:(p.y-600)*m.EAST_TERRAIN_SCALE,width:p.width*m.EAST_TERRAIN_SCALE,height:p.height*m.EAST_TERRAIN_SCALE},c,1500));
 for(const p of manifest.patches)if(near(p))localFiles.push(path.join(root,'public',p.image));
 for(const p of m.RIVER_SECTIONS)if(near(p)){const record=manifest.sections.find(s=>s.key===p.key);if(record)for(const url of [record.image,record.preview])localFiles.push(path.join(root,'public',url))}
 await hydrate(localFiles);
 renderer=await m.createNativeRenderer(view);await renderer.warmImages(sources);
 outdoor=new m.OutdoorTerrainStream(renderer.warmImages,renderer.releaseImages);world.outdoorReady=outdoor.ready;
 const initial=structuredClone(world.patchQuest),captures=[];
 for(const v of selected){
  Object.assign(view,v);world.patchQuest=structuredClone(initial);world.patchRepair=undefined;
  world.tick=324;world.phase=v.night?'night':'day';world.nightAmount=v.night?1:0;
  Object.assign(world.player,{...(v.stage==='home'?home:discovery),equipped:null,direction:'up-left',moving:false,walkBlend:0,runBlend:0,hurtUntil:0});
  const q=world.patchQuest;
  if(v.stage==='repair'){
   Object.assign(q,{discovered:true,servoClaimed:true});
   world.patchRepair={worked:3.2,duration:6,held:true,updatedAt:5.4,origin:{...discovery},hp:world.player.hp,hurtUntil:0};
  }
  if(v.stage==='repaired')Object.assign(q,{discovered:true,servoClaimed:true,servoInstalled:true,recruited:true,command:'follow',direction:'down-right',moving:true,walkDistance:12});
  if(v.stage==='home'){
   Object.assign(q,{discovered:true,servoClaimed:true,servoInstalled:true,recruited:true,position:{x:chest.x,y:chest.y+78},direction:'down-right'});
   m.deliverPatchSupplies(world);assert(q.suppliesDelivered,'A real arrival deposits the parcel once');
  }
  world.weather=m.createWeather({rain:false,fog:false,lightning:false});Object.assign(world.weather,{time:world.tick/60,rain:0,heavy:0,fog:0,flash:0});
  const camera=cameraFor(v);outdoor.update(camera,world.player);await outdoor.settled();assert(!outdoor.error);
  await renderer.prepareTerrain(world,844,390);
  const picture=renderer.draw(world,844,390),surface=api.Surface.Make(1688,780),canvas=surface.getCanvas();canvas.scale(2,2);canvas.drawPicture(picture);surface.flush();
  const shot=surface.makeImageSnapshot(),bytes=Buffer.from(shot.encodeToBytes()),file=path.join(output,v.id+'.png');fs.writeFileSync(file,bytes);shot.dispose();picture.dispose();surface.dispose();
  const stats=renderer.textureStats();for(const key of ['camp','rivers'])assert.equal(stats[key].missing,0,key+' texture completeness '+v.id);for(const key of ['active','queued','warming'])assert.equal(stats.artwork[key],0,key+' complete '+v.id);
  captures.push({file:path.relative(root,file),view:v,fixtureStage:v.stage,stats,bytes:bytes.length});console.log('Rendered '+v.id);
 }
 const report={passed:true,renderer:'Production native game renderer via CanvasKit software adapter',sourceCommit:git('rev-parse','HEAD').toString().trim(),workingTree:true,modelSha256:sha256(fs.readFileSync(model)),
  viewport:{points:[844,390],density:2},captures,artwork:[...assetReport].map(([file,details])=>({file,...details})),
  limitations:'Staged save/repair poses for visual inspection; gameplay transitions validated separately. No physical iPhone, touch or frame-rate test.'};
 fs.writeFileSync(path.join(output,'renderer-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:true,captures:captures.length,sourceFiles:assetReport.size,zeroMissing:true,physicalIPhoneTested:false}));
}finally{outdoor?.dispose();renderer?.dispose()}
