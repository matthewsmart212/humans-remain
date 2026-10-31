// Assemble the actual eastern edge; blank space is the next contiguous outpaint.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const sharp=createRequire(import.meta.url)('sharp');
export const WORKS_GROUNDS_MASTER={x:8314,y:2124,width:1666,height:2676};
export async function groundsWestContact(){
 return sharp({create:{width:260,height:2676,channels:3,background:'#000'}}).composite([
  {input:await sharp('public/survival/maps/eastern-works-v1/07-works-footpath.webp').extract({left:1278,top:132,width:260,height:1272}).png().toBuffer(),left:0,top:0},
  {input:await sharp('public/survival/maps/eastern-works-v1/08-works-service-track.webp').extract({left:1278,top:132,width:260,height:1404}).png().toBuffer(),left:0,top:1272},
 ]).removeAlpha().raw().toBuffer();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href&&process.argv[2]){
 const target=process.argv[2],contact=await groundsWestContact();
 await sharp({create:{width:1666,height:2676,channels:3,background:'#fff'}}).composite([{input:await sharp(contact,{raw:{width:260,height:2676,channels:3}}).png().toBuffer(),left:0,top:0}]).png().toFile(target);
 console.log(target);
}
