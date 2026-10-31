import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const dir=process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),'bunker-render-'));fs.mkdirSync(dir,{recursive:true});const temp=fs.mkdtempSync(path.join(os.tmpdir(),'bunker-skia-'));
const originalFetch=globalThis.fetch,originalWindow=globalThis.window,originalType=process.type;
try{
 await build({stdin:{contents:`export * from './src/world-assets';export * from './src/skia-web';export * from './src/world-scenes';export * from './src/scene-resources';export * from './src/world-layout';export * from './src/survival-engine';export * from './src/placed-world-renderer';export * from './src/editor-image-sources';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=createRequire(import.meta.url)(path.join(temp,'model.cjs'));
 const requests=[];delete globalThis.CanvasKit;globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;
 globalThis.fetch=async url=>{if(String(url).startsWith('blob:'))return originalFetch(url);requests.push(String(url));return new Response(fs.readFileSync(path.resolve('public'+String(url))))};
 let surface,fade=0,geometry=false;
 const canvas={width:0,height:0,clientWidth:1254,clientHeight:1254,dataset:{}},view={x:627,y:627,zoom:900/1254,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true};
 const world=m.createWorld({...m.emptyLayout(),spawn:m.BUNKER_SCENE.spawns.stairs});world.scene=m.BUNKER_SCENE;world.editorPreview=true;
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs,w)=>{
  m.drawWorldEditor(ctx,atlas,imgs,w,view,fade);
  if(geometry){const c=m.editorCamera(ctx.canvas.width,ctx.canvas.height,w,view);ctx.save();ctx.scale(c.scale,c.scale);ctx.translate(-c.x,-c.y);for(const [points,color]of [[w.scene.walkable,'#00ffff'],...w.scene.blockers.map(p=>[p,'#ff5360']),...w.scene.portals.map(p=>[p.area,'#00ff66'])]){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.stroke()}ctx.restore()}
 },{}, {sources:m.EDITOR_IMAGE_SOURCES});
 const kit=globalThis.CanvasKit;kit.MakeSWCanvasSurface=c=>(surface=kit.MakeSurface(c.width,c.height));
 const resources=new m.SceneResourceCache(m.SCENES,s=>renderer.warmImages(s),keys=>renderer.releaseImages(keys));resources.pin(['bunker']);
 let complete=false;const loading=resources.prepare('bunker').then(()=>complete=true);await new Promise(r=>setTimeout(r,0));assert(!complete,'A decoded map still waits for its rendered texture warm-up');
 for(let i=0;i<8&&!complete;i++){renderer.draw(world);await new Promise(r=>setTimeout(r,0))}await loading;assert(resources.ready('bunker'));assert.equal(requests.filter(u=>u===m.BUNKER_SCENE.terrain.url).length,1);
 const shot=name=>{const image=surface.makeImageSnapshot();fs.writeFileSync(path.join(dir,name),Buffer.from(image.encodeToBytes()));image.delete()};
 renderer.draw(world);shot('bunker-arrival.png');geometry=true;renderer.draw(world);shot('bunker-collision.png');geometry=false;
 Object.assign(world.player,{x:640,y:670,direction:'down'});renderer.draw(world);shot('bunker-centre.png');
 canvas.clientWidth=844;canvas.clientHeight=390;Object.assign(view,{follow:true,zoom:1});renderer.draw(world);shot('bunker-landscape.png');
 Object.assign(world.player,{x:969,y:492,direction:'up'});renderer.draw(world);shot('bunker-stairs.png');
 fade=1;renderer.draw(world);shot('bunker-fade.png');
 await resources.prepare('bunker');assert.equal(requests.filter(u=>u===m.BUNKER_SCENE.terrain.url).length,1,'No repeat downloads while visiting');
 resources.dispose();renderer.dispose();
 console.log('PASS: production CanvasKit renders bunker, character, foreground walls, 844×390 landscape camera and fade; decode/warm completes before entry and cached revisit does not download again. Screenshots: '+dir);
}finally{globalThis.fetch=originalFetch;globalThis.window=originalWindow;process.type=originalType;fs.rmSync(temp,{recursive:true,force:true})}
