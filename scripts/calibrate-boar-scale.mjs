// Measure existing atlas silhouettes; runtime transforms preserve original pixels,
// proportions and the common ground anchor. Never rescale individual poses.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const root='public/survival/predators-v1',directions=['down','down-left','left','up-left','up'];
const records=[];
for(const direction of directions){
 const masses=[];
 for(let frame=0;frame<10;frame++){
  const data=await sharp(`${root}/boar/${direction}.webp`).extract({left:frame%4*224,top:Math.floor(frame/4)*224,width:224,height:224}).ensureAlpha().raw().toBuffer();
  let mass=0;for(let i=3;i<data.length;i+=4)mass+=data[i]/255;
  masses.push(mass);
 }
 const sorted=[...masses].sort((a,b)=>a-b);
 records.push({direction,masses,median:(sorted[4]+sorted[5])/2});
}
// Preserve the established front-diagonal body mass, rather than the largest
// attack/death frame that originally determined each sheet's packing scale.
const target=records.find(r=>r.direction==='down-left').median;
const scales=Object.fromEntries(records.map(r=>[r.direction,Number(Math.sqrt(target/r.median).toFixed(6))]));
fs.writeFileSync(`${root}/boar-scale.json`,JSON.stringify(scales,null,2)+'\n');
fs.mkdirSync('docs/qa/boar-combat-v2',{recursive:true});
fs.writeFileSync('docs/qa/boar-combat-v2/scale-measurements.json',JSON.stringify({target,scales,records},null,2)+'\n');
console.log(JSON.stringify({scales,beforeSpread:Math.max(...records.map(r=>r.median))/Math.min(...records.map(r=>r.median))}));
