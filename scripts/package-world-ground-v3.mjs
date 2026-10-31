// Encoding only; ImageGen painted the quiet-earth material from the campfire
// clearing reference. The approved warm/brown textures are reused unchanged.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const source='artwork-archive/world-ground-v3/clear-earth-original.png',dest='public/survival/world-ground-v3';
fs.mkdirSync(dest,{recursive:true});
const {width,height}=await sharp(source).metadata();
if(width!==1254||height!==1254)throw Error('Unexpected clear-earth dimensions');
await sharp(source).webp({lossless:true,effort:6}).toFile(`${dest}/clear-earth.webp`);
const materials=[['warm','world-ground-v2/warm.webp'],['brown','world-ground-v2/brown.webp'],['clear','world-ground-v3/clear-earth.webp']].map(([name,file])=>({name,image:`/survival/${file}`,width,height,bytes:fs.statSync(`public/survival/${file}`).size}));
fs.writeFileSync(`${dest}/manifest.json`,JSON.stringify({version:'world-ground-v3',tool:'Built-in image_gen.imagegen',source:'Centre of the original campfire clearing, extended across a full ground-only texture',materials,assembly:'Existing 256 squares and 200px overlaps; continuous world-coordinate mask blends irregular clearings through warm and brown terrain',green:'Olive material removed from active sources; green colour pass removed',camp:'Original artwork and saved layouts unchanged',prompts:'artwork-archive/world-ground-v3/prompts.json'},null,2)+'\n');
console.log(JSON.stringify({materials,totalBytes:materials.reduce((n,m)=>n+m.bytes,0)}));
