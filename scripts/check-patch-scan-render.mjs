// Compare the actual browser/native Skia adapters against the same authored trail.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'patch-scan-render-')),require=createRequire(import.meta.url);
const width=640,height=680,reference=new Map();
const previews=process.argv.find(arg=>arg.startsWith('--previews='))?.slice('--previews='.length);
if(previews)fs.mkdirSync(previews,{recursive:true});
const modules=['studio-play','patch-placement','patch-quest','patch-scanner-trail','patch-scanner',
 'patch-scanner-renderer','patch-renderer','patch-scenery','player-presentation','gameplay-artwork','imported-art','skia-adapter','survival-engine'];
try{
 for(const target of ['browser','native']){
  const skia=path.resolve(target==='native'?'native/node_modules/@shopify/react-native-skia':'node_modules/@shopify/react-native-skia');
  const bundle=path.join(tmp,target+'.cjs');
  const entry=modules.map(id=>`export * from './src/${id}';`).join('\n')+
   '\nexport {JsiSkApi} from '+JSON.stringify(path.join(skia,'lib/module/skia/web/JsiSkia.js'))+';';
  await build({stdin:{contents:entry,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:bundle,logLevel:'error'});
  const m=require(bundle),fromSkia=createRequire(path.join(skia,'package.json'));
  const kit=await fromSkia('canvaskit-wasm')({locateFile:name=>path.join(path.dirname(fromSkia.resolve('canvaskit-wasm')),name)});
  const api=m.JsiSkApi(kit),adapter=m.createSkiaAdapter(api),font=api.Font(undefined,16);
  const data=api.Data.fromBytes(fs.readFileSync('public'+m.PATCH_SCENERY_IMAGE));
  const atlas=api.Image.MakeImageFromEncoded(data);data.dispose();assert(atlas);
  const saved=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));m.installImportedArt(saved.records);
  const layout=m.placePatchMaintenanceStation(saved.layout);
  const originalRandom=Math.random;let seed=137;
  Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  let world;
  try{world=m.createCampPlaySession(layout,undefined,'survival')}finally{Math.random=originalRandom}
  const quest=m.ensurePatchQuest(world);
  Object.assign(quest,{diagnosed:true,discovered:true,scannerLoaned:true});world.player.equipped='scanner';
  assert.equal(m.patchGameplayImages(world).patchScenery,m.PATCH_SCENERY_IMAGE);
  const site=m.patchRouteSite(world.layout,'shelter').placement;
  const props=[];m.drawPatchScenery({},atlas,world,{x:site.x-320,y:site.y-300,width:640,height:600},props);
  assert(props.some(prop=>prop.layer===-1),'Ground evidence sorts above painted terrain');
  assert(props.some(prop=>prop.layer===0),'Standing props sort with actors');

  function paint({offscreen=false,night=false,printsOnly=false,name}={}){
   const surface=api.Surface.Make(width,height),ctx=new adapter.SkiaContext(surface.getCanvas(),width,height,font);
   surface.getCanvas().clear(api.Color(night?'#908273':'#00000000'));
   const x=world.player.x-90,y=world.player.y-height/2,view={x:offscreen?x+4000:x,y,width,height};
   ctx.translate(-x,-y);
   const presented=m.presentPlayer(world,m.samplePlayer(world),.5),sample=m.samplePatchScan(presented);
   const held=sample&&m.heldPatchScanner(presented,sample);
   const scan=sample&&{...sample,aperture:held?.lens};
   // The production scanner overlays night shading and scenery. Both blue
   // paint and the darkness relief use the exact same raised-lens aperture.
   if(night)ctx.drawNightLighting([],1,{x,y,width,height},undefined,[],undefined,offscreen?undefined:scan);
   if(scan)m.drawPatchScanner(ctx,atlas,printsOnly?{...scan,opacity:0}:scan,view);
   surface.flush();
   const frame=surface.makeImageSnapshot(),pixels=Buffer.from(frame.readPixels());
   if(previews&&name)fs.writeFileSync(path.join(previews,target+'-'+name+'.png'),Buffer.from(frame.encodeToBytes()));
   frame.dispose();ctx.dispose();surface.dispose();
   return pixels;
  }
  for(const kind of ['right-tread','left-skid','crawler','rope']){
   const stage=kind==='crawler'||kind==='rope'?'haulage':'footprints';quest.dispatchRead=stage==='haulage';
   let hit=false;
   for(const mark of m.patchScannerTrail(world.layout,stage).filter(p=>p.kind===kind)){
    Object.assign(world.player,{x:mark.x-72,y:mark.y,direction:'right',equipped:'scanner'});
    world.tick+=240;m.stepPatchScanner(world);world.tick+=12;m.stepPatchScanner(world);
    if(m.samplePatchScan(world)?.prints.some(print=>print.kind===kind)){hit=true;break}
   }
   assert(hit,'Expected a visible '+kind+' on the published trail');
   let active=m.samplePatchScan(world),held=m.heldPatchScanner(world,active);
   assert(held&&held.lens.y<world.player.y,'Beam leaves the raised tool');
   world.player.moving=true;assert(m.heldPatchScanner(world,m.samplePatchScan(world)),'Walking keeps the scanner in hand');world.player.moving=false;
   world.player.direction='left';assert(m.heldPatchScanner(world,m.samplePatchScan(world)),'Turning keeps the scanner in hand');world.player.direction='right';
   assert(!paint({offscreen:true}).some(Boolean),'Offscreen light and marks are culled');
   const first=paint({name:kind+'-scanning'});world.tick+=15;m.stepPatchScanner(world);
   const animated=paint({name:kind+'-scan'}),changed=animated.reduce((count,n,i)=>count+(Math.abs(n-first[i])>12),0);
   assert(changed>100,'Travelling scan rings visibly animate while the tool remains held');
   const prints=paint({printsOnly:true});
   assert(prints.some((v,i)=>i%4===2&&v>prints[i-2]+60),'Footprints themselves fluoresce blue');
   world.tick+=600;m.stepPatchScanner(world);
   const lit=paint({night:true,name:kind+'-night'}),dark=paint({offscreen:true,night:true});
   let bright=0;
   for(let i=0;i<lit.length;i+=4)if(lit[i+2]>dark[i+2]+35&&lit[i+1]>dark[i+1]+20)bright++;
   assert(bright>300,'At night the scanner still lights the ground after ten seconds held');
   active=m.samplePatchScan(world);held=m.heldPatchScanner(world,active);
   let outside=0;
   for(let py=0;py<height;py++)for(let px=0;px<width;px++){
    const dx=world.player.x-90+px-held.lens.x,dy=world.player.y-height/2+py-held.lens.y;
    if(Math.hypot(dx,dy)<=active.radius+3&&Math.abs(Math.atan2(dy,dx)-active.angle)<=active.halfAngle+.025)continue;
    const i=(py*width+px)*4;
    // Fluorescent footprint art can cross a soft cone boundary; it is
    // deliberately excluded from this light-only nighttime silhouette check.
    if(prints[i+3]>0)continue;
    if(lit[i]>dark[i]+10&&lit[i+1]>dark[i+1]+10&&lit[i+2]>dark[i+2]+10)outside++;
   }
   assert(outside<12,'The night relief cannot spill a white halo outside the blue scan');
   const lingering=paint({printsOnly:true});
   world.player.equipped=null;m.stepPatchScanner(world);
   const released=m.samplePatchScan(world);assert.equal(released.opacity,0,'Putting the tool away removes its light immediately');
   assert(released.prints.length,'Discovered marks remain after the light is put away');
   world.tick+=85;m.stepPatchScanner(world);
   assert(m.samplePatchScan(world).prints.every(p=>p.opacity>0&&p.opacity<1),'Only the evidence fades after release');
   paint({name:kind+'-fading'});
   world.tick+=100;m.stepPatchScanner(world);assert(!paint().some(Boolean),'Faded marks disappear');
   if(target==='browser')reference.set(kind,{pixels:lingering,worldX:world.player.x,worldY:world.player.y});
   else{
    const expected=reference.get(kind);
    assert.deepEqual([world.player.x,world.player.y],[expected.worldX,expected.worldY],'Both adapters exercise the same trail imprint');
    const different=lingering.reduce((count,n,i)=>count+(Math.abs(n-expected.pixels[i])>8),0);
    assert(different<width*height*.035,`The ${kind} paint diverged across platforms on ${different} colour channels`);
   }
  }
  atlas.dispose();font.dispose();adapter.disposeLighting();
  console.log(target+' passed all four painted marks, moving held tool, animated continuous beam, night silhouette, culling and independent fade');
 }
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
