import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
const redirects=JSON.parse(fs.readFileSync('server/lossless-artwork-redirects.json')),report=[];
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(dir+'/'+d.name):[dir+'/'+d.name]);}
const candidates=files('public/survival').filter(p=>p.endsWith('.png')&&!redirects[p.slice(6)]&&!fs.existsSync(p.replace(/\.png$/,'.webp'))).map(file=>({file,bytes:fs.statSync(file).size})).sort((a,b)=>b.bytes-a.bytes);
let saved=0;
for(const {file,bytes} of candidates){
 if(saved>=9600000)break;if(bytes<800000)continue;
 const next=file.replace(/\.png$/,'.webp'),encoded=await sharp(file).webp({lossless:true,effort:6}).toBuffer();if(bytes-encoded.length<150000)continue;
 const a=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(encoded).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(a.info.width!==b.info.width||a.info.height!==b.info.height)throw Error('Dimensions changed');
 let alpha=0,rgb=0;for(let i=0;i<a.data.length;i+=4){if(a.data[i+3]!==b.data[i+3])alpha++;if(a.data[i+3]&&[0,1,2].some(c=>a.data[i+c]!==b.data[i+c]))rgb++;}if(alpha||rgb)throw Error('Lossless mismatch '+file);
 fs.writeFileSync(next,encoded);redirects[file.slice(6)]=next.slice(6);saved+=bytes-encoded.length;report.push({source:file,replacement:next,before:bytes,after:encoded.length,saved:bytes-encoded.length,alphaMismatches:alpha,visibleRGBMismatches:rgb});console.log(JSON.stringify(report.at(-1)));
}
if(saved<9600000)throw Error('Insufficient lossless headroom '+saved);
fs.writeFileSync('server/lossless-artwork-redirects.json',JSON.stringify(redirects,null,2)+'\n');fs.writeFileSync('docs/qa/tree-variants-v1/lossless-budget.json',JSON.stringify({result:'pass',savedBytes:saved,images:report},null,2)+'\n');console.log(JSON.stringify({savedBytes:saved,images:report.length}));
