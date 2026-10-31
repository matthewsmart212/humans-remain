import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {ARCHIVE,registered} from './prepare-west-camp.mjs';
const sharp=createRequire(import.meta.url)('sharp'),which=process.argv[2];
const cut=async(file,left,top,width,height)=>sharp(file).extract({left,top,width,height}).png().toBuffer();
if(which==='a1'){
 await sharp({create:{width:1670,height:1922,channels:3,background:'#000'}}).composite([{input:await cut(registered('a1n'),0,0,1670,962),left:0,top:0},{input:await cut(registered('a1s'),0,128,1670,960),left:0,top:962}]).png().toFile(path.join(ARCHIVE,'a1-master.png'));
}else if(which==='a2'){
 const chunks=[];for(const [key,x,y,left,top,width,height]of [['a2nw',0,0,0,0,962,1664],['a2ne',962,0,128,0,964,1664],['a2sw',0,1664,0,42,962,1664],['a2se',962,1664,128,42,964,1664]])chunks.push({input:await cut(registered(key),left,top,width,height),left:x,top:y});
 await sharp({create:{width:1926,height:3328,channels:3,background:'#000'}}).composite(chunks).png().toFile(path.join(ARCHIVE,'a2-master.png'));
}else if(which==='a3'||which==='a4'){
 await sharp({create:{width:1926,height:1672,channels:3,background:'#000'}}).composite([{input:await cut(registered(which+'w'),0,0,962,1672),left:0,top:0},{input:await cut(registered(which+'e'),128,0,964,1672),left:962,top:0}]).png().toFile(path.join(ARCHIVE,which+'-master.png'));
}else throw Error('Use a1, a2, a3 or a4');
console.log(path.join(ARCHIVE,which+'-master.png'));
