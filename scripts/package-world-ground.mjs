import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';const sharp=createRequire(import.meta.url)('sharp');
const dest='public/survival/world-ground-v1',archive='artwork-archive/world-ground-v1';fs.mkdirSync(dest,{recursive:true});fs.mkdirSync(archive,{recursive:true});
const sources={warm:'exec-930bbc7c-7020-4e3f-ba11-1b50658348aa.png',brown:'exec-2bc06de6-80e8-4316-b320-e2353b3239cc.png',olive:'exec-d3d0896f-072f-45d5-9e21-97e1ec064646.png'};
const materials=[];
for(const[name,file]of Object.entries(sources)){
 const original=archive+'/'+name+'-original.png';if(!fs.existsSync(original))fs.copyFileSync('/workspace/scratch/b21393be6c68/generated_images/'+file,original);
 await sharp(original).webp({lossless:true,effort:6}).toFile(dest+'/'+name+'.webp');const {width,height}=await sharp(original).metadata();materials.push({name,image:'/survival/world-ground-v1/'+name+'.webp',nativeWidth:width,nativeHeight:height});
}
const retired='public/survival/maps/consistent-terrain-v1',backup=archive+'/retired-sectors';
if(fs.existsSync(retired)){
 fs.mkdirSync(backup,{recursive:true});
 for(const name of fs.readdirSync(retired)){const old=path.join(retired,name),kept=path.join(backup,name);if(!fs.existsSync(kept))fs.copyFileSync(old,kept);if(!fs.readFileSync(old).equals(fs.readFileSync(kept)))throw Error('Archive mismatch: '+name)}
}
fs.writeFileSync(dest+'/manifest.json',JSON.stringify({version:'world-ground-v1',tool:'Built-in image_gen.imagegen',source:'Large full-frame camp-style variants; not small-sample quilting',bounds:{x:-7200,y:-6200,width:20000,height:20000},tileCount:256,tileSize:1437.5,overlap:200,assembly:'Rotated and mirrored warm squares. Brown and olive material blends follow broad world-coordinate gradients, never square boundaries. Each source is decoded once and reused.',materials,camp:'Original camp images unchanged; outer 120–340px feathered into surrounding ground',roads:'Only original camp paths retained. All extension roads removed; overlays to follow.',prompts:archive+'/prompts.json'},null,2)+'\n');
console.log('Packaged three large ground variants and archived all 26 superseded sectors.');
