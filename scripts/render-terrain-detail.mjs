// Render close-up terrain through the same CanvasKit adapter used by the game.
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),init=require('canvaskit-wasm');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'terrain-skia-'));
try{
 await build({stdin:{contents:`export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';export * from './src/skia-adapter';export * from './src/worker-renderer';export * from './src/survival-engine';export * from './src/survivor-art';export * from './src/world-layout';export * from './src/terrain-renderer';export * from './src/terrain-art';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'render.mjs')});
 const kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});globalThis.CanvasKit=kit;
 const m=await import(pathToFileURL(path.join(dir,'render.mjs'))),skia=m.JsiSkApi(kit);
 const {SkiaContext}=m.createSkiaAdapter(skia),surface=skia.Surface.Make(1024,900),font=skia.Font(undefined,14);
 const load=file=>{const d=skia.Data.fromBytes(fs.readFileSync(file)),im=skia.Image.MakeImageFromEncoded(d);d.dispose();return im};
 const character={};for(const [k,url]of Object.entries(m.SURVIVOR_IMAGE_SOURCES))character[k]=load('public'+url);
 const w=m.createWorld(m.emptyLayout());Object.assign(w.player,{x:1400,y:2050,direction:'down',moving:false});
 const ctx=new SkiaContext(surface.getCanvas(),1024,900,font);
 for(const [i,artDir] of ['artwork-archive/painted-terrain-v1','artwork-archive/painted-terrain-hd-original'].entries()){
  const terrain=Object.fromEntries(m.HOME_TERRAIN_TILES.map((t,index)=>[t.key,load(`${artDir}/${['nw','ne','sw','se'][index]}.webp`)]));
  ctx.save();ctx.beginPath();ctx.moveTo(i*512,0);ctx.lineTo((i+1)*512,0);ctx.lineTo((i+1)*512,900);ctx.lineTo(i*512,900);ctx.closePath();ctx.clip();ctx.fillStyle='#071316';ctx.fillRect(i*512,0,512,900);
  ctx.translate(i*512+256,450);ctx.scale(.75,.75);ctx.translate(-w.player.x,-w.player.y);
  m.drawHomeTerrain(ctx,terrain);m.drawWorker(ctx,character,w);ctx.restore();
  Object.values(terrain).forEach(im=>im.dispose());
 }
 surface.flush();const image=surface.makeImageSnapshot();fs.writeFileSync(process.argv[2],image.encodeToBytes());image.dispose();ctx.dispose();surface.dispose();font.dispose();Object.values(character).forEach(im=>im.dispose());
 console.log('Rendered old (left) and detailed (right) terrain at matching 75% gameplay scale.');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
