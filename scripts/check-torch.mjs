import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'torch-'));
try{
 await build({stdin:{contents:`export * from './src/torch';export * from './src/quick-items';export * from './src/field-kit';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/night-lighting-skia';export * from './src/skia-adapter';export * from './src/worker-renderer';export * from './src/survivor-art';export * from './src/runner-cycles';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs')});
 const m=require(path.join(temp,'test.cjs')),w=m.createWorld(m.emptyLayout());
 assert(w.tools.torch);assert(m.selectQuickItem(w,'torch'));assert(w.torchOn);assert.equal(m.selectedQuickItem(w),'torch');assert(!m.requestAttack(w));assert(!m.attack(w));
 const controller=new m.FieldKitController(),action=controller.sample(w).action;assert.equal(action.icon,'torch');assert(controller.press(w,action));controller.release();assert(!m.torchBeam(w));assert(m.doAction(w,'torch'));
 assert(m.selectQuickItem(w,'fists'));assert(!m.torchBeam(w));assert(m.selectQuickItem(w,'torch'));
 w.player.downedUntil=10;assert(!m.torchBeam(w));w.player.downedUntil=0;
 const dirs=['up','up-right','right','down-right','down','down-left','left','up-left'];
 for(const direction of dirs)for(const moving of [false,true])for(const run of [false,true])for(let frame=0;frame<4;frame++){
  Object.assign(w.player,{direction,moving,sprinting:run,runBlend:+run,walkBlend:1,walkDistance:frame*28});
  const b=m.torchBeam(w),a=m.DIRECTION_ANGLES[direction];assert(Math.abs(b.dx-Math.cos(a))<1e-6);assert(Math.abs(b.dy-Math.sin(a))<1e-6);assert(Number.isFinite(b.x+b.y));
 }
 const init=require('canvaskit-wasm'),kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});globalThis.CanvasKit=kit;
 const skia=m.JsiSkApi(kit),surface=skia.Surface.Make(800,800),canvas=surface.getCanvas(),lighting=m.createNightLighting(skia),view={x:0,y:0,width:800,height:800};
 for(const direction of dirs){const a=m.DIRECTION_ANGLES[direction],dx=Math.cos(a),dy=Math.sin(a);canvas.clear(skia.Color('#ffffff'));lighting.draw(canvas,[],1,view,{x:400,y:400,dx,dy,range:560});surface.flush();const image=surface.makeImageSnapshot(),px=image.readPixels();image.dispose();const red=(x,y)=>px[(Math.round(y)*800+Math.round(x))*4];assert(red(400+dx*100,400+dy*100)>200,direction+' lights ahead');assert(red(400-dx*180,400-dy*180)<50,direction+' stays dark behind');assert(red(400-dy*180,400+dx*180)<50,direction+' stays dark at side');assert(red(400+dx*180-dy*85,400+dy*180+dx*85)>150,direction+' has a broad useful beam');assert(red(400-dx*45,400-dy*45)>120,direction+' softly lights nearby footing')}
 canvas.clear(skia.Color('#ffffff'));lighting.draw(canvas,[],1,view,{x:100,y:400,dx:1,dy:0,range:560});surface.flush();const farImage=surface.makeImageSnapshot(),farPixels=farImage.readPixels();assert(farPixels[(400*800+520)*4]>100,'Beam still usefully illuminates 420 units ahead');farImage.dispose();
 const builds=lighting.shaderBuilds;for(let i=0;i<120;i++)lighting.draw(canvas,[],1,{x:0,y:0,width:1,height:1},{x:400+i,y:400,dx:1,dy:0,range:300});assert.equal(lighting.shaderBuilds,builds,'moving beam never rebuilds static lightmap');lighting.dispose();surface.dispose();
 // Contact sheet renders every carried frame through the production renderer.
 const {SkiaContext}=m.createSkiaAdapter(skia),font=skia.Font(undefined,14),imgs={};
 for(const [key,url] of Object.entries({...m.SURVIVOR_IMAGE_SOURCES,...m.RUNNER_CYCLE_SOURCES,torch:'/survival/equipment/torch-v1.png'})){const data=skia.Data.fromBytes(fs.readFileSync(fs.existsSync('public'+url)?'public'+url:('public'+url).replace(/\.png$/,'.webp')));imgs[key]=skia.Image.MakeImageFromEncoded(data);data.dispose();assert(imgs[key],key)}
 const sheet=skia.Surface.Make(1440,1620),ctx=new SkiaContext(sheet.getCanvas(),1440,1620,font);
 for(let row=0;row<9;row++)for(let col=0;col<8;col++){
  ctx.save();ctx.translate(col*180,row*180);ctx.fillStyle=(row+col)%2?'#294c43':'#35584a';ctx.fillRect(0,0,180,180);ctx.fillStyle='#ffedc7';ctx.font='12px sans-serif';ctx.fillText(dirs[col]+' / '+(row===0?'idle':row<5?'walk '+row:'sprint '+(row-4)),90,18);
  Object.assign(w.player,{x:90,y:162,direction:dirs[col],moving:row>0,sprinting:row>=5,runBlend:row>=5?1:0,walkDistance:((row-1)%4)*28,walkBlend:1});m.drawWorker(ctx,imgs,w);ctx.restore();
 }
 sheet.flush();const shot=sheet.makeImageSnapshot();const out='docs/qa/torch-v1';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/carry-72-poses.png',shot.encodeToBytes());shot.dispose();ctx.dispose();sheet.dispose();Object.values(imgs).forEach(i=>i.dispose());font.dispose();
 console.log('PASS: ownership, equip, toggle, attack exclusion, downed state; 8-direction beam pixels and 120-frame lightmap reuse; rendered all 72 idle/walk/sprint poses.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
