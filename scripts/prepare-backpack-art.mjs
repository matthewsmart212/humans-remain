import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const [scrap,fuel]=process.argv.slice(2);
if(!scrap||!fuel)throw Error('Pass the generated transparent scrap and fuel images.');
fs.mkdirSync('public/survival/ui-backpack-v1',{recursive:true});
for(const [name,file] of [['scrap',scrap],['fuel',fuel]]){
 await sharp(file).trim({threshold:12}).resize(112,112,{fit:'inside',withoutEnlargement:true}).extend({top:8,bottom:8,left:8,right:8,background:'#00000000'}).png().toFile(`public/survival/ui-backpack-v1/${name}.png`);
}
