// Exercises the same CanvasKit adapter as the live Site, without a browser.
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),init=require('canvaskit-wasm');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'locomotion-skia-'));
try{
 await build({stdin:{contents:`export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';export * from './src/skia-adapter';export * from './src/worker-renderer';export * from './src/survival-engine';export * from './src/survivor-art';export * from './src/world-layout';export * from './src/player-presentation';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'test.mjs')});
 const kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});globalThis.CanvasKit=kit;
 const m=await import(pathToFileURL(path.join(dir,'test.mjs'))),skia=m.JsiSkApi(kit);
 const detail=process.argv.includes('--detail'),running=process.argv.includes('--run'),width=detail?1280:960,height=detail?900:640;
 const {SkiaContext}=m.createSkiaAdapter(skia),surface=skia.Surface.Make(width,height),font=skia.Font(undefined,14);
 const imgs={};for(const [key,url] of Object.entries(m.SURVIVOR_IMAGE_SOURCES)){const data=skia.Data.fromBytes(fs.readFileSync('public'+url));imgs[key]=skia.Image.MakeImageFromEncoded(data);data.dispose()}
 const w=m.createWorld(),out=process.argv[2]||'/tmp/locomotion-skia';fs.mkdirSync(out,{recursive:true});
 const directions=Object.keys(m.SURVIVOR_ART),scenario=process.argv.includes('--scenario'),total=scenario?240:48;
 const worlds=directions.map(direction=>{const world=m.createWorld(m.emptyLayout());Object.assign(world.player,{x:1500,y:1500,direction});return world});
 for(let frame=0;frame<total;frame++){
  const ctx=new SkiaContext(surface.getCanvas(),width,height,font);ctx.fillStyle='#426552';ctx.fillRect(0,0,width,height);
  for(let i=0;i<8;i++){
   const x=detail?160+(i%4)*320:120+(i%4)*240,y=detail?365+Math.floor(i/4)*450:190+Math.floor(i/4)*320;
   if(scenario){
    const world=worlds[i],time=frame/60,angle=m.DIRECTION_ANGLES[directions[(i+(time>2.25?1:0))%8]],moving=time>.3&&time<3.3;
    const previous=m.samplePlayer(world);m.movePlayer(world,moving?{x:Math.cos(angle),y:Math.sin(angle)}:{x:0,y:0},time>1.3&&time<2.3);world.tick++;
    Object.assign(w.player,m.presentPlayer(world,previous,.5).player,{x,y});
   }else Object.assign(w.player,{x,y,direction:directions[i],moving:true,sprinting:running,runBlend:running?1:0,walkBlend:1,walkDistance:frame/48*112});
   if(detail){ctx.save();ctx.translate(x,y);ctx.scale(2.5,2.5);Object.assign(w.player,{x:0,y:0});m.drawWorker(ctx,imgs,w);ctx.restore()}else m.drawWorker(ctx,imgs,w);
   // A second row at 80% resembles the user's editor zoom.
   if(!detail){ctx.save();ctx.translate(x,y+125);ctx.scale(.8,.8);Object.assign(w.player,{x:0,y:0});m.drawWorker(ctx,imgs,w);ctx.restore();}
  }
  surface.flush();ctx.dispose();const image=surface.makeImageSnapshot();
  fs.writeFileSync(path.join(out,`skia-${String(frame).padStart(2,'0')}.png`),image.encodeToBytes());image.dispose();
 }
 const started=performance.now();
 for(let i=0;i<240;i++){
  const ctx=new SkiaContext(surface.getCanvas(),960,640,font);Object.assign(w.player,{x:120,y:190,direction:directions[i%8],walkDistance:i/60*112});m.drawWorker(ctx,imgs,w);ctx.dispose();
 }
 console.log(JSON.stringify({frames:total,directions:8,scenario,gait:running?'run':'walk',backend:'CanvasKit software / live Skia adapter',millisecondsPerPlayerDraw:(performance.now()-started)/240,output:out}));
 Object.values(imgs).forEach(im=>im.dispose());surface.dispose();font.dispose();
}finally{fs.rmSync(dir,{recursive:true,force:true})}
