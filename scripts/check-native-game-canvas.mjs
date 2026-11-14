// The native game Canvas is laid out smaller than the screen on 3x iPhones so
// its drawable holds two pixels per point, as web does. This checks the layout
// arithmetic only; it does not run an iOS app or measure GPU time.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'native-game-canvas-'));
try{
 await build({entryPoints:['native/game-canvas.ts'],bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temp,'model.cjs')),layout=m.gameCanvasLayout;
 assert.equal(m.GAME_CANVAS_MAX_DENSITY,2);

 // iPhone 15/16 landscape divides exactly: no extra point from float error.
 assert.deepEqual(layout(852,393,3),{width:568,height:262,scaleX:1.5,scaleY:1.5,density:2,reduced:true});
 assert.deepEqual(layout(393,852,3),{width:262,height:568,scaleX:1.5,scaleY:1.5,density:2,reduced:true});

 // Sizes that do not divide round up to whole points, never below 2x.
 const proMax=layout(956,440,3);
 assert.deepEqual([proMax.width,proMax.height],[638,294]);
 const older=layout(844,390,3);
 assert.deepEqual([older.width,older.height],[563,260]);

 // Devices already at or below the cap keep the original full-size Canvas.
 for(const density of [1,2])assert.deepEqual(layout(844,390,density),{width:844,height:390,scaleX:1,scaleY:1,density,reduced:false});
 // Before the first layout, or with an unusable density, change nothing.
 for(const [w,h,d] of [[0,0,3],[844,0,3],[0,390,3],[844,390,NaN],[NaN,390,3]])assert.equal(layout(w,h,d).reduced,false);

 let cases=0,worstDensity=0,worstPixelShare=0;
 for(const density of [2.5,2.625,3,3.5,4])for(let width=320;width<=1400;width+=7)for(let height=280;height<=1100;height+=13){
  const c=layout(width,height,density);cases++;
  assert(c.reduced);
  assert(Number.isInteger(c.width)&&Number.isInteger(c.height),'Skia sizes its layer from whole points');
  assert(Math.abs(c.width*c.scaleX-width)<1e-9&&Math.abs(c.height*c.scaleY-height)<1e-9,'The enlarged Canvas covers exactly the screen');
  const dx=c.width*density/width,dy=c.height*density/height;
  assert(dx>=2-1e-9&&dy>=2-1e-9,'Never fewer than two pixels per point on either axis');
  assert(dx<2+density/width+1e-9&&dy<2+density/height+1e-9,'At most one whole point above the cap');
  assert(Math.abs(c.density-Math.max(dx,dy))<1e-9);
  worstDensity=Math.max(worstDensity,c.density);
  worstPixelShare=Math.max(worstPixelShare,c.width*c.height/(width*height));
 }
 // A custom cap is honoured for future tuning.
 assert.deepEqual(layout(852,393,3,1.5),{width:426,height:197,scaleX:2,scaleY:393/197,density:197/393*3,reduced:true});

 const phone=layout(852,393,3);
 console.log(JSON.stringify({passed:true,cases,iPhone15:{screenPixels:[852*3,393*3],canvasPixels:[phone.width*3,phone.height*3],pixelShare:+(phone.width*phone.height/(852*393)).toFixed(4)},worstDensity:+worstDensity.toFixed(4),worstPixelShare:+worstPixelShare.toFixed(4),physicalIPhoneTested:false}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
