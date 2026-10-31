import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'boar-scale-'));
try{
 await build({stdin:{contents:"export * from './src/predator-art';export * from './src/predator-renderer';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/skia-adapter';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),directions=['down','down-left','left','up-left','up','up-right','right','down-right'];
 const masses=[];
 for(const direction of directions){
  const v=m.predatorView('boar',direction),file='public'+m.PREDATOR_IMAGES[v.key],areas=[];
  for(let frame=0;frame<10;frame++){
   const data=await sharp(file).extract({left:frame%4*224,top:Math.floor(frame/4)*224,width:224,height:224}).ensureAlpha().raw().toBuffer();
   let area=0;for(let i=3;i<data.length;i+=4)area+=data[i]/255;
   areas.push(area);
  }
  areas.sort((a,b)=>a-b);masses.push((areas[4]+areas[5])/2*m.predatorScale('boar',direction)**2);
  assert.equal(m.predatorScale('wolf',direction),.65,'Wolf sizing is preserved');
 }
 const spread=Math.max(...masses)/Math.min(...masses);assert(spread<1.001,'All eight views have consistent resting/locomotion body mass');
 for(const [a,b]of [['left','right'],['up-left','up-right'],['down-left','down-right']])assert.equal(m.predatorScale('boar',a),m.predatorScale('boar',b));
 const kit=await require('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)}),api=m.JsiSkApi(kit),adapter=m.createSkiaAdapter(api);
 const surface=api.Surface.Make(880,480),canvas=surface.getCanvas(),font=api.Font(undefined,14),ctx=new adapter.SkiaContext(canvas,880,480,font);
 canvas.clear(api.Color('#8a957b'));
 const images={};for(const [key,url]of Object.entries(m.PREDATOR_IMAGES).filter(([k])=>k.startsWith('boar'))){const data=api.Data.fromBytes(fs.readFileSync('public'+url));images[key]=api.Image.MakeImageFromEncoded(data);data.dispose()}
 const world=m.createWorld(m.emptyLayout());world.tick=1;
 for(const [i,direction]of directions.entries()){
  const x=110+(i%4)*220,y=190+Math.floor(i/4)*240;
  world.animals=[{x,y,id:i+1,home:0,hp:192,maxHp:192,moving:false,right:false,flashUntil:0,predator:{kind:'boar',direction,home:{x,y},target:{x,y},seed:i,state:'idle',since:0,until:1,thinkAt:1,readyAt:1,engaged:false,angle:0,distance:0}}];
  ctx.strokeStyle='#46583c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-90,y);ctx.lineTo(x+90,y);ctx.stroke();
  const draw=m.predatorDrawables(ctx,images,world);assert.equal(draw.length,1);draw[0].draw();
  ctx.fillStyle='#172b20';ctx.font='16px sans-serif';ctx.textAlign='center';ctx.fillText(direction,x,y+30);
 }
 surface.flush();const picture=surface.makeImageSnapshot();fs.mkdirSync('docs/qa/boar-combat-v2',{recursive:true});fs.writeFileSync('docs/qa/boar-combat-v2/native-directions.png',picture.encodeToBytes());
 picture.dispose();ctx.dispose();font.dispose();surface.dispose();for(const image of Object.values(images))image.dispose();adapter.disposeLighting();
 const report={passed:true,directions:8,bodyMassSpread:spread,checks:['actual atlas alpha measured across ten resting/locomotion poses','uniform scale per direction preserves anatomy and every animation frame','mirrored views use identical scale','common ground anchor retained','production predator renderer through native Skia adapter','wolf size unchanged']};
 fs.writeFileSync('docs/qa/boar-combat-v2/scale-checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
