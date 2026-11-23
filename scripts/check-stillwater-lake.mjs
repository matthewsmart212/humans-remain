// The new art must remain registered at every LOD and the calm shader must not
// affect another river reach, the protected waterfalls, or an existing bridge.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),report=JSON.parse(fs.readFileSync('artwork-archive/stillwater-lake-v2/packaging.json'));
const manifest=JSON.parse(fs.readFileSync('src/river-detail-manifest.json')),spec=JSON.parse(fs.readFileSync('src/stillwater-lake-paint.json'));
const checksum=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(report.protectedChanged,0);assert(report.changedPixels>300000);
assert.equal(report.exactSourceCores,30,'All original HD cores were reconstructed without re-encoding loss');assert.equal(report.losslessSamplesVerified,true);
for(const [file,hash]of Object.entries(report.preservedGeometry))assert.equal(checksum(fs.readFileSync(file)),hash,file+' retains the existing geography');
const bundled=fs.readFileSync('native/bundled-art.ts','utf8'),attrs=fs.readFileSync('.gitattributes','utf8');
assert(attrs.includes('/public/survival/stillwater-lake-v2/*.webp -filter'),'Lake art is available in ordinary web/native checkouts');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'stillwater-lake-check-'));
try{
 const file=path.join(temp,'model.cjs');
 await build({stdin:{contents:"export {RIVER_SHADER} from './src/river-art';export {RIVER_BATCHES} from './src/river-layout';export {EAST_TERRAIN_SCALE} from './src/east-approach';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:file,logLevel:'error'});
 const m=require(file),kit=await require('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});
 for(const item of report.exports){
  const bytes=fs.readFileSync('public'+item.image);assert(!bytes.subarray(0,50).toString().includes('git-lfs'),'Real asset bytes '+item.image);
  const image=kit.MakeImageFromEncoded(bytes);assert(image,'Image decodes '+item.image);assert.equal(image.width(),item.width);assert.equal(image.height(),item.height);image.delete();
  assert(bundled.includes(JSON.stringify(item.image)+':require('),'Offline native binding '+item.image);
  if(item.kind==='detail'){
   const patch=manifest.patches.find(p=>p.key===item.key);assert.equal(patch.batch,spec.batch);assert.equal(patch.image,item.image);
   const batch=manifest.batches.find(b=>b.batch===spec.batch),source=m.RIVER_BATCHES[spec.batch].source;
   assert.equal(Math.round(patch.sample.width/source.width*batch.width),item.width);assert.equal(Math.round(patch.sample.height/source.height*batch.height),item.height);
  }else{const section=manifest.sections.find(p=>p.key===item.key.replace(/Preview$/,''));assert.equal(section[item.kind==='preview'?'preview':'image'],item.image)}
 }
 const resources=[],keep=x=>{assert(x);resources.push(x);return x};
 const after=keep(kit.RuntimeEffect.Make(m.RIVER_SHADER));
 const oldLake=m.RIVER_SHADER.replace('float repaintedLake=lakeBatch*stillwaterPaintAmount(source);','float repaintedLake=0.;');assert.notEqual(oldLake,m.RIVER_SHADER);
 const before=keep(kit.RuntimeEffect.Make(oldLake));
 const sample=rgba=>{
  const image=keep(kit.MakeImage({width:1,height:1,colorType:kit.ColorType.RGBA_8888,alphaType:kit.AlphaType.Opaque,colorSpace:kit.ColorSpace.SRGB},new Uint8Array(rgba),4));
  return keep(image.makeShaderOptions(kit.TileMode.Clamp,kit.TileMode.Clamp,kit.FilterMode.Linear,kit.MipmapMode.None));
 };
 const children=[sample([40,115,150,255]),sample([255,255,255,255]),sample([0,0,0,150]),sample([128,230,255,255]),sample([128,180,255,255])];
 const surface=keep(kit.MakeSurface(8,8));
 const render=(effect,batch,point)=>{
  const s=m.EAST_TERRAIN_SCALE,b=batch.source,x=(point[0]-600)*s,y=(point[1]-600)*s;
  const shader=effect.makeShaderWithChildren([b.x,b.y,b.width,b.height,s,2,0,batch.topFade,1,1],children),paint=new kit.Paint();paint.setShader(shader);
  const canvas=surface.getCanvas();canvas.clear(kit.TRANSPARENT);canvas.save();canvas.translate(4-x,4-y);canvas.drawRect(kit.XYWHRect(x-4,y-4,8,8),paint);canvas.restore();surface.flush();
  const image=surface.makeImageSnapshot(),pixels=Buffer.from(image.readPixels(0,0,{width:8,height:8,colorType:kit.ColorType.RGBA_8888,alphaType:kit.AlphaType.Unpremul,colorSpace:kit.ColorSpace.SRGB}));image.delete();paint.delete();shader.delete();return pixels;
 };
 let unchanged=0;
 for(const [index,batch]of m.RIVER_BATCHES.entries())if(index!==spec.batch){const s=batch.source,p=[s.x+s.width*.5,s.y+s.height*.5];assert.deepEqual(render(after,batch,p),render(before,batch,p),'Other reach '+index+' is unchanged');unchanged++}
 const batch=m.RIVER_BATCHES[spec.batch],source=batch.source,toSource=([x,y])=>[source.x+x/spec.masterSize[0]*source.width,source.y+y/spec.masterSize[1]*source.height];
 const protectedPoints=[toSource([500,1000]),...spec.protectedRects.map(({bounds:[x,y,w,h]})=>toSource([x+w*.5,y+h*.5])),[-2575,8600],[-2400,5900]];
 for(const p of protectedPoints){assert.deepEqual(render(after,batch,p),render(before,batch,p),'Protected reach/bridge/waterfall material is unchanged');unchanged++}
 const centre=toSource([1900,1200]);assert.notDeepEqual(render(after,batch,centre),render(before,batch,centre),'New lake material receives its own calm treatment');
 for(const item of resources.reverse())item.delete();
 console.log(JSON.stringify({result:'pass',assets:report.exports.length,otherReachAndProtectedSamples:unchanged,geometryFiles:Object.keys(report.preservedGeometry).length,shaderCompiled:true,sharedNativeShader:true,physicalIPhoneTested:false}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
