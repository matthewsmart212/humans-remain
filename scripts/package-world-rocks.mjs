// Mechanical crop/size/encoding of imagegen originals; never repaints sprites.
import fs from 'node:fs';import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const specs=JSON.parse(fs.readFileSync('docs/world-rocks-brief.json')).rocks;
const sources=JSON.parse(fs.readFileSync('.qa/rocks-sources.json'));
const out='public/survival/world-rocks-v1',qa='docs/qa/world-rocks-v1';
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(qa,{recursive:true});
const previous=fs.existsSync(qa+'/packaging.json')?JSON.parse(fs.readFileSync(qa+'/packaging.json')):[];
const entries=[],report=[];
for(const s of specs){
 if(!sources[s.key]){if(process.argv.includes('--available'))continue;throw Error('Missing generated source: '+s.key)}
 const file=out+'/'+s.key+'.webp',prior=previous.find(p=>p.key===s.key&&p.source===sources[s.key]);
 let crop=prior?.crop;
 if(!prior||!fs.existsSync(file)){
  const {data,info}=await sharp(sources[s.key]).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let l=info.width,t=info.height,r=-1,b=-1,empty=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3];if(!a)empty++;if(a>=8){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y)}}
  if(empty<info.width*info.height*.1||r<l)throw Error('Expected transparent cutout: '+s.key);
  const pad=16,L=Math.max(0,l-pad),T=Math.max(0,t-pad),R=Math.min(info.width-1,r+pad),B=Math.min(info.height-1,b+pad);crop=[L,T,R-L+1,B-T+1];
  await sharp(sources[s.key]).extract({left:L,top:T,width:crop[2],height:crop[3]}).resize({width:s.maxSize,height:s.maxSize,fit:'inside',withoutEnlargement:true}).webp({quality:94,alphaQuality:100,effort:4}).toFile(file);
 }
 const meta=await sharp(file).metadata();
 entries.push({id:'art_rock_'+s.key.replaceAll('-','_'),name:s.name,kind:'prop',zone:s.zone,description:s.subject,image:'/survival/world-rocks-v1/'+s.key+'.webp',size:[meta.width,meta.height],anchor:s.anchor,worldWidth:s.width,walkable:!!s.walkable,body:[]});
 report.push({key:s.key,source:sources[s.key],size:[meta.width,meta.height],bytes:fs.statSync(file).size,crop,cropAlphaThreshold:8,alphaPreservedInsideCrop:true});
}
fs.writeFileSync('src/world-rock-art.json',JSON.stringify(entries,null,2)+'\n');
fs.writeFileSync(qa+'/packaging.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({assets:entries.length,bytes:report.reduce((n,r)=>n+r.bytes,0),decodedMiB:report.reduce((n,r)=>n+r.size[0]*r.size[1]*4,0)/1048576}));
