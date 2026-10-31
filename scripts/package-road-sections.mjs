import fs from 'node:fs';import {createRequire} from 'node:module';const sharp=createRequire(import.meta.url)('sharp');
const record=JSON.parse(fs.readFileSync('artwork-archive/road-sections-v2/prompts.json','utf8')),materials=[];
fs.mkdirSync('public/survival/road-sections-v2',{recursive:true});
for(const m of record.materials){
 if(!fs.existsSync(m.source))fs.copyFileSync(m.generatedPath,m.source);
 const meta=await sharp(m.source).metadata();if(!meta.hasAlpha)throw Error(m.id+' requires transparent shoulders');
 await sharp(m.source).webp({quality:96,alphaQuality:100,effort:6}).toFile(m.runtime);
 const alpha=await sharp(m.source).extractChannel('alpha').raw().toBuffer(),savedAlpha=await sharp(m.runtime).extractChannel('alpha').raw().toBuffer();
 if(!alpha.equals(savedAlpha))throw Error(m.id+' lost alpha detail');
 materials.push({id:m.id,width:meta.width,height:meta.height,bytes:fs.statSync(m.runtime).size,alphaPreserved:true,path:'/'+m.runtime.replace(/^public\//,'')});
}
const manifest={version:'road-sections-v2',generation:record.mode,materials,totalBytes:materials.reduce((s,m)=>s+m.bytes,0),loading:'Optional background detail',prompts:'artwork-archive/road-sections-v2/prompts.json'};
fs.writeFileSync('public/survival/road-sections-v2/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest));
