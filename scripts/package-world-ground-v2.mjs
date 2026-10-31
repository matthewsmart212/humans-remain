// Mechanical lossless packaging only. The painted materials are ImageGen edits
// of a native-scale crop of the existing camp; no synthesis, sharpening or resize.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const archive='artwork-archive/world-ground-v2',dest='public/survival/world-ground-v2';
fs.mkdirSync(dest,{recursive:true});
const materials=[];
for(const name of ['warm','brown','olive']){
 const source=`${archive}/${name}-original.png`,output=`${dest}/${name}.webp`;
 const {width,height}=await sharp(source).metadata();
 if(width!==1254||height!==1254)throw Error(`Unexpected ${name} dimensions`);
 await sharp(source).webp({lossless:true,effort:6}).toFile(output);
 materials.push({name,image:`/survival/world-ground-v2/${name}.webp`,nativeWidth:width,nativeHeight:height,bytes:fs.statSync(output).size});
}
fs.writeFileSync(`${dest}/manifest.json`,JSON.stringify({version:'world-ground-v2',tool:'Built-in image_gen.imagegen',source:'Original camp native-scale ground crop at (1500,150), 1438x1438 source pixels',detail:'Camp-sized painted earth fragments; calmer bare soil; roads and vegetation removed from the extension material',bounds:{x:-7200,y:-6200,width:20000,height:20000},tileCount:256,tileSize:1437.5,overlap:200,assembly:'Existing rotations, mirrors, edge feathers and broad world-coordinate regional colour fields retained. Three shared 1254px textures; no per-sector downloads.',materials,camp:'Original camp files and coordinates unchanged',prompts:`${archive}/prompts.json`},null,2)+'\n');
console.log(JSON.stringify({materials,totalBytes:materials.reduce((n,m)=>n+m.bytes,0)}));
