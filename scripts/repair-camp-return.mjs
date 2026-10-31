// Four close-up generations replace the stretched two-section master.
// Sharp only prepares contacts, registers pixels and packages the selected art.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {campReturnContacts,CAMP_RETURN_MASTER} from './prepare-camp-return.mjs';
const sharp=createRequire(import.meta.url)('sharp');
const archive='artwork-archive/camp-return-v2';fs.mkdirSync(archive,{recursive:true});
export const PATCHES={
 ne:{x:1534,y:0,width:1670,height:1026,north:260,right:264},
 nw:{x:0,y:0,width:1798,height:1026,north:260,right:264},
 se:{x:1534,y:770,width:1670,height:896,north:256,right:264},
 sw:{x:0,y:770,width:1798,height:896,north:256,right:264},
};
const [mode,key,source]=process.argv.slice(2),p=PATCHES[key];
const toPng=(raw,w,h)=>sharp(raw,{raw:{width:w,height:h,channels:3}}).png().toBuffer();
const crop=async(file,left,top,width,height)=>sharp(file).extract({left,top,width,height}).removeAlpha().raw().toBuffer();
const registered=k=>path.join(archive,k+'-registered.png');
const contacts=async()=>{
 const old=await campReturnContacts();let north,east;
 if(p.y===0)north=await sharp(old.north,{raw:{width:3204,height:260,channels:3}}).extract({left:p.x,top:0,width:p.width,height:260}).raw().toBuffer();
 else north=await crop(registered(key==='se'?'ne':'nw'),0,770,p.width,256);
 if(key.endsWith('e'))east=await sharp(old.east,{raw:{width:264,height:1538,channels:3}}).extract({left:0,top:Math.max(0,p.y-128),width:264,height:p.height-(p.y===0?128:0)}).raw().toBuffer();
 else east=await crop(registered(key==='nw'?'ne':'se'),0,0,264,p.height);
 return{north,east,eastY:key==='ne'?128:0,eastHeight:p.height-(key==='ne'?128:0),eastX:p.width-264};
};
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
if(mode==='template'){
 const c=await contacts();
 const target=path.join(archive,key+'-edit-target.png');
 await sharp({create:{width:p.width,height:p.height,channels:3,background:'#fff'}}).composite([
  {input:await toPng(c.north,p.width,p.north),left:0,top:0},
  {input:await toPng(c.east,264,c.eastHeight),left:c.eastX,top:c.eastY},
 ]).png().toFile(target);console.log(target);
}else if(mode==='register'){
 const c=await contacts(),native=await sharp(source).metadata();
 fs.copyFileSync(source,path.join(archive,key+'-generated-original.png'));
 const raw=await sharp(source).resize(p.width,p.height,{fit:'fill',kernel:'lanczos3'}).removeAlpha().raw().toBuffer();
 const keep=p.y===0?132:128;
 for(let y=0;y<p.north;y++)for(let x=0;x<p.width;x++)for(let ch=0;ch<3;ch++){
  const a=1-smooth((y-keep)/(p.north-keep-1)),i=(y*p.width+x)*3+ch;
  raw[i]=Math.round(raw[i]*(1-a)+c.north[i]*a);
 }
 const blend=key.endsWith('e')?96:132;
 for(let y=0;y<c.eastHeight;y++)for(let x=0;x<264;x++)for(let ch=0;ch<3;ch++){
  const a=smooth(x/blend),i=((y+c.eastY)*p.width+c.eastX+x)*3+ch;
  raw[i]=Math.round(raw[i]*(1-a)+c.east[(y*264+x)*3+ch]*a);
 }
 await sharp(raw,{raw:{width:p.width,height:p.height,channels:3}}).png().toFile(registered(key));
 fs.writeFileSync(path.join(archive,key+'-generation.json'),JSON.stringify({patch:key,source:{width:native.width,height:native.height,file:key+'-generated-original.png'},registered:p,scale:{x:p.width/native.width,y:p.height/native.height}},null,2)+'\n');
 console.log(JSON.stringify({patch:key,native:[native.width,native.height],registered:[p.width,p.height]}));
}else if(mode==='stitch'){
 const chunks=[];
 for(const [k,piece] of Object.entries(PATCHES)){
  const left=k.endsWith('e')?132:0,top=piece.y?128:0;
  const width=k.endsWith('e')?1538:1666,height=piece.y?768:898;
  chunks.push({input:await sharp(registered(k)).extract({left,top,width,height}).png().toBuffer(),left:k.endsWith('e')?1666:0,top:piece.y?898:0});
 }
 await sharp({create:{width:CAMP_RETURN_MASTER.width,height:CAMP_RETURN_MASTER.height,channels:3,background:'#000'}}).composite(chunks).png().toFile(path.join(archive,'detail-master.png'));
 console.log(path.join(archive,'detail-master.png'));
}else throw Error('Use template/register with ne,nw,se,sw, or stitch.');
