// Deterministic startup/failure checks using the real saved camp and production renderer.
// Run with the directory containing immutable /api/asset-files/<id> downloads.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {build} from 'esbuild';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'editor-startup-'));
const [input,layoutFile='docs/qa/camp-moss-no-gates-v1/layout-after.json',artworkFile='docs/qa/camp-moss-no-gates-v1/source-artwork.json',qa='docs/qa/editor-startup-v2',priorEntryFile]=process.argv.slice(2),oldFetch=globalThis.fetch,oldWindow=globalThis.window,oldType=process.type;
const tick=()=>new Promise(resolve=>setImmediate(resolve));fs.mkdirSync(qa,{recursive:true});
try{
 await build({stdin:{contents:`export * from './src/artwork-loading';export * from './src/editor-image-sources';export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/skia-web';export * from './src/placed-world-renderer';export * from './src/survival-engine';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs'));
 // A requested Play image jumps ahead of queued background work, without a
 // second download. Already active work finishes; the pool stays bounded.
 const starts=[],finish=new Map();let active=0,peak=0;
 const pool=m.createArtworkLoader(url=>new Promise(resolve=>{starts.push(url);active++;peak=Math.max(peak,active);finish.set(url,()=>{active--;resolve({url})})}),()=>{},1);
 const background=pool.load({a:'/a',b:'/b',c:'/c',d:'/d'},undefined,'background');
 const promoted=pool.load({play:'/d'}),fresh=pool.load({new:'/new'});
 for(const url of ['/a','/d','/new','/b','/c']){assert.equal(starts.at(-1),url);finish.get(url)();await tick()}
 await Promise.all([background,promoted,fresh]);assert.equal(peak,1);assert.equal(pool.images.d,pool.images.play);assert.equal(starts.filter(u=>u==='/d').length,1);pool.dispose();

 const raw=fs.readFileSync(layoutFile,'utf8'),layout=JSON.parse(raw).draft;
 m.installImportedArt(JSON.parse(fs.readFileSync(artworkFile)).records);
 const originalLayout=JSON.stringify(layout),placed=m.requiredImages(layout.items.map(p=>p.assetId),layout.terrainImage);
 const detail=m.editorTerrainDetail(layout.terrainImage),entry={...m.EDITOR_ENTRY_IMAGES,...m.editorEntryArtwork(layout)},before={...m.EDITOR_IMAGE_SOURCES,...placed,...detail};
 const unique=o=>[...new Set(Object.values(o))],deferred=new Set(unique(before).filter(url=>!unique(entry).includes(url)));
 const redirects=JSON.parse(fs.readFileSync('server/lossless-artwork-redirects.json','utf8'));
 const resolve=url=>url.startsWith('/api/asset-files/')?path.resolve(input,path.basename(url)+'.image'):path.resolve('public'+(redirects[url]??url));
 const bytes=o=>unique(o).reduce((n,url)=>n+fs.statSync(resolve(url)).size,0);
 for(const key of Object.keys(m.EDITOR_MOVEMENT_IMAGES))assert(!(key in m.EDITOR_ENTRY_IMAGES),'Gameplay-only image keys cannot block entry');
 for(const url of Object.values(detail))assert(!unique(entry).includes(url));
 assert.equal(m.editorEntryArtwork({...layout,terrainImage:{url:'/custom.png'}})['placed:/custom.png'],'/custom.png','Custom terrain remains mandatory');
 const baselineBytes=bytes(before),entryBytes=bytes(entry);
 if(priorEntryFile)assert(entryBytes<=bytes(JSON.parse(fs.readFileSync(priorEntryFile,'utf8')).sources)*.8,'Current saved camp entry should remove at least 20% of the previous startup bytes');
 else assert(entryBytes<baselineBytes*.45,'Entry should remove at least 55% of blocking artwork bytes');

 // The real camp must draw while every deferred download is held indefinitely.
 let releaseBackground;const barrier=new Promise(resolve=>releaseBackground=resolve),requests=[];
 const unavailable=new Set([Object.values(detail)[0],Object.values(m.EDITOR_MOVEMENT_IMAGES).find(url=>deferred.has(url))]);
 delete globalThis.CanvasKit;globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;
 globalThis.fetch=async url=>{
  url=String(url);if(url.startsWith('blob:'))return oldFetch(url);requests.push(url);
  if(deferred.has(url)){await barrier;if(unavailable.has(url))return new Response('Offline',{status:503})}
  return new Response(fs.readFileSync(resolve(url)));
 };
 let surface,drawables=0;
 const canvas={width:0,height:0,clientWidth:844,clientHeight:390,dataset:{}},world=m.createWorld(layout);
 const view={x:layout.spawn.x,y:layout.spawn.y,zoom:.55,follow:true,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false};world.editorPreview=true;
 const draw=(ctx,atlas,imgs,w)=>{drawables=m.placedDrawables(ctx,imgs,w,true).length;m.drawWorldEditor(ctx,atlas,imgs,w,view)};
 const renderer=await m.createWebWorld(canvas,draw,m.editorEntryArtwork(layout),{sources:m.EDITOR_ENTRY_IMAGES});
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 renderer.draw(world);const firstDrawables=drawables;
 assert(!requests.some(url=>deferred.has(url)),'No optional download is needed before the first useful frame');
 const screenshot=async name=>{const image=surface.makeImageSnapshot(),png=Buffer.from(image.encodeToBytes());image.delete();await sharp(png).webp({quality:94}).toFile(path.join(qa,name+'.webp'));return png};
 await screenshot('camp-entry');
 let settled=false;
 const blocked=Promise.allSettled([renderer.loadImages(detail,undefined,'background'),m.prepareEditorMovement(renderer,layout,'background')]).then(r=>{settled=true;return r});
 await tick();assert(!settled,'Optional work is still blocked');world.tick=17;renderer.draw(world);assert.equal(drawables,firstDrawables,'Every placed object remains drawn without the next animation frame');
 releaseBackground();const failures=await blocked;assert(failures.every(r=>r.status==='rejected'),'Both simulated background failures reached their own callers');
 renderer.draw(world);assert.equal(drawables,firstDrawables,'Failed optional loads leave the editor drawable');
 // Retry via the same foreground Play path. Frames are warmed on the real
 // drawing surface; Play cannot resolve before they are available.
 unavailable.clear();let prepared=false,problem;
 const recovered=Promise.all([renderer.loadImages(detail,undefined,'background'),m.prepareEditorMovement(renderer,layout)]).then(()=>prepared=true,e=>{problem=e});
 for(let frames=0;frames<100&&!prepared&&!problem;frames++){await tick();renderer.draw(world)}
 await recovered;if(problem)throw problem;assert(prepared);assert.equal(drawables,firstDrawables);
 const restored=await screenshot('camp-full-detail');renderer.dispose();
 // Identical full-quality output to loading every original image up front.
 const full=await m.createWebWorld(canvas,draw,{...placed,...detail},{sources:m.EDITOR_IMAGE_SOURCES});full.draw(world);
 const image=surface.makeImageSnapshot(),reference=Buffer.from(image.encodeToBytes());image.delete();
 assert((await sharp(restored).raw().toBuffer()).equals(await sharp(reference).raw().toBuffer()),'Final pixels must match the full upfront load');full.dispose();
 assert.equal(JSON.stringify(layout),originalLayout,'Startup must not alter placements or world data');
 const report={result:'pass',fixture:`Saved camp with ${layout.items.length} placements`,before:{images:unique(before).length,bytes:baselineBytes},entry:{images:unique(entry).length,bytes:entryBytes},deferredBytes:baselineBytes-entryBytes,reductionPercent:+((1-entryBytes/baselineBytes)*100).toFixed(1),checks:['Foreground promotion without duplicate fetches','Bounded shared loader queue','Custom terrain required at entry','Camp draws before optional downloads','Every object stays visible through missing animation frames','Failed detail and animation loads leave editor usable','Play preparation retries and warms textures','Final image pixels equal full upfront load','Saved placement data unchanged'],limitations:'Software CanvasKit rendering and deterministic delayed downloads; not a browser or physical iPhone timing measurement. Byte totals cover artwork only, excluding JavaScript, graphics WASM, fonts and metadata.'};
 fs.writeFileSync(path.join(qa,'checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{globalThis.fetch=oldFetch;globalThis.window=oldWindow;process.type=oldType;fs.rmSync(temp,{recursive:true,force:true})}
