// Native-Skia resource lifetime and pixel-equivalence regression. The software
// backend validates draws and ownership; it does not measure iPhone frame rate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'waterfall-reuse-'));
try{
 const skia=path.resolve('native/node_modules/@shopify/react-native-skia'),out=path.join(temp,'model.cjs');
 await build({stdin:{contents:`export {createSkiaAdapter} from './src/skia-adapter';export * from './src/waterfall-pilot';export {JsiSkApi} from ${JSON.stringify(path.join(skia,'lib/module/skia/web/JsiSkia.js'))};`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:out,logLevel:'error'});
 const m=require(out),kitRequire=createRequire(path.join(skia,'package.json'));
 const kit=await kitRequire('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(kitRequire.resolve('canvaskit-wasm')),f)}),api=m.JsiSkApi(kit);
 let samplers=0,disposedSamplers=0,paints=0,lastPaintShader;
 const liveSamplers=new Set(),imageResources=[];
 const image=(url,tracked=true)=>{
  const data=api.Data.fromBytes(fs.readFileSync('public'+url)),im=api.Image.MakeImageFromEncoded(data);data.dispose();assert(im);imageResources.push(im);
  if(tracked){const make=im.makeShaderOptions.bind(im);im.makeShaderOptions=(...args)=>{
   const shader=make(...args),dispose=shader.dispose.bind(shader);samplers++;liveSamplers.add(shader);
   shader.dispose=()=>{assert(liveSamplers.delete(shader),'Each cached sampler is disposed exactly once');disposedSamplers++;dispose()};return shader;
  }}return im;
 };
 const urls=Object.values(m.WATERFALL_IMAGES),images=urls.map(url=>image(url)),references=urls.map(url=>image(url,false));
 const adapter=m.createSkiaAdapter({...api,Paint:()=>{
  paints++;const paint=api.Paint(),set=paint.setShader.bind(paint);paint.setShader=shader=>{lastPaintShader=shader;set(shader)};return paint;
 }}),font=api.Font(undefined,14),initialPaints=paints;
 const pilot=api.RuntimeEffect.Make(m.WATERFALL_SHADER),section=api.RuntimeEffect.Make(m.WATERFALL_SECTION_SHADER);assert(pilot&&section);
 const sampling={nativeSize:[280,260],region:[0,0,1,1],direction:[.6,.8]};
 const freshDraw=(canvas,ims,b,time,alpha,sectionDraw,core=b)=>{
  const children=ims.map(im=>im.makeShaderOptions(0,0,1,0));
  const [x,y,w,h]=sampling.region,[width,height]=sampling.nativeSize;
  const uniforms=sectionDraw?[b.x,b.y,b.width,b.height,time,width,height,x*ims[0].width(),y*ims[0].height(),w*ims[0].width()/width,h*ims[0].height()/height,...sampling.direction]:[b.x,b.y,b.width,b.height,time];
  const shader=(sectionDraw?section:pilot).makeShaderWithChildren(uniforms,children),paint=api.Paint();paint.setShader(shader);paint.setAlphaf(alpha);paint.setAntiAlias(false);
  canvas.drawRect(core,paint);paint.dispose();shader.dispose();for(const child of children)child.dispose();
 };
 const render=(cached,recorded,timeOffset=0,ims=images,releaseAfterRecording=false)=>{
  const surface=api.Surface.Make(340,270),screen=surface.getCanvas();screen.clear(api.Color('#193f46'));
  const recorder=recorded?api.PictureRecorder():null,canvas=recorder?recorder.beginRecording({x:0,y:0,width:340,height:270}):screen;
  const ctx=cached?new adapter.SkiaContext(canvas,340,270,font):null;
  for(let i=0;i<8;i++){
   const b={x:10+i*18,y:8+i*13,width:190,height:160},time=timeOffset+i*.17,alpha=[.18,.65,1,.4][i%4],sectionDraw=i%2===1,core=sectionDraw?{x:b.x+5,y:b.y+9,width:b.width-11,height:b.height-17}:b;
   if(ctx){ctx.globalAlpha=alpha;if(sectionDraw)ctx.drawWaterfallSection(...ims,b,time,sampling,core);else ctx.drawWaterfallPilot(...ims,b,time)}
   else freshDraw(canvas,references,b,time,alpha,sectionDraw,core);
  }
  ctx?.dispose();
  if(recorder){const picture=recorder.finishRecordingAsPicture();if(releaseAfterRecording)adapter.releaseImage(ims[1]);screen.drawPicture(picture);picture.dispose();recorder.dispose()}
  surface.flush();const snapshot=surface.makeImageSnapshot(),pixels=snapshot.readPixels();snapshot.dispose();surface.dispose();return pixels;
 };
 for(const recorded of [false,true]){
  assert.deepEqual(render(true,recorded),render(false,recorded),'Cached samplers/paint match fresh resources for alpha, moving uniforms and clipped sections');
  assert.equal(lastPaintShader,null,'Reusable paint never retains the last time-varying shader');
 }
 assert.equal(samplers,3,'Repeated pilot/section draws create three immutable samplers');
 assert.equal(paints-initialPaints,1,'All waterfall draws share one paint');
 assert.notDeepEqual(render(true,false,0),render(true,false,.4),'The waterfall animation still changes with simulation time');
 assert.deepEqual(render(true,true,0,images,true),render(false,true),'Recorded commands remain valid after releasing cached samplers');
 assert.equal(liveSamplers.size,0,'Releasing any dependent image removes its sampler set');
 const beforeReload=samplers;
 assert.deepEqual(render(true,false),render(false,false),'Released images can warm their samplers again without a visual change');
 assert.equal(samplers-beforeReload,3);
 const swapped=[image(urls[0]),images[1],images[2]],beforeSwap=samplers;
 assert.deepEqual(render(true,true,0,swapped),render(false,true),'A replacement image handle uses its own matching immutable samplers');
 assert.equal(samplers-beforeSwap,3);
 adapter.releaseImage(swapped[0]);assert.equal(liveSamplers.size,3,'Image invalidation leaves unrelated sampler sets intact');

 // A failed sampler creation does not leak earlier children or poison retry.
 const broken=[image(urls[0]),image(urls[1]),images[2]],makeMask=broken[1].makeShaderOptions;
 broken[1].makeShaderOptions=()=>{throw Error('Synthetic sampler failure')};
 const canvas={drawRect(){}};let ctx=new adapter.SkiaContext(canvas,340,270,font),beforeFailure=liveSamplers.size;
 assert.throws(()=>ctx.drawWaterfallPilot(...broken,{x:0,y:0,width:30,height:30},0),/Synthetic sampler failure/);ctx.dispose();
 assert.equal(liveSamplers.size,beforeFailure,'Partial construction releases already-created children');
 broken[1].makeShaderOptions=makeMask;
 ctx=new adapter.SkiaContext({drawRect(){throw Error('Synthetic draw failure')}},340,270,font);
 assert.throws(()=>ctx.drawWaterfallPilot(...broken,{x:0,y:0,width:30,height:30},0),/Synthetic draw failure/);ctx.dispose();
 assert.equal(lastPaintShader,null,'A failed draw still clears the reusable paint shader');
 adapter.releaseImage(broken[0]);

 // Streamed image churn stays bounded while evicting older sampler sets.
 for(let i=0;i<40;i++){
  const group=[image(urls[0]),images[1],images[2]],c=new adapter.SkiaContext(canvas,1,1,font);
  c.drawWaterfallPilot(...group,{x:0,y:0,width:1,height:1},i);c.dispose();
  assert(liveSamplers.size<=32*3,'Sampler ownership remains within the fixed cache budget');
 }
 assert.equal(liveSamplers.size,32*3);
 adapter.releaseImage(images[1]);assert.equal(liveSamplers.size,0,'Releasing a shared mask clears every dependent set');
 render(true,false);assert.equal(liveSamplers.size,3);
 adapter.disposeLighting();assert.equal(liveSamplers.size,0,'Renderer disposal releases the remaining cached samplers');
 assert.equal(samplers,disposedSamplers);assert.equal(paints-initialPaints,1,'Streaming and failures never allocate an extra waterfall paint');
 for(const im of imageResources)im.dispose();font.dispose();pilot.dispose();section.dispose();
 console.log(JSON.stringify({passed:true,pixelsIdentical:true,repeatedDrawSamplerAllocations:3,waterfallPaintAllocations:1,maxCachedSamplerSets:32,checks:['pilot and section pixels','recorded alpha/time capture','animation remains live','image replacement and release','partial creation failure','draw failure shader cleanup','bounded image churn','native resource disposal'],physicalIPhoneTested:false}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
