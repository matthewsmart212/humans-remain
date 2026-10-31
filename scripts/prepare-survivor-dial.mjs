// Package the approved scenery using the existing stats panel's painted skin.
// Runtime uses small transparent images on both web and native; no SVG filters
// or additional Skia surface are needed while the game is running.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import os from 'node:os';
const require=createRequire(import.meta.url),sharp=require('sharp');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'survivor-dial-'));
try{
 await build({entryPoints:['src/sky-clock.ts'],bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'dial.cjs')});
 const {HORIZON,DIAL_SHAPE,DIAL_ARC}=require(path.join(temp,'dial.cjs'));
 const out='public/survival/ui-survivor-dial-v2';fs.mkdirSync(out,{recursive:true});
 const svg=body=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${HORIZON.width*4}" height="${HORIZON.height*4}" viewBox="0 0 ${HORIZON.width} ${HORIZON.height}">${body}</svg>`);
 // Reuse quiet teal cloth and the real worn/stitched bronze borders. Leave
 // the portrait and crest out, and preserve the small orange corner ties.
 const skin=fs.readFileSync('public/survival/ui-field-kit-v1/vitals.png');
 const texture=(await sharp(skin).extract({left:240,top:48,width:230,height:132}).resize(480,HORIZON.height*4,{fit:'fill'}).png().toBuffer()).toString('base64');
 const cap=await sharp(skin).extract({left:794,top:18,width:40,height:192}).resize(32,HORIZON.height*4,{fit:'fill'}).png().toBuffer();
 const middle=await sharp(skin).extract({left:240,top:18,width:240,height:192}).resize(416,HORIZON.height*4,{fit:'fill'}).png().toBuffer();
 const frame=(await sharp({create:{width:480,height:HORIZON.height*4,channels:4,background:'#0000'}}).composite([{input:await sharp(cap).flop().toBuffer(),left:0,top:0},{input:middle,left:32,top:0},{input:cap,left:448,top:0}]).png().toBuffer()).toString('base64');
 // Shared chrome textures keep web and iOS identical; no runtime filters.
 await sharp(Buffer.from(texture,'base64')).resize(160,HORIZON.height*4,{fit:'fill'}).png({compressionLevel:9}).toFile('public/survival/ui-field-kit-v1/utility-panel.png');
 for(const icon of ['pause','backpack'])await sharp(`public/survival/ui-field-kit-v1/${icon}.png`).grayscale().linear(1.08,28).tint({r:245,g:247,b:235}).png({compressionLevel:9}).toFile(`public/survival/ui-field-kit-v1/${icon}-light.png`);
 for(const night of [false,true]){
  const name=night?'night':'day',scene=fs.readFileSync(`docs/artwork/sky-dial-v2/${name}-scene.png`).toString('base64'),light=night?'#e0e9e1':'#ffe1a0';
  await sharp(svg(`<defs><clipPath id="case"><path d="${DIAL_SHAPE}"/></clipPath><radialGradient id="edge"><stop offset="0" stop-color="#0a2c2b" stop-opacity="0"/><stop offset=".7" stop-color="#0a2c2b" stop-opacity=".08"/><stop offset="1" stop-color="#071c20" stop-opacity=".48"/></radialGradient></defs><g clip-path="url(#case)"><image href="data:image/png;base64,${texture}" width="120" height="${HORIZON.height}" preserveAspectRatio="none"/><image href="data:image/png;base64,${scene}" x="3" y="4" width="114" height="${HORIZON.height-7}" opacity="${night?.4:.46}" preserveAspectRatio="none"/><rect width="120" height="${HORIZON.height}" fill="url(#edge)"/><path d="${DIAL_ARC}" fill="none" stroke="${light}" stroke-opacity=".58" stroke-width=".42"/>${[HORIZON.inset,HORIZON.width-HORIZON.inset].map(x=>`<circle cx="${x}" cy="${HORIZON.baseline}" r="1" fill="${light}"/><circle cx="${x}" cy="${HORIZON.baseline}" r="2.3" fill="${light}" opacity=".09"/>`).join('')}</g>`)).png({compressionLevel:9}).toFile(`${out}/${name}.png`);
 }
 await sharp(svg(`<defs><clipPath id="outer"><rect width="120" height="${HORIZON.height}" rx="${HORIZON.radius}"/></clipPath><mask id="border"><rect width="120" height="${HORIZON.height}" fill="white"/><rect x="4" y="4.5" width="112" height="${HORIZON.height-9}" rx="7" fill="black"/></mask></defs><image href="data:image/png;base64,${frame}" width="120" height="${HORIZON.height}" preserveAspectRatio="none" clip-path="url(#outer)" mask="url(#border)"/>`)).png({compressionLevel:9}).toFile(`${out}/rim.png`);
 for(const [name,color] of [['sun','#ffbc47'],['moon','#b4dbef']]){
  const halo=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="162" height="162" viewBox="0 0 54 54"><defs><radialGradient id="glow"><stop stop-color="${color}" stop-opacity=".66"/><stop offset=".22" stop-color="${color}" stop-opacity=".52"/><stop offset=".45" stop-color="${color}" stop-opacity=".24"/><stop offset=".7" stop-color="${color}" stop-opacity=".07"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><circle cx="27" cy="27" r="27" fill="url(#glow)"/></svg>`);
  await sharp(halo).png({compressionLevel:9}).toFile(`${out}/${name}-glow.png`);
 }
 console.log('Prepared Survivor Dial: shared stats-panel teal cloth, worn bronze edging, subdued day/night scenes, round icons and soft glows.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
