import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const patches=read('src/complete-road-patches.json');
const dir='public/survival/complete-roads-v1',previewDir='public/survival/road-overviews-v1';
fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(previewDir,{recursive:true});
const manifest=[];
for(const p of patches){
 const input=`artwork-archive/complete-roads-v1/${p.id}.png`,meta=await sharp(input).metadata();
 if(meta.width!==p.width||meta.height!==p.height)throw Error(p.id+' changed native dimensions');
 const file=`${dir}/${p.id}.webp`;
 if(!fs.existsSync(file))await sharp(input).webp({quality:97,alphaQuality:100}).toFile(file);
 manifest.push({...p,file,bytes:fs.statSync(file).size});
}
const sources=[...manifest,
 ...read('src/camp-road-patches.json').map(p=>({...p,file:`public/survival/camp-road-patches-v1/${p.id}.webp`})),
 ...read('src/district-road-patches.json').map(p=>({...p,file:`public/survival/district-road-patches-v1/${p.id}.webp`})),
 {key:'roadTerrainPilotSE',file:'public/survival/road-pilot-v1/southeast.webp'}];
let previewBytes=0;
for(const p of sources){const file=`${previewDir}/${p.key}.webp`;await sharp(p.file).resize({width:256,height:256,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toFile(file);previewBytes+=fs.statSync(file).size;}
fs.writeFileSync(dir+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({fullImages:manifest.length,fullBytes:manifest.reduce((n,p)=>n+p.bytes,0),previews:sources.length,previewBytes}));
