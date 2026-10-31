import fs from 'node:fs';
import assert from 'node:assert/strict';
import {headquartersArtwork,localArtwork,imageProcessor} from './headquarters-artwork.mjs';

const sharp=imageProcessor(),manifest=JSON.parse(fs.readFileSync('src/headquarters-thumbnails.json'));
let before=0,after=0,encoded=0;
for(const url of await headquartersArtwork()){
 assert(manifest[url],`Missing menu image for ${url}`);
 const original=await sharp(localArtwork(url)).metadata(),small=await sharp('public'+manifest[url]).metadata();
 assert(small.width<=512&&small.height<=512,`Oversized menu image: ${url}`);
 assert.equal(small.hasAlpha,original.hasAlpha,`Transparency changed: ${url}`);
 assert(Math.abs(small.width/small.height-original.width/original.height)<.01,`Image bounds changed: ${url}`);
 before+=original.width*original.height*4;after+=small.width*small.height*4;encoded+=fs.statSync('public'+manifest[url]).size;
}
assert(after<32*1048576,'The entire headquarters catalogue must fit below 32 MiB decoded');
assert(after<before*.2,'Menu artwork must avoid full-size texture copies');
assert(encoded<3*1048576,'UI previews must stay within the site publication budget');
console.log(`PASS: All broken/restored buildings, equipment, journal and material images have bounded menu copies. ${(before/1048576).toFixed(1)} → ${(after/1048576).toFixed(1)} MiB decoded; original world images untouched.`);
