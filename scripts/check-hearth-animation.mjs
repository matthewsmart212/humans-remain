import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hearth-animation-'));
try{
 const modules=['world-assets','world-layout','imported-art','hearth-animation-art','camp-restoration','placed-world-renderer','authored-world','studio-play'];
 const out=path.join(temp,'check.cjs');
 await build({stdin:{contents:modules.map(m=>`export * from './src/${m}';`).join(''),resolveDir:process.cwd()},outfile:out,bundle:true,format:'cjs',platform:'node'});
 const game=createRequire(import.meta.url)(out),snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
 game.installImportedArt(snapshot.records);
 const layout=game.prepareAuthoredWorld(snapshot.layout),p=layout.items.find(p=>p.role==='hearth'),asset=game.ASSET_BY_ID.get(p.assetId);
 const world=game.createCampPlaySession(layout,undefined,'survival');
 world.layout={...world.layout,items:[p]};
 const sources=game.requiredImages([p.assetId]),images=Object.fromEntries(Object.entries(sources).map(([key,src])=>[key,{src}]));
 const layers=Object.values(game.HEARTH_ANIMATION_IMAGES);
 const startup=Object.values(game.requiredImages([p.assetId],undefined,{animationFrames:false}));
 assert(startup.includes(asset.image)&&startup.includes(asset.unlit)&&layers.every(url=>!startup.includes(url)));
 assert(asset.frames.slice(1).every(url=>!Object.values(sources).includes(url)),'Gameplay must not decode the full editor filmstrip');
 assert(!game.hasPaintedHearthAnimation({...asset,frames:[...asset.frames.slice(0,7),'/api/asset-files/owner-frame']}));
 assert(!game.hasPaintedHearthAnimation({...asset,fps:5}),'Owner timing uses the ordinary sprite player');

 const calls=[];
 const ctx=new Proxy({drawImage:(...args)=>calls.push(args)},{get:(target,key)=>key in target?target[key]:()=>{}});
 function draw(textures=images){calls.length=0;game.placedDrawables(ctx,textures,world).forEach(o=>o.draw());return calls.map(([im])=>im.src)}
 assert.deepEqual(draw(),[game.BROKEN_CAMP_ART.fire]);
 world.progression.restoredBuildings=['headquarters','fire'];
 world.camp.hearth.fuel=0;assert.deepEqual(draw(),[asset.unlit]);
 world.camp.hearth.fuel=2;
 const rear=new Set(),front=new Set();
 for(let tick=0;tick<2160;tick++){
  world.tick=tick;assert.deepEqual(draw(),layers);
  rear.add(calls[1].slice(1,3).join(','));front.add(calls[2].slice(1,3).join(','));
 }
 assert.equal(rear.size,48);assert.equal(front.size,36);
 for(const key of Object.keys(game.HEARTH_ANIMATION_IMAGES)){const partial={...images};delete partial[key];assert.deepEqual(draw(partial),[asset.image])}
 world.weather={...world.weather,reducedMotion:true};
 for(const tick of [0,31,900]){world.tick=tick;assert.deepEqual(draw(),[asset.image])}
 console.log('PASS: independent 48/36-frame wood fire, ruin, extinguished, reduced motion, streaming fallback and custom artwork.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
