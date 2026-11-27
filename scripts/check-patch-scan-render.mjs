// Compare the actual browser/native Skia adapters against the same authored trail.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'patch-scan-render-')),require=createRequire(import.meta.url);
const width=390,height=170,reference=new Map();
const modules=['studio-play','patch-placement','patch-quest','patch-scanner-trail','patch-scanner',
 'patch-scanner-renderer','patch-renderer','patch-scenery','player-presentation','gameplay-artwork','imported-art','skia-adapter','survival-engine'];
try{
 for(const target of ['browser','native']){
  const skia=path.resolve(target==='native'?'native/node_modules/@shopify/react-native-skia':'node_modules/@shopify/react-native-skia');
  const bundle=path.join(tmp,target+'.cjs');
  const entry=modules.map(id=>`export * from './src/${id}';`).join('\n')+
   '\nexport {JsiSkApi} from '+JSON.stringify(path.join(skia,'lib/module/skia/web/JsiSkia.js'))+';';
  await build({stdin:{contents:entry,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:bundle});
  const m=require(bundle),fromSkia=createRequire(path.join(skia,'package.json'));
  const kit=await fromSkia('canvaskit-wasm')({locateFile:name=>path.join(path.dirname(fromSkia.resolve('canvaskit-wasm')),name)});
  const api=m.JsiSkApi(kit),adapter=m.createSkiaAdapter(api),font=api.Font(undefined,16);
  const data=api.Data.fromBytes(fs.readFileSync('public'+m.PATCH_SCENERY_IMAGE));
  const atlas=api.Image.MakeImageFromEncoded(data);data.dispose();assert(atlas);
  const saved=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));m.installImportedArt(saved.records);
  const layout=m.placePatchMaintenanceStation(saved.layout);
  const originalRandom=Math.random;
  let seed=137;
  Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  let world;
  try{world=m.createCampPlaySession(layout,undefined,'survival')}finally{Math.random=originalRandom}
  const quest=m.ensurePatchQuest(world);
  Object.assign(quest,{diagnosed:true,discovered:true,scannerLoaned:true});
  assert.equal(m.patchGameplayImages(world).patchScenery,m.PATCH_SCENERY_IMAGE);
  const site=m.patchRouteSite(world.layout,'shelter').placement;
  const atShelter={x:site.x-320,y:site.y-300,width:640,height:600};
  const props=[];
  m.drawPatchScenery({},atlas,world,atShelter,props);
  assert(props.some(prop=>prop.layer===-1),'Ground evidence sorts above painted terrain');
  assert(props.some(prop=>prop.layer===0),'Standing props sort with actors');

  function paint(offscreen=false){
   const surface=api.Surface.Make(width,height),ctx=new adapter.SkiaContext(surface.getCanvas(),width,height,font);
   surface.getCanvas().clear(api.Color('#00000000'));
   const x=world.player.x-42,y=world.player.y-height/2;
   ctx.translate(-x,-y);
   // Render through the interpolated World object used by the frame loop.
   const presented=m.presentPlayer(world,m.samplePlayer(world),.5);
   const scan=m.samplePatchScan(presented);
   if(scan)m.drawPatchScanner(ctx,atlas,scan,{x:offscreen?x+4000:x,y,width,height},m.heldPatchScanner(presented,scan)?.lens);
   surface.flush();
   const frame=surface.makeImageSnapshot(),pixels=Buffer.from(frame.readPixels());
   frame.dispose();ctx.dispose();surface.dispose();
   return pixels;
  }
  for(const kind of ['right-tread','left-skid','crawler','rope']){
   const stage=kind==='crawler'||kind==='rope'?'haulage':'footprints';
   quest.dispatchRead=stage==='haulage';
   let hit=false;
   for(const mark of m.patchScannerTrail(world.layout,stage).filter(p=>p.kind===kind)){
    Object.assign(world.player,{x:mark.x-72,y:mark.y,direction:'right'});
    world.tick+=240;
    if(m.worldBlocked(world,world.player.x,world.player.y,19)||!m.pulsePatchScanner(world))continue;
    world.tick+=44;
    if(m.samplePatchScan(world)?.prints.some(print=>print.kind===kind)){hit=true;break}
   }
   assert(hit,'Expected a visible '+kind+' on the published trail');
   const active=m.samplePatchScan(world),held=m.heldPatchScanner(world,active);
   assert(held&&held.lens.y<world.player.y,'Beam leaves the raised tool');
   world.player.moving=true;assert.equal(m.heldPatchScanner(world,active),undefined);world.player.moving=false;
   world.player.direction='left';assert.equal(m.heldPatchScanner(world,active),undefined);world.player.direction='right';
   const beam=paint(),offscreen=paint(true);assert(!offscreen.some(Boolean),'Offscreen pulse is culled');
   world.tick+=45;
   const lingering=paint();assert(lingering.some(Boolean),'Painted marks persist after the sweep');
   assert(beam.filter((v,i)=>i%4===3&&v).length>lingering.filter((v,i)=>i%4===3&&v).length,'Light covers open ground beyond the impression');
   world.tick+=320;assert(!paint().some(Boolean),'Expired marks disappear');
   if(target==='browser')reference.set(kind,{pixels:lingering,worldX:world.player.x,worldY:world.player.y});
   else{
    const expected=reference.get(kind);
    assert.deepEqual([world.player.x,world.player.y],[expected.worldX,expected.worldY],'Both adapters exercise the same trail imprint');
    const different=lingering.reduce((count,n,i)=>count+(Math.abs(n-expected.pixels[i])>8),0);
    assert(different<width*height*.035,`The ${kind} paint diverged across platforms on ${different} colour channels`);
   }
  }
  atlas.dispose();font.dispose();adapter.disposeLighting();
  console.log(target+' passed all four painted marks, sweep, culling and fade');
 }
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
