/** Mechanical sprite packaging: preserve generated colours/alpha, trim and resize only. */
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const sharp=createRequire(import.meta.url)('sharp');
const archive='artwork-archive/foliage-v2',runtime='public/survival/foliage-v2',sourceRoot=process.argv[2];
const specs=[
 {key:'olive-shrub',id:'olive_shrub',name:'Olive woodland shrub',source:'exec-ded8d7fa-fc16-4598-aad3-aae2a17af916.png',root:[635,1158],height:54},
 {key:'golden-shrub',id:'golden_shrub',name:'Golden woodland shrub',source:'exec-9e4d3b3f-0775-4667-b196-cf5fdde097bb.png',root:[651,1068],height:58},
 {key:'copper-fern',id:'copper_fern',name:'Copper woodland fern',source:'exec-d10167b9-8370-4f64-b89b-d8a4e98eda34.png',root:[634,1030],height:54},
 {key:'pale-flowers',id:'pale_flowers',name:'Pale woodland flowers',source:'exec-ed8a5757-8d83-4234-9dcb-966b3cbd1a6e.png',root:[684,920],height:48},
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
 const padding=24,crop={left:Math.max(0,left-padding),top:Math.max(0,top-padding),width:Math.min(info.width-1,right+padding)-Math.max(0,left-padding)+1,height:Math.min(info.height-1,bottom+padding)-Math.max(0,top-padding)+1};
 const scaled=await sharp(data,{raw:info}).extract(crop).resize({width:320,height:384,fit:'inside',kernel:'lanczos3'}).raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<scaled.data.length;i+=4)if(scaled.data[i+3]===0)scaled.data.fill(0,i,i+3);
 const file=path.join(runtime,s.key+'.webp');await sharp(scaled.data,{raw:scaled.info}).webp({lossless:true,effort:6}).toFile(file);
 const entry={id:'art_foliage_'+s.id,name:s.name,image:'/survival/foliage-v2/'+s.key+'.webp',size:[scaled.info.width,scaled.info.height],anchor:[(s.root[0]-crop.left)/crop.width,(s.root[1]-crop.top)/crop.height].map(n=>Math.round(n*10000)/10000),worldWidth:Math.round(s.height*scaled.info.width/scaled.info.height*100)/100};
 entries.push(entry);packaging.push({...s,nativeSize:[info.width,info.height],crop,entry,bytes:fs.statSync(file).size});
}
const art=JSON.parse(fs.readFileSync('src/foliage-art.json'));
fs.writeFileSync('src/foliage-art.json',JSON.stringify([...art.filter(a=>!entries.some(e=>e.id===a.id)),...entries],null,2)+'\n');
const catalogue=fs.readFileSync('src/base-catalogue.json','utf8'),existing=JSON.parse(catalogue);
const newRecords=entries.filter(e=>!existing.some(a=>a.id===e.id)).map(e=>({...existing.find(a=>a.id==='art_foliage_broadleaf'),id:e.id,name:e.name,purpose:e.id.includes('flowers')?'Walk-through woodland flowers that sway and part when touched.':'Taller walk-through foliage that parts around the character and settles back.',appearance:e.name+' in the camp\'s warm hand-painted palette.',image:e.image,artPreview:{worldWidth:e.worldWidth},artworkExports:[e.image]}));
const format=e=>JSON.stringify(e,null,2).split('\n').map(l=>'  '+l).join('\n');
let next=catalogue;
for(const e of entries){const old=existing.find(a=>a.id===e.id);if(!old)continue;const serialized=format(old);if(!next.includes(serialized))throw Error('Unexpected catalogue formatting for '+e.id);next=next.replace(serialized,format({...old,image:e.image,artPreview:{...old.artPreview,worldWidth:e.worldWidth},artworkExports:[e.image]}));}
if(newRecords.length)next='[\n'+newRecords.map(format).join(',\n')+',\n'+next.slice(next.indexOf('\n')+1);
if(next!==catalogue)fs.writeFileSync('src/base-catalogue.json',next);
fs.writeFileSync(archive+'/packaging.json',JSON.stringify(packaging,null,2)+'\n');
console.log(JSON.stringify(packaging.map(({key,entry,bytes})=>({key,size:entry.size,anchor:entry.anchor,worldWidth:entry.worldWidth,bytes})),null,2));
