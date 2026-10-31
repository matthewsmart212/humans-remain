// Disposable in-context art review. Never writes to the live camp or saved draft.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
const label=process.argv[2]||'before',out=`docs/qa/trees-style-v2/${label}`,cache='.qa/tree-style';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tree-style-'));fs.mkdirSync(out,{recursive:true});
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/survival-engine';export * from './src/tree-chopping';export * from './src/placed-world-renderer';export * from './src/skia-web';export * from './src/editor-image-sources';export * from './src/terrain-art';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs')});
 const m=require(path.join(tmp,'model.cjs'));
 const source=JSON.parse(fs.readFileSync(cache+'/layout.json')).draft,artwork=JSON.parse(fs.readFileSync(cache+'/artwork.json'));
 m.installImportedArt(artwork.records);const before=JSON.stringify(source),arts=[...m.TREE_ART.values()];
 const specimens=arts.map((a,i)=>({...m.newPlacement(a.id,[1030,1430,2450,2870][i],1320),id:'style-'+i,allowTransparency:false}));
 const layout={...source,items:[...source.items,...specimens]},world=m.createWorld(layout);world.editorPreview=true;world.player.x=1260;world.player.y=1380;world.player.direction='down-right';world.tick=120;
 const sources={...m.EDITOR_ENTRY_IMAGES,...m.requiredImages(layout.items.map(p=>p.assetId),layout.terrainImage),...Object.fromEntries(m.HOME_TERRAIN_TILES.map(t=>[t.key,t.image]))};
 const originalFetch=globalThis.fetch;globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;delete globalThis.createImageBitmap;
 const missing=[];
 globalThis.fetch=async url=>{
  if(String(url).startsWith('blob:'))return originalFetch(url);
  let file='public'+url;
  if(String(url).startsWith('/api/asset-files/')){file=cache+'/'+String(url).split('/').pop();if(!fs.existsSync(file))execFileSync('curl',['-fsSL','--max-time','40','https://safety-last.matthew-smart212.chatgpt.site'+url,'-o',file])}
  if(!fs.existsSync(file)){missing.push(url);throw Error('Missing artwork '+url)}
  return new Response(fs.readFileSync(file));
 };
 const canvas={width:0,height:0,clientWidth:1600,clientHeight:1000,dataset:{}},view={x:1950,y:900,zoom:.68,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true};let surface;
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs,w)=>{ctx.requestCampArtwork=undefined;m.drawWorldEditor(ctx,atlas,imgs,w,view)},{},{sources,streamRoads:false,streamRivers:false});
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 const capture=async(name)=>{renderer.draw(world);const shot=surface.makeImageSnapshot();await sharp(Buffer.from(shot.encodeToBytes())).webp({quality:95}).toFile(out+'/'+name+'.webp');shot.delete()};
 for(const stage of [0,1,2]){world.treeChops={};for(const p of specimens)if(stage)world.treeChops[p.id]={hp:stage===1?40:0,hitAt:0,direction:1,...(stage===2?{felledAt:0}:{})};await capture('camp-stage-'+stage)}
 world.treeChops={};
 for(let i=0;i<4;i++){const p=specimens[i];Object.assign(view,{x:p.x,y:p.y-170,zoom:1.1});Object.assign(world.player,{x:p.x+105,y:p.y+45});await capture(arts[i].id);world.nightAmount=1;await capture(arts[i].id+'-night');world.nightAmount=0;}
 // Repeat next to the owner's existing foliage, at its actual placed scale.
 const patch=source.items.filter(p=>m.ASSET_BY_ID.get(p.assetId)?.foliage).sort((a,b)=>Math.hypot(a.x-650,a.y-2600)-Math.hypot(b.x-650,b.y-2600))[0];
 for(let i=0;i<4;i++){const p={...specimens[i],x:patch.x+45,y:patch.y+45};world.layout={...source,items:[...source.items,p]};Object.assign(view,{x:p.x,y:p.y-160,zoom:1.1});Object.assign(world.player,{x:p.x+115,y:p.y+75});await capture(arts[i].id+'-foliage');}
 renderer.dispose();globalThis.fetch=originalFetch;
 if(JSON.stringify(source)!==before)throw Error('Source draft changed');
 fs.writeFileSync(out+'/report.json',JSON.stringify({savedCampRevision:JSON.parse(fs.readFileSync(cache+'/layout.json')).revision,originalPlacements:source.items.length,addedOnlyToDisposableFixture:specimens,stages:3,missing,renderer:'Production CanvasKit software; not a browser or physical-device test',liveWrites:false},null,2)+'\n');console.log(JSON.stringify({out,missing,placements:source.items.length}));
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
