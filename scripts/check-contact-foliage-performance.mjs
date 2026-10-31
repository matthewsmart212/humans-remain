import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'contact-foliage-'));
try{
 const baseline=process.argv.includes('--baseline');
 const source="export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/foliage-motion';export * from './src/foliage-renderer';export * from './src/studio-play';export * from './src/survival-engine';export * from './src/layout-views';export * from './src/placed-world-renderer';export * from './src/skia-adapter';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';"+(baseline?"export {createSkiaAdapter as beforeAdapter} from './.qa/skia-adapter-before';export {visiblePlacements as beforeVisible,layoutViews as beforeViews} from './.qa/layout-views-before';":"");
 await build({stdin:{contents:source,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs')});
 const m=require(path.join(temp,'test.cjs'));m.installImportedArt(JSON.parse(fs.readFileSync('docs/qa/clean-play/artwork.json')).records);
 const draft=JSON.parse(fs.readFileSync('docs/qa/tree-variants-v1/after.json')),original=JSON.stringify(draft);
 const p={...m.newPlacement('art_foliage_fern',600,600),id:'contact-test'},layout={...m.emptyLayout(),spawn:{x:550,y:600},items:[p]},asset=m.ASSET_BY_ID.get(p.assetId);
 const make=()=>m.createCampPlaySession(layout),step=(w,n)=>{for(let i=0;i<n;i++){w.tick++;m.stepFoliage(w,m.STEP)}};
 const idle=make();Object.assign(idle.player,{x:584,y:600,moving:false});step(idle,600);assert.equal(idle.foliageMotions,undefined,'Standing in a plant creates no motion');
 idle.player.moving=true;step(idle,32);assert(idle.foliageMotions[p.id].x>.1,'Walking pushes foliage');idle.player.moving=false;step(idle,240);assert.equal(idle.foliageMotions,undefined,'Stopping inside a plant lets it settle and sleep');
 const walk=make(),run=make();for(const w of [walk,run])Object.assign(w.player,{x:584,y:600,moving:true,direction:'right'});run.player.sprinting=true;step(walk,32);step(run,32);assert(run.foliageMotions[p.id].x>walk.foliageMotions[p.id].x*1.4);
 for(const kind of ['enemy','animal']){const w=make();Object.assign(w.player,{x:1000,y:1000,moving:false});const actor={id:1,x:584,y:600,hp:10,moving:false};w[kind==='enemy'?'enemies':'animals']=[actor];step(w,60);assert.equal(w.foliageMotions,undefined);actor.moving=true;step(w,32);assert(w.foliageMotions[p.id]);actor.moving=false;step(w,240);assert.equal(w.foliageMotions,undefined);}
 const native=make();for(let i=0;i<30;i++)m.stepWorld(native,{x:1,y:0});assert(native.foliageMotions?.[p.id],'Native simulation also steps contact foliage');
 const at0=structuredClone(m.foliageMesh(p,asset,{x:0,y:0},0)),at100=structuredClone(m.foliageMesh(p,asset,{x:0,y:0},100));assert.deepEqual(at0,at100,'Time alone cannot sway foliage');
 const bent=m.foliageMesh(p,asset,{x:1,y:.5},0);for(let i=25;i<35;i++)assert.deepEqual(bent.positions[i],at0.positions[i],'Roots remain fixed');
 const calls={images:0,meshes:0},ctx={save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(){calls.images++},drawTexturedMesh(){calls.meshes++}};
 const many={...layout,items:Array.from({length:600},(_,i)=>({...p,id:'plant-'+i,x:300+i%30*20,y:300+Math.floor(i/30)*20}))},world=m.createCampPlaySession({...many,spawn:{x:100,y:100}}),imgs={[m.assetImageKey(asset.image)]:{}};
 for(const d of m.placedDrawables(ctx,imgs,world,true))d.draw();assert.equal(calls.meshes,0);assert.equal(calls.images,600);
 world.foliageMotions={'plant-0':{x:.3,y:.1,vx:0,vy:0,lastTouch:0}};calls.images=0;for(const d of m.placedDrawables(ctx,imgs,world,true))d.draw();assert.equal(calls.meshes,1);assert.equal(calls.images,599);
 world.weather={reducedMotion:true};calls.images=0;calls.meshes=0;for(const d of m.placedDrawables(ctx,imgs,world,true))d.draw();assert.equal(calls.meshes,0);assert.equal(calls.images,600);
 for(let i=0;i<100;i++){
  const view={x:-500+(i*317)%7200,y:-500+(i*563)%7200,width:300+i%7*200,height:250+i%5*180};
  const visible=m.visiblePlacements(draft,view),again=m.visiblePlacements(draft,{...view}),ground=m.visibleGroundPlacements(draft,view);assert.equal(visible,again,'Identical camera queries reuse the list');
  assert.deepEqual(ground,m.layoutViews(draft).ground.filter(p=>visible.includes(p)),'Ground decal order remains authored order');
  if(baseline)assert.deepEqual(visible.map(p=>p.id),m.beforeVisible(draft,view).map(p=>p.id),'Culling and equal-depth order match the previous renderer');
 }
 const view={x:1000,y:1000,width:1200,height:700},first=m.visiblePlacements(draft,view);m.visiblePlacements(draft,{x:200,y:200,width:150,height:165});assert.equal(m.visiblePlacements(draft,view),first);assert.equal(m.layoutViews(draft).queries.length,2);
 m.invalidateLayoutViews();assert.notEqual(m.visiblePlacements(draft,view),first,'Artwork/layout invalidation drops cached views');assert.equal(JSON.stringify(draft),original);
 const init=require('canvaskit-wasm'),kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)}),skia=m.JsiSkApi(kit);
 const imageData=skia.Data.fromBytes(fs.readFileSync('public'+asset.image)),image=skia.Image.MakeImageFromEncoded(imageData);imageData.dispose();assert(image);
 const render=(factory,record=false,meshes=false)=>{
  let paints=0;const api={...skia,Paint:()=>{paints++;return skia.Paint()}},adapter=factory(api),font=skia.Font(undefined,16),surface=skia.Surface.Make(400,300);
  const recorder=record?skia.PictureRecorder():null,canvas=recorder?recorder.beginRecording(skia.XYWHRect(0,0,400,300)):surface.getCanvas();let picture;
  const started=performance.now(),before=paints;
  for(let frame=0;frame<8;frame++){
   const c=new adapter.SkiaContext(canvas,400,300,font);
   for(let i=0;i<150;i++){c.globalAlpha=[1,.6,.08,.4][i%4];c.filter=i%3===0?'brightness(2)':'none';c.save();c.translate((i%15)*23,Math.floor(i/15)*28);c.rotate(i%2?.07:0);if(i%5===0)c.scale(-1,1);c.drawImage(image,...asset.crop,0,0,40,45);c.restore();}
   if(meshes)for(let i=0;i<4;i++){c.save();c.translate(-470+i*15,-400);c.globalAlpha=[1,.6,.08,.4][i];c.drawTexturedMesh(image,m.foliageMesh(p,asset,{x:(i-1)*.3,y:.2},0));c.restore();}
   c.dispose();
  }
  if(recorder){picture=recorder.finishRecordingAsPicture();surface.getCanvas().drawPicture(picture)}
  surface.flush();const snapshot=surface.makeImageSnapshot(),bytes=Buffer.from(snapshot.encodeToBytes());snapshot.dispose();const result={paintAllocations:paints-before,imageDraws:1200,milliseconds:performance.now()-started};
  picture?.dispose();recorder?.dispose();surface.dispose();font.dispose();adapter.disposeLighting();return {bytes,...result};
 };
 const after=render(m.createSkiaAdapter);assert.equal(after.paintAllocations,2,'Repeated image draws reuse two native paints, including brightness');let before;
 if(baseline){before=render(m.beforeAdapter);assert.deepEqual(after.bytes,before.bytes,'Original image sampling, alpha, filters, flips and transforms remain pixel-identical');for(const record of [false,true]){const afterMesh=render(m.createSkiaAdapter,record,true),beforeMesh=render(m.beforeAdapter,record,true);assert.deepEqual(afterMesh.bytes,beforeMesh.bytes,'Cached mesh shader preserves alpha, UVs and native Picture snapshots');}assert.equal(before.paintAllocations,1200);}
 let meshPaints=0;const meshAdapter=m.createSkiaAdapter({...skia,Paint:()=>{meshPaints++;return skia.Paint()}}),meshSurface=skia.Surface.Make(400,300),meshFont=skia.Font(undefined,16),paintStart=meshPaints;
 for(let i=0;i<30;i++){const mc=new meshAdapter.SkiaContext(meshSurface.getCanvas(),400,300,meshFont);mc.drawTexturedMesh(image,m.foliageMesh(p,asset,{x:.2,y:0},0));mc.dispose();}
 assert.equal(meshPaints-paintStart,1,'Animated mesh reuses its native paint and shader');meshAdapter.releaseImage(image);
 const mc=new meshAdapter.SkiaContext(meshSurface.getCanvas(),400,300,meshFont);mc.drawTexturedMesh(image,m.foliageMesh(p,asset,{x:.2,y:0},0));mc.dispose();assert.equal(meshPaints-paintStart,2,'Image eviction releases and rebuilds the dependent mesh paint');meshSurface.dispose();meshFont.dispose();meshAdapter.disposeLighting();
 const adapter=m.createSkiaAdapter(skia),surface=skia.Surface.Make(400,300),font=skia.Font(undefined,16),c=new adapter.SkiaContext(surface.getCanvas(),400,300,font);m.drawFoliage(c,image,make(),p,asset);surface.flush();c.dispose();surface.dispose();font.dispose();adapter.disposeLighting();image.dispose();
 const report={passed:true,worldPlacements:draft.items.length,idleFoliage:{tested:600,deformingMeshes:0,oneContactMeshes:1},spriteDraws:after.imageDraws,paintAllocationsBefore:before?.paintAllocations,paintAllocationsAfter:after.paintAllocations,pixelsIdenticalToPrevious:baseline,recordedPicturePixelsIdentical:baseline,cullingViewsCompared:baseline?100:0,deviceFPSMeasured:false,checks:['moving player/enemy/animal contact only','stationary contact sleeps','fixed roots and reduced motion','native simulation contact','bounded visibility cache and invalidation','ground/depth ordering preserved','no artwork files changed']};
 fs.mkdirSync('docs/qa/contact-foliage-performance',{recursive:true});fs.writeFileSync('docs/qa/contact-foliage-performance/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
