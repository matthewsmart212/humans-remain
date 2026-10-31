// Lossless encoding only: keep every visible source pixel and archive originals.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const names=['survival/hearth/tier-3-lit-sheet','survival/hearth/tier-2-lit-sheet','survival/shelters/proper-bed',...['1','2','3'].flatMap(t=>['interior','roof'].map(p=>`survival/shelters/tier-${t}-${p}`))];
const redirects={},report=[];
for(const n of names){
 const original=`artwork-archive/lossless-runtime-v1/${n}.png`,old=`public/${n}.png`,dest=`public/${n}.webp`;
 fs.mkdirSync(path.dirname(original),{recursive:true});if(!fs.existsSync(original))fs.copyFileSync(old,original);
 await sharp(original).webp({lossless:true,effort:6}).toFile(dest);
 const a=await sharp(original).ensureAlpha().raw().toBuffer(),b=await sharp(dest).ensureAlpha().raw().toBuffer();assert.equal(a.length,b.length);
 for(let i=0;i<a.length;i+=4){assert.equal(a[i+3],b[i+3]);if(a[i+3])for(let c=0;c<3;c++)assert.equal(a[i+c],b[i+c]);}
 redirects['/'+n+'.png']='/'+n+'.webp';report.push({asset:n,savedBytes:fs.statSync(original).size-fs.statSync(dest).size,visiblePixelsIdentical:true});
 if(fs.existsSync(old))fs.renameSync(old,original);
}
// Mechanical URL migration; old saved layouts retain working redirect URLs.
function rewrite(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())rewrite(file);else if(/\.(ts|tsx|json)$/.test(file)){let text=fs.readFileSync(file,'utf8');for(const [a,b]of Object.entries(redirects))text=text.replaceAll(a,b);fs.writeFileSync(file,text)}}}
rewrite('src');rewrite('server');
fs.writeFileSync('server/lossless-artwork-redirects.json',JSON.stringify(redirects,null,2)+'\n');
fs.mkdirSync('docs/qa/river-complete-v1',{recursive:true});fs.writeFileSync('docs/qa/river-complete-v1/lossless-encoding.json',JSON.stringify(report,null,2)+'\n');console.log({savedBytes:report.reduce((n,p)=>n+p.savedBytes,0),assets:report.length});
