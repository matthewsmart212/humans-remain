// Actual native renderer QA, with SHA-verified local asset/platform adapters.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile,execFileSync} from 'node:child_process';
import {promisify} from 'node:util';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const root=process.cwd(),phase=process.argv[2]??'before';assert(['before','after'].includes(phase));
const directory=path.resolve('.qa/fishing-refinement'),output=path.join(directory,phase);fs.mkdirSync(output,{recursive:true});
const baseFile=path.join(directory,'baseline-ref.txt');if(!fs.existsSync(baseFile))fs.writeFileSync(baseFile,execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}));
const requestedBaseline=process.argv.find(a=>a.startsWith('--baseline='))?.slice(11);
if(requestedBaseline){assert(/^[a-f0-9]{7,40}$/.test(requestedBaseline),'Use a Git commit SHA for --baseline');fs.writeFileSync(baseFile,requestedBaseline)}
const baseline=fs.readFileSync(baseFile,'utf8').trim(),sourceRef=phase==='before'?baseline:'HEAD';
const git=(...args)=>execFileSync('git',args,{maxBuffer:32*1024*1024,stdio:['ignore','pipe','pipe']});
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const require=createRequire(import.meta.url),run=promisify(execFile),nativeSkia=path.resolve('native/node_modules/@shopify/react-native-skia');
const nativeRequire=createRequire(path.join(nativeSkia,'package.json')),model=path.join(directory,'model-'+phase+'.cjs');
const modules=['studio-play','world-assets','world-layout','layout-views','outdoor-streaming','outdoor-terrain','placed-world-renderer','survivor-art','river-art','river-collision','world-ground','weather-model','fishing-site-art','fishing-site-geometry','fishing-site-renderer','terrain-art','east-approach','waterfalls','survival-engine'];
const aliases={
 '@react-native-async-storage/async-storage':'export default {getItem:async()=>null,setItem:async()=>{}};',
 '@shopify/react-native-skia':'export const Skia=globalThis.__fishingSkia;',
 'react-native':'export const PixelRatio={get:()=>2};',
 'expo-asset':'const asset=uri=>({uri,localUri:uri,downloadAsync:async()=>{}});export const Asset={fromModule:asset,fromURI:asset};',
};
if(!process.argv.includes('--reuse-model')||!fs.existsSync(model))await build({
 stdin:{contents:modules.map(id=>`export * from './src/${id}';`).join('\n')+"\nexport * from './native/game-world';export * from './native/game-renderer';export * from './native/bundled-art';export {JsiSkApi} from "+JSON.stringify(path.join(nativeSkia,'lib/module/skia/web/JsiSkia.js'))+';',resolveDir:root},
 bundle:true,platform:'node',format:'cjs',outfile:model,logLevel:'error',
 plugins:[{name:'fishing-native-platform',setup(b){
  b.onResolve({filter:/^(@react-native-async-storage\/async-storage|@shopify\/react-native-skia|react-native|expo-asset)$/},a=>({path:a.path,namespace:'fishing-native'}));
  b.onLoad({filter:/.*/,namespace:'fishing-native'},a=>({contents:aliases[a.path],loader:'js'}));
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
  if(needed.length){console.log('Fetching '+needed.length+' exact LFS assets');const r=await run('git',['lfs','fetch','--include='+needed.map(s=>s.relative).join(','),'--exclude=','origin',sourceRef],{cwd:root,maxBuffer:4*1024*1024});if(r.stderr.trim())console.log(r.stderr.trim())}
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
 globalThis.__fishingSkia={...api,Data:{fromBytes:b=>api.Data.fromBytes(b),fromURI:async uri=>api.Data.fromBytes(await assetBytes(uri))},Surface:{...api.Surface,Make:(w,h)=>api.Surface.Make(w,h),MakeOffscreen:(w,h)=>api.Surface.Make(w,h)}};
 delete require.cache[require.resolve(model)];const m=require(model);
 globalThis.requestAnimationFrame=fn=>setImmediate(()=>fn(performance.now()));globalThis.fetch=async()=>{throw Error('Native QA uses verified local artwork only')};
 const saved=m.loadGameWorld(),world=m.createCampPlaySession(saved.layout,undefined,'survival');
 const pier=world.layout.items.find(p=>p.id===m.FISHING_PIER_PLACEMENT_ID);assert(pier,'Published jetty exists');
 Object.assign(world,{enemies:[],animals:[],loot:[],effects:[],noticeUntil:0,stationPanel:undefined,tick:1800,phase:'day',nightAmount:0,phaseLeft:480});
 Object.assign(world.player,{...m.fishingPierPoint(pier,.29,.57),equipped:null,direction:'down-left',moving:false,walkBlend:0,runBlend:0,hurtUntil:0});
 const views=[
  {id:'platform',x:-1830,y:6660,zoom:1},
  {id:'entry',x:-1430,y:6480,zoom:1.25},
  {id:'overview',x:-2100,y:6750,zoom:.6},
  {id:'north-join',x:-2870,y:6150,zoom:.8},
  {id:'south-join',x:-2900,y:7510,zoom:.8},
  {id:'full-lake',x:-2350,y:6790,zoom:.38},
  {id:'portrait',x:-1830,y:6740,zoom:.35,width:390,height:844},
 ];
 const filter=process.argv.find(a=>a.startsWith('--views='))?.slice(8)?.split(',');
 const selected=filter?views.filter(v=>filter.includes(v.id)):views;
 const view={...m.PLAY_VIEW,follow:false,fullZoom:true,...selected[0]};
 const cameraFor=v=>{const width=v.width??844,height=v.height??390,c=m.editorCamera(width*2,height*2,world,{...view,...v},2);return{...c,width:width*2/c.scale,height:height*2/c.scale}};
 const cameras=selected.map(cameraFor),visible=[...new Map(cameras.flatMap(c=>m.visiblePlacements(world.layout,c)).map(p=>[p.id,p])).values()];
 const sources={...m.WORLD_GROUND_MATERIAL_SOURCES,...m.requiredImages(visible.map(p=>p.assetId),world.layout.terrainImage,{animationFrames:false}),survivorBase:m.SURVIVOR_IMAGE_SOURCES.survivorBase,survivorRear:m.SURVIVOR_IMAGE_SOURCES.survivorRear,riverSurfaceRipples:m.RIVER_MOTION_IMAGES.riverSurfaceRipples};
 const intersects=p=>cameras.some(c=>m.terrainIntersects({x:(p.x-600)*m.EAST_TERRAIN_SCALE,y:(p.y-600)*m.EAST_TERRAIN_SCALE,width:p.width*m.EAST_TERRAIN_SCALE,height:p.height*m.EAST_TERRAIN_SCALE},c));
 const batches=new Set();for(const section of m.RIVER_SECTIONS)if(intersects(section)){sources[section.key+'Preview']=m.RIVER_PREVIEW_IMAGES[section.key+'Preview'];batches.add(section.batch)}
 for(const feature of m.RIVER_SIDE_FEATURES)if(batches.has(feature.batch))sources[feature.maskKey]=feature.maskPath;
 for(const fall of m.WATERFALL_SECTIONS)if(intersects(fall)){sources[fall.maskKey]=fall.maskPath;sources.riverWaterfallFrames=m.RIVER_MOTION_IMAGES.riverWaterfallFrames}
 // Resolve all direct bundled images before warming, so LFS downloads batch.
 const localFiles=Object.values(sources).map(url=>m.BUNDLED_ART[url]??path.join(root,'public',canonical(url)));localFiles.push(path.join(root,'public/fonts/barlow-condensed-black.ttf'));
 const manifest=JSON.parse(readFile(path.resolve('src/river-detail-manifest.json'))),near=p=>cameras.some(c=>m.terrainIntersects({x:(p.x-600)*m.EAST_TERRAIN_SCALE,y:(p.y-600)*m.EAST_TERRAIN_SCALE,width:p.width*m.EAST_TERRAIN_SCALE,height:p.height*m.EAST_TERRAIN_SCALE},c,1500));
 for(const p of manifest.patches)if(near(p))localFiles.push(path.join(root,'public',p.image));
 for(const p of m.RIVER_SECTIONS)if(near(p)){const record=manifest.sections.find(s=>s.key===p.key);if(record)for(const url of [record.image,record.preview])localFiles.push(path.join(root,'public',url))}
 await hydrate(localFiles);
 renderer=await m.createNativeRenderer(view);await renderer.warmImages(sources);
 outdoor=new m.OutdoorTerrainStream(renderer.warmImages,renderer.releaseImages);world.outdoorReady=outdoor.ready;
 const captures=[];
 async function render(v,condition='clear',tick=1800,suffix=''){
  Object.assign(view,v);const width=v.width??844,height=v.height??390,camera=cameraFor(v);world.tick=tick;
  Object.assign(world.player,v.id==='entry'?{x:pier.x+80,y:pier.y-25}:m.fishingPierPoint(pier,.29,.57));
  world.weather=m.createWeather({rain:condition==='rain',fog:false,lightning:false});Object.assign(world.weather,{time:tick/60,rain:condition==='rain'?1:0,heavy:0,fog:0,flash:0,rainTravel:tick/60*390});
  outdoor.update(camera,world.player);await outdoor.settled();assert(!outdoor.error);
  await renderer.prepareTerrain(world,width,height);
  const picture=renderer.draw(world,width,height),surface=api.Surface.Make(width*2,height*2),canvas=surface.getCanvas();canvas.scale(2,2);canvas.drawPicture(picture);surface.flush();
  const shot=surface.makeImageSnapshot(),bytes=Buffer.from(shot.encodeToBytes());const file=path.join(output,v.id+'-'+condition+suffix+'.png');fs.writeFileSync(file,bytes);shot.dispose();picture.dispose();surface.dispose();
  const stats=renderer.textureStats();for(const key of ['camp','rivers'])assert.equal(stats[key].missing,0,key+' texture completeness '+v.id);for(const key of ['active','queued','warming'])assert.equal(stats.artwork[key],0,key+' complete '+v.id);
  const fish=m.fishingFishSchool(pier).map(f=>m.fishingFishPosition(f,tick/60)).filter(p=>p.x>=camera.x&&p.x<=camera.x+camera.width&&p.y>=camera.y&&p.y<=camera.y+camera.height&&!m.fishingPierDeckContains(pier,p.x,p.y));
  captures.push({file:path.relative(root,file),view:v,condition,tick,player:{x:world.player.x,y:world.player.y},visibleFish:fish.length,stats,bytes:bytes.length});
  console.log('Rendered '+path.basename(file));return{camera,width,height};
 }
 for(const v of selected)await render(v);
 if(selected.some(v=>v.id==='platform'))await render(selected.find(v=>v.id==='platform'),'rain');
 if(process.argv.includes('--motion')){const v=selected.find(v=>v.id==='platform')??selected[0];for(let i=0;i<12;i++)await render(v,'clear',1800+i*12,'-motion-'+String(i).padStart(2,'0'))}
 const samples=[{id:'entry',x:pier.x,y:pier.y},...Array.from({length:6},(_,i)=>({id:'approach-'+(i+1),x:pier.x+(i+1)*20,y:pier.y-(i+1)*10})),{id:'gangway',...m.fishingPierPoint(pier,.65,.31)},{id:'platform',...m.fishingPierPoint(pier,.29,.57)},{id:'open-water',...m.fishingPierPoint(pier,.1,.82)}];
 const shorelineChecks=samples.map(p=>({...p,radius:19,rawWater:m.riverWaterBlocked(p.x,p.y,19),walkable:!m.worldBlocked(world,p.x,p.y,19)}));
 for(const sample of shorelineChecks)assert.equal(sample.walkable,sample.id!=='open-water','Clear entry, continuous deck and blocked open water: '+sample.id);
 for(const sample of shorelineChecks.filter(p=>p.id==='entry'||p.id.startsWith('approach-')))assert(!sample.rawWater,'The bank approach is visibly dry: '+sample.id);
 if(selected.some(v=>v.id==='platform')){
  const v=views.find(v=>v.id==='platform'),camera=cameraFor(v),surface=api.Surface.Make(1688,780),canvas=surface.getCanvas();
  const bytes=api.Data.fromBytes(fs.readFileSync(path.join(output,'platform-clear.png'))),background=api.Image.MakeImageFromEncoded(bytes);bytes.dispose();assert(background);
  const paint=api.Paint();canvas.drawImage(background,0,0,paint);paint.setColor(api.Color('#1ad9ec'));paint.setAlphaf(.8);
  const screen=(x,y)=>[(x-camera.x)*camera.scale,(y-camera.y)*camera.scale];
  for(let y=Math.floor(camera.y/12)*12;y<camera.y+camera.height;y+=12)for(let x=Math.floor(camera.x/12)*12;x<camera.x+camera.width;x+=12){
   if(!m.riverWaterBlocked(x,y,0))continue;
   if([[12,0],[-12,0],[0,12],[0,-12]].every(([dx,dy])=>m.riverWaterBlocked(x+dx,y+dy,0)))continue;
   const [px,py]=screen(x,y);canvas.drawCircle(px,py,2.2,paint);
  }
  paint.setStyle(1);paint.setStrokeWidth(2);paint.setColor(api.Color('#f8dd6d'));paint.setAlphaf(1);
  const deck=m.fishingPierGeometry(pier).deck.map(([x,y])=>screen(x,y)),shape=api.Path.MakeFromSVGString('M'+deck.map(p=>p.join(',')).join('L')+'Z');canvas.drawPath(shape,paint);shape.dispose();
  for(const p of shorelineChecks){paint.setColor(api.Color(p.walkable?'#58ff85':'#ff4384'));const [x,y]=screen(p.x,p.y);canvas.drawCircle(x,y,19*camera.scale,paint)}
  surface.flush();const shot=surface.makeImageSnapshot();fs.writeFileSync(path.join(output,'platform-clear-collision.png'),shot.encodeToBytes());shot.dispose();paint.dispose();background.dispose();surface.dispose();
 }
 const report={phase,baselineCommit:baseline,sourceCommit:git('rev-parse','HEAD').toString().trim(),modelSha256:sha256(fs.readFileSync(model)),renderer:'Production native renderer with CanvasKit software platform adapter',physicalIPhoneTested:false,captures,shorelineChecks,uniqueDecodedFiles:decodedFiles.size,verifiedSourceFiles:assetReport.size,assets:Object.fromEntries(assetReport)};
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({phase,captures:captures.length,sourceFiles:assetReport.size,zeroMissing:true,physicalIPhoneTested:false}));
}finally{outdoor?.dispose();renderer?.dispose()}
