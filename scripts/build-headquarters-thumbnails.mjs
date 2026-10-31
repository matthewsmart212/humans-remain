import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {headquartersArtwork,localArtwork,imageProcessor} from './headquarters-artwork.mjs';

const sharp=imageProcessor(),manifest={},directory='/survival/headquarters-thumbnails-v1';
const previous=fs.existsSync('src/headquarters-thumbnails.json')?JSON.parse(fs.readFileSync('src/headquarters-thumbnails.json')):{};
fs.mkdirSync('public'+directory,{recursive:true});
let before=0,after=0;
for(const url of await headquartersArtwork()){
 const input=localArtwork(url),meta=await sharp(input).metadata();
 // These are UI previews; high-quality WebP keeps the publish bundle small
 // while the original lossless world artwork remains available separately.
 const data=await sharp(input).resize({width:512,height:512,fit:'inside',withoutEnlargement:true}).webp({quality:94,alphaQuality:100,effort:6}).toBuffer();
 const output=directory+'/'+createHash('sha256').update(data).digest('hex').slice(0,16)+'.webp';
 fs.writeFileSync('public'+output,data);manifest[url]=output;
 const small=await sharp(data).metadata();before+=meta.width*meta.height*4;after+=small.width*small.height*4;
}
fs.writeFileSync('src/headquarters-thumbnails.json',JSON.stringify(manifest,null,2)+'\n');
const current=new Set(Object.values(manifest));
for(const old of Object.values(previous))if(old.startsWith(directory+'/')&&!current.has(old))fs.rmSync('public'+old,{force:true});
console.log(`${Object.keys(manifest).length} headquarters images: ${(before/1048576).toFixed(1)} → ${(after/1048576).toFixed(1)} MiB decoded across the catalogue.`);
