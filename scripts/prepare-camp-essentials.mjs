// Mechanical registration of the generated masters, without repainting artwork.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp');
const source='artwork-archive/camp-essentials-v1',out='public/survival/camp-essentials-v1';
fs.mkdirSync(out,{recursive:true});
const well=source+'/well.png',meta=await sharp(well).metadata(),scale=.72;
await sharp({create:{width:1091,height:1012,channels:4,background:'#00000000'}}).composite([{input:await sharp(well).resize(Math.round(meta.width*scale),Math.round(meta.height*scale)).png().toBuffer(),left:Math.round(471-meta.width*.5*scale),top:Math.round(995-meta.height*.94*scale)}]).webp({lossless:true,effort:6}).toFile(out+'/rope-well.webp');
await sharp(source+'/treatment-centre.png').webp({lossless:true,effort:6}).toFile(out+'/treatment-centre.webp');
console.log('Prepared transparent well and treatment centre; existing well canvas and ground anchor retained.');
