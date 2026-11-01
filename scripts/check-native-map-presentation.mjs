// Whole-map retained coverage used by the UI-thread camera. Pixel checks use
// production Skia tile code through the software shim, not device timing.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'native-map-presentation-'));
try{
 const skia=path.resolve('native/node_modules/@shopify/react-native-skia'),out=path.join(temp,'model.cjs');
 await build({stdin:{contents:`export {createMapTiles} from './native/map-tiles';export {JsiSkApi} from ${JSON.stringify(path.join(skia,'lib/module/skia/web/JsiSkia.js'))};`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:out,logLevel:'error'});
 const m=require(out),nativeRequire=createRequire(path.join(skia,'package.json'));
 const kit=await nativeRequire('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(nativeRequire.resolve('canvaskit-wasm')),f)}),Skia=m.JsiSkApi(kit);
 const area={left:0,top:0,right:4096,bottom:4096,width:4096,height:4096};
 const paths=[{id:'translucent',fill:'#80406080',path:'M0 0H4096V4096H0Z',parts:['M0 0H4096V4096H0Z'],bounds:[0,0,4096,4096]}];
 const tiles=m.createMapTiles(Skia,paths,area),entry={x:400,y:400,width:600,height:400,scale:.6};
 tiles.want(entry,2,48);
 assert.equal(tiles.presentationPicture(),null);
 let operations=0;
 while(!tiles.stats().ready){assert(tiles.nextWork('foreground'));tiles.runWork(48);assert(++operations<100)}
 const base=tiles.presentationPicture();assert(base);assert.equal(tiles.presentationPicture(),base,'Unchanged cache reuses the retained whole-map picture');
 const pixelChecks=()=>{
  const plan=tiles.presentationPlan();
  assert.equal(plan.reduce((sum,p)=>sum+p.dst.width*p.dst.height,0),area.width*area.height,'The retained picture covers the whole map, including outside the JS viewport');
  for(let i=0;i<plan.length;i++)for(let j=i+1;j<plan.length;j++){
   const a=plan[i].dst,b=plan[j].dst;
   assert(!(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y),'Detail and fallback never overlap');
  }
  for(const view of [{x:300,y:300,scale:.6},{x:2800,y:2800,scale:.6},{x:800,y:1400,scale:.25}]){
   const surface=Skia.Surface.Make(320,180),canvas=surface.getCanvas();canvas.clear(Skia.Color('transparent'));canvas.scale(view.scale,view.scale);canvas.translate(-view.x,-view.y);canvas.drawPicture(tiles.presentationPicture());
   const image=surface.makeImageSnapshot(),pixels=image.readPixels(0,0,{width:320,height:180,colorType:4,alphaType:2});
   for(let p=0;p<pixels.length;p+=4)assert(Math.abs(pixels[p+3]-128)<=1,'Panning the UI camera beyond prepared detail never reveals holes, seams or double blending');
   image.dispose();surface.dispose();
  }
 };
 pixelChecks();
 // A partial mix of detailed tiles and base fallback must remain one layer.
 while(tiles.stats().ready<4){tiles.runWork(48);assert(++operations<1000)}
 const detailed=tiles.presentationPicture();assert.notEqual(detailed,base);pixelChecks();
 const far={...entry,x:2800,y:2800};tiles.want(far,2,5);tiles.trim(5);
 while(tiles.pending()){tiles.runWork(5);assert(++operations<3000)}
 assert(tiles.stats().tiles<=5);pixelChecks();
 const final=tiles.presentationPicture();assert.equal(tiles.presentationPicture(),final);
 tiles.dispose();assert.equal(tiles.presentationPicture(),null);assert.equal(tiles.nextWork(),null);assert.equal(tiles.runWork(),false);
 console.log(JSON.stringify({passed:true,operations,checks:['full-map fallback','UI camera outside JS viewport','partial detail single coverage','retained picture identity','trim invalidation','no translucent seams','disposal'],physicalIPhoneTested:false}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
