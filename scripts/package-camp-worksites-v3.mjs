import fs from 'node:fs';
import {imageProcessor} from './headquarters-artwork.mjs';
const sharp=imageProcessor(),exports=[];
for(const name of ['furnace','furnace-ruined','warehouse-full','warehouse-empty','warehouse-ruined']){
 const width=name.startsWith('furnace')?960:1152,height=width*2/3;
 const output=`public/survival/camp-worksites-v3/${name}.webp`;
 // Preserve generated alpha and registration; bound iPhone texture memory.
 await sharp(`art-source/camp-worksites-v3/${name}.png`).resize(width,height).webp({quality:94,alphaQuality:100,effort:6}).toFile(output);
 exports.push({name,width,height,bytes:fs.statSync(output).size});
}
fs.writeFileSync('src/camp-worksites-exports.json',JSON.stringify(exports,null,2)+'\n');
console.log(exports);
