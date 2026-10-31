import fs from 'node:fs';import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp'),specs=JSON.parse(fs.readFileSync('.qa/scenery-tree-sources.json'));
const dest='public/survival/trees-world-v1';fs.mkdirSync(dest,{recursive:true});
for(const s of specs){
 await sharp(s.source).webp({quality:95,alphaQuality:100,effort:6}).toFile(dest+'/'+s.key+'.webp');
 const meta=await sharp(dest+'/'+s.key+'.webp').metadata();if(meta.width!==1536||meta.height!==1024||!meta.hasAlpha)throw Error('Tree atlas dimensions/alpha: '+s.key);
 const {data,info}=await sharp(s.source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const gaps=[];for(const [start,end]of [[540,620],[1090,1160]]){const columns=[];for(let x=start;x<end;x++){let count=0;for(let y=0;y<info.height;y++)if(data[(y*info.width+x)*4+3]>8)count++;columns.push({x,count});}gaps.push(columns.sort((a,b)=>a.count-b.count).slice(0,8));}
 console.log(JSON.stringify({key:s.key,bytes:fs.statSync(dest+'/'+s.key+'.webp').size,gaps}));
}
