// Assemble unchanged adjacent ground as the edit target for image generation.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const sharp=createRequire(import.meta.url)('sharp');
export const WORKS_MASTER={x:6908,y:1992,width:1666,height:2808};
export async function westernContact(){
 return sharp({create:{width:260,height:2808,channels:3,background:'#000'}}).composite([
  {input:await sharp('public/survival/maps/village-approach-v2/04-village-trail.webp').extract({left:1278,top:132,width:260,height:1404}).png().toBuffer(),left:0,top:0},
  {input:await sharp('public/survival/maps/east-approach-v1/02-woodland-junction.webp').extract({left:1278,top:132,width:260,height:1404}).png().toBuffer(),left:0,top:1404},
 ]).removeAlpha().raw().toBuffer();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href&&process.argv[2]){
 const target=process.argv[2],contact=await westernContact();
 await sharp({create:{width:1666,height:2808,channels:3,background:'#fff'}}).composite([{input:await sharp(contact,{raw:{width:260,height:2808,channels:3}}).png().toBuffer(),left:0,top:0}]).png().toFile(target);
 console.log(target);
}
