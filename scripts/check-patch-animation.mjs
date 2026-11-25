// Exercise the production companion painter through the installed browser and
// native Skia APIs. Optional previews are real rendered frames, not mockups.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const root=process.cwd(),require=createRequire(import.meta.url),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'patch-animation-'));
const previews=process.argv.find(a=>a.startsWith('--output='))?.slice(9);
if(previews)fs.mkdirSync(previews,{recursive:true});
const targets=process.argv.includes('--browser-only')?['browser']:['browser','native'];
const directions=['down','down-right','right','up-right','up','up-left','left','down-left'];
const metadata=JSON.parse(fs.readFileSync('src/patch-walk-frames.json','utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const width=256,height=220,viewport={x:0,y:0,width,height};
const difference=(a,b,region={x:0,y:0,width,height})=>{
 let changed=0,total=0,max=0;
 for(let y=region.y;y<region.y+region.height;y++)for(let x=region.x;x<region.x+region.width;x++){
  const i=(y*width+x)*4;let largest=0;
  for(let c=0;c<3;c++){const n=Math.abs(a[i+c]-b[i+c]);total+=n;largest=Math.max(largest,n)}
  if(largest>8)changed++;max=Math.max(max,largest);
 }
 return{changed,mean:total/(region.width*region.height*3),max};
};
assert.equal(metadata.version,1);assert.equal(metadata.cell,256);assert.equal(metadata.columns,8);
assert.deepEqual(metadata.directions,directions);assert.deepEqual(metadata.anchor,[128,228]);
assert.equal(metadata.lamps.length,8);for(const row of metadata.lamps){assert.equal(row.length,8);for(const lamp of row){assert.equal(lamp.length,2);assert(lamp.every(n=>Number.isFinite(n)&&n>=0&&n<256))}}

const results=[],browserFrames=new Map(),browserCalls=new Map();
try{
 for(const target of targets){
  const skiaRoot=path.resolve(target==='native'?'native/node_modules/@shopify/react-native-skia':'node_modules/@shopify/react-native-skia');
  const file=path.join(temporary,target+'.cjs'),modules=['patch-art','patch-animation','player-presentation','patch-renderer','patch-quest','patch-placement','gameplay-artwork','survival-engine','world-layout','skia-adapter'];
  await build({stdin:{contents:modules.map(id=>`export * from './src/${id}';`).join('\n')+`\nexport {JsiSkApi} from ${JSON.stringify(path.join(skiaRoot,'lib/module/skia/web/JsiSkia.js'))};`,resolveDir:root},bundle:true,platform:'node',format:'cjs',outfile:file,logLevel:'error'});
  const m=require(file),kitRequire=createRequire(path.join(skiaRoot,'package.json'));
  const kit=await kitRequire('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(kitRequire.resolve('canvaskit-wasm')),f)}),api=m.JsiSkApi(kit);
  if(target==='native')assert(api.PathBuilder,'Exercise the native immutable-path API as well as browser paths');
  // A null CanvasKit typeface produces no glyphs; load the runtime font's
  // family/weight so speech checks verify painted text as well as draw calls.
  const fontBytes=fs.readFileSync(require.resolve('@fontsource/barlow-condensed/files/barlow-condensed-latin-900-normal.woff'));
  const fontData=api.Data.fromBytes(fontBytes),face=api.Typeface.MakeFreeTypeFaceFromData(fontData);fontData.dispose();assert(face,'The Barlow Condensed Black test face decodes');
  const adapter=m.createSkiaAdapter(api),font=api.Font(face,16),images={};
  const surface=api.Surface.Make(width,height);assert(surface);
  try{
   for(const [key,url] of Object.entries(m.PATCH_IMAGES)){
    const data=api.Data.fromBytes(fs.readFileSync('public'+url));images[key]=api.Image.MakeImageFromEncoded(data);data.dispose();assert(images[key],url+' decodes');
   }
   assert.deepEqual([images.patchWalk.width(),images.patchWalk.height()],[2048,2048]);
   const atlas=images.patchWalk.readPixels();assert(atlas);
   const frameHashes=new Set(),legHashes=new Set();
   for(let row=0;row<8;row++)for(let phase=0;phase<8;phase++){
    const bytes=Buffer.alloc(256*256*4);let body=0,border=0;
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
     const i=((row*256+y)*2048+phase*256+x)*4,j=(y*256+x)*4;
     for(let c=0;c<4;c++)bytes[j+c]=atlas[i+c];
     if(atlas[i+3]>128){body++;if(x<2||x>253||y<2||y>253)border++}
    }
    assert(body>10000,`${target}: ${directions[row]} phase${phase} has a full painted body`);
    assert.equal(border,0,'Opaque body pixels do not touch neighboring atlas cells');
    frameHashes.add(hash(bytes));legHashes.add(hash(bytes.subarray(170*256*4,232*256*4)));
    const [lx,ly]=metadata.lamps[row][phase];let amber=0;
    for(let y=Math.round(ly)-4;y<=Math.round(ly)+4;y++)for(let x=Math.round(lx)-4;x<=Math.round(lx)+4;x++){
     const i=((row*256+y)*2048+phase*256+x)*4;
     if(atlas[i+3]>128&&atlas[i]>atlas[i+1]*1.1&&atlas[i+1]>atlas[i+2]*1.25)amber++;
    }
    assert(amber>5,`${target}: registered lamp lies on amber artwork in ${directions[row]} phase${phase}`);
   }
   assert.equal(frameHashes.size,64,'Every direction/phase has its own artwork');
   assert.equal(legHashes.size,64,'Walking legs are authored, not repeated standing cutouts');
   assert.equal(m.PATCH_ROBOT_SCALE/.3,1.5,'Both visual dimensions grow by exactly 50 percent');
   assert.equal(m.PATCH_WALK_CYCLE_DISTANCE,112,'Existing saved gait distance stays compatible');
   for(const distance of [0,13.999,14,27.999,28,97.999,98,111.999,112,126,224]){
    const expected=Math.floor((distance%112)/14);
    assert.equal(m.patchWalkPhase(distance),expected,'A phase changes only after its own travelled distance');
    for(const direction of directions)assert.equal(m.patchSpriteFrame('walk',direction,distance).phase,expected,'Turning preserves left/right gait phase');
   }
   for(const invalid of [NaN,Infinity,-1])assert.equal(m.patchWalkPhase(invalid),0);

   const layout=m.emptyLayout();layout.spawn={x:128,y:170};layout.items=[
    {id:m.PATCH_STATION_PLACEMENT_ID,assetId:m.PATCH_STATION_ID,x:3,y:90,scale:1,solid:false,role:'prop',roof:'auto'},
    {id:m.PATCH_LOCKER_PLACEMENT_ID,assetId:m.PATCH_LOCKER_ID,x:-237,y:-70,scale:1,solid:false,role:'prop',roof:'auto'},
   ];
   const world=m.createWorld(layout);world.progression={};world.editorPreview=true;world.weather={reducedMotion:false};
   world.enemies=[];world.animals=[];world.loot=[];world.effects=[];
   const q=m.ensurePatchQuest(world);assert(q);Object.assign(q,{servoInstalled:true,direction:'down',moving:true});
   assert.equal(m.gameplayImageSources(world).patchWalk,m.PATCH_IMAGES.patchWalk,'Nearby gameplay preloads the same walk atlas');
   const bindings=fs.readFileSync('native/bundled-art.ts','utf8');
   assert(bindings.includes(JSON.stringify(m.PATCH_IMAGES.patchWalk)+':require("./../public'+m.PATCH_IMAGES.patchWalk+'")'),'Expo bundles the walk atlas for offline use');
   const previous=m.samplePlayer(world),ground={...q.position};
   q.position.x+=6;q.walkDistance=3;previous.patch.walkDistance=109;
   const halfway=m.presentPlayer(world,previous,.5);
   assert.equal(halfway.presentedPatch.x,ground.x+3);
   assert.equal(halfway.presentedPatch.walkDistance,0,'The render pose crosses the stride seam smoothly');
   assert.equal(halfway.patchQuest,q,'Interpolated views share run facts and live speech');
   assert.equal(q.position.x,ground.x+6,'Painting does not change the simulated position');
   q.position.x=ground.x;q.walkDistance=0;
   const imageKeys=new Map(Object.entries(images).map(([key,image])=>[image,key]));
   const observed=new Set(['drawImage','ellipse','arc','moveTo','lineTo','closePath','fill','stroke','rotate','translate','scale','createRadialGradient','strokeText','fillText']);
   const render=(name,feedback=true,available=images)=>{
    const context=new adapter.SkiaContext(surface.getCanvas(),width,height,font),calls=[];
    context.fillStyle='#59614b';context.fillRect(0,0,width,height);
    const ctx=new Proxy(context,{get(object,key){const value=Reflect.get(object,key);if(typeof value!=='function')return value;return(...args)=>{if(observed.has(key))calls.push([key,...args.map(a=>imageKeys.get(a)??a)]);return value.apply(object,args)}}});
    const presented=m.presentPlayer(world,m.samplePlayer(world),.5);assert.notEqual(presented,world);
    const draws=m.patchDrawables(ctx,available,presented,viewport);assert.equal(draws.length,1);assert.equal(draws[0].y,q.position.y,'Actor sorting stays at the feet');draws[0].draw();
    if(feedback)m.drawPatchFeedback(ctx,available,presented,viewport);
    surface.flush();const shot=surface.makeImageSnapshot(),pixels=Buffer.from(shot.readPixels());
    if(previews&&name)fs.writeFileSync(path.join(previews,target+'-'+name+'.png'),Buffer.from(shot.encodeToBytes()));
    shot.dispose();context.dispose();return{pixels,calls};
   };
   let smallestLegDifference=Infinity,maxParityError=0,mostParityPixels=0;
   for(let row=0;row<8;row++){
    const rowFrames=[];q.direction=directions[row];q.moving=true;
    for(let phase=0;phase<8;phase++){
     q.walkDistance=phase*14+7;world.tick=phase*83;
     const name=directions[row]+'-'+phase,frame=m.patchSpriteFrame('walk',q.direction,q.walkDistance);
     assert.deepEqual(frame.source,[phase*256,row*256,256,256]);assert.deepEqual(frame.lamp,metadata.lamps[row][phase]);
     const rendered=render(name);rowFrames.push(rendered.pixels);
     const draw=rendered.calls.find(c=>c[0]==='drawImage');
     assert.deepEqual(draw.slice(1,6),['patchWalk',phase*256,row*256,256,256],'The painter uses the selected walking cell');
     const [ratio,dx,dy]=frame.registration;
     assert(ratio>.95&&ratio<1.03,'Registration keeps the enlarged size');
     assert.deepEqual(draw.slice(6),[128+(dx-128*ratio)*.45,170+(dy-228*ratio)*.45,256*ratio*.45,256*ratio*.45],'The gait registration is isotropic and foot-anchored');
     assert(!rendered.calls.some(c=>['rotate','translate','scale'].includes(c[0])),'Walking never rocks or bobs the entire standing image');
     const glow=rendered.calls.find(c=>c[0]==='createRadialGradient'),[lx,ly]=metadata.lamps[row][phase];assert(glow,'Lamp feedback is rendered');
     assert.equal(glow[1],128+(dx+(lx-128)*ratio)*.45);assert.equal(glow[2],170+(dy+(ly-228)*ratio)*.45,'Lamp follows this exact gait cell');
     if(target==='browser'){browserFrames.set(name,rendered.pixels);browserCalls.set(name,rendered.calls)}
     else{
      assert.deepEqual(rendered.calls,browserCalls.get(name),'Browser and native use identical crop, anchor, shadow and lamp commands');
      const delta=difference(browserFrames.get(name),rendered.pixels);maxParityError=Math.max(maxParityError,delta.mean);mostParityPixels=Math.max(mostParityPixels,delta.changed);
      assert(delta.mean<.25&&delta.changed<width*height*.003,'Browser/native pixels agree within raster edge tolerance');
     }
    }
    for(let phase=0;phase<8;phase++){
     const delta=difference(rowFrames[phase],rowFrames[(phase+1)%8],{x:88,y:145,width:80,height:27});
     smallestLegDifference=Math.min(smallestLegDifference,delta.changed);
     assert(delta.changed>20,'Every adjacent step changes actual leg pixels, including the loop seam');
    }
    q.moving=false;q.walkDistance=1;world.tick=0;const resting=render();
    q.walkDistance=111;world.tick=9000;const later=render();assert(resting.pixels.equals(later.pixels),'Idle settles to a stable planted pose');
    assert.equal(resting.calls.find(c=>c[0]==='drawImage')[1],'patchRobot');
   }
   q.direction='down-right';q.moving=true;q.walkDistance=45;world.weather.reducedMotion=true;
   const reduced=render('reduced-walking');world.tick+=300;assert(reduced.pixels.equals(render().pixels),'Reduced motion has no decorative clock-driven movement');
   q.walkDistance+=14;assert(difference(reduced.pixels,render().pixels).changed>20,'Reduced motion preserves essential stepping');
   const fallback=render('loading-fallback',true,{patchRobot:images.patchRobot,patchDamaged:images.patchDamaged});
   assert.equal(fallback.calls.find(c=>c[0]==='drawImage')[1],'patchRobot','Late walk download retains a visible companion');
   q.servoInstalled=false;q.moving=false;world.tick=0;const damaged=render('damaged');world.tick=360;assert(damaged.pixels.equals(render().pixels),'Reduced-motion rescue beacon is steady');
   assert.deepEqual(damaged.calls.find(c=>c[0]==='drawImage').slice(6),[128-128*.45,170-228*.45,256*.45,256*.45],'The damaged pose is enlarged by the same amount');
   world.patchRepair={worked:3,duration:6,held:true};const half=render('repair-half');
   const arc=half.calls.filter(c=>c[0]==='moveTo'||c[0]==='lineTo');assert.equal(arc.length,21);
   assert.deepEqual(arc[0],['moveTo',128,158]);assert(Math.abs(arc.at(-1)[1]-128)<1e-7);assert.equal(arc.at(-1)[2],188,'Half repair draws only the right half of the larger ring');
   world.patchRepair=undefined;
   assert.equal(m.patchDrawables({},images,world,{x:4000,y:4000,width:100,height:100}).length,0,'Distant actors do no GPU work');
   q.servoInstalled=true;assert.equal(m.patchDrawables({},images,world,{x:80,y:55,width:96,height:20}).length,1,'Expanded cull bounds retain visible head/lamp edges');
   assert.equal(m.patchDrawables({},images,{...world,scene:{}},viewport).length,0,'Patch does not leak into interior scenes');

   // Real quest actions produce temporary speech. Paint their bubbles through
   // both production adapters, including the two-line repair acknowledgement.
   Object.assign(q,{discovered:true,servoClaimed:true,servoInstalled:false,recruited:false,returnedToCamp:false,suppliesDelivered:false,command:'stay',moving:false});
   Object.assign(world.player,q.position);world.stationPanel=undefined;
   assert(m.beginPatchRepair(world));assert(m.holdPatchRepair(world,true));
   for(let i=0;i<360;i++){world.tick++;m.stepPatchQuest(world)}
   assert(q.servoInstalled);assert.equal(m.patchSpeech(world),'Supplies… still required?');
   const checkSpeech=(name,expected)=>{
    const shot=render(name),text=shot.calls.filter(call=>call[0]==='fillText');
    assert(text.length>=1&&text.length<=2,'World speech stays within two readable lines');
    assert.equal(text.map(call=>call[1]).join(' '),expected,'Wrapping preserves the complete authored response');
    assert(!shot.calls.some(call=>call[0]==='strokeText'),'Readable bubble text does not need a heavy outline');
    assert(shot.calls.some(call=>call[0]==='closePath'),'A closed background and pointer protect text from world detail');
    let inkPixels=0;
    for(let y=0;y<65;y++)for(let x=0;x<width;x++){
     const at=(y*width+x)*4;if(shot.pixels[at]>210&&shot.pixels[at+1]>200&&shot.pixels[at+2]>165)inkPixels++;
    }
    assert(inkPixels>30,'Cream speech glyphs must actually paint inside the bubble');
    if(target==='browser'){browserFrames.set(name,shot.pixels);browserCalls.set(name,shot.calls)}
    else{
     assert.deepEqual(shot.calls,browserCalls.get(name),'Native and web use the same bubble paths and text baselines');
     const delta=difference(browserFrames.get(name),shot.pixels);
     assert(delta.mean<.25&&delta.changed<width*height*.003,'Native and web bubble pixels agree');
    }
    return shot;
   };
   assert.equal(checkSpeech('speech-repair','Supplies… still required?').calls.filter(call=>call[0]==='fillText').length,2);
   assert(m.recruitPatch(world));checkSpeech('speech-recruited','I know that camp. Lead the way.');
   Object.assign(q,{returnedToCamp:true,suppliesDelivered:true});
   for(const [command,line] of [['follow','With you.'],['stay','I will wait here.'],['camp','Returning to camp.']]){
    world.stationPanel='patch';assert(m.commandPatch(world,command));checkSpeech('speech-'+command,line);
   }
   world.player.x+=1100;assert(!render().calls.some(call=>call[0]==='fillText'),'A distant actor cannot speak across the screen');world.player.x-=1100;
   world.tick+=181;assert.equal(m.patchSpeech(world),undefined,'The existing three-second command lifetime remains intact');
   assert(!render().calls.some(call=>call[0]==='fillText'),'Expired bubbles leave no persistent world UI');
   results.push({target,skiaVersion:JSON.parse(fs.readFileSync(path.join(skiaRoot,'package.json'))).version,walkFrames:frameHashes.size,legFrames:legHashes.size,smallestAdjacentLegChange:smallestLegDifference,maxParityMean:maxParityError,maxParityPixels:mostParityPixels});
  }finally{for(const image of Object.values(images))image?.dispose();surface.dispose();font.dispose();face.dispose();adapter.disposeLighting()}
 }
 const report={passed:true,results,checks:['eight headings and eight actual leg poses','256-pixel bounds and transparent cell gutters','1.5x standing/damaged/walking scale','distance-driven phases and continuous turns','steady planted idle','essential reduced-motion locomotion','per-frame lamp registration','larger partial repair arc','browser/native offline atlas parity','shared depth and expanded culling','real repair/recruitment/command speech bubbles and timed expiry','one/two-line speech and native/web bubble rendering parity'],physicalIPhoneTested:false};
 if(previews)fs.writeFileSync(path.join(previews,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(temporary,{recursive:true,force:true})}
