// Source/reference preparation only. All replacement ground art is ImageGen.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp');
const archive='artwork-archive/consistent-terrain-v1';
fs.mkdirSync(archive,{recursive:true});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'terrain-registry-'));
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/outdoor-terrain';export * from './src/world-master-plan';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs'));
 fs.writeFileSync(archive+'/original-registry.json',JSON.stringify({bounds:m.OUTDOOR_SOURCE_BOUNDS,tiles:m.OUTDOOR_SOURCE_TILES,routes:m.WORLD_PLAN_ROUTES.filter(r=>r.status==='built'&&r.kind!=='access').map(r=>({...r,points:m.routePoints(r)}))},null,2)+'\n');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
for(const [name,left,top]of [['warm',2110,1970],['olive',2450,1900],['brown',2200,2400]])await sharp('public/survival/camp-ground-v3/full-4800.webp').extract({left,top,width:650,height:600}).png().toFile(archive+'/'+name+'-camp-reference.png');
fs.copyFileSync('/workspace/scratch/b21393be6c68/generated_images/exec-a58a0ca0-6f7d-4438-bb13-4d53276cfc72.png',archive+'/warm-generated-original.png');
const tiles=JSON.parse(fs.readFileSync(archive+'/original-registry.json')).tiles.sort((a,b)=>path.basename(a.image).localeCompare(path.basename(b.image)));
const thumbs=[];
for(let i=0;i<tiles.length;i++)thumbs.push({input:await sharp('public'+tiles[i].image).resize(240,240,{fit:'contain',background:'#071316'}).png().toBuffer(),left:(i%6)*240,top:Math.floor(i/6)*240});
await sharp({create:{width:1440,height:1200,channels:3,background:'#071316'}}).composite(thumbs).png().toFile(archive+'/before-all-segments.png');
console.log('Recorded all '+tiles.length+' original terrain rectangles and prepared original-camp references.');
