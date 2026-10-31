// Four near-native image_gen patches. Sharp only prepares existing contacts,
// registers their pixels, and packages the finished artwork.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const sharp=createRequire(import.meta.url)('sharp');
export const SOUTH_CAMP_MASTER={x:1284,y:4284,width:3076,height:1922};
export const SOUTH_CAMP_ARCHIVE='artwork-archive/south-camp-v1';
export const PATCHES={
 ne:{x:1406,y:0,width:1670,height:1090,north:292},
 nw:{x:0,y:0,width:1670,height:1090,north:292},
 se:{x:1406,y:834,width:1670,height:1088,north:256},
 sw:{x:0,y:834,width:1670,height:1088,north:256},
};
const crop=(file,left,top,width,height)=>sharp(file).extract({left,top,width,height}).removeAlpha().raw().toBuffer();
const png=(raw,w,h)=>sharp(raw,{raw:{width:w,height:h,channels:3}}).png().toBuffer();
const registered=k=>path.join(SOUTH_CAMP_ARCHIVE,k+'-registered.png');
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
export async function southCampContacts(){
 const north=await crop('public/survival/camp-ground-v3/full-4800.webp',1284,4284,3076,292);
 const approach=await crop('public/survival/maps/east-approach-v1/01-camp-approach.webp',0,1020,264,516);
 // The east approach already paints over the camp without a left feather.
 for(let y=0;y<292;y++)approach.copy(north,(y*3076+2812)*3,y*264*3,(y+1)*264*3);
 const meadow=await crop('public/survival/maps/camp-return-v2/18-camp-southeast-meadow.webp',0,0,264,1538);
 const east=Buffer.alloc(264*1922*3);
 for(let y=0;y<1922;y++)for(let x=0;x<264;x++)for(let c=0;c<3;c++){
  const i=(y*264+x)*3+c;
  if(y<384)east[i]=approach[i];
  else{const a=Math.min(1,(y-384)/36),v=meadow[((y-384)*264+x)*3+c];east[i]=Math.round((y<420?approach[i]:v)*(1-a)+v*a);}
 }
 return{north,east};
}
export async function patchContacts(key){
 const p=PATCHES[key],old=await southCampContacts();
 const north=p.y===0?await sharp(old.north,{raw:{width:3076,height:292,channels:3}}).extract({left:p.x,top:0,width:p.width,height:292}).raw().toBuffer():await crop(registered(key==='se'?'ne':'nw'),0,834,p.width,256);
 const east=key.endsWith('e')?await sharp(old.east,{raw:{width:264,height:1922,channels:3}}).extract({left:0,top:p.y,width:264,height:p.height}).raw().toBuffer():await crop(registered(key==='nw'?'ne':'se'),0,0,264,p.height);
 return{north,east};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 fs.mkdirSync(SOUTH_CAMP_ARCHIVE,{recursive:true});
 const [mode,key,source]=process.argv.slice(2),p=PATCHES[key];
 if(mode==='template'){
  const c=await patchContacts(key),target=path.join(SOUTH_CAMP_ARCHIVE,key+'-edit-target.png');
  await sharp({create:{width:p.width,height:p.height,channels:3,background:'#fff'}}).composite([{input:await png(c.north,p.width,p.north),left:0,top:0},{input:await png(c.east,264,p.height),left:p.width-264,top:0}]).png().toFile(target);console.log(target);
 }else if(mode==='register'){
  const c=await patchContacts(key),native=await sharp(source).metadata();
  if(Math.max(p.width/native.width,p.height/native.height)>1.10)throw Error('Generate a closer view: source enlargement would exceed 10%.');
  fs.copyFileSync(source,path.join(SOUTH_CAMP_ARCHIVE,key+'-generated-original.png'));
  const raw=await sharp(source).resize(p.width,p.height,{fit:'fill',kernel:'lanczos3'}).removeAlpha().raw().toBuffer();
  const keep=p.y===0?164:128;
  for(let y=0;y<p.north;y++)for(let x=0;x<p.width;x++)for(let ch=0;ch<3;ch++){
   const a=1-smooth((y-keep)/(p.north-keep-1)),i=(y*p.width+x)*3+ch;raw[i]=Math.round(raw[i]*(1-a)+c.north[i]*a);
  }
  const blend=key.endsWith('e')?96:132;
  for(let y=0;y<p.height;y++)for(let x=0;x<264;x++)for(let ch=0;ch<3;ch++){
   const a=smooth(x/blend),i=(y*p.width+p.width-264+x)*3+ch;raw[i]=Math.round(raw[i]*(1-a)+c.east[(y*264+x)*3+ch]*a);
  }
  await sharp(raw,{raw:{width:p.width,height:p.height,channels:3}}).png().toFile(registered(key));
  fs.writeFileSync(path.join(SOUTH_CAMP_ARCHIVE,key+'-generation.json'),JSON.stringify({patch:key,source:{width:native.width,height:native.height,file:key+'-generated-original.png'},registered:p,scale:{x:p.width/native.width,y:p.height/native.height}},null,2)+'\n');console.log(JSON.stringify({patch:key,native:[native.width,native.height],registered:[p.width,p.height]}));
 }else if(mode==='stitch'){
  const chunks=[];
  for(const [k,piece]of Object.entries(PATCHES)){
   const left=k.endsWith('e')?132:0,top=piece.y?128:0,width=1538,height=piece.y?960:962;
   chunks.push({input:await sharp(registered(k)).extract({left,top,width,height}).png().toBuffer(),left:k.endsWith('e')?1538:0,top:piece.y?962:0});
  }
  await sharp({create:{width:3076,height:1922,channels:3,background:'#000'}}).composite(chunks).png().toFile(path.join(SOUTH_CAMP_ARCHIVE,'registered-master.png'));console.log(path.join(SOUTH_CAMP_ARCHIVE,'registered-master.png'));
 }else throw Error('Use template/register with ne,nw,se,sw, or stitch.');
}
