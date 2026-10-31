// Actual production renderer with disposable specimens, never a live map write.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp'),out='docs/qa/world-scenery-v1',cache='.qa/world-scenery';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'scenery-render-'));fs.mkdirSync(out,{recursive:true});
const oldFetch=globalThis.fetch;
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/survival-engine';export * from './src/placed-world-renderer';export * from './src/skia-web';export * from './src/editor-image-sources';export * from './src/east-approach';export * from './src/outdoor-terrain';export * from './src/river-art';export * from './src/tree-chopping';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs')});
 const m=require(path.join(tmp,'model.cjs')),art=JSON.parse(fs.readFileSync('src/world-scenery-art.json'));
 const saved=JSON.parse(fs.readFileSync(cache+'/layout.json')),source=saved.draft,original=JSON.stringify(source);
 m.installImportedArt(JSON.parse(fs.readFileSync(cache+'/artwork.json')).records);
 const world=m.createWorld(source);world.editorPreview=true;world.tick=100;world.outdoorReady=new Set(m.OUTDOOR_TILES.map(t=>t.key));
 const specimens=[...art.map(x=>x.id),'art_tree_rowan','art_tree_willow'];
 const sources={...m.EDITOR_ENTRY_IMAGES,...m.editorTerrainDetail(),...m.requiredImages([...source.items.map(x=>x.assetId),...specimens],source.terrainImage),...Object.fromEntries(m.OUTDOOR_SOURCE_TILES.map(t=>[t.key,t.image])),...Object.fromEntries(Object.entries(m.RIVER_DETAIL_IMAGES).filter(([key])=>m.RIVER_SECTIONS.some(p=>p.key===key&&p.batch===1)))};
 globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;delete globalThis.createImageBitmap;
 const missing=[];globalThis.fetch=async url=>{
  if(String(url).startsWith('blob:'))return oldFetch(url);let file='public'+url;
  if(String(url).startsWith('/api/asset-files/')){file=cache+'/'+String(url).split('/').pop();if(!fs.existsSync(file))execFileSync('curl',['-fsSL','--max-time','40','https://safety-last.matthew-smart212.chatgpt.site'+url,'-o',file]);}
  if(!fs.existsSync(file)){missing.push(url);throw Error('Missing image: '+url)}return new Response(fs.readFileSync(file));
 };
 const canvas={width:0,height:0,clientWidth:1600,clientHeight:1000,dataset:{}},view={x:0,y:0,zoom:1.0,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true};let surface;
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs,w)=>m.drawWorldEditor(ctx,atlas,imgs,w,view),{},{sources,streamRoads:false,streamRivers:false});
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 const captures=[];const shot=async name=>{renderer.draw(world);const im=surface.makeImageSnapshot();await sharp(Buffer.from(im.encodeToBytes())).webp({quality:95}).toFile(out+'/'+name+'.webp');im.delete();captures.push(name);};
 const coords=(x,y)=>({x:(x-600)*m.EAST_TERRAIN_SCALE,y:(y-600)*m.EAST_TERRAIN_SCALE});
 for(const [zone,sx,sy,tree,rock]of [
  ['Woodland',-5350,-2500,'art_tree_rowan','art_scenery_mossy_fallen_oak'],
  ['Meadow',2600,11000,'art_tree_rowan','art_scenery_mossy_boulder_cluster'],
  ['Dryland',9000,8000,null,'art_scenery_ochre_crag'],
  ['Wetland',-3500,-2900,'art_tree_willow','art_scenery_hollow_birch_log']].filter(([zone])=>!process.argv.some(a=>a.startsWith('--zone='))||process.argv.includes('--zone='+zone))){
  const c=coords(sx,sy),items=[],plants=art.filter(a=>a.zone===zone&&a.kind==='foliage');
  const add=(id,x,y,scale=1,flip=false)=>items.push({...m.newPlacement(id,c.x+x,c.y+y),id:'preview-'+items.length,scale,flipX:flip,allowTransparency:false});
  // Natural clumps around an open central walking space, not a permanent scatter.
  const offsets=zone==='Wetland'?[[120,-210],[255,-230],[420,-240],[550,-160],[110,-90],[265,-50],[500,90],[440,200],[600,260],[570,360]]:[[-560,-150],[-455,-190],[-360,-115],[-490,35],[-365,130],[-510,255],[265,-150],[420,-180],[530,-70],[335,25],[470,145],[300,245]];
  offsets.forEach(([x,y],i)=>{add(plants[i%plants.length].id,x,y,.78+(i%4)*.11,i%3===1);if(i%3===0)add(plants[(i+1)%plants.length].id,x+70,y+55,.6,true)});
  if(tree)add(tree,zone==='Wetland'?420:-300,zone==='Wetland'?130:-100,.86);add(rock,zone==='Wetland'?540:430,zone==='Wetland'?320:300,.86);
  if(zone==='Woodland')add('art_scenery_twisted_root_log',-375,295,.85,true);
  if(zone==='Dryland')add('art_scenery_slate_ridge',-345,305,.8);
  world.layout={...source,items};Object.assign(world.player,{x:c.x+(zone==='Wetland'?-40:0),y:c.y+(zone==='Wetland'?-170:145),direction:'down-right'});Object.assign(view,{x:c.x,y:c.y,zoom:1});world.nightAmount=0;await shot(zone.toLowerCase());
  if(zone==='Wetland'){world.nightAmount=1;await shot('wetland-night');world.nightAmount=0;}
 }
 // Optional close inspection; the review sheet covers every asset by default.
 const c=coords(-5350,-2500);
 for(const a of process.argv.includes('--specimens')?art:[]){world.layout={...source,items:[{...m.newPlacement(a.id,c.x,c.y),id:'specimen',allowTransparency:false}]};Object.assign(world.player,{x:c.x+170,y:c.y+80,direction:'down-right'});Object.assign(view,{x:c.x+30,y:c.y-70,zoom:1.4});await shot(a.id);}
 renderer.dispose();globalThis.fetch=oldFetch;if(JSON.stringify(source)!==original)throw Error('Saved map changed');
 fs.writeFileSync(out+'/render-checks.json',JSON.stringify({result:'pass',renderer:'Production CanvasKit software renderer',savedCampRevision:saved.revision,captures,missing,liveWrites:false,limitations:'No browser GPU or physical-device benchmark. Scenes are temporary art review arrangements.'},null,2)+'\n');
 console.log(JSON.stringify({captures:captures.length,missing,liveWrites:false}));
}finally{globalThis.fetch=oldFetch;fs.rmSync(tmp,{recursive:true,force:true});}
