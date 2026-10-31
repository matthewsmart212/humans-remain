import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'swords-'));
try{
 await build({stdin:{contents:`export * from './src/swords';export * from './src/sword-combat';export * from './src/quick-items';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/skia-adapter';export * from './src/worker-renderer';export * from './src/survivor-art';export * from './src/runner-cycles';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs')});
 const m=require(path.join(temp,'test.cjs')),w=m.createWorld(m.emptyLayout()),dirs=['down-left','down','down-right','right','up-right','up','up-left','left'];
 const init=require('canvaskit-wasm'),kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});globalThis.CanvasKit=kit;
 const skia=m.JsiSkApi(kit),{SkiaContext}=m.createSkiaAdapter(skia),fontData=skia.Data.fromBytes(fs.readFileSync('public/fonts/barlow-condensed-black.ttf')),face=skia.Typeface.MakeFreeTypeFaceFromData(fontData),font=skia.Font(face,14),imgs={};fontData.dispose();
 for(const [key,url] of Object.entries({...m.SURVIVOR_IMAGE_SOURCES,...m.RUNNER_CYCLE_SOURCES,...m.SWORD_IMAGES})){const data=skia.Data.fromBytes(fs.readFileSync(fs.existsSync('public'+url)?'public'+url:('public'+url).replace(/\.png$/,'.webp')));imgs[key]=skia.Image.MakeImageFromEncoded(data);data.dispose();assert(imgs[key],key)}
 const out='.openai/qa/sword-thrust';fs.mkdirSync(out,{recursive:true});
 const save=(surface,ctx,name)=>{surface.flush();const shot=surface.makeImageSnapshot();fs.writeFileSync(out+'/'+name+'.png',shot.encodeToBytes());shot.dispose();ctx.dispose();surface.dispose()};
 for(const item of ['woodenSword','metalSword']){
  w.tick=0;w.attackReady=0;w.attackUntil=0;w.swordThrust=undefined;assert(m.selectQuickItem(w,item));
  const carry=skia.Surface.Make(2400,2250),ctx=new SkiaContext(carry.getCanvas(),2400,2250,font);
  for(let row=0;row<9;row++)for(let col=0;col<8;col++){
   ctx.save();ctx.translate(col*300,row*250);ctx.fillStyle=(row+col)%2?'#294c43':'#35584a';ctx.fillRect(0,0,300,250);ctx.fillStyle='#ffedc7';ctx.font='12px sans-serif';ctx.fillText(dirs[col]+' / '+(row===0?'idle':row<5?'walk '+row:'sprint '+(row-4)),150,18);
   ctx.translate(150,205);ctx.scale(1.35,1.35);Object.assign(w.player,{x:0,y:0,direction:dirs[col],moving:row>0,sprinting:row>=5,runBlend:row>=5?1:0,walkDistance:((row-1)%4)*28,walkBlend:1});
   const pose=m.swordPose(w);assert(pose&&Number.isFinite(pose.hand[0]+pose.hand[1]+pose.angle));m.drawWorker(ctx,imgs,w);ctx.restore();
  }
  save(carry,ctx,item+'-72-poses');
  const ages=[-1,0,.04,.09,.14,.22,.29,.35,.42,.44],attack=skia.Surface.Make(2560,3400),a=new SkiaContext(attack.getCanvas(),2560,3400,font);
  for(let row=0;row<ages.length;row++)for(let col=0;col<8;col++){
   const age=ages[row],angle=m.DIRECTION_ANGLES[dirs[col]];w.tick=age<0?0:(2+age)*60;w.attackReady=age<0?0:2.68;w.swordThrust=age<0||age>m.SWORD_THRUST.duration?undefined:{started:2,angle,tool:item,resolved:age>=m.SWORD_THRUST.contact};
   Object.assign(w.player,{x:0,y:0,direction:dirs[col],moving:false,sprinting:false,runBlend:0,walkBlend:1});
   const pose=m.swordPose(w);assert(pose);
   if(age>=.09&&age<=.22){assert(pose.striking);const mirror=m.runnerFacing(dirs[col]).mirror?-1:1;assert(Math.sin(pose.angle)*mirror*Math.cos(angle)-Math.cos(pose.angle)*Math.sin(angle)>.999,'sword points along thrust: '+dirs[col])}
   a.save();a.translate(col*320,row*340);a.fillStyle=(row+col)%2?'#294c43':'#35584a';a.fillRect(0,0,320,340);a.fillStyle='#ffedc7';a.font='12px sans-serif';a.fillText(dirs[col]+' / '+(age<0?'carry':`${Math.round(age*1000)} ms`),160,18);a.translate(160,240);a.scale(1.4,1.4);m.drawWorker(a,imgs,w);a.restore();
  }
  save(attack,a,item+'-thrust-sequence');
 }

 // The attack upper body must not freeze the walking feet underneath it.
 for(const direction of dirs){
  const feet=[];
  for(const walkDistance of [0,28]){
   Object.assign(w.player,{equipped:'metalSword',x:0,y:0,direction,moving:true,sprinting:false,walkDistance,walkBlend:1,runBlend:0});
   w.tick=(2+m.SWORD_THRUST.contact)*60;w.swordThrust={started:2,angle:m.DIRECTION_ANGLES[direction],tool:'metalSword',resolved:false};
   const surface=skia.Surface.Make(240,100),ctx=new SkiaContext(surface.getCanvas(),240,100,font);
   ctx.translate(120,25);ctx.scale(2,2);m.drawWorker(ctx,imgs,w);surface.flush();
   const shot=surface.makeImageSnapshot();feet.push(Buffer.from(shot.encodeToBytes()));shot.dispose();ctx.dispose();surface.dispose();
  }
  assert.notDeepEqual(feet[0],feet[1],'walking feet continue during sword thrust: '+direction);
 }
 console.log('PASS: walking legs continue during the thrust in all eight directions.');
 if(process.argv.includes('--motion')){
  const frameDir=path.resolve('.openai/qa/sword-thrust/frames');fs.mkdirSync(frameDir,{recursive:true});
  const labels=['SW','S','SE','E','NE','N','NW','W'];
  for(let frame=0;frame<120;frame++){
   const surface=skia.Surface.Make(1280,1280),c=new SkiaContext(surface.getCanvas(),1280,1280,font);
   for(let n=0;n<16;n++){
    const item=n<8?'woodenSword':'metalSword',col=n%4,row=Math.floor(n/4),dir=dirs[n%8],elapsed=(frame/60)%1,age=elapsed-.12;
    Object.assign(w.player,{equipped:item,x:0,y:0,direction:dir,moving:frame>=60,sprinting:false,walkDistance:frame*1.8,walkBlend:1,runBlend:0});
    w.tick=(2+Math.max(0,age))*60;w.attackReady=2.68;w.swordThrust=age>=0&&age<m.SWORD_THRUST.duration?{started:2,angle:m.DIRECTION_ANGLES[dir],tool:item,resolved:age>=m.SWORD_THRUST.contact}:undefined;
    c.save();c.translate(col*320,row*320);c.fillStyle=(row+col)%2?'#294c43':'#35584a';c.fillRect(0,0,320,320);c.fillStyle='#ead7ad';c.font='17px sans-serif';c.fillText((n<8?'Wooden sword':'Metal sword')+' / '+labels[n%8],160,23);c.translate(160,230);c.scale(1.42,1.42);m.drawWorker(c,imgs,w);c.restore();
   }
   surface.flush();const shot=surface.makeImageSnapshot();fs.writeFileSync(frameDir+'/'+String(frame).padStart(3,'0')+'.png',shot.encodeToBytes());shot.dispose();c.dispose();surface.dispose();
  }
  execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','60','-i',path.join(frameDir,'%03d.png'),'-vf','format=yuv420p','-c:v','libx264','-threads','2','-crf','20','-movflags','+faststart',path.join(out,'thrust-preview.mp4')],{stdio:'inherit'});
  const video=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=nb_frames','-of','json',path.join(out,'thrust-preview.mp4')],{encoding:'utf8'}));assert.equal(video.streams[0].nb_frames,'120');
  console.log('120 production-rendered frames at 60 fps: stationary thrusts followed by moving thrusts.');
 }
 Object.values(imgs).forEach(i=>i.dispose());font.dispose();
 console.log('PASS: rendered 144 carried poses and 160 thrust/recovery poses through production Skia; both swords thrust forwards in all eight directions.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
