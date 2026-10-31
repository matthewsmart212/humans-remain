// Deterministic delivery encoding only. All artwork and alpha come from imagegen.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp');
const brief=JSON.parse(fs.readFileSync('docs/world-scenery-brief.json','utf8'));
const sources=JSON.parse(fs.readFileSync(process.argv[2]||'.qa/scenery-sources.json','utf8'));
const root='public/survival/world-scenery-v1';fs.mkdirSync(root,{recursive:true});
const entries=[],report=[];
for(const s of [...brief.foliage,...brief.props]){
 if(!sources[s.key])throw Error('Missing generated source: '+s.key);
 const {data,info}=await sharp(sources[s.key]).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,top=info.height,right=-1,bottom=-1,transparent=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const alpha=data[(y*info.width+x)*4+3];if(alpha===0)transparent++;
  if(alpha>=8){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}
 }
 if(transparent<info.width*info.height*.1||right<left)throw Error('Expected real transparent cutout for '+s.key);
 // Ignore subvisual alpha noise when measuring outer canvas. Preserve the
 // generated alpha inside the padded cutout, including antialiased edges.
 const pad=16,L=Math.max(0,left-pad),T=Math.max(0,top-pad),R=Math.min(info.width-1,right+pad),B=Math.min(info.height-1,bottom+pad);
 const file=root+'/'+s.key+'.webp',max=s.maxSize||384;
 await sharp(sources[s.key]).extract({left:L,top:T,width:R-L+1,height:B-T+1}).resize({width:max,height:max,fit:'inside',withoutEnlargement:true}).webp({quality:94,alphaQuality:100,effort:6}).toFile(file);
 const meta=await sharp(file).metadata(),kind=s.maxSize?'prop':'foliage';
 const e={id:(kind==='foliage'?'art_foliage_world_':'art_scenery_')+s.key.replaceAll('-','_'),name:s.name,kind,zone:s.zone,description:s.subject,image:'/survival/world-scenery-v1/'+s.key+'.webp',size:[meta.width,meta.height],anchor:s.anchor,worldWidth:s.width,body:s.body||[]};
 entries.push(e);report.push({key:s.key,source:sources[s.key],size:e.size,bytes:fs.statSync(file).size,crop:[L,T,R-L+1,B-T+1],cropAlphaThreshold:8,alphaPreservedInsideCrop:true});
}
fs.writeFileSync('src/world-scenery-art.json',JSON.stringify(entries,null,2)+'\n');
fs.mkdirSync('docs/qa/world-scenery-v1',{recursive:true});
fs.writeFileSync('docs/qa/world-scenery-v1/packaging.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({assets:entries.length,bytes:report.reduce((n,x)=>n+x.bytes,0),maxDecodedMiB:entries.reduce((n,x)=>n+x.size[0]*x.size[1]*4,0)/1048576,report},null,2));
