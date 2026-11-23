// Source-painted character/rod inspection through the production native adapter.
// A render state is supplied directly so every phase/facing is reproducible.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const root=process.cwd(),out=path.resolve('.qa/fishing-gameplay/character');
fs.mkdirSync(out,{recursive:true});
const native=path.resolve('native/node_modules/@shopify/react-native-skia');
const require=createRequire(import.meta.url),nativeRequire=createRequire(path.join(native,'package.json'));
const model=path.join(out,'model.cjs');
await build({stdin:{contents:"export * from './src/fishing-character';export * from './src/worker-renderer';export * from './src/player-gear';export * from './src/fishing-renderer';export * from './src/skia-adapter';export * from './src/survivor-art';export {JsiSkApi} from "+JSON.stringify(path.join(native,'lib/module/skia/web/JsiSkia.js'))+';',resolveDir:root},bundle:true,platform:'node',format:'cjs',outfile:model,logLevel:'error',plugins:[{name:'native-platform',setup(b){
 b.onResolve({filter:/^@shopify\/react-native-skia$/},a=>({path:a.path,namespace:'native-platform'}));
 b.onLoad({filter:/.*/,namespace:'native-platform'},()=>({contents:'export const Skia=globalThis.__fishingSkia;',loader:'js'}));

}}]});
const kit=await nativeRequire('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(nativeRequire.resolve('canvaskit-wasm')),f)});
const {JsiSkApi}=require(model),api=JsiSkApi(kit);globalThis.__fishingSkia=api;
delete require.cache[require.resolve(model)];const m=require(model),adapter=m.createSkiaAdapter(api);
const images={};for(const [key,name]of [['survivorBase','motion-a-v1.webp'],['survivorRear','motion-b-v1.webp']]){
 const bytes=api.Data.fromBytes(fs.readFileSync(path.resolve('public/survival/scrap-runner',name)));images[key]=api.Image.MakeImageFromEncoded(bytes);bytes.dispose();
}
const fontData=api.Data.fromBytes(fs.readFileSync(path.resolve('public/fonts/barlow-condensed-black.ttf'))),typeface=api.Typeface.MakeFreeTypeFaceFromData(fontData);fontData.dispose();
const face=api.Font(typeface,15),facings=['down','down-right','right','up-right','up','up-left','left','down-left'];
const phases=['equipped','ready','aiming','casting','waiting','bite','reeling','landing'];
for(const phase of phases){
 const width=1200,height=700,surface=api.Surface.Make(width,height),ctx=new adapter.SkiaContext(surface.getCanvas(),width,height,face);
 ctx.fillStyle='#344a3e';ctx.fillRect(0,0,width,height);
 for(let i=0;i<facings.length;i++){
  const direction=facings[i],column=i%4,row=Math.floor(i/4),ox=column*300,oy=row*350;
  ctx.save();ctx.beginPath();ctx.moveTo(ox+2,oy+2);ctx.lineTo(ox+298,oy+2);ctx.lineTo(ox+298,oy+348);ctx.lineTo(ox+2,oy+348);ctx.closePath();ctx.clip();
  ctx.font='900 16px sans-serif';ctx.textAlign='center';ctx.fillStyle='#d7d2b7';ctx.fillText(direction,ox+150,oy+328);
  ctx.translate(ox+145,oy+284);ctx.scale(1.3,1.3);
  const w={tick:1800,player:{x:0,y:0,direction,moving:false,downedUntil:0,equipped:'fishingRod',hp:100,walkDistance:0,walkBlend:0,runBlend:0,hurtUntil:0},weather:{reducedMotion:false}};
  m.gear(w).bag.fishingRod=1;
  const bearing={right:0,'down-right':Math.PI/4,down:Math.PI/2,'down-left':Math.PI*3/4,left:Math.PI,'up-left':-Math.PI*3/4,up:-Math.PI/2,'up-right':-Math.PI/4}[direction];
  const state={phase,age:.35,phaseProgress:phase==='casting'?.45:phase==='landing'?.78:0,direction,charge:.75,tension:.65,holding:phase==='reeling',lineVisible:['waiting','bite','reeling','casting'].includes(phase),bobberVisible:true,bobber:{x:Math.cos(bearing)*170,y:Math.sin(bearing)*170}};
  if(phase==='equipped')m.drawWorker(ctx,images,w);else m.drawFishingSurvivor(ctx,images,w,state);ctx.restore();
 }
 surface.flush();const shot=surface.makeImageSnapshot();fs.writeFileSync(path.join(out,phase+'.png'),shot.encodeToBytes());shot.dispose();ctx.dispose();surface.dispose();console.log('Rendered '+phase);
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({renderer:'Production Skia adapter with CanvasKit software platform',facings,phases,physicalDevice:false},null,2)+'\n');
for(const image of Object.values(images))image.dispose();face.dispose();typeface.dispose();adapter.disposeLighting();
