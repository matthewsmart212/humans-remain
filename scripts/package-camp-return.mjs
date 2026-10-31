// Register both existing sides and cut the westward return as two ground textures.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {CAMP_RETURN_MASTER,campReturnContacts} from './prepare-camp-return.mjs';
const sharp=createRequire(import.meta.url)('sharp'),source=process.argv[2];
if(!source)throw Error('Pass the generated master PNG.');
const folder='camp-return-v1',archive='artwork-archive/'+folder,out='public/survival/maps/'+folder;
fs.mkdirSync(archive,{recursive:true});fs.mkdirSync(out,{recursive:true});
const {width:W,height:H}=CAMP_RETURN_MASTER,native=await sharp(source).metadata(),{north,east}=await campReturnContacts();
fs.copyFileSync(source,path.join(archive,'generated-master-original.png'));
const raw=await sharp(source).resize(W,H,{fit:'fill',kernel:'lanczos3'}).removeAlpha().raw().toBuffer();
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
for(let y=0;y<260;y++)for(let x=0;x<W;x++)for(let c=0;c<3;c++){
 const a=1-smooth((y-132)/127),i=(y*W+x)*3+c;
 raw[i]=Math.round(raw[i]*(1-a)+north[i]*a);
}
for(let y=0;y<1538;y++)for(let x=0;x<264;x++)for(let c=0;c<3;c++){
 const a=smooth(x/96),i=((y+128)*W+2940+x)*3+c;
 raw[i]=Math.round(raw[i]*(1-a)+east[(y*264+x)*3+c]*a);
}
const master=sharp(raw,{raw:{width:W,height:H,channels:3}});
await master.clone().png().toFile(path.join(archive,'registered-master.png'));
const tiles=[{id:'18-camp-southeast-meadow',left:0,width:1666},{id:'19-camp-works-open-ground',left:1534,width:1538}];
for(const t of tiles)await master.clone().extract({left:t.left,top:128,width:t.width,height:1538}).webp({lossless:true,effort:6}).toFile(path.join(out,t.id+'.webp'));
const decoded=await Promise.all(tiles.map(t=>sharp(path.join(out,t.id+'.webp')).removeAlpha().raw().toBuffer()));
let between=0,northContact=0,eastContact=0;
for(let y=0;y<1538;y++)for(let x=0;x<132;x++)for(let c=0;c<3;c++)between=Math.max(between,Math.abs(decoded[0][(y*1666+1534+x)*3+c]-decoded[1][(y*1538+x)*3+c]));
for(let ti=0;ti<2;ti++)for(let y=0;y<4;y++)for(let x=0;x<tiles[ti].width&&x+tiles[ti].left<2940;x++)for(let c=0;c<3;c++)northContact=Math.max(northContact,Math.abs(decoded[ti][(y*tiles[ti].width+x)*3+c]-north[((y+128)*W+x+tiles[ti].left)*3+c]));
for(let y=0;y<1538;y++)for(let x=0;x<36;x++)for(let c=0;c<3;c++)eastContact=Math.max(eastContact,Math.abs(decoded[1][(y*1538+1502+x)*3+c]-east[(y*264+96+x)*3+c]));
if(between||northContact||eastContact)throw Error('Terrain contact pixels changed.');
const manifest={name:'Humans Remain — Return towards camp',date:'2026-10-14',method:'Built-in image_gen outpaint and material-transition edit; deterministic north/east registration and lossless cuts',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),nativeGeneration:{width:native.width,height:native.height,file:'generated-master-original.png'},registeredMaster:{...CAMP_RETURN_MASTER,file:'registered-master.png'},packaging:'Generated artwork resampled to existing camp scale; packaged dimensions are not native generation resolution.',tiles:tiles.map(t=>({id:t.id,url:'/survival/maps/'+folder+'/'+t.id+'.webp',x:4096+t.left,y:4668,width:t.width,height:1538})),contacts:{north:{masterPreservedRows:132,masterBlendRows:128,outputExactRows:4,exactRegion:'Before the eastern 132-pixel overlap',runtimeOverlap:132,featherRows:36,maxChannelError:northContact},east:{runtimeOverlap:132,registrationBlendColumns:96,exactOutputColumns:36,featherColumns:36,maxChannelError:eastContact},betweenNewTiles:{sharedColumns:132,featherColumns:36,maxChannelError:between}},scope:'Close the previously empty strip beneath the southeast camp approach back west from the works. Both new pieces remain road-free.',next:'Continue west directly beneath the main camp, then wrap its western and northern sides before extending distant districts.'};
fs.writeFileSync(path.join(archive,'terrain-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({native:[native.width,native.height],packagedTiles:tiles.map(t=>({file:t.id+'.webp',bytes:fs.statSync(path.join(out,t.id+'.webp')).size})),checks:manifest.contacts}));
