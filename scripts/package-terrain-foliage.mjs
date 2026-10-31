/** Trim/resize genuine generated alpha; no repainting or synthetic foliage. */
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const sharp=createRequire(import.meta.url)('sharp');
const archive='artwork-archive/foliage-v3',runtime='public/survival/foliage-v3',sourceRoot=process.argv[2];
const specs=[
 {key:'moss-rosette',id:'moss_rosette',name:'Broad moss leaf clump',source:'exec-566eaee1-a7ef-4042-8f16-505d238af77c.png',anchor:[.52,.76],worldWidth:165},
 {key:'lime-rosette',id:'lime_rosette',name:'Golden paddle leaf clump',source:'exec-60b25870-381a-4c4e-85e4-b38bc0a07e83.png',anchor:[.52,.76],worldWidth:150},
 {key:'flower-leaf-clump',id:'flower_leaf_clump',name:'Flowering woodland groundcover',source:'exec-1571cdcf-c8b8-4ab8-a9d9-a4c8086f318b.png',anchor:[.5,.73],worldWidth:205},
];
fs.mkdirSync(archive,{recursive:true});fs.mkdirSync(runtime,{recursive:true});
const entries=[],packaging=[];
for(const s of specs){
 const original=path.join(archive,s.key+'-source.png');if(sourceRoot)fs.copyFileSync(path.join(sourceRoot,s.source),original);
 const {data,info}=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,top=info.height,right=0,bottom=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const i=(y*info.width+x)*4;if(data[i+3]<8){data.fill(0,i,i+4);continue}
  left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
 }
 const pad=24,crop={left:Math.max(0,left-pad),top:Math.max(0,top-pad),width:Math.min(info.width-1,right+pad)-Math.max(0,left-pad)+1,height:Math.min(info.height-1,bottom+pad)-Math.max(0,top-pad)+1};
 const scaled=await sharp(data,{raw:info}).extract(crop).resize({width:384,height:384,fit:'inside',kernel:'lanczos3'}).raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<scaled.data.length;i+=4)if(scaled.data[i+3]===0)scaled.data.fill(0,i,i+3);
 const file=path.join(runtime,s.key+'.webp');await sharp(scaled.data,{raw:scaled.info}).webp({lossless:true,effort:6}).toFile(file);
 const entry={id:'art_foliage_'+s.id,name:s.name,image:'/survival/foliage-v3/'+s.key+'.webp',size:[scaled.info.width,scaled.info.height],anchor:s.anchor,worldWidth:s.worldWidth};
 entries.push(entry);packaging.push({...s,nativeSize:[info.width,info.height],crop,entry,bytes:fs.statSync(file).size});
}
const art=JSON.parse(fs.readFileSync('src/foliage-art.json'));
fs.writeFileSync('src/foliage-art.json',JSON.stringify([...art.filter(a=>!entries.some(e=>e.id===a.id)),...entries],null,2)+'\n');
const catalogue=fs.readFileSync('src/base-catalogue.json','utf8'),existing=JSON.parse(catalogue),format=e=>JSON.stringify(e,null,2).split('\n').map(l=>'  '+l).join('\n');
const newRecords=entries.filter(e=>!existing.some(a=>a.id===e.id)).map(e=>({...existing.find(a=>a.id==='art_foliage_broadleaf'),id:e.id,name:e.name,purpose:'Broad overlapping leaves matching the terrain, with walk-through sway and contact bending.',appearance:'Low top-down rounded paddle leaves in olive, moss and yellow-green; layered dark leaf undersides.',image:e.image,artPreview:{worldWidth:e.worldWidth},artworkExports:[e.image]}));
let next=catalogue;
for(const e of entries){const old=existing.find(a=>a.id===e.id);if(!old)continue;const serialized=format(old);if(!next.includes(serialized))throw Error('Unexpected catalogue formatting for '+e.id);next=next.replace(serialized,format({...old,image:e.image,artPreview:{...old.artPreview,worldWidth:e.worldWidth},artworkExports:[e.image]}));}
if(newRecords.length)next='[\n'+newRecords.map(format).join(',\n')+',\n'+next.slice(next.indexOf('\n')+1);
if(next!==catalogue)fs.writeFileSync('src/base-catalogue.json',next);
fs.writeFileSync(archive+'/packaging.json',JSON.stringify(packaging,null,2)+'\n');
console.log(JSON.stringify(packaging.map(({key,entry,bytes})=>({key,size:entry.size,anchor:entry.anchor,worldWidth:entry.worldWidth,bytes})),null,2));
