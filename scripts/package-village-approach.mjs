// Register the generated outpaint against unchanged neighbouring artwork.
// This only resamples, joins and cuts artwork; new terrain is made with image_gen.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const sharp=createRequire(import.meta.url)('sharp');
const source=process.argv[2];
if(!source)throw Error('Pass the generated master PNG.');
const version=process.argv[3]||'v1';
if(!/^v\d+$/.test(version))throw Error('Use a version such as v1 or v2.');
const folder='village-approach-'+version,archive='artwork-archive/'+folder,out='public/survival/maps/'+folder;
fs.mkdirSync(archive,{recursive:true});fs.mkdirSync(out,{recursive:true});
const W=3072,H=1660,origin={x:4096,y:1860};
const native=await sharp(source).metadata();
fs.copyFileSync(source,path.join(archive,'generated-master-original.png'));
const raw=await sharp(source).resize(W,H,{fit:'fill',kernel:'lanczos3'}).removeAlpha().raw().toBuffer();
const camp=await sharp('public/survival/camp-ground-v3/full-4800.webp').extract({left:origin.x,top:origin.y,width:256,height:H}).removeAlpha().raw().toBuffer();
const south=await sharp({create:{width:W,height:256,channels:3,background:'#000'}}).composite([
 {input:await sharp('public/survival/maps/east-approach-v1/01-camp-approach.webp').extract({left:0,top:0,width:1534,height:256}).png().toBuffer(),left:0,top:0},
 {input:await sharp('public/survival/maps/east-approach-v1/02-woodland-junction.webp').extract({left:0,top:0,width:1538,height:256}).png().toBuffer(),left:1534,top:0}
]).removeAlpha().raw().toBuffer();
const smooth=t=>t*t*(3-2*t);
for(let y=0;y<H;y++)for(let x=0;x<W;x++)for(let c=0;c<3;c++){
 const i=(y*W+x)*3+c;
 if(x<256){const a=x<128?1:1-smooth((x-128)/127);raw[i]=Math.round(raw[i]*(1-a)+camp[(y*256+x)*3+c]*a);}
 if(y>=1404){const a=y>=1532?1:smooth((y-1404)/127);raw[i]=Math.round(raw[i]*(1-a)+south[((y-1404)*W+x)*3+c]*a);}
}
const master=sharp(raw,{raw:{width:W,height:H,channels:3}});
await master.clone().png().toFile(path.join(archive,'registered-master.png'));
const tiles=[{id:'03-camp-east-clearing',x:0},{id:'04-village-trail',x:1534}];
for(const t of tiles)await master.clone().extract({left:t.x,top:0,width:1538,height:1538}).webp({lossless:true,effort:6}).toFile(path.join(out,t.id+'.webp'));
const decoded=await Promise.all(tiles.map(t=>sharp(path.join(out,t.id+'.webp')).removeAlpha().raw().toBuffer()));
let horizontal=0,southJoin=0,campContact=0;
for(let y=0;y<1538;y++)for(let x=0;x<4;x++)for(let c=0;c<3;c++)horizontal=Math.max(horizontal,Math.abs(decoded[0][(y*1538+x+1534)*3+c]-decoded[1][(y*1538+x)*3+c]));
for(let ti=0;ti<2;ti++)for(let y=1532;y<1538;y++)for(let x=0;x<1538;x++)for(let c=0;c<3;c++)southJoin=Math.max(southJoin,Math.abs(decoded[ti][(y*1538+x)*3+c]-south[((y-1404)*W+x+tiles[ti].x)*3+c]));
for(let y=0;y<1404;y++)for(let x=0;x<128;x++)for(let c=0;c<3;c++)campContact=Math.max(campContact,Math.abs(decoded[0][(y*1538+x)*3+c]-camp[(y*256+x)*3+c]));
if(horizontal||southJoin||campContact)throw Error('Terrain contact pixels changed.');
const manifest={name:'Humans Remain — Village approach 01',date:'2026-10-14',method:'Built-in image_gen; deterministic edge registration and lossless texture cuts',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),nativeGeneration:{width:native.width,height:native.height,file:'generated-master-original.png'},registeredMaster:{...origin,width:W,height:H,file:'registered-master.png'},packaging:'Native generated artwork resampled to the existing camp pixel scale; packaged dimensions are not native generation resolution.',tiles:tiles.map(t=>({id:t.id,url:'/survival/maps/'+folder+'/'+t.id+'.webp',x:origin.x+t.x,y:origin.y,width:1538,height:1538,paintHeight:1536})),contacts:{camp:{preservedColumns:128,blendColumns:128},betweenNewTiles:{overlapColumns:4,maxChannelError:horizontal},existingJunction:{sharedSourceRows:[128,134],newSourceRows:[1532,1538],paintBoundaryY:3396,maxChannelError:southJoin},campContactMaxChannelError:campContact},nextExits:{north:{x:6093,y:1860,destination:'Village outskirts'},east:{x:7168,y:2430,destination:'Eastern works approach'}},scope:'Ground and paths only; separately placed buildings, foliage, rocks, water and resources are added later.'};
fs.writeFileSync(path.join(archive,'terrain-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({native:[native.width,native.height],packagedTiles:tiles.map(t=>({file:t.id+'.webp',bytes:fs.statSync(path.join(out,t.id+'.webp')).size})),checks:manifest.contacts}));
