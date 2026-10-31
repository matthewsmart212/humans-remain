// Mechanical registration/packaging only. All ground painting is from ImageGen.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const archive='artwork-archive/camp-ground-v2',out='public/survival/camp-ground-v2';
fs.mkdirSync(out,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(archive+'/prompts.json'));
for(const a of manifest)if(!fs.existsSync(`${archive}/${a.key}-source.png`))fs.copyFileSync(a.sourcePath,`${archive}/${a.key}-source.png`);
const size=4800,half=2400;
const raw=await sharp(`${archive}/overview-source.png`).resize(size,size).removeAlpha().raw().toBuffer();
for(const [key,ox,oy] of [['nw',0,0],['ne',2398,0],['sw',0,2398],['se',2398,2398]]){
 const tile=await sharp(`${archive}/${key}-source.png`).resize(2402,2402).removeAlpha().raw().toBuffer();
 for(let y=0;y<2402;y++)for(let x=0;x<2402;x++){
  const gx=x+ox,gy=y+oy;
  // Use the unified generation in a narrow cross to blend independently edited quarters.
  const weight=Math.min(1,Math.min(Math.abs(gx-half),Math.abs(gy-half))/80);
  for(let c=0;c<3;c++){const p=(gy*size+gx)*3+c;raw[p]=Math.round(raw[p]*(1-weight)+tile[(y*2402+x)*3+c]*weight)}
 }
}
const full=()=>sharp(raw,{raw:{width:size,height:size,channels:3}});
await full().webp({quality:94,effort:6}).toFile(out+'/full-4800.webp');
await full().resize(1200,1200).webp({quality:92}).toFile(out+'/preview.webp');
await full().extract({left:600,top:600,width:3600,height:3600}).webp({quality:94}).toFile(out+'/centre-3600.webp');
for(const [key,left,top] of [['nw',0,0],['ne',2398,0],['sw',0,2398],['se',2398,2398]])await full().extract({left,top,width:2402,height:2402}).webp({quality:94,effort:6}).toFile(`${out}/${key}.webp`);
// The owner's old clearing overlay has its own baked foliage. Its exact source
// resolves to a registered piece of the new floor; placement/anchor stay intact.
const factor=3600/(2400*Math.SQRT2),left=Math.round((1733.2074750798122-627)*factor+600),top=Math.round((2117.415200737417-1254*.94)*factor+600),edge=Math.round(1254*factor);
await full().extract({left,top,width:edge,height:edge}).resize(1254,1254).webp({quality:94}).toFile(out+'/bonfire-clearing.webp');
const clearing=JSON.parse(fs.readFileSync(archive+'/clearing-prompt.json'));
if(!fs.existsSync(archive+'/clearing-source.png'))fs.copyFileSync(clearing.sourcePath,archive+'/clearing-source.png');
const registered=await sharp(out+'/bonfire-clearing.webp').removeAlpha().raw().toBuffer();
const cleaned=await sharp(archive+'/clearing-source.png').resize(1254,1254).removeAlpha().raw().toBuffer();
for(let y=0;y<1254;y++)for(let x=0;x<1254;x++){const mix=Math.max(0,Math.min(1,(Math.min(x,y,1253-x,1253-y)-64)/80));for(let c=0;c<3;c++){const i=(y*1254+x)*3+c;registered[i]=Math.round(registered[i]*(1-mix)+cleaned[i]*mix)}}
await sharp(registered,{raw:{width:1254,height:1254,channels:3}}).webp({quality:94}).toFile(out+'/bonfire-clearing.webp');
const file='src/camp-artwork-replacements.json',reskins=JSON.parse(fs.readFileSync(file)).filter(r=>r.entryId!=='misc_d9795b56-b7cc-4e3a-84e2-3140912e5d0d');
reskins.push({entryId:'misc_d9795b56-b7cc-4e3a-84e2-3140912e5d0d',sourceId:'53b14b13-4089-4f5d-ab53-400e5b242ff7',url:'/survival/camp-ground-v2/bonfire-clearing.webp',name:'bonfire-clearing-ground-only.webp',width:1254,height:1254,bytes:fs.statSync(out+'/bonfire-clearing.webp').size});
fs.writeFileSync(file,JSON.stringify(reskins,null,2)+'\n');
fs.writeFileSync(archive+'/packaging.json',JSON.stringify({source:'ImageGen edits of all four original terrain quarters, blended against a unified ground-only overview',size,playable:3600,border:600,tileOverlap:4,clearingCrop:{left,top,width:edge,height:edge},files:fs.readdirSync(out).map(name=>({name,bytes:fs.statSync(out+'/'+name).size}))},null,2)+'\n');
console.log('Packaged ground-only terrain and registered bonfire clearing.');
