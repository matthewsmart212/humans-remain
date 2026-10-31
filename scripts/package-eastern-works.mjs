// Register image_gen artwork against the unchanged west contact, then cut it.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {WORKS_MASTER,westernContact} from './prepare-eastern-works.mjs';
const sharp=createRequire(import.meta.url)('sharp'),source=process.argv[2];
if(!source)throw Error('Pass the generated master PNG.');
const folder='eastern-works-v1',archive='artwork-archive/'+folder,out='public/survival/maps/'+folder;
fs.mkdirSync(archive,{recursive:true});fs.mkdirSync(out,{recursive:true});
const {width:W,height:H}=WORKS_MASTER,native=await sharp(source).metadata();
fs.copyFileSync(source,path.join(archive,'generated-master-original.png'));
const raw=await sharp(source).resize(W,H,{fit:'fill',kernel:'lanczos3'}).removeAlpha().raw().toBuffer(),west=await westernContact();
const smooth=t=>t*t*(3-2*t);
for(let y=0;y<H;y++)for(let x=0;x<260;x++)for(let c=0;c<3;c++){
 const a=x<132?1:1-smooth((x-132)/127),i=(y*W+x)*3+c;
 raw[i]=Math.round(raw[i]*(1-a)+west[(y*260+x)*3+c]*a);
}
const master=sharp(raw,{raw:{width:W,height:H,channels:3}});
await master.clone().png().toFile(path.join(archive,'registered-master.png'));
const tiles=[{id:'07-works-footpath',top:0,height:1406,paintTop:0,paintHeight:1404},{id:'08-works-service-track',top:1272,height:1536,paintTop:132,paintHeight:1404}];
for(const t of tiles)await master.clone().extract({left:128,top:t.top,width:1538,height:t.height}).webp({lossless:true,effort:6}).toFile(path.join(out,t.id+'.webp'));
const decoded=await Promise.all(tiles.map(t=>sharp(path.join(out,t.id+'.webp')).removeAlpha().raw().toBuffer()));
let between=0,westContact=0;
for(let y=0;y<134;y++)for(let x=0;x<1538;x++)for(let c=0;c<3;c++)between=Math.max(between,Math.abs(decoded[0][((1272+y)*1538+x)*3+c]-decoded[1][(y*1538+x)*3+c]));
for(let ti=0;ti<2;ti++)for(let y=0;y<tiles[ti].height;y++)for(let x=0;x<4;x++)for(let c=0;c<3;c++)westContact=Math.max(westContact,Math.abs(decoded[ti][(y*1538+x)*3+c]-west[((y+tiles[ti].top)*260+x+128)*3+c]));
if(between||westContact)throw Error('Terrain contact pixels changed.');
const manifest={name:'Humans Remain — Eastern works approach',date:'2026-10-14',method:'Built-in image_gen outpaint and palette edit; deterministic registration and lossless cuts',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),nativeGeneration:{width:native.width,height:native.height,file:'generated-master-original.png'},registeredMaster:{...WORKS_MASTER,file:'registered-master.png'},packaging:'Native generated artwork resampled to existing camp scale; packaged dimensions are not native generation resolution.',tiles:tiles.map(t=>({id:t.id,url:'/survival/maps/'+folder+'/'+t.id+'.webp',x:7036,y:1992+t.top,width:1538,height:t.height,paintTop:t.paintTop,paintHeight:t.paintHeight})),contacts:{west:{masterPreservedColumns:132,masterBlendColumns:128,outputExactColumns:4,runtimeOverlap:132,maxChannelError:westContact},betweenNewTiles:{sharedRows:134,paintBoundaryY:3396,maxChannelError:between}},palette:'Cool grey-brown and umber soil, muted olive grass, dusty dirt tracks; warm existing western contact retained. Sparse leaves outside the existing contact.',scope:'Ground and paths only. Buildings, water, resources and foliage remain separate assets.',nextExits:{coordinateStatus:'Approximate source-pixel guides for later outpainting, not navigation geometry.',north:{x:8020,y:1992},east:{x:8574,y:3890},south:{x:7820,y:4800}}};
fs.writeFileSync(path.join(archive,'terrain-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({native:[native.width,native.height],packagedTiles:tiles.map(t=>({file:t.id+'.webp',bytes:fs.statSync(path.join(out,t.id+'.webp')).size})),checks:manifest.contacts}));
