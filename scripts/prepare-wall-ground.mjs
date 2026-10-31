// Integrates the image-generated painted soil with the unchanged wall artwork.
// Contact traces are in the original HD wall canvas; all tiers share one bed.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp');
const manifest=JSON.parse(fs.readFileSync('src/wall-artwork-replacements.json'));
export const groundTraces=[
 [[110,245],[260,290],[420,345],[595,420],[750,525],[890,610]],
 [[715,255],[770,350],[830,457],[875,575],[905,705]],
 [[510,790],[615,705],[720,590],[805,465],[855,365],[875,265]],
 [[90,592],[230,569],[365,527],[490,465],[623,385]],
 [[245,890],[365,950],[512,1014],[667,1050],[806,1061]],
 [[82,224],[128,370],[205,525],[326,679],[460,809]],
 [[145,848],[208,714],[285,548],[375,406],[462,275]],
 [[140,414],[283,350],[435,281],[590,230],[740,188]],
];
// The front-facing stone foundations project farther than the timber foot line.
// Include their contact edge in the SAME ground bed so upgrades never change it.
const foundationTraces={
 1:[[110,315],[260,340],[420,392],[595,475],[750,560],[890,610]],
 4:[[90,625],[230,600],[365,550],[490,495],[623,440]],
 5:[[245,930],[365,985],[512,1050],[667,1090],[806,1090]],
 8:[[140,425],[283,388],[435,345],[590,285],[740,270]],
};
const padding=64,texturePath='artwork-archive/wall-ground/painted-earth.png';
fs.mkdirSync('public/survival/wall-ground-v1',{recursive:true});
const {data:texture,info}=await sharp(texturePath).removeAlpha().raw().toBuffer({resolveWithObject:true});
const distance=(x,y,points)=>{let best=Infinity;for(let j=1;j<points.length;j++){const [ax,ay]=points[j-1],[bx,by]=points[j],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));best=Math.min(best,Math.hypot(x-ax-dx*t,y-ay-dy*t))}return best};
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
const report=[];
for(let i=0;i<manifest.length;i++){
 const m=manifest[i],width=m.width+padding*2,height=m.height+padding*2,buf=Buffer.alloc(width*height*4),points=groundTraces[i];
 let left=width,top=height,right=0,bottom=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const sx=x-padding,sy=y-padding,d=Math.min(distance(sx,sy,points),foundationTraces[i+1]?distance(sx,sy,foundationTraces[i+1])+24:Infinity);
  // Irregular, feathered edges cover foliage at the posts, taper into the untouched terrain.
  const noise=7*Math.sin(sx*.058+Math.cos(sy*.041))+5*Math.sin(sy*.103+sx*.077)+3*Math.sin(sx*.23-sy*.19);
  const radius=([80,94,94,80,76,94,94,80][i])+noise,opacity=smooth((radius-d)/38);if(opacity<=0)continue;
  const tx=(x+i*107)%info.width,ty=(y+i*73)%info.height,ti=(ty*info.width+tx)*3,di=(y*width+x)*4;
  // Soft ambient contact immediately against the timber/stone, baked into the soil, never over the wall.
  const shade=1-.25*Math.exp(-(d*d)/(2*16*16));
  for(let c=0;c<3;c++)buf[di+c]=Math.round(texture[ti+c]*shade);
  buf[di+3]=Math.round(opacity*255);
  if(buf[di+3]){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}
 }
 // Discard unused transparent canvas to reduce decoded texture memory on phones.
 left=Math.max(0,left-2);top=Math.max(0,top-2);right=Math.min(width-1,right+2);bottom=Math.min(height-1,bottom+2);
 const crop={left,top,width:right-left+1,height:bottom-top+1};
 const output=`public/survival/wall-ground-v1/wall-${i+1}.webp`;
 await sharp(buf,{raw:{width,height,channels:4}}).extract(crop).webp({quality:92,alphaQuality:100,effort:6}).toFile(output);
 report.push({piece:i+1,image:output.slice('public'.length),size:[crop.width,crop.height],rect:[(left-padding)/m.width,(top-padding)/m.height,crop.width/m.width,crop.height/m.height],padding,contact:points,foundationContact:foundationTraces[i+1],bytes:fs.statSync(output).size});
}
fs.writeFileSync('artwork-archive/wall-ground/registration.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('src/wall-ground-art.json',JSON.stringify(report.map(({image,size,rect})=>({image,size,rect})),null,2)+'\n');
console.log(`Prepared eight registered ground beds (${report.reduce((n,r)=>n+r.bytes,0)} bytes); original wall pixels untouched.`);
