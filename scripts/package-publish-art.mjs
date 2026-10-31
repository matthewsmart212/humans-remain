// File encoding only: preserve the generated PNGs and every visible RGBA pixel.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const assets=["/survival/equipment/metal-pickaxe-v1.png", "/survival/equipment/metal-spear-v1.png", "/survival/equipment/metal-sword-v1.png", "/survival/equipment/scrap-knife-v1.png", "/survival/equipment/wooden-knife-v1.png", "/survival/equipment/wooden-pickaxe-v1.png", "/survival/equipment/wooden-spear-v1.png", "/survival/equipment/wooden-sword-v1.png", "/survival/forage-v1/apple-tree.png", "/survival/forage-v1/berry-bush.png", "/survival/ironworks-v1/camp-furnace.png", "/survival/ironworks-v1/iron-boulder.png", "/survival/ironworks-v1/iron-ingot.png", "/survival/ironworks-v1/iron-ore.png", "/survival/scrapling.png", "/survival/ui-field-kit-v1/vitals.png"];
const redirects=JSON.parse(fs.readFileSync('server/lossless-artwork-redirects.json','utf8'));
const report=[];
for(const name of assets){
 const original='public'+name,dest=original.replace(/\.png$/,'-lossless-v1.webp');
 await sharp(original).webp({lossless:true,effort:6}).toFile(dest);
 const a=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const b=await sharp(dest).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.deepEqual(a.info,b.info);
 for(let i=0;i<a.data.length;i+=4){
  assert.equal(a.data[i+3],b.data[i+3]);
  if(a.data[i+3])for(let c=0;c<3;c++)assert.equal(a.data[i+c],b.data[i+c]);
 }
 redirects[original.slice(6)]=dest.slice(6);
 report.push({asset:name,width:a.info.width,height:a.info.height,pngBytes:fs.statSync(original).size,webpBytes:fs.statSync(dest).size,visiblePixelsIdentical:true,alphaIdentical:true});
}
fs.writeFileSync('server/lossless-artwork-redirects.json',JSON.stringify(redirects,null,2)+'\n');
fs.writeFileSync('docs/qa/camp-restoration-v1/publish-encoding.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({assets:report.length,savedBytes:report.reduce((n,r)=>n+r.pngBytes-r.webpBytes,0),visiblePixelsIdentical:true,alphaIdentical:true}));
