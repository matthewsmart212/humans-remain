// WebP encoding only, with no resizing; ImageGen painted every material.
import fs from 'node:fs';import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp'),dir='public/survival/road-materials-v1';
const prompts=JSON.parse(fs.readFileSync('artwork-archive/road-materials-v1/prompts.json','utf8'));
fs.mkdirSync(dir,{recursive:true});const materials=[];
for(const m of prompts.materials){
 if(!fs.existsSync(m.savedSource))fs.copyFileSync(m.generatedPath,m.savedSource);
 const {width,height}=await sharp(m.savedSource).metadata();
 await sharp(m.savedSource).webp({quality:96,effort:6}).toFile(m.runtime);
 const original=await sharp(m.savedSource).removeAlpha().raw().toBuffer(),encoded=await sharp(m.runtime).removeAlpha().raw().toBuffer();let error=0;
 for(let i=0;i<original.length;i++)error+=Math.abs(original[i]-encoded[i]);
 materials.push({id:m.id,width,height,path:m.runtime.replace('public',''),bytes:fs.statSync(m.runtime).size,meanChannelError:+(error/original.length).toFixed(3)});
}
const report={version:'road-materials-v1',tool:prompts.tool,encoding:'WebP quality 96, original dimensions; original PNGs retained',materials,totalBytes:materials.reduce((n,m)=>n+m.bytes,0),loading:'Background terrain detail, not editor-entry requirements',reference:'Original camp stone walkways and clear earth',prompts:'artwork-archive/road-materials-v1/prompts.json'};
fs.writeFileSync(dir+'/manifest.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
