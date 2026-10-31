// Pixel regression: both axe cuts reuse the approved face, not merely a hair
// bounding box. Raised hands may occlude the face but must not resize its eyes.
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'runner-head-'));
try{
 await build({stdin:{contents:`export * from './src/runner-combat-head';export * from './src/runner-axe-art';export * from './src/survivor-art';export * from './src/skia-adapter';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'check.cjs'),logLevel:'error'});
 const redirects=JSON.parse(fs.readFileSync('server/lossless-artwork-redirects.json'));let prefix='runnerAxe-';const m=require(path.join(tmp,'check.cjs')),kit=await require('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)}),skia=m.JsiSkApi(kit),adapter=m.createSkiaAdapter(skia),font=skia.Font(undefined,14),imgs={};
 for(const [key,url]of Object.entries({...m.SURVIVOR_IMAGE_SOURCES,...m.RUNNER_AXE_IMAGE_SOURCES})){const data=skia.Data.fromBytes(fs.readFileSync('public'+(redirects[url]??url)));imgs[key]=skia.Image.MakeImageFromEncoded(data);data.dispose()}
 const surface=skia.Surface.Make(512,512),scale=3,ox=256,oy=432;
 const render=(view,frame,mirror=false,rawAttack=false)=>{
  const c=new adapter.SkiaContext(surface.getCanvas(),512,512,font);c.clearRect(0,0,512,512);c.save();c.translate(ox,oy);c.scale(mirror?-scale:scale,scale);
  if(frame===undefined){const s=m.SURVIVOR_ART[view].idle,[x,y,w,h]=s.crop;c.drawImage(imgs[s.sheet],x,y,w,h,-s.anchor[0]*s.scale,-s.anchor[1]*s.scale,w*s.scale,h*s.scale)}
  else if(rawAttack){const r=m.RUNNER_AXE_REGISTRATION[view][frame];c.drawImage(imgs[prefix+view],frame%4*384,Math.floor(frame/4)*384,384,384,r.x,r.y,384*r.scaleX,384*r.scaleY)}
  else m.drawRunnerCombatUpper(c,imgs,view,frame,prefix+view);
  c.restore();surface.flush();const snapshot=surface.makeImageSnapshot(),pixels=snapshot.readPixels();snapshot.dispose();c.dispose();return pixels;
 };
 const inside=(x,y,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes}return yes};
 // Eye and cheek interiors, measured in original feet-relative coordinates.
 // Use interior points: antialiased silhouette/collar pixels are not face size.
 const samples={down:[[-13,-67,7,9],[8,-67,7,9],[-5,-57,13,4]],'down-right':[[3,-64,5,8],[19,-69,5,8],[3,-55,6,2]],right:[[20,-70,6,9],[10,-57,6,2]]};
 let compared=0,exact=0;
 for(prefix of ['runnerAxe-','runnerWoodenAxe-'])for(const view of Object.keys(samples))for(const mirror of [false,true]){
  const reference=render(view,undefined,mirror);
  for(let frame=0;frame<8;frame++){
   const actual=render(view,frame,mirror),r=m.RUNNER_AXE_REGISTRATION[view][frame],front=m.RUNNER_COMBAT_FOREGROUND[view][frame].map(([x,y])=>[r.x+x*r.scaleX,r.y+y*r.scaleY]);let count=0;
   for(const [x,y,w,h]of samples[view])for(let py=Math.ceil(oy+y*scale);py<oy+(y+h)*scale;py++)for(let px=Math.ceil(ox+x*scale);px<ox+(x+w)*scale;px++){
    const wx=(px+.5-ox)/scale,wy=(py+.5-oy)/scale;
    if(front.length&&[[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>inside(wx+dx,wy+dy,front)))continue;
    const targetX=mirror?511-px:px,i=(py*512+targetX)*4;
    // The approved PNG has 253/255 alpha in some skin pixels. The torso
    // underneath can change the composite by 1–3 levels, not the eye shape.
    const difference=Math.max(...[0,1,2,3].map(channel=>Math.abs(actual[i+channel]-reference[i+channel])));
    assert(difference<=3,`${view} frame ${frame}, mirror=${mirror}: original face pixel at ${wx.toFixed(2)},${wy.toFixed(2)} changed by ${difference}`);if(difference===0)exact++;count++;
    const originalTone=reference[i]+reference[i+1]+reference[i+2],actualTone=actual[i]+actual[i+1]+actual[i+2];
    if(originalTone<64)assert(actualTone<73,'Original black eye/outline pixel retained');
    if(originalTone>82)assert(actualTone>73,'Eye/outline must not grow into original skin');
   }
   assert(count>100,`${view} ${frame}: the face should remain readable, not be hidden to pass the test`);compared+=count;
   const weapon=render(view,frame,mirror,true),blade=m.runnerAxePoint(view,frame,m.RUNNER_AXE_ART.views[view].blade[frame]);let bladePixels=0;
   for(let dy=-6;dy<=6;dy++)for(let dx=-6;dx<=6;dx++){
    if(dx*dx+dy*dy>36)continue;
    const px=Math.round(ox+(mirror?-1:1)*blade[0]*scale)+dx,py=Math.round(oy+blade[1]*scale)+dy,i=(py*512+px)*4;
    if(weapon[i+3]<250)continue;
    const difference=Math.max(...[0,1,2,3].map(channel=>Math.abs(actual[i+channel]-weapon[i+channel])));
    assert(difference<=3,`${view} ${frame}: registered axe head clipped or replaced`);bladePixels++;
   }
   assert(bladePixels>15,`${view} ${frame}: complete visible axe head`);
  }
 }
 surface.dispose();font.dispose();Object.values(imgs).forEach(i=>i.dispose());adapter.disposeLighting();
 console.log(`PASS: ${compared} original eye/cheek pixels across 96 directional/mirrored steel and wooden axe attack renders (maximum 3/255 source-alpha compositing allowance, ${exact} exact); unchanged eye silhouettes, head registration and complete axe heads through both cuts.`);
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
