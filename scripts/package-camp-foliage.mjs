// Mechanical alpha cleanup, trimming and runtime packaging of generated originals.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const archive='artwork-archive/foliage-v4',runtime='public/survival/foliage-v4';
const {assets:designs}=JSON.parse(fs.readFileSync(archive+'/prompts.json'));
fs.mkdirSync(runtime,{recursive:true});const entries=[],packaging=[];
for(const d of designs){
 const original=path.join(archive,d.key+'-source.png');if(!fs.existsSync(original))fs.copyFileSync(d.source,original);
 const {data,info}=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,top=info.height,right=0,bottom=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const i=(y*info.width+x)*4;if(data[i+3]<8){data.fill(0,i,i+4);continue}
  left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
 }
 const pad=24,crop={left:Math.max(0,left-pad),top:Math.max(0,top-pad),width:Math.min(info.width-1,right+pad)-Math.max(0,left-pad)+1,height:Math.min(info.height-1,bottom+pad)-Math.max(0,top-pad)+1};
 const scaled=await sharp(data,{raw:info}).extract(crop).resize({width:384,height:384,fit:'inside',kernel:'lanczos3'}).raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<scaled.data.length;i+=4)if(scaled.data[i+3]===0)scaled.data.fill(0,i,i+3);
 const file=path.join(runtime,d.key+'.webp');await sharp(scaled.data,{raw:scaled.info}).webp({lossless:true,effort:6}).toFile(file);
 const entry={id:'art_foliage_'+d.key.replaceAll('-','_'),name:d.name,image:'/survival/foliage-v4/'+d.key+'.webp',size:[scaled.info.width,scaled.info.height],anchor:[.5,.77],worldWidth:d.width};
 entries.push(entry);packaging.push({key:d.key,nativeSize:[info.width,info.height],crop,entry,bytes:fs.statSync(file).size});
}
const art=JSON.parse(fs.readFileSync('src/foliage-art.json'));
fs.writeFileSync('src/foliage-art.json',JSON.stringify([...art.filter(a=>!entries.some(e=>e.id===a.id)),...entries],null,2)+'\n');
const catalogue=fs.readFileSync('src/base-catalogue.json','utf8'),existing=JSON.parse(catalogue),format=e=>JSON.stringify(e,null,2).split('\n').map(l=>'  '+l).join('\n');
const records=entries.filter(e=>!existing.some(a=>a.id===e.id)).map(e=>({...existing.find(a=>a.id==='art_foliage_broadleaf'),id:e.id,name:e.name,purpose:'Dense woodland groundcover matching the camp terrain, with walk-through sway and contact bending.',appearance:designs.find(d=>e.id==='art_foliage_'+d.key.replaceAll('-','_')).subject,image:e.image,artPreview:{worldWidth:e.worldWidth},artworkExports:[e.image]}));
if(records.length)fs.writeFileSync('src/base-catalogue.json','[\n'+records.map(format).join(',\n')+',\n'+catalogue.slice(catalogue.indexOf('\n')+1));
fs.writeFileSync(archive+'/packaging.json',JSON.stringify(packaging,null,2)+'\n');
console.log(JSON.stringify(packaging.map(({key,entry,bytes})=>({key,size:entry.size,bytes})),null,2));
