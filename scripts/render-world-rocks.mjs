// Production CanvasKit renderer; disposable arrangements, no live layout writes.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rocks-render-')),out='docs/qa/world-rocks-v1',cache='.qa/world-scenery',oldFetch=globalThis.fetch;
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/survival-engine';export * from './src/placed-world-renderer';export * from './src/skia-web';export * from './src/editor-image-sources';export * from './src/east-approach';export * from './src/outdoor-terrain';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs')});
 const m=require(path.join(tmp,'model.cjs')),art=JSON.parse(fs.readFileSync('src/world-rock-art.json')),saved=JSON.parse(fs.readFileSync(cache+'/layout.json')),source=saved.draft,original=JSON.stringify(source);
 m.installImportedArt(JSON.parse(fs.readFileSync(cache+'/artwork.json')).records);const w=m.createWorld(source);w.editorPreview=true;w.tick=120;
 const centre={x:(2600-600)*m.EAST_TERRAIN_SCALE,y:(11000-600)*m.EAST_TERRAIN_SCALE},visible={x:centre.x-900,y:centre.y-550,width:1800,height:1100};
 const terrain=m.OUTDOOR_TILES.filter(t=>m.terrainIntersects(t,visible,400));w.outdoorReady=new Set(terrain.map(t=>t.key));
 const refs=['art_foliage_world_blue_sword_fern','art_foliage_world_meadow_fescue','art_scenery_mossy_boulder_cluster'];
 const sources={...m.EDITOR_ENTRY_IMAGES,...m.editorTerrainDetail(),...m.requiredImages([...art.map(a=>a.id),...refs],source.terrainImage),...Object.fromEntries(terrain.map(t=>[t.key,t.image]))};
 globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;delete globalThis.createImageBitmap;
 const missing=[];globalThis.fetch=async url=>{if(String(url).startsWith('blob:'))return oldFetch(url);let file='public'+url;if(String(url).startsWith('/api/asset-files/')){file=cache+'/'+String(url).split('/').pop();if(!fs.existsSync(file))execFileSync('curl',['-fsSL','--max-time','30','https://safety-last.matthew-smart212.chatgpt.site'+url,'-o',file]);}if(!fs.existsSync(file)){missing.push(url);throw Error('Missing: '+url)}return new Response(fs.readFileSync(file))};
 const canvas={width:0,height:0,clientWidth:1600,clientHeight:1000,dataset:{}},view={x:centre.x,y:centre.y,zoom:1,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true};let surface;
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs,world)=>m.drawWorldEditor(ctx,atlas,imgs,world,view),{},{sources,streamRoads:false,streamRivers:false});globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 const captures=[];
 for(const zone of ['Woodland rocks','River rocks','Dryland rocks','Exposed rocks']){
  const rocks=art.filter(a=>a.zone===zone),items=[];if(rocks.length!==5)throw Error('Expected five designs: '+zone);
  const offsets=[[-440,-140],[0,-210],[430,-130],[-370,220],[390,250]];
  rocks.forEach((a,i)=>items.push({...m.newPlacement(a.id,centre.x+offsets[i][0],centre.y+offsets[i][1]),id:'review-rock-'+i,allowTransparency:false}));
  for(const [i,id]of refs.slice(0,2).entries())items.push({...m.newPlacement(id,centre.x-580+i*1160,centre.y+320),id:'style-reference-'+i,scale:.8});
  w.layout={...source,items};Object.assign(w.player,{x:centre.x,y:centre.y+100,direction:'down-right'});w.nightAmount=0;renderer.draw(w);
  const im=surface.makeImageSnapshot(),name=zone.toLowerCase().replaceAll(' ','-');await sharp(Buffer.from(im.encodeToBytes())).webp({quality:94}).toFile(out+'/'+name+'.webp');im.delete();captures.push(name);console.log('Rendered '+name);
 }
 renderer.dispose();if(JSON.stringify(source)!==original)throw Error('Saved layout changed');
 fs.writeFileSync(out+'/render-checks.json',JSON.stringify({result:'pass',renderer:'Production CanvasKit software renderer',captures,newRockDesigns:20,savedRevision:saved.revision,missing,liveMapWrites:false,deviceFPSMeasured:false},null,2)+'\n');
}finally{globalThis.fetch=oldFetch;fs.rmSync(tmp,{recursive:true,force:true})}
