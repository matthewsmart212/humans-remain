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

  function paint({offscreen=false,night=false,printsOnly=false,beamOnly=false,background,phase,fallback=false,name}={}){
   const surface=api.Surface.Make(width,height),ctx=new adapter.SkiaContext(surface.getCanvas(),width,height,font);
   if(fallback)ctx.drawPatchScanLight=undefined;
   surface.getCanvas().clear(api.Color(background??(night?'#908273':'#00000000')));
   const x=world.player.x-90,y=world.player.y-height/2,view={x:offscreen?x+4000:x,y,width,height};
   ctx.translate(-x,-y);
   const presented=m.presentPlayer(world,m.samplePlayer(world),.5),sample=m.samplePatchScan(presented);
   const held=sample&&m.heldPatchScanner(presented,sample);
   const scan=sample&&{...sample,aperture:held?.lens,...(phase===undefined?{}:{sweep:phase}),...(beamOnly?{prints:[]}:{})};
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
  function heldPixels(scan){
   const surface=api.Surface.Make(width,height),ctx=new adapter.SkiaContext(surface.getCanvas(),width,height,font);
   surface.getCanvas().clear(api.Color('#00000000'));
   ctx.translate(-(world.player.x-90),-(world.player.y-height/2));
   const held=m.heldPatchScanner(world,scan);
   if(held)m.drawHeldPatchScanner(ctx,atlas,held,scan.opacity);
   surface.flush();
   const image=surface.makeImageSnapshot(),pixels=Buffer.from(image.readPixels());
   image.dispose();ctx.dispose();surface.dispose();
   return pixels;
  }
  // Measure output light on real opaque ground colours. Transparent previews
  // alone cannot catch a blue SrcOver fill darkening terrain beneath the scan.
  function verifyDaylight(scan,held){
   for(const [name,background] of [['earth','#806548'],['stone','#a6a19a']]){
    const base=paint({offscreen:true,beamOnly:true,background});
    const lit=paint({beamOnly:true,background,phase:.5,name:'daylight-'+name});
    const fallback=paint({beamOnly:true,background,phase:.5,fallback:true,name:'daylight-'+name+'-fallback'});
    for(const [mode,pixels] of [['shader',lit],['fallback',fallback]]){
     let brighter=0;
     for(let i=0;i<pixels.length;i+=4){
      assert(pixels[i]>=base[i]-1&&pixels[i+1]>=base[i+1]-1&&pixels[i+2]>=base[i+2]-1,
       'The '+mode+' scanner must emit light without darkening '+name+' at pixel '+i/4);
      assert.equal(pixels[i+3],255,'Opaque ground stays opaque beneath the scanner');
      if(pixels[i+1]+pixels[i+2]>base[i+1]+base[i+2]+8)brighter++;
     }
     assert(brighter>1500,'The daylight '+mode+' beam must remain visible on '+name);
    }
    const gain=(pixels,distance,angle=scan.angle)=>{
     const x=Math.round(held.lens.x+Math.cos(angle)*distance-(world.player.x-90));
     const y=Math.round(held.lens.y+Math.sin(angle)*distance-(world.player.y-height/2));
     let sum=0;
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      assert(x+dx>=0&&x+dx<width&&y+dy>=0&&y+dy<height,'Light sample lies inside the test surface');
      const i=((y+dy)*width+x+dx)*4;
      sum+=(pixels[i+1]-base[i+1]+pixels[i+2]-base[i+2])/2;
     }
     return sum/9;
    };
    const distance=scan.radius*.5,center=gain(lit,distance);
    assert(gain(fallback,distance)>3,'The fallback fills the cone from its source through the middle of its range');
    for(const side of [-1,1]){
     const middle=gain(lit,distance,scan.angle+side*scan.halfAngle*.73);
     const edge=gain(lit,distance,scan.angle+side*scan.halfAngle*.96);
     const outside=gain(lit,distance,scan.angle+side*(scan.halfAngle+.045));
     assert(center>middle+1&&middle>edge+.5,'The '+name+' beam has a broad sideways fade rather than a hard wedge');
     assert(edge<center*.2&&outside<.5,'Side edges disappear smoothly into '+name);
    }
    // Average several sweep phases so range falloff is measured independently
    // of the moving band. The final stretch must blend into untouched ground.
    const phases=[0,.25,.5,.75].map(phase=>paint({beamOnly:true,background,phase}));
    const average=fraction=>phases.reduce((sum,pixels)=>sum+gain(pixels,scan.radius*fraction),0)/phases.length;
    const near=average(.22),middle=average(.56),far=average(.85),edge=average(.98),outside=average(1.04);
    assert(near>middle+1&&middle>far+1&&far>edge+.5,'The '+name+' beam loses strength gradually with range');
    assert(edge<near*.08&&outside<.5,'Range edge disappears into '+name);
    // A thin radar line creates a sharp brightness jump along this ray. A
    // broad travelling light band stays continuous at normal world scale.
    let previous=gain(lit,scan.radius*.2),largestJump=0;
    for(let d=scan.radius*.2+3;d<scan.radius*.94;d+=3){
     const current=gain(lit,d);largestJump=Math.max(largestJump,Math.abs(current-previous));previous=current;
    }
    assert(largestJump<5,'The scan animation must be a soft travelling band, not a hard ring on '+name);
   }
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
   if(kind==='right-tread')verifyDaylight(active,held);
   const first=paint({beamOnly:true,name:kind+'-scanning'});world.tick+=30;m.stepPatchScanner(world);
   const animated=paint({beamOnly:true,name:kind+'-scan'}),changed=animated.reduce((count,n,i)=>count+(Math.abs(n-first[i])>3),0);
   assert(changed>1000,'The soft scan band visibly travels while the tool remains held');
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
   assert(m.togglePatchScanner(world),'The equipped scanner can be switched off');
   const off=m.samplePatchScan(world);
   assert(off?.equipped&&off.opacity===0&&!off.prints.length,'Power off removes the beam and marks while keeping the tool held');
   assert(m.heldPatchScanner(world,off),'The powered-off scanner still has a hand rig');
   assert(heldPixels(off).some((value,i)=>i%4===3&&value>0),'The physical scanner remains visible when its light is off');
   assert(!paint().some(Boolean),'Power off renders no beam or fluorescent marks');
   const offNight=paint({night:true,name:kind+'-off-night'});
   assert(offNight.every((value,i)=>Math.abs(value-dark[i])<=1),'Power off restores the normal night darkness');
   assert(m.togglePatchScanner(world),'The scanner can be switched back on');
   assert(m.samplePatchScan(world).prints.length,'Power on reveals the nearby trail immediately');
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
  console.log(target+' passed all four painted marks, held power toggle, daylight light emission and feathering, soft travelling band, night silhouette, culling and independent fade');
 }
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
