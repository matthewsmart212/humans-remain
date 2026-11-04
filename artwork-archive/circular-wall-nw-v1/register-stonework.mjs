// Register ImageGen's stonework inside the original wall's foundation only.
// Existing timber pixels, alpha, dimensions and every placement stay intact.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),sharp=require('sharp');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const directory=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(directory,'../..');
const originalPath=path.join(root,'public/survival/camp-circular-wall-weathered-v1/wall-15.png');
const generatedPath=path.join(directory,'generated/wall-15-stonework.png');
const output=path.join(root,'public/survival/camp-circular-wall-nw-v1');
const reportPath=path.join(directory,'registration-report.json');
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const original=await sharp(originalPath).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const generated=await sharp(generatedPath).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const {width,height}=original.info;
assert.equal(width,670);assert.equal(height,672);
function bounds({data,info}){
 let left=info.width,top=info.height,right=-1,bottom=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}
 assert(right>=left);return{left,top,width:right-left+1,height:bottom-top+1};
}
const sourceBounds=bounds(generated),targetBounds=bounds(original);
const registered=await sharp(generatedPath).extract(sourceBounds).resize(targetBounds.width,targetBounds.height,{fit:'fill',kernel:'lanczos3'}).png().toBuffer();
const aligned=await sharp({create:{width,height,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:registered,left:targetBounds.left,top:targetBounds.top}]).raw().toBuffer();
const maskCanvas=createCanvas(width,height),maskContext=maskCanvas.getContext('2d');
const foundation=[
 [109,581],[121,562],[146,546],[181,525],[217,505],[252,485],[288,463],[323,441],
 [349,423],[355,410],[378,400],[399,386],[436,366],[473,347],[510,326],[548,303],
 [585,281],[621,263],[638,257],[647,269],[647,327],[113,650],[102,635],[102,604],
];
function polygon(context,points,fill){context.fillStyle=fill;context.beginPath();points.forEach(([x,y],i)=>i?context.lineTo(x,y):context.moveTo(x,y));context.closePath();context.fill();}
polygon(maskContext,foundation,'white');
// Explicit exclusion hulls retain the road-end and intermediate timber posts.
const protectedPosts=[[[15,300],[125,300],[125,555],[106,578],[102,625],[74,657],[15,600]],[[286,105],[403,105],[400,387],[376,411],[346,412],[329,393]]];
for(const points of protectedPosts)polygon(maskContext,points,'black');
const mask=maskContext.getImageData(0,0,width,height).data;
const pixels=Buffer.from(original.data);let changedPixels=0,protectedPixelsVerified=0,visibleChangedPixels=0;
let minX=width,minY=height,maxX=-1,maxY=-1;
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const p=(y*width+x)*4,weight=mask[p]/255*mask[p+3]/255*aligned[p+3]/255;
 if(weight&&original.data[p+3])for(let c=0;c<3;c++)pixels[p+c]=Math.round(original.data[p+c]*(1-weight)+aligned[p+c]*weight);
 assert.equal(pixels[p+3],original.data[p+3],'Keep every alpha byte');
 if(!mask[p]){assert(pixels.subarray(p,p+4).equals(original.data.subarray(p,p+4)));protectedPixelsVerified++;}
 if(!pixels.subarray(p,p+4).equals(original.data.subarray(p,p+4))){changedPixels++;if(pixels[p+3])visibleChangedPixels++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
}
assert(changedPixels>15000,'The stonework edit must be visible');
fs.mkdirSync(output,{recursive:true});fs.mkdirSync(path.join(directory,'previews'),{recursive:true});
const png=await sharp(pixels,{raw:{width,height,channels:4}}).png().toBuffer();
const webp=await sharp(png).webp({lossless:true,effort:6,alphaQuality:100}).toBuffer();
const encoded=await sharp(webp).ensureAlpha().raw().toBuffer();
for(let p=0;p<pixels.length;p+=4){assert.equal(pixels[p+3],encoded[p+3]);if(pixels[p+3])for(let c=0;c<3;c++)assert.equal(pixels[p+c],encoded[p+c]);}
fs.writeFileSync(path.join(directory,'wall-15.png'),png);
fs.writeFileSync(path.join(output,'wall-15.webp'),webp);
fs.writeFileSync(path.join(directory,'previews/foundation-mask.png'),maskCanvas.toBuffer('image/png'));
const comparison=createCanvas(width*2+24,height+40),ctx=comparison.getContext('2d');
ctx.fillStyle='#17362d';ctx.fillRect(0,0,comparison.width,comparison.height);ctx.font='22px sans-serif';ctx.fillStyle='#f5ead1';ctx.fillText('Before',12,28);ctx.fillText('Matched stonework',width+24,28);
ctx.drawImage(await loadImage(originalPath),0,40);ctx.drawImage(await loadImage(png),width+24,40);
fs.writeFileSync(path.join(directory,'previews/stonework-before-after.jpg'),comparison.toBuffer('image/jpeg',95));
const report={result:'pass',source:'Built-in ImageGen edit; stonework registered inside the original foundation mask',originalImage:'public/survival/camp-circular-wall-weathered-v1/wall-15.png',originalSha256:hash(fs.readFileSync(originalPath)),generatedImage:'generated/wall-15-stonework.png',generatedSha256:hash(fs.readFileSync(generatedPath)),sourceBounds,targetBounds,size:[width,height],foundationMask:foundation,protectedPostHulls:protectedPosts,changedPixels,visibleChangedPixels,protectedPixelsVerified,changedBounds:[minX,minY,maxX,maxY],allAlphaBytesIdentical:true,allPixelsOutsideFoundationIdentical:true,timberPreserved:true,pngSha256:hash(png),webpSha256:hash(webp),losslessVisiblePixelsVerified:true,placementAndCollisionChanges:0};
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
