// Run the drawing adapter with both browser Skia and the installed native SDK's
// API. Reject legacy mutation on native paths: the web shim otherwise conceals
// the exact undefined-method failure that occurs on an iPhone.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'skia-paths-'));
try{
 const results=[];
 for(const target of ['browser','native']){
  const root=path.resolve(target==='native'?'native/node_modules':'node_modules');
  const skia=path.join(root,'@shopify/react-native-skia');
  const out=path.join(temp,target+'.cjs');
  await build({stdin:{contents:`export * from './src/skia-drawing-path';export * from './src/skia-adapter';export * from './src/weather-skia';export * from './src/ground-lightning-skia';export {JsiSkApi} from ${JSON.stringify(path.join(skia,'lib/module/skia/web/JsiSkia.js'))};`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:out,logLevel:'error'});
  const m=require(out),kitRequire=createRequire(path.join(skia,'package.json'));
  const kit=await kitRequire('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(kitRequire.resolve('canvaskit-wasm')),f)});
  const api=m.JsiSkApi(kit);
  if(target==='native'){
   assert(api.PathBuilder,'The installed iOS Skia uses PathBuilder');
   const make=api.Path.Make.bind(api.Path);
   api.Path.Make=()=>new Proxy(make(),{get(object,key){if(['moveTo','lineTo','close','reset','addArc','addOval'].includes(key))throw Error('Removed native path mutation: '+String(key));return Reflect.get(object,key)}});
  }
  const builder=m.createDrawingPath(api);builder.moveTo(0,0);builder.lineTo(10,20);builder.close();
  const first=builder.path();assert.equal(builder.path(),first,'Repeated draws share the same immutable geometry');builder.lineTo(20,30);if(target==='native')assert.notEqual(builder.path(),first);builder.dispose();builder.dispose();
  const surface=api.Surface.Make(844,390),font=api.Font(undefined,20),adapter=m.createSkiaAdapter(api),ctx=new adapter.SkiaContext(surface.getCanvas(),844,390,font);
  ctx.fillStyle='#225449';ctx.fillRect(0,0,844,390);ctx.beginPath();ctx.moveTo(30,30);ctx.lineTo(180,40);ctx.lineTo(100,180);ctx.closePath();ctx.fill();ctx.stroke();ctx.save();ctx.clip();ctx.fillRect(0,0,240,240);ctx.restore();ctx.beginPath();ctx.ellipse(320,90,60,30);ctx.arc(380,90,30,0,Math.PI*2);ctx.fill();ctx.dispose();
  const weather=m.createWeatherRenderer(api),lightning=m.createGroundLightningRenderer(api),canvas=surface.getCanvas();
  const state={time:2,rainTravel:100,rain:1,heavy:.7,fog:1,flash:.2,reducedMotion:false};
  const view={x:0,y:0,width:844,height:390,scale:1,pixelRatio:1},shelters=[[[20,20],[200,20],[200,200],[20,200]]];
  weather.draw(canvas,state,view,.5,shelters);weather.draw(canvas,{...state,time:3},view,.5,shelters);
  const strike={x:420,y:350,height:260,seed:512};lightning.draw(canvas,strike,.1);lightning.draw(canvas,strike,.15);lightning.draw(canvas,{...strike,seed:640},.1);
  surface.flush();const image=surface.makeImageSnapshot();assert(image.encodeToBytes().length>5000,'Paths, rain, fog and lightning render pixels');
  image.dispose();weather.dispose();lightning.dispose();adapter.disposeLighting();surface.dispose();font.dispose();
  results.push({target,version:JSON.parse(fs.readFileSync(path.join(skia,'package.json'))).version,removedNativeMethodsRejected:target==='native'});
 }
 console.log(JSON.stringify({passed:true,results,checks:['gameplay paths','path snapshot reuse/disposal','clipping','rain shelters','fog','lightning'],physicalIPhoneTested:false},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
