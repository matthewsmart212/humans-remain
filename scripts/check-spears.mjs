import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'spears-'));
try{
 await build({stdin:{contents:`export * from './src/spears';export * from './src/quick-items';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/skia-adapter';export * from './src/worker-renderer';export * from './src/survivor-art';export * from './src/runner-cycles';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs')});
 const m=require(path.join(temp,'test.cjs')),w=m.createWorld(m.emptyLayout()),dirs=['down-left','down','down-right','right','up-right','up','up-left','left'];
 const init=require('canvaskit-wasm'),kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});globalThis.CanvasKit=kit;
 const skia=m.JsiSkApi(kit),{SkiaContext}=m.createSkiaAdapter(skia),font=skia.Font(undefined,14),imgs={};
 for(const [key,url] of Object.entries({...m.SURVIVOR_IMAGE_SOURCES,...m.RUNNER_CYCLE_SOURCES,...m.SPEAR_IMAGES})){const data=skia.Data.fromBytes(fs.readFileSync(fs.existsSync('public'+url)?'public'+url:('public'+url).replace(/\.png$/,'.webp')));imgs[key]=skia.Image.MakeImageFromEncoded(data);data.dispose();assert(imgs[key],key)}
 const out='docs/qa/spears-v1';fs.mkdirSync(out,{recursive:true});
 const save=(surface,ctx,name)=>{surface.flush();const shot=surface.makeImageSnapshot();fs.writeFileSync(out+'/'+name+'.png',shot.encodeToBytes());shot.dispose();ctx.dispose();surface.dispose()};
 for(const item of ['woodenSpear','metalSpear']){
  w.tick=0;w.attackReady=0;w.attackUntil=0;w.spearThrust=undefined;assert(m.selectQuickItem(w,item));
  const carry=skia.Surface.Make(2400,2250),ctx=new SkiaContext(carry.getCanvas(),2400,2250,font);
  for(let row=0;row<9;row++)for(let col=0;col<8;col++){
   ctx.save();ctx.translate(col*300,row*250);ctx.fillStyle=(row+col)%2?'#294c43':'#35584a';ctx.fillRect(0,0,300,250);ctx.fillStyle='#ffedc7';ctx.font='12px sans-serif';ctx.fillText(dirs[col]+' / '+(row===0?'idle':row<5?'walk '+row:'sprint '+(row-4)),150,18);
   ctx.translate(150,205);ctx.scale(1.35,1.35);Object.assign(w.player,{x:0,y:0,direction:dirs[col],moving:row>0,sprinting:row>=5,runBlend:row>=5?1:0,walkDistance:((row-1)%4)*28,walkBlend:1});
   const pose=m.spearPose(w);assert(pose&&Number.isFinite(pose.hand[0]+pose.hand[1]+pose.angle));m.drawWorker(ctx,imgs,w);ctx.restore();
  }
  save(carry,ctx,item+'-72-poses');
  const ages=[-1,.04,.09,.14,.22,.29,.35,.44],attack=skia.Surface.Make(2560,2720),a=new SkiaContext(attack.getCanvas(),2560,2720,font);
  for(let row=0;row<ages.length;row++)for(let col=0;col<8;col++){
   const age=ages[row],angle=m.DIRECTION_ANGLES[dirs[col]];w.tick=age<0?0:(2+age)*60;w.attackReady=age<0?0:2.62;w.spearThrust=age<0||age>.43?undefined:{started:2,angle,tool:item,resolved:age>=.14};
   Object.assign(w.player,{x:0,y:0,direction:dirs[col],moving:false,sprinting:false,runBlend:0,walkBlend:1});
   const pose=m.spearPose(w);assert(pose);
   if(age>=.09&&age<=.22){assert(pose.striking);const mirror=m.runnerFacing(dirs[col]).mirror?-1:1;assert(Math.sin(pose.angle)*mirror*Math.cos(angle)-Math.cos(pose.angle)*Math.sin(angle)>.999,'spear points along thrust: '+dirs[col])}
   a.save();a.translate(col*320,row*340);a.fillStyle=(row+col)%2?'#294c43':'#35584a';a.fillRect(0,0,320,340);a.fillStyle='#ffedc7';a.font='12px sans-serif';a.fillText(dirs[col]+' / '+(age<0?'carry':`${Math.round(age*1000)} ms`),160,18);a.translate(160,285);a.scale(1.4,1.4);m.drawWorker(a,imgs,w);a.restore();
  }
  save(attack,a,item+'-thrust-sequence');
 }
 Object.values(imgs).forEach(i=>i.dispose());font.dispose();
 console.log('PASS: rendered 144 carried poses and 128 thrust/recovery poses through production Skia; both spears point forwards in all eight directions.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
