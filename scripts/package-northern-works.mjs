// Register image_gen artwork against both unchanged neighbours and cut it.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {NORTH_WORKS_MASTER,northWorksContacts} from './prepare-northern-works.mjs';
const sharp=createRequire(import.meta.url)('sharp'),source=process.argv[2];
if(!source)throw Error('Pass the generated master PNG.');
const folder='northern-works-v1',archive='artwork-archive/'+folder,out='public/survival/maps/'+folder;
fs.mkdirSync(archive,{recursive:true});fs.mkdirSync(out,{recursive:true});
const {width:W,height:H}=NORTH_WORKS_MASTER,native=await sharp(source).metadata();
fs.copyFileSync(source,path.join(archive,'generated-master-original.png'));
const raw=await sharp(source).resize(W,H,{fit:'fill',kernel:'lanczos3'}).removeAlpha().raw().toBuffer(),{west,south}=await northWorksContacts();
const smooth=t=>t*t*(3-2*t);
for(let y=0;y<H;y++)for(let x=0;x<W;x++)for(let c=0;c<3;c++){
 const i=(y*W+x)*3+c;
 if(x<260){const a=x<132?1:1-smooth((x-132)/127);raw[i]=Math.round(raw[i]*(1-a)+west[(y*260+x)*3+c]*a);}
 if(y>=1536){const a=y>=1664?1:smooth((y-1536)/127);raw[i]=Math.round(raw[i]*(1-a)+south[((y-1536)*W+x)*3+c]*a);}
}
const master=sharp(raw,{raw:{width:W,height:H,channels:3}});
await master.clone().png().toFile(path.join(archive,'registered-master.png'));
const tiles=[{id:'09-north-works-clearing',top:0,height:1538,paintTop:0,paintHeight:1536},{id:'10-works-trail-connector',top:1404,height:266,paintTop:132,paintHeight:132}];
for(const t of tiles)await master.clone().extract({left:128,top:t.top,width:1538,height:t.height}).webp({lossless:true,effort:6}).toFile(path.join(out,t.id+'.webp'));
const decoded=await Promise.all(tiles.map(t=>sharp(path.join(out,t.id+'.webp')).removeAlpha().raw().toBuffer()));
let between=0,westContact=0,southContact=0;
for(let y=0;y<134;y++)for(let x=0;x<1538;x++)for(let c=0;c<3;c++)between=Math.max(between,Math.abs(decoded[0][((1404+y)*1538+x)*3+c]-decoded[1][(y*1538+x)*3+c]));
for(let ti=0;ti<2;ti++)for(let y=0;y<tiles[ti].height;y++)for(let x=0;x<4;x++)for(let c=0;c<3;c++)westContact=Math.max(westContact,Math.abs(decoded[ti][(y*1538+x)*3+c]-west[((y+tiles[ti].top)*260+x+128)*3+c]));
for(let y=260;y<266;y++)for(let x=0;x<1538;x++)for(let c=0;c<3;c++)southContact=Math.max(southContact,Math.abs(decoded[1][(y*1538+x)*3+c]-south[((y-132)*W+x+128)*3+c]));
if(between||westContact||southContact)throw Error('Terrain contact pixels changed.');
const manifest={name:'Humans Remain — Northern works connection',date:'2026-10-14',method:'Built-in image_gen; deterministic contact registration and lossless cuts',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),nativeGeneration:{width:native.width,height:native.height,file:'generated-master-original.png'},registeredMaster:{...NORTH_WORKS_MASTER,file:'registered-master.png'},packaging:'Native generated artwork resampled to existing camp scale; packaged dimensions are not native generation resolution.',tiles:tiles.map(t=>({id:t.id,url:'/survival/maps/'+folder+'/'+t.id+'.webp',x:7036,y:456+t.top,width:1538,height:t.height,paintTop:t.paintTop,paintHeight:t.paintHeight})),contacts:{west:{masterPreservedColumns:132,masterBlendColumns:128,outputExactColumns:4,runtimeOverlap:132,featherColumns:36,maxChannelError:westContact},betweenNewTiles:{sharedRows:134,paintBoundaryY:1992,maxChannelError:between},existingWorks:{sharedSourceRows:[128,134],newConnectorRows:[260,266],paintBoundaryY:2124,maxChannelError:southContact}},scope:'Ground and dirt paths only. The main clearing closes the northern corner; the shorter connector registers its southern contact without changing existing textures.',nextExits:{coordinateStatus:'Approximate source-pixel guides, not navigation geometry.',north:{x:8000,y:456},east:{x:8574,y:1360}}};
fs.writeFileSync(path.join(archive,'terrain-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({native:[native.width,native.height],packagedTiles:tiles.map(t=>({file:t.id+'.webp',bytes:fs.statSync(path.join(out,t.id+'.webp')).size})),checks:manifest.contacts}));
