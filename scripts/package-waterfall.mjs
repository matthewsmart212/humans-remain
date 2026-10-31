// Mechanical packaging only: original reference crop, generated frame atlas,
// and a technical water-only stencil. The source river artwork is not edited.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const archive='artwork-archive/waterfall-pilot-v1',out='public/survival/waterfall-pilot-v1';
fs.mkdirSync(out,{recursive:true});fs.mkdirSync('docs/qa/waterfall-pilot-v1',{recursive:true});
const width=280,height=260;
const crop=await sharp('artwork-archive/river-headwaters-v1/master.png').extract({left:300,top:320,width,height}).png().toBuffer();
await sharp(crop).webp({quality:97,effort:6}).toFile(out+'/artwork.webp');
const {data,info}=await sharp(crop).removeAlpha().raw().toBuffer({resolveWithObject:true});
// Trace inside the stream edges, not the cliff faces. Separate strands preserve
// the rock between them and the boulder sitting in the plunge pool.
const polygons=[
 [[75,47],[107,51],[122,66],[136,86],[142,111],[151,128],[141,147],[107,155],[77,146],[86,129],[90,105],[86,82]],
 [[196,31],[204,32],[192,57],[185,82],[184,104],[173,118],[159,124],[156,116],[174,104],[175,79],[181,56]],
 [[78,137],[123,130],[165,124],[187,118],[192,128],[181,139],[188,154],[209,161],[224,158],[232,176],[222,200],[205,214],[175,224],[129,219],[84,201],[55,198],[56,180],[48,169],[63,155]],
];
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)};
function distance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)}
function coverage(x,y,poly){let inside=false,edge=Infinity;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;edge=Math.min(edge,distance([x,y],a,b))}return inside?smooth(0,10,edge):0}
const pixels=Buffer.alloc(width*height*3);let active=0;
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const n=(y*width+x)*info.channels,[r,g,b]=data.subarray(n,n+3);
 const blue=smooth(2,14,b-r)*smooth(0,8,g-r);
 const white=smooth(208,238,Math.min(r,g,b))*smooth(-8,1,b-r);
 const region=Math.max(...polygons.map(poly=>coverage(x+.5,y+.5,poly)));
 const value=Math.round(255*region*Math.max(blue,white));
 pixels.fill(value,(y*width+x)*3,(y*width+x+1)*3);if(value)active++;
}
await sharp(pixels,{raw:{width,height,channels:3}}).png().toFile(out+'/water-mask.png');
const master=archive+'/frames-original.png',meta=await sharp(master).metadata(),frames=[];
if(!meta.hasAlpha)throw Error('Waterfall frames need real transparency');
for(let i=0;i<12;i++){
 const left=Math.round(i%4*meta.width/4),top=Math.round(Math.floor(i/4)*meta.height/3);
 const right=Math.round((i%4+1)*meta.width/4),bottom=Math.round((Math.floor(i/4)+1)*meta.height/3);
 const input=await sharp(master).extract({left,top,width:right-left,height:bottom-top}).resize(160,160).png().toBuffer();
 frames.push({input,left:i%4*160,top:Math.floor(i/4)*160});
}
await sharp({create:{width:640,height:480,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(frames).webp({quality:92,alphaQuality:100,effort:6}).toFile(out+'/whitewater-frames.webp');
const report={frames:12,periodSeconds:1.5,atlasPixels:[640,480],referencePixels:[width,height],activeMaskPixels:active,bytes:fs.readdirSync(out).reduce((n,f)=>n+fs.statSync(out+'/'+f).size,0)};
fs.writeFileSync('docs/qa/waterfall-pilot-v1/assets.json',JSON.stringify(report,null,2)+'\n');console.log(report);
