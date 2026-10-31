// Build the exact west and south contacts for the northern works outpaint.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const sharp=createRequire(import.meta.url)('sharp');
export const NORTH_WORKS_MASTER={x:6908,y:456,width:1666,height:1792};
export async function northWorksContacts(){
 const west=await sharp({create:{width:260,height:1792,channels:3,background:'#000'}}).composite([
  {input:await sharp('public/survival/maps/village-outskirts-v1/06-village-outskirts.webp').extract({left:1278,top:0,width:260,height:1536}).png().toBuffer(),left:0,top:0},
  {input:await sharp('public/survival/maps/village-approach-v2/04-village-trail.webp').extract({left:1278,top:132,width:260,height:256}).png().toBuffer(),left:0,top:1536},
 ]).removeAlpha().raw().toBuffer();
 const south=await sharp({create:{width:1666,height:256,channels:3,background:'#000'}}).composite([
  {input:await sharp(west,{raw:{width:260,height:1792,channels:3}}).extract({left:0,top:1536,width:128,height:256}).png().toBuffer(),left:0,top:0},
  {input:await sharp('public/survival/maps/eastern-works-v1/07-works-footpath.webp').extract({left:0,top:0,width:1538,height:256}).png().toBuffer(),left:128,top:0},
 ]).removeAlpha().raw().toBuffer();
 return{west,south};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href&&process.argv[2]){
 const {west,south}=await northWorksContacts();
 await sharp({create:{width:1666,height:1792,channels:3,background:'#fff'}}).composite([
  {input:await sharp(west,{raw:{width:260,height:1792,channels:3}}).png().toBuffer(),left:0,top:0},
  {input:await sharp(south,{raw:{width:1666,height:256,channels:3}}).png().toBuffer(),left:0,top:1536},
 ]).png().toFile(process.argv[2]);
 console.log(process.argv[2]);
}
