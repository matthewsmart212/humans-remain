// Actual production renderer and current world, not an illustrative mock-up.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'world-plant-render-')),out='docs/qa/camp-feather-v1',cache='.qa/world-scenery',oldFetch=globalThis.fetch;
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/survival-engine';export * from './src/placed-world-renderer';export * from './src/skia-web';export * from './src/editor-image-sources';export * from './src/east-approach';export * from './src/outdoor-terrain';export * from './src/terrain-art';export * from './src/terrain-stream-art';export * from './src/river-art';export * from './src/camp-fringe';export * from './src/layout-views';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs')});
 const m=require(path.join(tmp,'model.cjs')),saved=JSON.parse(fs.readFileSync(out+'/before.json')),before=saved.draft;
 m.installImportedArt(JSON.parse(fs.readFileSync('.qa/camp-feather-artwork.json')).records);
 const layout=m.addApprovedCampFringe(before),world=m.createWorld(layout),s=m.EAST_TERRAIN_SCALE;world.editorPreview=true;world.tick=120;world.nightAmount=0;
 const rect=r=>({x:(r.x-600)*s,y:(r.y-600)*s,width:r.width*s,height:r.height*s});
 const full={x:-1600,y:-1700,width:8200,height:8200},overall=rect(full),terrain=m.OUTDOOR_TILES.filter(t=>m.terrainIntersects(t,overall,100));world.outdoorReady=new Set(terrain.map(t=>t.key));
 const sources={...m.EDITOR_ENTRY_IMAGES,...m.editorTerrainDetail(layout.terrainImage),...m.requiredImages([...m.visiblePlacements(before,overall),...m.visiblePlacements(layout,overall)].map(p=>p.assetId),layout.terrainImage,{animationFrames:false}),...Object.fromEntries(terrain.map(t=>[t.key,t.image])),...m.RIVER_MOTION_IMAGES};
 for(const t of m.HOME_TERRAIN_TILES)sources[t.key]=t.image;
 for(const t of m.TERRAIN_CHUNKS)if(m.terrainIntersects(rect(t),overall))for(const l of t.levels)sources[l.key]=l.url;
 for(const t of m.RIVER_SECTIONS)if(m.terrainIntersects(rect(t),overall))sources[t.key]=m.RIVER_DETAIL_IMAGES[t.key];
 globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;delete globalThis.createImageBitmap;
 const missing=[];globalThis.fetch=async url=>{if(String(url).startsWith('blob:'))return oldFetch(url);let file='public'+url;if(String(url).startsWith('/api/asset-files/')){file=cache+'/'+String(url).split('/').pop();if(!fs.existsSync(file))execFileSync('curl',['-fsSL','--max-time','40','https://safety-last.matthew-smart212.chatgpt.site'+url,'-o',file]);}if(!fs.existsSync(file)){missing.push(url);throw Error('Missing '+url)}return new Response(fs.readFileSync(file));};
 const canvas={width:0,height:0,clientWidth:1400,clientHeight:1500,dataset:{}},view={x:0,y:0,zoom:1,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true};let surface;
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs,w)=>{ctx.riverTime=0;m.drawWorldEditor(ctx,atlas,imgs,w,view);},{},{sources,streamRoads:false,streamRivers:false});globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 const captures=[],only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
 async function shot(name,frame,width=1400){
  if(only&&!only.includes(name))return;
  canvas.clientWidth=width;canvas.clientHeight=Math.round(width*frame.height/frame.width);const r=rect(frame);
  Object.assign(view,{x:r.x+r.width/2,y:r.y+r.height/2,zoom:width/r.width/Math.max(width/1800,canvas.clientHeight/900)});
  renderer.draw(world);const im=surface.makeImageSnapshot();await sharp(Buffer.from(im.encodeToBytes())).webp({quality:94}).toFile(out+'/'+name+'.webp');im.delete();captures.push(name);console.log('Rendered '+name);
 }
 world.layout=before;await shot('before-overview',full,1700);
 world.layout=layout;await shot('after-overview',full,1700);
 for(const [name,frame] of [
  ['north-edge',{x:1200,y:-1150,width:2400,height:1600}],
  ['south-edge',{x:1000,y:4000,width:2800,height:1800}],
  ['east-edge',{x:3900,y:2300,width:2400,height:1700}],
 ]){
  const r=rect(frame);
  for(let i=0;i<60;i++){const x=r.x+r.width*.5+(i%6-3)*70,y=r.y+r.height*.7+Math.floor(i/6)*65;if(!m.worldBlocked(world,x,y,22)){Object.assign(world.player,{x,y,direction:'down-right'});break;}}
  await shot(name,frame);
 }
 renderer.dispose();fs.writeFileSync(out+'/render-checks.json',JSON.stringify({result:missing.length?'fail':'pass',renderer:'Production CanvasKit software renderer',captures,missing,sourceRevision:saved.revision,placements:layout.items.length,liveMapWrites:false,deviceFPSMeasured:false},null,2)+'\n');
}finally{globalThis.fetch=oldFetch;fs.rmSync(tmp,{recursive:true,force:true});}


