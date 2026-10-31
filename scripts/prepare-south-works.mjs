// Preserve the actual southern contact, including the existing east/west blend.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const sharp=createRequire(import.meta.url)('sharp');
export const SOUTH_WORKS_MASTER={x:7036,y:4540,width:2944,height:1666};
export async function southWorksNorthContact(){
 const east=await sharp('public/survival/maps/works-grounds-v1/12-works-dirt-lane.webp').extract({left:0,top:1276,width:1538,height:260}).ensureAlpha().raw().toBuffer();
 for(let y=0;y<260;y++)for(let x=0;x<36;x++)east[(y*1538+x)*4+3]=Math.round(x/36*255);
 return sharp({create:{width:2944,height:260,channels:3,background:'#000'}}).composite([
  {input:await sharp('public/survival/maps/eastern-works-v1/08-works-service-track.webp').extract({left:0,top:1276,width:1538,height:260}).png().toBuffer(),left:0,top:0},
  {input:await sharp(east,{raw:{width:1538,height:260,channels:4}}).png().toBuffer(),left:1406,top:0},
 ]).removeAlpha().raw().toBuffer();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href&&process.argv[2]){
 const north=await southWorksNorthContact();
 await sharp({create:{width:2944,height:1666,channels:3,background:'#fff'}}).composite([{input:await sharp(north,{raw:{width:2944,height:260,channels:3}}).png().toBuffer(),left:0,top:0}]).png().toFile(process.argv[2]);
 console.log(process.argv[2]);
}
