// A north-and-east constrained outpaint closes the gap back towards camp.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const sharp=createRequire(import.meta.url)('sharp');
export const CAMP_RETURN_MASTER={x:4096,y:4540,width:3204,height:1666};
export async function campReturnContacts(){
 const north=await sharp({create:{width:3204,height:260,channels:3,background:'#000'}}).composite([
  {input:await sharp('public/survival/maps/east-approach-v1/01-camp-approach.webp').extract({left:0,top:1276,width:1534,height:260}).png().toBuffer(),left:0,top:0},
  {input:await sharp('public/survival/maps/east-approach-v1/02-woodland-junction.webp').extract({left:0,top:1276,width:1538,height:260}).png().toBuffer(),left:1534,top:0},
 ]).removeAlpha().raw().toBuffer();
 const works=await sharp('public/survival/maps/eastern-works-v1/08-works-service-track.webp').extract({left:0,top:1276,width:264,height:260}).removeAlpha().raw().toBuffer();
 for(let y=0;y<260;y++)for(let x=0;x<264;x++)for(let c=0;c<3;c++){
  const a=Math.min(1,x/36),i=(y*3204+2940+x)*3+c;
  north[i]=Math.round(north[i]*(1-a)+works[(y*264+x)*3+c]*a);
 }
 const east=await sharp('public/survival/maps/south-works-v1/16-south-works-clearing.webp').extract({left:0,top:0,width:264,height:1538}).removeAlpha().raw().toBuffer();
 return{north,east};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href&&process.argv[2]){
 const {north,east}=await campReturnContacts();
 await sharp({create:{width:3204,height:1666,channels:3,background:'#fff'}}).composite([
  {input:await sharp(north,{raw:{width:3204,height:260,channels:3}}).png().toBuffer(),left:0,top:0},
  {input:await sharp(east,{raw:{width:264,height:1538,channels:3}}).png().toBuffer(),left:2940,top:128},
 ]).png().toFile(process.argv[2]);
 console.log(process.argv[2]);
}
