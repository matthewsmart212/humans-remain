// Actual CanvasKit render + simulation checks for the first equipment trial.
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),init=require('canvaskit-wasm'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-axe-'));
try{
 await build({stdin:{contents:`export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';export * from './src/skia-adapter';export * from './src/worker-renderer';export * from './src/survival-engine';export * from './src/survivor-art';export * from './src/world-layout';export * from './src/axe-renderer';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'test.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'test.mjs')));
 const make=()=>{const w=m.createWorld(m.emptyLayout());Object.assign(w.player,{x:1500,y:1500,direction:'right'});return w};
 const enemy=(id,x,y)=>({id,x,y,hp:100,maxHp:100,attackAt:999,path:[],repathAt:999,flashUntil:0});
 for(const direction of Object.keys(m.SURVIVOR_ART)){
  const w=make(),angle=m.DIRECTION_ANGLES[direction];w.player.direction=direction;
  w.enemies=[enemy(1,1500+100*Math.cos(angle),1500+100*Math.sin(angle)),enemy(2,1500-100*Math.cos(angle),1500-100*Math.sin(angle))];
  assert(m.attack(w));assert.equal(w.player.stamina,80);assert(!m.attack(w));assert(!m.toggleAxe(w));
  w.tick=15;m.stepAxe(w);assert.equal(w.enemies[0].hp,100,'no damage before blade contact');
  w.tick=16;m.stepAxe(w);assert.equal(w.enemies[0].hp,60,`${direction} front target hit`);assert.equal(w.enemies[1].hp,100,'cannot hit behind');
  m.stepAxe(w);assert.equal(w.enemies[0].hp,60,'one impact per swing');
  const aim=w.axeSwing.angle;m.movePlayer(w,{x:1,y:1},true);assert(w.player.x>1500,'moving axe strike');assert.equal(w.axeSwing.angle,aim,'strike facing stays committed');
  w.tick=36;m.stepAxe(w);assert(!w.axeSwing);assert(!m.attack(w));w.tick=40;assert(m.attack(w),'cooldown expires');
 }
 const low=make();low.player.stamina=19;assert(!m.attack(low));low.player.downedUntil=10;assert(!m.attack(low));
 const preview=make();preview.editorPreview=true;preview.enemies=[enemy(1,1600,1500)];assert(m.attack(preview));preview.tick=20;m.stepAxe(preview);assert.equal(preview.enemies[0].hp,100);assert.equal(preview.player.stamina,100);
 const crate=make();crate.breakables=[{x:1600,y:1500,id:20,kind:'scrap',amount:5,hp:64,maxHp:64,flashUntil:0}];assert(m.attack(crate));crate.tick=20;m.stepAxe(crate);assert.equal(crate.breakables[0].hp,24);crate.tick=40;m.stepAxe(crate);assert(m.attack(crate));crate.tick=60;m.stepAxe(crate);assert.equal(crate.breakables[0].hp,0);assert.equal(crate.loot.filter(l=>l.kind==='scrap').length,1);
 // Equipping must not alter approved gait samples at any direction or speed.
 for(const direction of Object.keys(m.SURVIVOR_ART))for(const sprint of [false,true]){
  const a=make(),b=make();a.player.direction=b.player.direction=direction;b.player.equipped=null;const angle=m.DIRECTION_ANGLES[direction];
  for(let i=0;i<90;i++){m.movePlayer(a,{x:Math.cos(angle),y:Math.sin(angle)},sprint);m.movePlayer(b,{x:Math.cos(angle),y:Math.sin(angle)},sprint)}
  for(const key of ['x','y','walkDistance','walkBlend','runBlend','sprinting','direction'])assert.equal(a.player[key],b.player[key]);
 }
 const out=process.argv[2]||'/tmp/axe-preview';fs.mkdirSync(out,{recursive:true});
 const kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});globalThis.CanvasKit=kit;
 const skia=m.JsiSkApi(kit),{SkiaContext}=m.createSkiaAdapter(skia),font=skia.Font(undefined,14),imgs={};
 for(const [key,url]of Object.entries({...m.SURVIVOR_IMAGE_SOURCES,...m.AXE_IMAGE_SOURCES})){const data=skia.Data.fromBytes(fs.readFileSync('public'+url));imgs[key]=skia.Image.MakeImageFromEncoded(data);assert(imgs[key],key);data.dispose()}
 const directions=Object.keys(m.SURVIVOR_ART),surface=skia.Surface.Make(1600,1280);
 const rows=[['idle',0],['walk',0],['run',56],['wind-up',.16],['contact',.265],['follow-through',.34]];
 const ctx=new SkiaContext(surface.getCanvas(),1600,1280,font);
 for(let row=0;row<rows.length;row++)for(let col=0;col<8;col++){
  const [pose,value]=rows[row],w=make();Object.assign(w.player,{x:0,y:0,direction:directions[col]});ctx.save();ctx.translate(col*200,row*213);ctx.fillStyle=(row+col)%2?'#294c43':'#35584a';ctx.fillRect(0,0,200,213);ctx.fillStyle='#ffedc7';ctx.font='14px sans-serif';ctx.fillText(directions[col]+' / '+pose,100,21);ctx.translate(100,198);ctx.scale(1.25,1.25);
  if(pose==='walk'||pose==='run')Object.assign(w.player,{moving:true,sprinting:pose==='run',runBlend:pose==='run'?1:0,walkBlend:1,walkDistance:value});
  else if(row>=3){w.axeSwing={started:0,angle:m.DIRECTION_ANGLES[directions[col]],resolved:row>3};w.tick=value/m.STEP}
  m.drawWorker(ctx,imgs,w);ctx.restore();
 }
 surface.flush();ctx.dispose();let shot=surface.makeImageSnapshot();fs.writeFileSync(path.join(out,'axe-eight-directions.png'),shot.encodeToBytes());shot.dispose();surface.dispose();
 const animated=skia.Surface.Make(960,480);
 for(let frame=0;frame<72;frame++){
  const c=new SkiaContext(animated.getCanvas(),960,480,font);c.fillStyle='#35584a';c.fillRect(0,0,960,480);
  for(let i=0;i<8;i++){const w=make(),t=frame/60;Object.assign(w.player,{x:120+(i%4)*240,y:220+Math.floor(i/4)*240,direction:directions[i]});if(t>=.15&&t<.73){w.axeSwing={started:.15,angle:m.DIRECTION_ANGLES[directions[i]],resolved:t>=.415};w.tick=t/m.STEP}m.drawWorker(c,imgs,w)}
  animated.flush();c.dispose();const shot=animated.makeImageSnapshot();fs.writeFileSync(path.join(out,`swing-${String(frame).padStart(3,'0')}.png`),shot.encodeToBytes());shot.dispose();
 }
 animated.dispose();Object.values(imgs).forEach(im=>im.dispose());font.dispose();
 console.log('PASS: 8-direction contact timing, forward arcs, cooldown, stamina, editor safety, crate salvage, unchanged gait; CanvasKit contact sheet and 72-frame preview: '+out);
}finally{fs.rmSync(temp,{recursive:true,force:true})}
