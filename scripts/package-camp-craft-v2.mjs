import fs from 'node:fs';
import {imageProcessor} from './headquarters-artwork.mjs';
const sharp=imageProcessor(),exports=[];
const root='public/survival/camp-craft-v2';
fs.mkdirSync(root,{recursive:true});
for(const name of ['furnace-idle','furnace-broken','warehouse-full','warehouse-empty','warehouse-half','warehouse-broken']){
 const width=1254,height=1254,output=`${root}/${name}.webp`;
 // Keep the registered frame and generated alpha; export at bounded texture size.
 await sharp(`art-source/camp-craft-v2/${name}.png`).resize(width,height).webp({quality:92,alphaQuality:100,effort:6}).toFile(output);
 exports.push({name,width,height,bytes:fs.statSync(output).size});
}
fs.writeFileSync('src/camp-worksites-exports.json',JSON.stringify(exports,null,2)+'\n');
console.log(exports);
