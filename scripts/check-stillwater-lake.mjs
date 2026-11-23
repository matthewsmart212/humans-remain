// The new art must remain registered at every LOD and the calm shader must not
// affect another river reach or dry bridge/ground artwork. The water material
// deliberately crosses old paint-export boundaries at the inlet and outlet.
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
 await build({stdin:{contents:"export {RIVER_SHADER} from './src/river-art';export {RIVER_BATCHES} from './src/river-layout';export {EAST_TERRAIN_SCALE} from './src/east-approach';export {WATERFALL_SHADER,WATERFALL_SECTION_SHADER} from './src/waterfall-pilot';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:file,logLevel:'error'});
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
 const oldLake=m.RIVER_SHADER.replace('float repaintedLake=lakeBatch*stillwaterPaintAmount(source);','float repaintedLake=0.;').replace('float lakeWater=lakeBatch*stillwaterWaterAmount(source);','float lakeWater=0.;');assert.notEqual(oldLake,m.RIVER_SHADER);
 const before=keep(kit.RuntimeEffect.Make(oldLake));
 const sample=rgba=>{
  const image=keep(kit.MakeImage({width:1,height:1,colorType:kit.ColorType.RGBA_8888,alphaType:kit.AlphaType.Opaque,colorSpace:kit.ColorSpace.SRGB},new Uint8Array(rgba),4));
  return keep(image.makeShaderOptions(kit.TileMode.Clamp,kit.TileMode.Clamp,kit.FilterMode.Linear,kit.MipmapMode.None));
 };
 const children=[sample([40,115,150,255]),sample([255,255,255,255]),sample([0,0,0,150]),sample([128,230,255,255]),sample([128,180,255,255])];
 const surface=keep(kit.MakeSurface(8,8));
 const render=(effect,batch,point,art=children[0],clock=2,ripples=children[2])=>{
  const s=m.EAST_TERRAIN_SCALE,b=batch.source,x=(point[0]-600)*s,y=(point[1]-600)*s;
  const shader=effect.makeShaderWithChildren([b.x,b.y,b.width,b.height,s,clock,0,batch.topFade,1,1],[art,children[1],ripples,children[3],children[4]]),paint=new kit.Paint();paint.setShader(shader);
  const canvas=surface.getCanvas();canvas.clear(kit.TRANSPARENT);canvas.save();canvas.translate(4-x,4-y);canvas.drawRect(kit.XYWHRect(x-4,y-4,8,8),paint);canvas.restore();surface.flush();
  const image=surface.makeImageSnapshot(),pixels=Buffer.from(image.readPixels(0,0,{width:8,height:8,colorType:kit.ColorType.RGBA_8888,alphaType:kit.AlphaType.Unpremul,colorSpace:kit.ColorSpace.SRGB}));image.delete();paint.delete();shader.delete();return pixels;
 };
 let unchanged=0;
 for(const [index,batch]of m.RIVER_BATCHES.entries())if(index!==spec.batch){const s=batch.source,p=[s.x+s.width*.5,s.y+s.height*.5];assert.deepEqual(render(after,batch,p),render(before,batch,p),'Other reach '+index+' is unchanged');unchanged++}
 const batch=m.RIVER_BATCHES[spec.batch],source=batch.source,toSource=([x,y])=>[source.x+x/spec.masterSize[0]*source.width,source.y+y/spec.masterSize[1]*source.height];
 const protectedPoints=[toSource([500,1000]),toSource([1047,2070]),[-2400,5900]];
 for(const p of protectedPoints){assert.deepEqual(render(after,batch,p),render(before,batch,p),'Other reach and distant waterfall water is unchanged');unchanged++}
 const earth=sample([92,70,42,255]),wood=sample([134,104,67,255]),stone=sample([132,132,125,255]);
 for(const p of [[-2575,8600],toSource([1600,880]),toSource([2450,1150])])for(const art of [earth,wood,stone]){
  assert.deepEqual(render(after,batch,p,art),render(before,batch,p,art),'Dry earth, stone and bridge wood retain their exact pixels');
 }
 const centre=toSource([1900,1200]);assert.notDeepEqual(render(after,batch,centre),render(before,batch,centre),'New lake material receives its own calm treatment');
 const inlet=toSource([1600,880]),outlet=toSource([1510,1690]);
 for(const point of [inlet,outlet]){
  const current=render(after,batch,point),previous=render(before,batch,point);
  assert.notDeepEqual(current,previous,'Water material crosses the old rectangular paint boundary');
  assert(current[1]>current[2],'Lake joins have woodland-green water instead of a cyan patch');
 }
 const gradeOnly=keep(kit.RuntimeEffect.Make(m.RIVER_SHADER.replace('float lakeWater=lakeBatch*stillwaterWaterAmount(source);','float lakeWater=0.;')));
 const emerald=sample([24,60,53,255]);
 // Both paths retain the same ripple treatment inside the painted lake;
 // extending the colour field must preserve its approved deep green paint.
 assert.deepEqual(render(after,batch,centre,emerald),render(gradeOnly,batch,centre,emerald),'Existing emerald water retains its painted colour');
 const leftJoin=render(after,batch,toSource([1634,880])),rightJoin=render(after,batch,toSource([1650,880]));
 assert(leftJoin.every((value,i)=>Math.abs(value-rightJoin[i])<=2),'Old rectangular export boundary has no abrupt colour step');

 // A repeating water pattern makes the real moving-surface shader observable,
 // without depending on an LFS image in a plain CI checkout.
 const pattern=new Uint8Array(64*64*4);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++)pattern[(y*64+x)*4+3]=Math.round(130+90*Math.sin(x*Math.PI/16+y*Math.PI/8));
 const patternImage=keep(kit.MakeImage({width:64,height:64,colorType:kit.ColorType.RGBA_8888,alphaType:kit.AlphaType.Unpremul,colorSpace:kit.ColorSpace.SRGB},pattern,64*4));
 const ripples=keep(patternImage.makeShaderOptions(kit.TileMode.Repeat,kit.TileMode.Repeat,kit.FilterMode.Linear,kit.MipmapMode.None));
 const still=render(after,batch,centre,emerald,0,ripples),moving=render(after,batch,centre,emerald,.75,ripples);
 assert.notDeepEqual(still,moving,'Broad lake ripples visibly travel with world time');
 assert.deepEqual(render(after,batch,centre,wood,0,ripples),render(after,batch,centre,wood,.75,ripples),'Water motion cannot animate dry timber');

 const fall=keep(kit.RuntimeEffect.Make(m.WATERFALL_SECTION_SHADER));
 const fallBefore=keep(kit.RuntimeEffect.Make(m.WATERFALL_SECTION_SHADER.replace('float lakeWater=stillwaterWaterAmount(','float lakeWater=0.*stillwaterWaterAmount(')));
 keep(kit.RuntimeEffect.Make(m.WATERFALL_SHADER));
 const fallRender=(effect,point,art=children[0])=>{
  const s=m.EAST_TERRAIN_SCALE,x=(point[0]-600)*s,y=(point[1]-600)*s;
  const shader=effect.makeShaderWithChildren([x-50,y-60,100,120,2,100,120,0,0,1,1,0,1],[art,children[1],sample([0,0,0,0])]),paint=new kit.Paint();paint.setShader(shader);
  const canvas=surface.getCanvas();canvas.clear(kit.TRANSPARENT);canvas.save();canvas.translate(4-x,4-y);canvas.drawRect(kit.XYWHRect(x-4,y-4,8,8),paint);canvas.restore();surface.flush();
  const image=surface.makeImageSnapshot(),pixels=Buffer.from(image.readPixels(0,0,{width:8,height:8,colorType:kit.ColorType.RGBA_8888,alphaType:kit.AlphaType.Unpremul,colorSpace:kit.ColorSpace.SRGB}));image.delete();paint.delete();shader.delete();return pixels;
 };
 assert.deepEqual(fallRender(fall,[-5400,-4900]),fallRender(fallBefore,[-5400,-4900]),'Unrelated waterfalls retain their exact colour and motion');
 assert.notDeepEqual(fallRender(fall,inlet),fallRender(fallBefore,inlet),'Lake-adjacent waterfall water uses the same material as its surroundings');
 const foam=sample([231,237,235,255]);assert.deepEqual(fallRender(fall,inlet,foam),fallRender(fallBefore,inlet,foam),'White cascade foam remains white');
 for(const item of resources.reverse())item.delete();
 console.log(JSON.stringify({result:'pass',assets:report.exports.length,otherReachAndProtectedSamples:unchanged,dryMaterialSamples:9,continuousLakeJoins:2,movingWaterStillBanks:true,unrelatedWaterfallPreserved:true,geometryFiles:Object.keys(report.preservedGeometry).length,shaderCompiled:true,waterfallShadersCompiled:true,sharedNativeShader:true,physicalIPhoneTested:false}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
