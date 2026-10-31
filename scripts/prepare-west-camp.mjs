// Close-up artwork only: ImageGen supplies every new ground pixel. Sharp crops
// real neighbouring references, registers preserved contacts and packages art.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
const sharp=createRequire(import.meta.url)('sharp');
export const ART_VERSION=process.env.WEST_CAMP_ART_VERSION||'west-camp-v1';
if(!['west-camp-v1','west-camp-v2'].includes(ART_VERSION))throw Error('Unsupported western artwork version');
export const ARCHIVE='artwork-archive/'+ART_VERSION;
export const PATCHES={
 a1n:{x:-122,y:4284,width:1670,height:1090,top:292,right:264},
 a1s:{x:-122,y:5118,width:1670,height:1088,top:256,right:264},
 a2ne:{x:-694,y:2878,width:1092,height:1706,right:264},
 a2nw:{x:-1528,y:2878,width:1090,height:1706,right:256},
 a2se:{x:-694,y:4500,width:1092,height:1706,top:84,right:264},
 a2sw:{x:-1528,y:4500,width:1090,height:1706,top:84,right:256},
 a3e:{x:-694,y:1598,width:1092,height:1672,bottom:264,right:264},
 a3w:{x:-1528,y:1598,width:1090,height:1672,bottom:264,right:256},
 a4e:{x:-694,y:190,width:1092,height:1672,bottom:264,right:264},
 a4w:{x:-1528,y:190,width:1090,height:1672,bottom:264,right:256},
};
export const crop=async(file,left,top,width,height)=>sharp(file).extract({left,top,width,height}).removeAlpha().raw().toBuffer();
export const registered=key=>path.join(ARCHIVE,key+'-registered.png');
// Narrow samples of the existing path keep its layout visible in an otherwise
// blank editing target; ImageGen supplies the replacement floor around it.
const pathGuides={
 a1n:{width:95,points:[[535,0],[440,110],[345,220],[250,330],[155,430],[55,530],[0,570]]},
 a2sw:{width:70,points:[[0,1040],[160,1000],[330,900],[500,780],[700,660],[850,560],[1090,520]]},
 a3e:{width:75,points:[[0,1000],[260,1040],[500,1120],[760,1160],[1092,1170]]},
 a3w:{width:75,points:[[0,1245],[250,1230],[490,1130],[760,1030],[1090,1000]]},
};
const png=(raw,w,h)=>sharp(raw,{raw:{width:w,height:h,channels:3}}).png().toBuffer();
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
export async function a1East(){
 const camp=await crop('public/survival/camp-ground-v3/full-4800.webp',1284,4284,264,516),trail=await crop('public/survival/maps/south-camp-v1/21-camp-south-trail.webp',0,0,264,1794),raw=Buffer.alloc(264*1922*3);
 for(let y=0;y<1922;y++)for(let x=0;x<264;x++)for(let c=0;c<3;c++){
  const i=(y*264+x)*3+c;
  if(y<128)raw[i]=camp[i];else{const alpha=Math.min(1,(y-128)/36),v=trail[((y-128)*264+x)*3+c];raw[i]=Math.round((y<164?camp[i]:v)*(1-alpha)+v*alpha)}
 }return raw;
}
export async function contacts(key){
 const p=PATCHES[key];
 if(key.startsWith('a3')||key.startsWith('a4')){
  const group=key.slice(0,2),parent=group==='a3'?'a2':'a3',parentTop=group==='a3'?3006:1598,parentMasterTop=group==='a3'?2878:1598;
  const parentFile=path.join(ARCHIVE,parent+'-master.png');
  const bottom=await crop(parentFile,p.x+1528,parentTop-parentMasterTop,p.width,264);
  let right;
  if(key.endsWith('w'))right=await crop(registered(group+'e'),0,0,256,p.height);
  else{
   right=await crop('public/survival/camp-ground-v3/full-4800.webp',134,p.y,264,p.height);
   const parentRight=await crop(parentFile,1662,parentTop-parentMasterTop,264,264);
   for(let y=0;y<264;y++)for(let x=0;x<264;x++)for(let c=0;c<3;c++){
    const alpha=Math.min(1,y/96),i=((p.height-264+y)*264+x)*3+c;right[i]=Math.round(right[i]*(1-alpha)+parentRight[(y*264+x)*3+c]*alpha);
   }
  }
  return{right,bottom};
 }
 if(key.startsWith('a2')){
  const right=key.endsWith('w')?await crop(registered(key==='a2nw'?'a2ne':'a2se'),0,0,256,p.height):await a2East(p.y,p.height);
  const top=key.includes('s')?await crop(registered(key==='a2se'?'a2ne':'a2nw'),0,1622,p.width,84):undefined;
  return{right,top};
 }
 const right=await sharp(await a1East(),{raw:{width:264,height:1922,channels:3}}).extract({left:0,top:p.y-4284,width:264,height:p.height}).raw().toBuffer();
 if(key==='a1n'){
  const top=Buffer.alloc(p.width*p.top*3,255),raw=await crop('public/survival/camp-ground-v3/full-4800.webp',0,4284,1548,292);
  for(let y=0;y<292;y++)raw.copy(top,(y*p.width+122)*3,y*1548*3,(y+1)*1548*3);
  return{top,right};
 }
 return{top:await crop(registered('a1n'),0,834,p.width,p.top),right};
}
export async function a2East(y,height){
 const x=134,w=264,raw=Buffer.alloc(w*height*3),camp=await crop('public/survival/camp-ground-v3/full-4800.webp',x,y,w,Math.min(height,4800-y)),a1=await crop(path.join(ARCHIVE,'a1-master.png'),x+122,0,w,1922);
 for(let row=0;row<height;row++)for(let col=0;col<w;col++)for(let c=0;c<3;c++){
  const i=(row*w+col)*3+c,sourceY=y+row;
  if(sourceY<4412)raw[i]=camp[i];else{const alpha=Math.min(1,(sourceY-4412)/36),v=a1[((sourceY-4284)*w+col)*3+c];raw[i]=Math.round((alpha<1?camp[i]:v)*(1-alpha)+v*alpha)}
 }return raw;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 fs.mkdirSync(ARCHIVE,{recursive:true});const[mode,key,source]=process.argv.slice(2),p=PATCHES[key];if(!p)throw Error('Unknown close-up patch');
 const c=await contacts(key);
 if(mode==='ground-template'){
  const guide=pathGuides[key];if(!guide)throw Error('No path guide for '+key);
  const mask=Buffer.from(`<svg width="${p.width}" height="${p.height}" xmlns="http://www.w3.org/2000/svg"><polyline points="${guide.points.map(v=>v.join(',')).join(' ')}" fill="none" stroke="white" stroke-width="${guide.width}" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
  const pathSample=await sharp(path.join('artwork-archive/west-camp-v1',key+'-registered.png')).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
  const overlays=[{input:pathSample,left:0,top:0}];
  if(c.top){const left=key==='a1n'?322:0;overlays.push({input:await sharp(await png(c.top,p.width,p.top)).extract({left,top:0,width:p.width-left,height:p.top}).png().toBuffer(),left,top:0})}
  if(c.bottom)overlays.push({input:await png(c.bottom,p.width,p.bottom),left:0,top:p.height-p.bottom});
  overlays.push({input:await png(c.right,p.right,p.height),left:p.width-p.right,top:0});
  await sharp({create:{width:p.width,height:p.height,channels:3,background:'#fff'}}).composite(overlays).png().toFile(path.join(ARCHIVE,key+'-edit-target.png'));
 }else if(mode==='clean-template'){
  // Edit the existing layout, using already-cleaned neighbouring strips where
  // available. This keeps the roads and regional colours visible to ImageGen.
  const overlays=[];
  if(c.top){const left=key==='a1n'?322:0;overlays.push({input:await sharp(await png(c.top,p.width,p.top)).extract({left,top:0,width:p.width-left,height:p.top}).png().toBuffer(),left,top:0})}
  if(c.bottom)overlays.push({input:await png(c.bottom,p.width,p.bottom),left:0,top:p.height-p.bottom});
  overlays.push({input:await png(c.right,p.right,p.height),left:p.width-p.right,top:0});
  await sharp(path.join('artwork-archive/west-camp-v1',key+'-registered.png')).composite(overlays).png().toFile(path.join(ARCHIVE,key+'-edit-target.png'));
 }else if(mode==='template'){
  await sharp({create:{width:p.width,height:p.height,channels:3,background:'#fff'}}).composite([...(c.top?[{input:await png(c.top,p.width,p.top),left:0,top:0}]:[]),...(c.bottom?[{input:await png(c.bottom,p.width,p.bottom),left:0,top:p.height-p.bottom}]:[]),{input:await png(c.right,p.right,p.height),left:p.width-p.right,top:0}]).png().toFile(path.join(ARCHIVE,key+'-edit-target.png'));
 }else if(mode==='register'){
  const native=await sharp(source).metadata();if(Math.max(p.width/native.width,p.height/native.height)>1.1)throw Error('Artwork exceeds 10% enlargement limit');
  fs.copyFileSync(source,path.join(ARCHIVE,key+'-generated-original.png'));
  const raw=await sharp(source).resize(p.width,p.height,{fit:'fill',kernel:'lanczos3'}).removeAlpha().raw().toBuffer();
  for(let y=0;y<p.top;y++)for(let x=0;x<p.width;x++)for(let ch=0;ch<3;ch++){
   // Do not preserve the old black western frame or white outside-image pixels.
   const xWeight=key==='a1n'?smooth((x-222)/100):1,keep=key==='a1n'?164:key.startsWith('a2')?42:128,alpha=xWeight*(1-smooth((y-keep)/(p.top-keep-1))),i=(y*p.width+x)*3+ch;
   raw[i]=Math.round(raw[i]*(1-alpha)+c.top[i]*alpha);
  }
  if(c.bottom)for(let y=0;y<p.bottom;y++)for(let x=0;x<p.width;x++)for(let ch=0;ch<3;ch++){
   const alpha=smooth(y/96),i=((p.height-p.bottom+y)*p.width+x)*3+ch;raw[i]=Math.round(raw[i]*(1-alpha)+c.bottom[(y*p.width+x)*3+ch]*alpha);
  }
  for(let y=0;y<p.height;y++)for(let x=0;x<p.right;x++)for(let ch=0;ch<3;ch++){
   const alpha=smooth(x/(key.endsWith('w')?128:96)),i=(y*p.width+p.width-p.right+x)*3+ch;raw[i]=Math.round(raw[i]*(1-alpha)+c.right[(y*p.right+x)*3+ch]*alpha);
  }
  await sharp(raw,{raw:{width:p.width,height:p.height,channels:3}}).png().toFile(registered(key));
  fs.writeFileSync(path.join(ARCHIVE,key+'-generation.json'),JSON.stringify({patch:key,source:{width:native.width,height:native.height,file:key+'-generated-original.png'},registered:p,scale:{x:p.width/native.width,y:p.height/native.height}},null,2)+'\n');console.log(JSON.stringify({patch:key,native:[native.width,native.height],scale:Math.max(p.width/native.width,p.height/native.height)}));
 }else throw Error('Use template, clean-template, ground-template or register');
}
