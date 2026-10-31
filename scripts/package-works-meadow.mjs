// Preserve both existing contacts and cut the meadow at neighbour boundaries.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {WORKS_MEADOW_MASTER,meadowContacts} from './prepare-works-meadow.mjs';
const sharp=createRequire(import.meta.url)('sharp'),source=process.argv[2];
if(!source)throw Error('Pass the generated master PNG.');
const folder='works-meadow-v1',archive='artwork-archive/'+folder,out='public/survival/maps/'+folder;
fs.mkdirSync(archive,{recursive:true});fs.mkdirSync(out,{recursive:true});
const {width:W,height:H}=WORKS_MEADOW_MASTER,native=await sharp(source).metadata();
fs.copyFileSync(source,path.join(archive,'generated-master-original.png'));
const raw=await sharp(source).resize(W,H,{fit:'fill',kernel:'lanczos3'}).removeAlpha().raw().toBuffer(),{west,south}=await meadowContacts();
const smooth=t=>t*t*(3-2*t);
for(let y=0;y<H;y++)for(let x=0;x<W;x++)for(let c=0;c<3;c++){
 const i=(y*W+x)*3+c;
 if(x<260){const a=x<132?1:1-smooth((x-132)/127);raw[i]=Math.round(raw[i]*(1-a)+west[(y*260+x)*3+c]*a);}
 if(y>=1668){const a=y>=1796?1:smooth((y-1668)/127);raw[i]=Math.round(raw[i]*(1-a)+south[((y-1668)*W+x)*3+c]*a);}
}
const master=sharp(raw,{raw:{width:W,height:H,channels:3}});
await master.clone().png().toFile(path.join(archive,'registered-master.png'));
const tiles=[{id:'13-works-meadow',top:0,height:1538,paintTop:0,paintHeight:1536},{id:'14-meadow-south-contact',top:1404,height:266,paintTop:132,paintHeight:132},{id:'15-meadow-yard-contact',top:1536,height:266,paintTop:132,paintHeight:132}];
for(const t of tiles)await master.clone().extract({left:128,top:t.top,width:1538,height:t.height}).webp({lossless:true,effort:6}).toFile(path.join(out,t.id+'.webp'));
const decoded=await Promise.all(tiles.map(t=>sharp(path.join(out,t.id+'.webp')).removeAlpha().raw().toBuffer()));
let between=0,westContact=0,southContact=0;
for(let ti=0;ti<2;ti++)for(let y=0;y<134;y++)for(let x=0;x<1538;x++)for(let c=0;c<3;c++)between=Math.max(between,Math.abs(decoded[ti][((tiles[ti+1].top-tiles[ti].top+y)*1538+x)*3+c]-decoded[ti+1][(y*1538+x)*3+c]));
for(let ti=0;ti<3;ti++)for(let y=0;y<tiles[ti].height;y++)for(let x=0;x<4;x++)for(let c=0;c<3;c++)westContact=Math.max(westContact,Math.abs(decoded[ti][(y*1538+x)*3+c]-west[((y+tiles[ti].top)*260+x+128)*3+c]));
for(let y=260;y<266;y++)for(let x=0;x<1538;x++)for(let c=0;c<3;c++)southContact=Math.max(southContact,Math.abs(decoded[2][(y*1538+x)*3+c]-south[((y-132)*W+x+128)*3+c]));
if(between||westContact||southContact)throw Error('Terrain contact pixels changed.');
const manifest={name:'Humans Remain — Works meadow',date:'2026-10-14',method:'Built-in image_gen; deterministic west/south registration and lossless cuts',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),nativeGeneration:{width:native.width,height:native.height,file:'generated-master-original.png'},registeredMaster:{...WORKS_MEADOW_MASTER,file:'registered-master.png'},packaging:'Native generated artwork resampled to existing camp scale; packaged dimensions are not native generation resolution.',tiles:tiles.map(t=>({id:t.id,url:'/survival/maps/'+folder+'/'+t.id+'.webp',x:8442,y:456+t.top,width:1538,height:t.height,paintTop:t.paintTop,paintHeight:t.paintHeight})),contacts:{west:{masterPreservedColumns:132,masterBlendColumns:128,outputExactColumns:4,runtimeOverlap:132,featherColumns:36,maxChannelError:westContact},betweenNewTiles:{sharedRowsPerJoin:134,paintBoundaryYs:[1992,2124],maxChannelError:between},existingYard:{sharedSourceRows:[128,134],newContactRows:[260,266],paintBoundaryY:2256,maxChannelError:southContact}},scope:'One open meadow with two short southern contact strips. One dirt path connects existing west and south routes; the northern half and eastern margin have no roads. All built ground remains freely walkable.',palette:'Muted olive/green grass, exposed brown earth and deeper umber patches, quiet texture and no added red/orange leaves.',nextExits:{coordinateStatus:'Open ground boundaries for later outpainting, not required road exits.',north:{y:456,road:false},east:{x:9980,road:false}}};
fs.writeFileSync(path.join(archive,'terrain-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({native:[native.width,native.height],packagedTiles:tiles.map(t=>({file:t.id+'.webp',bytes:fs.statSync(path.join(out,t.id+'.webp')).size})),checks:manifest.contacts}));
