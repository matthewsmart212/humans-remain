// Lossless crops of registered ImageGen art. No procedural replacement ground.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {ART_VERSION,ARCHIVE,PATCHES,crop,a1East,a2East} from './prepare-west-camp.mjs';
const sharp=createRequire(import.meta.url)('sharp'),out='public/survival/maps/'+ART_VERSION;fs.mkdirSync(out,{recursive:true});
const pieces=[
 {file:'22-southwest-camp-corner.webp',batch:'A1',master:'a1',left:0,top:128,x:-122,y:4412,width:1538,height:1794},
 {file:'23-west-camp-lower.webp',batch:'A2',master:'a2',left:0,top:128,x:-1528,y:3006,width:1794,height:1666},
 {file:'24-southwest-woodland-trail.webp',batch:'A2',master:'a2',left:0,top:1662,x:-1528,y:4540,width:1794,height:1666},
 {file:'25-west-camp-exit.webp',batch:'A3',master:'a3',left:0,top:0,x:-1528,y:1598,width:1794,height:1540},
 {file:'26-west-camp-upper-ground.webp',batch:'A4',master:'a4',left:0,top:0,x:-1528,y:190,width:1794,height:1540},
];
for(const p of pieces){
 const source=path.join(ARCHIVE,p.master+'-master.png'),file=path.join(out,p.file);
 await sharp(source).extract({left:p.left,top:p.top,width:p.width,height:p.height}).webp({lossless:true,effort:6}).toFile(file);
 assert.deepEqual(await crop(file,0,0,p.width,p.height),await crop(source,p.left,p.top,p.width,p.height),'Lossless export '+p.file);
 p.bytes=fs.statSync(file).size;
}
const rawCrop=(raw,w,h,left,top,width,height)=>sharp(raw,{raw:{width:w,height:h,channels:3}}).extract({left,top,width,height}).raw().toBuffer();
const contactChecks=[];
const check=(name,a,b)=>{assert.deepEqual(a,b,name);contactChecks.push({name,maximumChannelError:0})};
const files=pieces.map(p=>path.join(out,p.file));
check('A1 eastern feather against actual camp/southern-trail composite',await crop(files[0],1502,0,36,1794),await rawCrop(await a1East(),264,1922,96,128,36,1794));
check('A1 northern camp contact',await crop(files[0],322,0,1084,36),await crop('public/survival/camp-ground-v3/full-4800.webp',200,4412,1084,36));
for(const index of [1,2])check('A2 '+index+' eastern feather against actual camp/A1 composite',await crop(files[index],1758,0,36,1666),await rawCrop(await a2East(pieces[index].y,1666),264,1666,96,0,36,1666));
check('A2 internal 132-row overlap',await crop(files[1],0,1534,1794,132),await crop(files[2],0,0,1794,132));
check('A3 southern feather matches A2',await crop(files[3],0,1504,1794,36),await crop(files[1],0,96,1794,36));
check('A4 southern feather matches A3',await crop(files[4],0,1504,1794,36),await crop(files[3],0,96,1794,36));
for(const index of [3,4])check(pieces[index].batch+' eastern camp feather',await crop(files[index],1758,0,36,1408),await crop('public/survival/camp-ground-v3/full-4800.webp',230,pieces[index].y,36,1408));
const generations=Object.keys(PATCHES).map(k=>JSON.parse(fs.readFileSync(path.join(ARCHIVE,k+'-generation.json'),'utf8')));
const manifest={version:ART_VERSION,tool:'Built-in image_gen.imagegen',completedBatches:['A1','A2','A3','A4'],nextBatches:['A5','A6'],sourceCoordinates:'Original 4800px camp; no camp translation or rescale',pieces,generations,maximumEnlargement:Math.max(...generations.flatMap(g=>Object.values(g.scale))),contactChecks,prompts:ARCHIVE+'/prompts.json',routeFrontiers:{west:[-1528,2860],southwest:[-1528,5520]},notes:['Only the southwest and western camp approaches are built in this batch; northern and distant districts remain planned.','All new creative pixels come from ten close-up ImageGen passes; crops, registered contact restoration and lossless cuts use Sharp.','A2 is split into two runtime textures to stream independently.','Road-free ground above the western exit and between the two western routes.',...(ART_VERSION==='west-camp-v2'?['Ground-only correction of pieces 22–26: remove baked grass clumps, ferns, rosettes and plant shadows; no new land or placed objects.','Original camp contact strips remain registered and unchanged. This pass does not clean the older 21 extensions.','Depth and density must come from separately placed foliage assets; regional ground colour and existing paths remain in the background.']:[])]};
assert(manifest.maximumEnlargement<=1.1);
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({pieces:pieces.length,bytes:pieces.reduce((n,p)=>n+p.bytes,0),maximumEnlargement:manifest.maximumEnlargement,contactChecks:contactChecks.length}));
