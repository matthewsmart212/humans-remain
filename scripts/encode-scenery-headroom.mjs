// Preserve exact visible RGBA pixels while making space for the new scenery.
// Original PNGs remain in source/native exports; old web URLs redirect to WebP.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const originals=['/survival/survivor/base-motion-v1.png','/survival/survivor/base-idle-v1.png','/survival/camp-workshop-v1/camp-workshop.png','/survival/camp-well-t1.png'];
const redirects=JSON.parse(fs.readFileSync('server/lossless-artwork-redirects.json','utf8')),report=[];
for(const url of originals){
 const target=url.replace(/\.png$/,'.webp'),source='public'+url,file='public'+target;
 await sharp(source).webp({lossless:true,effort:6}).toFile(file);
 const before=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),after=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.deepEqual(before.info,after.info);
 for(let i=0;i<before.data.length;i+=4){assert.equal(before.data[i+3],after.data[i+3]);if(before.data[i+3])for(let c=0;c<3;c++)assert.equal(before.data[i+c],after.data[i+c]);}
 redirects[url]=target;report.push({source:url,webp:target,oldBytes:fs.statSync(source).size,newBytes:fs.statSync(file).size,visiblePixelsIdentical:true});
}
fs.writeFileSync('server/lossless-artwork-redirects.json',JSON.stringify(redirects,null,2)+'\n');
fs.mkdirSync('docs/qa/world-scenery-v1',{recursive:true});fs.writeFileSync('docs/qa/world-scenery-v1/lossless-headroom.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({savedBytes:report.reduce((n,x)=>n+x.oldBytes-x.newBytes,0),report},null,2));
