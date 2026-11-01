// Scheduler lifecycle checks plus real Skia pixel checks for paint reuse.
// These are host regressions, not measurements of physical-iPhone frame rate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'native-rendering-'));
try{
 const skia=path.resolve('native/node_modules/@shopify/react-native-skia'),out=path.join(temp,'checks.cjs');
 await build({stdin:{contents:`export {createMapTiles} from './native/map-tiles';
  export {createSkiaAdapter} from './src/skia-adapter';
  export {JsiSkApi} from ${JSON.stringify(path.join(skia,'lib/module/skia/web/JsiSkia.js'))};`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:out,logLevel:'error'});
 const m=require(out);
 let allocations=0,disposals=0,fail=false;
 const canvas={clear(){},translate(){},scale(){},drawPath(){}};
 const resource=()=>({dispose(){}}),paint=()=>({setAntiAlias(){},setStyle(){},setColor(){},setStrokeWidth(){},dispose(){}});
 const fake={Color:()=>new Float32Array(4),Paint:paint,Path:{MakeFromSVGString:resource},PathBuilder:{Make:()=>({addPath(){},reset(){},detach:resource,dispose(){}})},Surface:{Make:()=>{allocations++;if(fail)return null;return{getCanvas:()=>canvas,makeImageSnapshot:resource,dispose(){disposals++}}}}};
 const area={left:0,top:0,right:4096,bottom:4096,width:4096,height:4096};
 // Multiple batches make a tile yield before completion.
 const paths=Array.from({length:4},(_,n)=>({id:String(n),fill:'#80406080',path:'M0 0H4096V4096H0Z'}));
 const a={x:20,y:20,width:120,height:120,scale:1},b={...a,x:3500,y:3500};
 const tiles=m.createMapTiles(fake,paths,area);
 tiles.want(a,1,48);
 for(let i=1;i<=1000;i++)tiles.want({...a,x:20+i/1000,y:20+i/2000,scale:1+i/100000},1,48);
 assert.equal(tiles.stats().requestBuilds,1,'Subpixel changes with unchanged coverage reuse the request queue');
 tiles.want({...a,x:600},1,48);assert.equal(tiles.stats().requestBuilds,2,'Crossing a tile boundary requests new coverage');
 tiles.want(a,1,48);
 // Finish the base and begin one detailed tile, then move beyond its ring.
 while(!tiles.stats().ready)tiles.step(0,true,48);
 tiles.step(0,true,48);const disposedBefore=disposals;
 tiles.want(b,1,48);
 assert.equal(tiles.stats().cancelledJobs,1,'Unfinished offscreen work is cancelled');
 assert.equal(disposals,disposedBefore+1,'Cancelled raster surfaces are released');
 assert.equal(tiles.stats().tiles,tiles.stats().ready,'Cancelled work is absent from the cache');
 assert.equal(tiles.stats().ready,1,'The complete fallback tile survives a camera move');
 let units=0;while(tiles.pending()){tiles.step(0,true,48);assert(++units<2000)}
 assert(tiles.plan(b,1).every(d=>d.src.width===512),'The new view finishes at its requested density');
 tiles.dispose();assert.equal(disposals,allocations,'Every allocated raster surface is released');
 const retry=m.createMapTiles(fake,paths,area);retry.want(a,1,48);fail=true;
 const beforeFailure=allocations;retry.step(Infinity,true,48);
 assert.equal(allocations,beforeFailure+1,'Allocation failure yields without spinning');
 assert.equal(retry.stats().tiles,0,'Failed allocations never masquerade as cached tiles');
 assert(retry.pending(),'Failed tiles remain retryable');fail=false;
 while(!retry.stats().ready)retry.step(0,true,48);
 assert.equal(retry.stats().allocationFailures,1);retry.dispose();

 const kitRequire=createRequire(path.join(skia,'package.json'));
 const kit=await kitRequire('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(kitRequire.resolve('canvaskit-wasm')),f)});
 const api=m.JsiSkApi(kit);let paints=0;
 const adapter=m.createSkiaAdapter({...api,Paint:()=>{paints++;return api.Paint()}}),font=api.Font(undefined,14);
 const styles=[
  {color:'#c58040',stroke:false,width:1,dash:[],erase:false},
  {color:'#83bdf180',stroke:false,width:1,dash:[],erase:false},
  {color:'#ffe3b3b0',stroke:true,width:2,dash:[],erase:false},
  {color:'#91d38d80',stroke:true,width:3,dash:[3,2],erase:false},
  {color:'#00000080',stroke:false,width:1,dash:[],erase:true},
 ];
 const startPaints=paints;
 const draw=(canvas,cached)=>{
  const ctx=cached?new adapter.SkiaContext(canvas,320,240,font):null;
  for(let i=0;i<1200;i++){
   const style=styles[i%styles.length],alpha=(i%239)/238,rect={x:10+i%29*9,y:10+i%23*8,width:25,height:19};
   if(ctx){ctx.fillStyle=ctx.strokeStyle=style.color;ctx.globalAlpha=alpha;ctx.lineWidth=style.width;ctx.setLineDash(style.dash);ctx.globalCompositeOperation=style.erase?'destination-out':'source-over';ctx[style.stroke?'strokeRect':'fillRect'](rect.x,rect.y,rect.width,rect.height)}
   else{
    const p=api.Paint();p.setAntiAlias(true);p.setColor(api.Color(style.color));p.setAlphaf(p.getAlphaf()*alpha);p.setStyle(style.stroke?1:0);p.setStrokeWidth(style.width);p.setBlendMode(style.erase?8:3);
    const effect=style.dash.length?api.PathEffect.MakeDash(style.dash,0):null;if(effect)p.setPathEffect(effect);
    canvas.drawRect(rect,p);p.dispose();effect?.dispose();
   }
  }
  ctx?.dispose();
 };
 const render=(cached,recorded)=>{
  const surface=api.Surface.Make(320,240),canvas=surface.getCanvas();canvas.clear(api.Color('transparent'));
  if(recorded){const r=api.PictureRecorder(),c=r.beginRecording({x:0,y:0,width:320,height:240});draw(c,cached);const picture=r.finishRecordingAsPicture();canvas.drawPicture(picture);picture.dispose();r.dispose()}
  else draw(canvas,cached);
  const image=surface.makeImageSnapshot(),pixels=image.readPixels();image.dispose();surface.dispose();return pixels;
 };
 for(const recorded of [false,true])assert.deepEqual(render(true,recorded),render(false,recorded),'Animated opacity is pixel-identical to fresh paints, including recorded commands and translucent colour');
 assert.equal(paints-startPaints,styles.length,'2,400 opacity-varying draws use only five cached paints');
 font.dispose();adapter.disposeLighting();
 console.log(JSON.stringify({passed:true,subpixelRequests:1000,requestQueueBuilds:1,opacityVaryingDraws:2400,nativePaintAllocations:paints-startPaints,pixelsIdentical:true,checks:['tile boundary invalidation','obsolete job disposal','complete fallback retained','allocation retry without spin','immediate and recorded alpha/stroke/dash/erase equivalence'],physicalIPhoneTested:false}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
