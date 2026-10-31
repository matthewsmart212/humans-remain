// Register the northern contact, then cut two overlapping southern textures.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {SOUTH_WORKS_MASTER,southWorksNorthContact} from './prepare-south-works.mjs';
const sharp=createRequire(import.meta.url)('sharp'),source=process.argv[2];
if(!source)throw Error('Pass the generated master PNG.');
const folder='south-works-v1',archive='artwork-archive/'+folder,out='public/survival/maps/'+folder;
fs.mkdirSync(archive,{recursive:true});fs.mkdirSync(out,{recursive:true});
const {width:W,height:H}=SOUTH_WORKS_MASTER,native=await sharp(source).metadata();
fs.copyFileSync(source,path.join(archive,'generated-master-original.png'));
const raw=await sharp(source).resize(W,H,{fit:'fill',kernel:'lanczos3'}).removeAlpha().raw().toBuffer(),north=await southWorksNorthContact();
const smooth=t=>t*t*(3-2*t);
for(let y=0;y<260;y++)for(let x=0;x<W;x++)for(let c=0;c<3;c++){
 const a=y<132?1:1-smooth((y-132)/127),i=(y*W+x)*3+c;
 raw[i]=Math.round(raw[i]*(1-a)+north[i]*a);
}
const master=sharp(raw,{raw:{width:W,height:H,channels:3}});
await master.clone().png().toFile(path.join(archive,'registered-master.png'));
const tiles=[{id:'16-south-works-clearing',left:0},{id:'17-scrap-outskirts-trail',left:1406}];
for(const t of tiles)await master.clone().extract({left:t.left,top:128,width:1538,height:1538}).webp({lossless:true,effort:6}).toFile(path.join(out,t.id+'.webp'));
const decoded=await Promise.all(tiles.map(t=>sharp(path.join(out,t.id+'.webp')).removeAlpha().raw().toBuffer()));
let between=0,northContact=0;
for(let y=0;y<1538;y++)for(let x=0;x<132;x++)for(let c=0;c<3;c++)between=Math.max(between,Math.abs(decoded[0][(y*1538+1406+x)*3+c]-decoded[1][(y*1538+x)*3+c]));
for(let ti=0;ti<2;ti++)for(let y=0;y<4;y++)for(let x=0;x<1538;x++)for(let c=0;c<3;c++)northContact=Math.max(northContact,Math.abs(decoded[ti][(y*1538+x)*3+c]-north[((y+128)*W+x+tiles[ti].left)*3+c]));
if(between||northContact)throw Error('Terrain contact pixels changed.');
const manifest={name:'Humans Remain — Southern works and scrap outskirts',date:'2026-10-14',method:'Built-in image_gen outpaint and material-transition edit; deterministic northern registration and lossless cuts',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),nativeGeneration:{width:native.width,height:native.height,file:'generated-master-original.png'},registeredMaster:{...SOUTH_WORKS_MASTER,file:'registered-master.png'},packaging:'Native generated artwork resampled to existing camp scale; packaged dimensions are not native generation resolution.',tiles:tiles.map(t=>({id:t.id,url:'/survival/maps/'+folder+'/'+t.id+'.webp',x:7036+t.left,y:4668,width:1538,height:1538})),contacts:{north:{masterPreservedRows:132,masterBlendRows:128,outputExactRows:4,runtimeOverlap:132,featherRows:36,existingHorizontalContact:'The two original northern neighbours are composited through their existing 36-pixel eastern left feather.',maxChannelError:northContact},betweenNewTiles:{sharedColumns:132,featherColumns:36,maxChannelError:between}},scope:'Two adjoining southern ground pieces. The broad western approach opens into worn work ground, while the smaller eastern trail continues south. Central ground remains road-free and freely walkable.',palette:'Brown and umber compacted earth, muted olive grass and sparse gravel; existing top-left leaves preserved only in the contact, no new red/orange leaves.',nextExits:{coordinateStatus:'Approximate source-pixel guides, not navigation geometry.',south:{x:9410,y:6206,road:'small dirt trail'},west:{x:7036,road:false},east:{x:9980,road:false}}};
fs.writeFileSync(path.join(archive,'terrain-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({native:[native.width,native.height],packagedTiles:tiles.map(t=>({file:t.id+'.webp',bytes:fs.statSync(path.join(out,t.id+'.webp')).size})),checks:manifest.contacts}));
