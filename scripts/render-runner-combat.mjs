// Real CanvasKit composition: the generated torso, approved legs and live trails.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'runner-combat-'));
const output=process.argv[2]||'/tmp/runner-combat-qa';fs.mkdirSync(output,{recursive:true});
try{
 await build({stdin:{contents:`export * from './src/survival-engine';export * from './src/studio-play';export * from './src/world-layout';export * from './src/worker-renderer';export * from './src/worker-animation';export * from './src/survivor-art';export * from './src/runner-axe-art';export * from './src/axe-combat';export * from './src/axe-renderer';export * from './src/skia-adapter';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'render.cjs'),logLevel:'error'});
 const m=require(path.join(tmp,'render.cjs')),kit=await require('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)}),skia=m.JsiSkApi(kit),adapter=m.createSkiaAdapter(skia),font=skia.Font(undefined,14),imgs={};
 let bytes=0;
 for(const [key,url]of Object.entries({...m.SURVIVOR_IMAGE_SOURCES,...m.AXE_IMAGE_SOURCES,...m.RUNNER_AXE_IMAGE_SOURCES})){const buf=fs.readFileSync('public'+url),data=skia.Data.fromBytes(buf);imgs[key]=skia.Image.MakeImageFromEncoded(data);data.dispose();assert(imgs[key],key);if(key.startsWith('runnerAxe-'))bytes+=buf.length}
 assert.equal(Object.keys(m.RUNNER_AXE_ART.views).length,5);assert.equal(Object.keys(m.RUNNER_AXE_ART.directions).length,8);assert(bytes<2500000,'Shared attack artwork stays within mobile download budget');
 const registration=JSON.parse(fs.readFileSync('public/survival/scrap-runner/axe-combo-v1/atlas.json','utf8'));
 for(const source of registration.sources)for(const frame of source.frames){
  const r=m.RUNNER_AXE_REGISTRATION[source.view][frame.frame],hair=frame.sourceHairBox;
  assert(Math.abs((hair[2]-hair[0])*source.packingScale*r.scaleX-78)<1e-8,'Attack hair width must match approved walking art');
  assert.equal(r.y+registration.layers.headTop*r.scaleY,-112,'No vertical jump at the hair top');
  assert.equal(r.scaleY,registration.scale,'Do not lengthen the torso over approved legs');
  assert.equal(r.x+registration.anchor[0]*r.scaleX,0,'Pose remains centered over the feet');
  const blade=m.RUNNER_AXE_ART.views[source.view].blade[frame.frame],point=m.runnerAxePoint(source.view,frame.frame,blade);
  assert.deepEqual(point,[r.x+blade[0]*r.scaleX,r.y+blade[1]*r.scaleY],'Trails use the same registration as the painted axe');
 }
 for(const [key,image]of Object.entries(imgs).filter(([key])=>key.startsWith('runnerAxe-'))){
  assert.equal(image.width(),1536);assert.equal(image.height(),768);const pixels=image.readPixels(),signatures=new Set();
  for(let frame=0;frame<8;frame++){let opaque=0,hash=0;for(let y=0;y<384;y++)for(let x=0;x<384;x++){const i=((Math.floor(frame/4)*384+y)*1536+frame%4*384+x)*4,a=pixels[i+3];if(x<3||y<3||x>=381||y>=381)assert.equal(a,0,'Transparent gutters preserve complete axe in '+key);if(a>32){opaque++;hash=(hash+pixels[i]*(x+1)+pixels[i+1]*(y+1))%2147483647}}assert(opaque>6000&&opaque<110000);signatures.add(hash)}assert.equal(signatures.size,8,'Eight distinct painted poses in '+key);
 }
 const dirs=Object.keys(m.DIRECTION_ANGLES),fresh=()=>m.createCampPlaySession({...m.emptyLayout(),spawn:{x:1500,y:1500}});
 const samples=[['idle',0,0],['walk',0,0],['cut ready',1,.09],['cut contact',1,.265],['cut follow',1,.39],['cut settle',1,.5],['return ready',2,.10],['return contact',2,.29],['return follow',2,.43],['return settle',2,.57]];
 const sheet=skia.Surface.Make(2000,1680),ctx=new adapter.SkiaContext(sheet.getCanvas(),2000,1680,font);
 for(let row=0;row<8;row++)for(let col=0;col<10;col++){
  const [label,cut,t]=samples[col],w=fresh();Object.assign(w.player,{x:0,y:0,direction:dirs[row],moving:label==='walk',walkBlend:1,walkDistance:28});
  if(cut){w.axeSwing={started:0,angle:m.DIRECTION_ANGLES[dirs[row]],resolved:t>m.axeProfile({cut}).contact,cut};w.tick=t/m.STEP}
  ctx.save();ctx.translate(col*200,row*210);ctx.fillStyle=(col+row)%2?'#28483d':'#324f43';ctx.fillRect(0,0,200,210);ctx.fillStyle='#eedab3';ctx.font='12px sans-serif';ctx.fillText(dirs[row]+' · '+label,100,18);ctx.translate(100,192);ctx.scale(1.2,1.2);m.drawWorker(ctx,imgs,w);ctx.restore();
 }
 sheet.flush();let snap=sheet.makeImageSnapshot();fs.writeFileSync(path.join(output,'runner-axe-contact-sheet.png'),snap.encodeToBytes());snap.dispose();ctx.dispose();sheet.dispose();
 const worlds=dirs.map(d=>{const w=fresh();w.player.direction=d;return w}),surface=skia.Surface.Make(960,520);
 for(let frame=0;frame<60;frame++){
  const c=new adapter.SkiaContext(surface.getCanvas(),960,520,font);c.fillStyle='#29483e';c.fillRect(0,0,960,520);
  for(let i=0;i<8;i++){
   const w=worlds[i],a=m.DIRECTION_ANGLES[dirs[i]],input={x:Math.cos(a),y:Math.sin(a)};
   for(let tick=0;tick<3;tick++){if(frame===10&&tick===0)m.requestAttack(w);if(frame===14&&tick===0)m.requestAttack(w);m.stepCampPlaySession(w,input,false,false)}
   c.save();c.fillStyle='#edd6ad';c.font='13px sans-serif';c.fillText(dirs[i],120+i%4*240,28+Math.floor(i/4)*260);c.translate(120+i%4*240-w.player.x,225+Math.floor(i/4)*260-w.player.y);m.drawWorker(c,imgs,w);c.restore();
  }
  surface.flush();const snapshot=surface.makeImageSnapshot();fs.writeFileSync(path.join(output,'moving-'+String(frame).padStart(3,'0')+'.png'),snapshot.encodeToBytes());snapshot.dispose();c.dispose();
 }
 surface.dispose();font.dispose();Object.values(imgs).forEach(im=>im.dispose());adapter.disposeLighting();
 console.log(`PASS: 40 alpha-safe unique attack poses in ${(bytes/1e6).toFixed(2)} MB; fixed 78-unit head width, head/foot anchoring, unchanged torso height and registered trails; live eight-direction standing/moving renders: ${output}`);
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
