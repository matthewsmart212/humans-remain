import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'outskirts-render-')),out='docs/qa/camp-outskirts-v1',cache='.qa/world-scenery',oldFetch=globalThis.fetch;
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/survival-engine';export * from './src/placed-world-renderer';export * from './src/skia-web';export * from './src/editor-image-sources';export * from './src/east-approach';export * from './src/outdoor-terrain';export * from './src/terrain-art';export * from './src/terrain-stream-art';export * from './src/tree-chopping';export * from './src/camp-outskirts';export * from './src/layout-views';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs')});
 const m=require(path.join(tmp,'model.cjs')),saved=JSON.parse(fs.readFileSync('.qa/populate-layout-before.json')),before=saved.draft;
 m.installImportedArt(JSON.parse(fs.readFileSync('.qa/populate-artwork.json')).records);
 const layout=m.addApprovedCampOutskirts(before),world=m.createWorld(layout);world.editorPreview=true;world.tick=120;world.nightAmount=0;
 const only=process.argv.find(a=>a.startsWith('--only='))?.split('=')[1],target=layout.items.find(p=>p.id.startsWith(m.CAMP_OUTSKIRTS_PREFIX+'west-near-tree'));
 const overall=only==='harvest'?{x:target.x-800,y:target.y-800,width:1600,height:1600}:{x:-2500,y:-1100,width:7800,height:6800},terrain=m.OUTDOOR_TILES.filter(t=>m.terrainIntersects(t,overall,100));world.outdoorReady=new Set(terrain.map(t=>t.key));
 const sources={...m.EDITOR_ENTRY_IMAGES,...m.editorTerrainDetail(layout.terrainImage),...m.requiredImages((only?m.visiblePlacements(layout,overall):layout.items).map(p=>p.assetId),layout.terrainImage,{animationFrames:false}),...Object.fromEntries(terrain.map(t=>[t.key,t.image]))};
 // Full camp textures and local road chunks verify the sharp runtime view.
 for(const t of m.HOME_TERRAIN_TILES)sources[t.key]=t.image;
 for(const t of m.TERRAIN_CHUNKS){const r={x:(t.x-600)*m.EAST_TERRAIN_SCALE,y:(t.y-600)*m.EAST_TERRAIN_SCALE,width:t.width*m.EAST_TERRAIN_SCALE,height:t.height*m.EAST_TERRAIN_SCALE};if(m.terrainIntersects(r,overall))for(const l of t.levels)sources[l.key]=l.url;}
 globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;delete globalThis.createImageBitmap;
 const missing=[];globalThis.fetch=async url=>{if(String(url).startsWith('blob:'))return oldFetch(url);let file='public'+url;if(String(url).startsWith('/api/asset-files/')){file=cache+'/'+String(url).split('/').pop();if(!fs.existsSync(file))execFileSync('curl',['-fsSL','--max-time','40','https://safety-last.matthew-smart212.chatgpt.site'+url,'-o',file]);}if(!fs.existsSync(file)){missing.push(url);throw Error('Missing '+url)}return new Response(fs.readFileSync(file));};
 const canvas={width:0,height:0,clientWidth:1800,clientHeight:1500,dataset:{}},view={x:1450,y:2350,zoom:.144,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true};let surface;
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs,w)=>m.drawWorldEditor(ctx,atlas,imgs,w,view),{},{sources,streamRoads:false,streamRivers:false});globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 const captures=[];const shot=async name=>{renderer.draw(world);const im=surface.makeImageSnapshot();await sharp(Buffer.from(im.encodeToBytes())).webp({quality:94}).toFile(out+'/'+name+'.webp');im.delete();captures.push(name);console.log('Rendered '+name);};
 if(!only||only==='overview'){world.layout=before;await shot('before-overview');world.layout=layout;await shot('after-overview');}
 const groups=JSON.parse(fs.readFileSync('src/camp-outskirts-planting.json')).groups;
 for(const id of ['west-near','north-near','east-outer','south-outer'].filter(id=>!only||only===id)){
  const g=groups.find(g=>g.id===id),[sx,sy]=g.sourceCentre,c={x:(sx-600)*m.EAST_TERRAIN_SCALE,y:(sy-600)*m.EAST_TERRAIN_SCALE};
  canvas.clientWidth=1440;canvas.clientHeight=900;Object.assign(view,{...c,zoom:.9});
  let player={x:c.x+100,y:c.y+160};for(let k=0;k<30&&m.worldBlocked(world,player.x,player.y,22);k++)player={x:c.x+(k%5-2)*100,y:c.y+160+Math.floor(k/5)*65};Object.assign(world.player,{...player,direction:'down-right'});
  await shot(id);
 }
 if(!only||only==='harvest'){
  const tree=layout.items.find(p=>p.id.startsWith(m.CAMP_OUTSKIRTS_PREFIX+'west-near-tree')),root=m.treeRoot(tree);
  canvas.clientWidth=1200;canvas.clientHeight=900;Object.assign(view,{x:root.x,y:root.y-90,zoom:1.35});Object.assign(world.player,{x:root.x,y:root.y+103,direction:'up'});await shot('tree-standing');
  m.chopTree(world,-Math.PI/2,136,1,999,(a,b)=>m.lineClear(a,b,world));world.tick+=60;console.log(JSON.stringify({harvestCapture:{player:world.player,logs:world.loot.filter(l=>l.appearance==='logs'),logImage:sources[m.assetImageKey(m.TREE_LOG_IMAGE)]}}));await shot('tree-felled-with-logs');
 }
 renderer.dispose();if(only&&fs.existsSync(out+'/render-checks.json'))captures.unshift(...JSON.parse(fs.readFileSync(out+'/render-checks.json')).captures.filter(n=>!captures.includes(n)));fs.writeFileSync(out+'/render-checks.json',JSON.stringify({result:'pass',renderer:'Production CanvasKit software renderer',captures,missing,sourceRevision:saved.revision,placements:layout.items.length,liveMapWrites:false,deviceFPSMeasured:false},null,2)+'\n');
}finally{globalThis.fetch=oldFetch;fs.rmSync(tmp,{recursive:true,force:true});}
