import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const patches=JSON.parse(fs.readFileSync('src/camp-road-patches.json','utf8'));
const dir='public/survival/camp-road-patches-v1';fs.mkdirSync(dir,{recursive:true});
const manifest=[];
for(const p of patches){
 const input=`artwork-archive/camp-road-patches-v1/${p.id==='west'?'west-final':p.id}.png`,meta=await sharp(input).metadata();
 if(meta.width!==p.width||meta.height!==p.height)throw Error(p.id+' changed native reference dimensions');
 const file=`${dir}/${p.id}.webp`;await sharp(input).webp({quality:97,alphaQuality:100}).toFile(file);
 manifest.push({...p,bytes:fs.statSync(file).size});
}
fs.writeFileSync(dir+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest));
