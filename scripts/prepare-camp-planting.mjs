// Analyse the original foliage distribution; no terrain pixels are created here.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const edge=600,data=await sharp('artwork-archive/painted-terrain-hd-original/full-4800.webp').resize(edge,edge).removeAlpha().raw().toBuffer();
const meta=JSON.parse(fs.readFileSync('src/foliage-art.json'));
let state=9494;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
const leaf=new Uint8Array(edge*edge),hard=new Uint8Array(edge*edge);
for(let i=0;i<leaf.length;i++){const r=data[i*3],g=data[i*3+1],b=data[i*3+2];leaf[i]=Number(g>r*.92&&g>b*1.35&&g>27);hard[i]=Number((r>65&&g>60&&Math.abs(r-g)<30&&g/b<1.36)||(b>g*.98&&b>r*.9&&b>45))}
function density(a,x,y,r){let sum=0,count=0;for(let yy=Math.max(0,Math.round(y-r));yy<=Math.min(edge-1,y+r);yy++)for(let xx=Math.max(0,Math.round(x-r));xx<=Math.min(edge-1,x+r);xx++){if((xx-x)**2+(yy-y)**2>r*r)continue;sum+=a[yy*edge+xx];count++}return sum/Math.max(1,count)}
const common=['moss_rosette','moss_rosette','lime_rosette','lime_rosette','forest_ivy','forest_ivy','sage_fan','flower_leaf_clump','blue_fern','white_woodland_flowers','yellow_woodland_flowers','berry_bramble','copper_leaf'];
const accents=['broadleaf','fern','grass','olive_shrub','golden_shrub','copper_fern','pale_flowers','ochre_meadow_grass'];
const items=[];const factor=2400*Math.SQRT2/3600;
for(let cy=13;cy<edge-13;cy+=9)for(let cx=13;cx<edge-13;cx+=9){
 let x=cx+(random()-.5)*6,y=cy+(random()-.5)*6,d=density(leaf,x,y,6);
 if(d<.22||random()>.4+d)continue;
 // Prefer leaf centres, leaving stone paths and blue puddles readable.
 for(let k=0;k<4;k++){const nx=cx+(random()-.5)*9,ny=cy+(random()-.5)*9,nd=density(leaf,nx,ny,3);if(nd>density(leaf,x,y,3)){x=nx;y=ny}}
 if(density(hard,x,y,4)>.16)continue;
 const small=random()<.12,names=small?accents:common,name=names[Math.floor(random()*names.length)],id='art_foliage_'+name,index=meta.findIndex(a=>a.id===id),a=meta[index];
 const scale=+(small?1.1+random()*.45:.83+random()*.4).toFixed(2);
 const h=a.worldWidth*a.size[1]/a.size[0]*scale;
 // Sample is the leafy crown centre; placement stores the grounded root anchor.
 const wx=(x*8-600)*factor,wy=(y*8-600)*factor+h*(a.anchor[1]-.5);
 items.push([index,+wx.toFixed(1),+wy.toFixed(1),scale,Math.round(random()*28-14+360)%360,random()<.5?1:0]);
}
fs.writeFileSync('src/camp-planting.json',JSON.stringify({version:1,assets:meta.map(a=>a.id),items})+'\n');
console.log(`Prepared ${items.length} deterministic plant candidates following the original foliage.`);
