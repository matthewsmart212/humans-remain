// Exact visible pixel preservation, with legacy URL compatibility.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const originals=['/survival/home-props.png','/survival/water-storage/tier-3-tank.png','/survival/provisions.png'];
const redirects=JSON.parse(fs.readFileSync('server/lossless-artwork-redirects.json')),report=[];
for(const source of originals){
 const webp=source.replace(/\.png$/,'.webp');await sharp('public'+source).webp({lossless:true,effort:6}).toFile('public'+webp);
 const a=await sharp('public'+source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp('public'+webp).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.deepEqual(a.info,b.info);for(let i=0;i<a.data.length;i+=4){assert.equal(a.data[i+3],b.data[i+3]);if(a.data[i+3])for(let c=0;c<3;c++)assert.equal(a.data[i+c],b.data[i+c]);}
 redirects[source]=webp;report.push({source,webp,oldBytes:fs.statSync('public'+source).size,newBytes:fs.statSync('public'+webp).size,visiblePixelsIdentical:true});
}
fs.writeFileSync('server/lossless-artwork-redirects.json',JSON.stringify(redirects,null,2)+'\n');fs.mkdirSync('docs/qa/world-rocks-v1',{recursive:true});fs.writeFileSync('docs/qa/world-rocks-v1/lossless-headroom.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({savedBytes:report.reduce((n,x)=>n+x.oldBytes-x.newBytes,0),report}));
