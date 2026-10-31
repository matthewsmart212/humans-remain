import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const dir='public/survival/road-pilot-v1';fs.mkdirSync(dir,{recursive:true});
const input='artwork-archive/road-pilot-v1/southeast.png';
const meta=await sharp(input).metadata();
if(meta.width!==1536||meta.height!==1024)throw Error('Pilot must retain native reference dimensions');
await sharp(input).webp({quality:97,alphaQuality:100}).toFile(dir+'/southeast.webp');
console.log(JSON.stringify({width:meta.width,height:meta.height,bytes:fs.statSync(dir+'/southeast.webp').size}));
