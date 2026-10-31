// Offline visual QA using the production placement and terrain renderers.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require('@napi-rs/canvas');
const [artworkPath,layoutPath,outputDir]=process.argv.slice(2);if(!outputDir)throw Error('Usage: render-wall-ground.mjs artwork.json layout.json output-dir');
fs.mkdirSync(outputDir,{recursive:true});const temp=fs.mkdtempSync(path.join(os.tmpdir(),'wall-ground-render-'));
try{
 await build({stdin:{contents:`export * from './src/world-assets';export * from './src/world-layout';export * from './src/world-tiers';export * from './src/imported-art';export * from './src/terrain-renderer';export * from './src/placed-world-renderer';export * from './src/survival-engine';export {MAP_WIDTH,MAP_HEIGHT} from './src/factory-map';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:path.join(temp,'scene.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'scene.mjs'))),records=JSON.parse(fs.readFileSync(artworkPath)).records,layout=JSON.parse(fs.readFileSync(layoutPath)).draft;
 m.installImportedArt(records);const manifest=JSON.parse(fs.readFileSync('src/wall-artwork-replacements.json')),registration=JSON.parse(fs.readFileSync('artwork-archive/wall-tier-sources/registration.json'));
 const images={homeGround:await loadImage('artwork-archive/painted-terrain-hd-original/full-4800.webp')};
 const allIds=[...new Set([...layout.items.map(p=>p.assetId),...manifest.flatMap(v=>[1,2,3].map(t=>m.wallAssetId(v.entryId,t)))])];
 for(const [key,url]of Object.entries(m.requiredImages(allIds))){let local='public'+url;
  if(url.startsWith('/api/asset-files/')){local=path.join(outputDir,path.basename(url)+'.image');if(!fs.existsSync(local)){const res=await fetch('https://safety-last.matthew-smart212.chatgpt.site'+url);if(!res.ok)throw Error(`${res.status} ${url}`);fs.writeFileSync(local,Buffer.from(await res.arrayBuffer()))}}
  images[key]=await loadImage(local);
 }
 const selected=layout.items.find(p=>m.wallIdentity(p.assetId));
 function render(scene,width,height,view,ground){const canvas=createCanvas(width,height),ctx=canvas.getContext('2d'),w=m.createWorld(scene);w.player.x=-9999;w.player.y=-9999;w.tick=0;
  ctx.fillStyle='#071316';ctx.fillRect(0,0,width,height);const scale=Math.min(width/view.width,height/view.height);ctx.translate((width-view.width*scale)/2,(height-view.height*scale)/2);ctx.scale(scale,scale);ctx.translate(-view.x,-view.y);
  m.drawHomeTerrain(ctx,images,scene.terrainImage,scene.terrainBorder);if(ground)m.drawPlacedGround(ctx,images,scene);m.placedDrawables(ctx,images,w,true).sort(m.compareWorldDrawables).forEach(d=>d.draw());return canvas;
 }
 for(const tier of [1,2,3]){
  const scene=m.changePlacementTier(layout,selected.id,tier),extent=m.MAP_WIDTH*4800/3600,margin=m.MAP_WIDTH*600/3600,view={x:-margin,y:-margin,width:extent,height:extent};
  for(const ground of [false,true])fs.writeFileSync(path.join(outputDir,`map-t${tier}-${ground?'after':'before'}.png`),render(scene,1500,1500,view,ground).toBuffer('image/png'));
  const sheet=createCanvas(1200,1600),c=sheet.getContext('2d');c.fillStyle='#142d2b';c.fillRect(0,0,1200,1600);
  for(let i=0;i<8;i++){
   let p=scene.items.find(p=>m.wallIdentity(p.assetId)?.piece===i+1);if(!p)p={...m.newPlacement(m.wallAssetId(manifest[i].entryId,tier),2100,1100),scale:2};
   const box=registration.find(r=>r.piece===i+1).registeredBox,a=m.ASSET_BY_ID.get(p.assetId),b=m.placementBounds(p),corners=[[box.left,box.top],[box.left+box.width,box.top],[box.left,box.top+box.height],[box.left+box.width,box.top+box.height]].map(([x,y])=>m.placementPoint(p,b.x+x/manifest[i].width*b.width,b.y+y/manifest[i].height*b.height)),xs=corners.map(v=>v[0]),ys=corners.map(v=>v[1]),view={x:Math.min(...xs)-100,y:Math.min(...ys)-70,width:Math.max(...xs)-Math.min(...xs)+200,height:Math.max(...ys)-Math.min(...ys)+140};
   const single={...scene,items:[p]},x=i%2*600,y=Math.floor(i/2)*400;c.drawImage(render(single,588,358,view,true),x+6,y+36);c.fillStyle='#efe7c7';c.font='20px sans-serif';c.fillText(`Wall ${i+1} · Tier ${tier}`,x+16,y+25);
   if(i===6){const comparison=createCanvas(1600,900),cc=comparison.getContext('2d');cc.drawImage(render(single,800,900,view,false),0,0);cc.drawImage(render(single,800,900,view,true),800,0);fs.writeFileSync(path.join(outputDir,`comparison-t${tier}.png`),comparison.toBuffer('image/png'))}
  }
  fs.writeFileSync(path.join(outputDir,`all-pieces-t${tier}.png`),sheet.toBuffer('image/png'));
 }
 console.log(`Rendered all 24 variants and the saved layout before/after in ${outputDir}`);
}finally{fs.rmSync(temp,{recursive:true,force:true})}
