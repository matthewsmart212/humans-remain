import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp':'sharp');
const names=['furnace','furnace-ruined','warehouse-empty','warehouse-half','warehouse-full','warehouse-ruined'];
const report=[];
function baseline(x,points){for(let i=1;i<points.length;i++){const [x1,y1]=points[i-1],[x2,y2]=points[i];if(x<=x2)return y1+(y2-y1)*(x-x1)/(x2-x1)}return points.at(-1)[1]}
for(const name of names){
 const furnace=name.startsWith('furnace'),size=furnace?768:1024;
 const {data,info}=await sharp(`art-source/camp-worksites-v2/${name}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 // Preserve the generated architectural pixels and source alpha. Only soften
 // the outer dirt apron so the actual map's stones/leaves show through it.
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const nx=x/info.width,ny=y/info.height;
  const edge=baseline(nx,furnace?[[0,.79],[.15,.835],[.59,.91],[.82,.85],[1,.77]]:[[0,.60],[.1,.64],[.70,.90],[1,.74]]);
  const t=Math.max(0,Math.min(1,(ny-edge)/(furnace?.07:.07)));
  const fade=1-t*t*(3-2*t)*.94;
  data[(y*info.width+x)*4+3]=Math.round(data[(y*info.width+x)*4+3]*fade);
 }
 const output=`public/survival/camp-worksites-v2/${name}.webp`;
 await sharp(data,{raw:info}).resize(size,size).webp({quality:92,alphaQuality:100,effort:6}).toFile(output);
 report.push({name,size,bytes:fs.statSync(output).size});
}
fs.writeFileSync('art-source/camp-worksites-v2/exports.json',JSON.stringify(report,null,2)+'\n');
console.log(report);
