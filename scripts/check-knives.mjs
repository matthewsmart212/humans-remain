import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'knives-'));
try{
 await build({stdin:{contents:`export * from './src/knives';export * from './src/quick-items';export * from './src/field-kit';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/night-lighting-skia';export * from './src/skia-adapter';export * from './src/worker-renderer';export * from './src/survivor-art';export * from './src/runner-cycles';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs')});
 const m=require(path.join(temp,'test.cjs')),w=m.createWorld(m.emptyLayout());
 w.gear.bag.woodenKnife=1;w.gear.bag.scrapKnife=1;
 const dirs=['up','up-right','right','down-right','down','down-left','left','up-left'];
 const init=require('canvaskit-wasm'),kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});globalThis.CanvasKit=kit;
 const skia=m.JsiSkApi(kit);
 // Contact sheet renders every carried frame through the production renderer.
 const {SkiaContext}=m.createSkiaAdapter(skia),font=skia.Font(undefined,14),imgs={};
 for(const [key,url] of Object.entries({...m.SURVIVOR_IMAGE_SOURCES,...m.RUNNER_CYCLE_SOURCES,...m.KNIFE_IMAGES})){const data=skia.Data.fromBytes(fs.readFileSync(fs.existsSync('public'+url)?'public'+url:('public'+url).replace(/\.png$/,'.webp')));imgs[key]=skia.Image.MakeImageFromEncoded(data);data.dispose();assert(imgs[key],key)}
 for(const item of ['woodenKnife','scrapKnife']){
 assert(m.selectQuickItem(w,item));
 const sheet=skia.Surface.Make(1440,1620),ctx=new SkiaContext(sheet.getCanvas(),1440,1620,font);
 for(let row=0;row<9;row++)for(let col=0;col<8;col++){
  ctx.save();ctx.translate(col*180,row*180);ctx.fillStyle=(row+col)%2?'#294c43':'#35584a';ctx.fillRect(0,0,180,180);ctx.fillStyle='#ffedc7';ctx.font='12px sans-serif';ctx.fillText(dirs[col]+' / '+(row===0?'idle':row<5?'walk '+row:'sprint '+(row-4)),90,18);
  Object.assign(w.player,{x:90,y:162,direction:dirs[col],moving:row>0,sprinting:row>=5,runBlend:row>=5?1:0,walkDistance:((row-1)%4)*28,walkBlend:1});const pose=m.knifePose(w);assert(pose&&Number.isFinite(pose.hand[0]+pose.hand[1]+pose.angle));m.drawWorker(ctx,imgs,w);ctx.restore();
 }
 sheet.flush();const shot=sheet.makeImageSnapshot();const out='docs/qa/knives-v1';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/'+item+'-72-poses.png',shot.encodeToBytes());shot.dispose();ctx.dispose();sheet.dispose();}
 // Inspect complete stab/recovery sequences, including the mirrored front views.
 for(const item of ['woodenKnife','scrapKnife']){
  w.attackReady=0;w.attackUntil=0;w.tick=0;assert(m.selectQuickItem(w,item));
  const directions=['down-left','down','down-right','right','up-right','up','up-left','left'];
  const ages=[-1,.02,.06,.12,.21,.26];
  const sheet=skia.Surface.Make(2400,1800),ctx=new SkiaContext(sheet.getCanvas(),2400,1800,font);
  for(let row=0;row<ages.length;row++)for(let col=0;col<directions.length;col++){
   const age=ages[row];w.attackReady=age<0?0:2.3;w.tick=age<0?0:(2+age)*60;w.attackAngle=m.DIRECTION_ANGLES[directions[col]];
   Object.assign(w.player,{x:0,y:0,direction:directions[col],moving:false,sprinting:false,runBlend:0,walkBlend:1});
   const pose=m.knifePose(w);assert(pose);
   if(pose.striking){
    const mirror=m.runnerFacing(directions[col]).mirror?-1:1;
    const dx=Math.sin(pose.angle)*mirror,dy=-Math.cos(pose.angle),a=m.DIRECTION_ANGLES[directions[col]];
    assert(dx*Math.cos(a)+dy*Math.sin(a)>.999,'blade thrusts forwards: '+directions[col]);
   }
   ctx.save();ctx.translate(col*300+150,row*300+275);ctx.fillStyle=(row+col)%2?'#294c43':'#35584a';ctx.fillRect(-150,-275,300,300);ctx.scale(2,2);m.drawWorker(ctx,imgs,w);ctx.restore();
  }
  sheet.flush();const shot=sheet.makeImageSnapshot();fs.writeFileSync('docs/qa/knives-v1/'+item+'-stab-sequence.png',shot.encodeToBytes());shot.dispose();ctx.dispose();sheet.dispose();
 }
 Object.values(imgs).forEach(i=>i.dispose());font.dispose();
 console.log('PASS: both knives equip; rendered 144 carry poses and 96 stab/recovery poses; both blades point forwards in all eight attack directions.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
