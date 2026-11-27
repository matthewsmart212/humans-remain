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
  const file=path.join(temporary,target+'.cjs'),modules=['patch-art','patch-animation','patch-meeting','placed-world-renderer','continuous-zoom','patch-chat','patch-chat-bounds','patch-reply-strip-layout','patch-bubble-placement','patch-dialogue','patch-speech-bubble','player-presentation','patch-renderer','patch-quest','patch-placement','gameplay-artwork','survival-engine','world-layout','skia-adapter'];
  await build({stdin:{contents:modules.map(id=>`export * from './src/${id}';`).join('\n')+`\nexport {JsiSkApi} from ${JSON.stringify(path.join(skiaRoot,'lib/module/skia/web/JsiSkia.js'))};`,resolveDir:root},bundle:true,platform:'node',format:'cjs',outfile:file,logLevel:'error'});
  const m=require(file),kitRequire=createRequire(path.join(skiaRoot,'package.json'));
  const kit=await kitRequire('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(kitRequire.resolve('canvaskit-wasm')),f)}),api=m.JsiSkApi(kit);
  if(target==='native')assert(api.PathBuilder,'Exercise the native immutable-path API as well as browser paths');
  // A null CanvasKit typeface produces no glyphs; load the runtime font's
  // family/weight so speech checks verify painted text as well as draw calls.
  const fontBytes=fs.readFileSync(require.resolve('@fontsource/barlow-condensed/files/barlow-condensed-latin-900-normal.woff'));
  const fontData=api.Data.fromBytes(fontBytes),face=api.Typeface.MakeFreeTypeFaceFromData(fontData);fontData.dispose();assert(face,'The Barlow Condensed Black test face decodes');
  const dialogueFont=m.createDialogueFont(api,api.Data.fromBytes(fs.readFileSync('public/fonts/barlow-medium.ttf')));assert(dialogueFont);
  const adapter=m.createSkiaAdapter(api,undefined,dialogueFont),font=api.Font(face,16),images={};
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
   const artScale=m.PATCH_ROBOT_SCALE;
   assert(Math.abs(artScale/.45-1.30)<1e-12,'All poses are 30 percent larger than the previous release');
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
     const shadow=rendered.calls.find(c=>c[0]==='ellipse');
     assert.equal(shadow[3],17*(artScale/.3));assert.equal(shadow[4],5*(artScale/.3),'The shadow follows the enlarged feet');
     const [ratio,dx,dy]=frame.registration;
     assert(ratio>.95&&ratio<1.03,'Registration keeps the enlarged size');
     assert.deepEqual(draw.slice(6),[ground.x+(dx-128*ratio)*artScale,ground.y+(dy-228*ratio)*artScale,256*ratio*artScale,256*ratio*artScale],'The gait registration is isotropic and foot-anchored');
     assert(!rendered.calls.some(c=>['rotate','translate','scale'].includes(c[0])),'Walking never rocks or bobs the entire standing image');
     const glow=rendered.calls.find(c=>c[0]==='createRadialGradient'),[lx,ly]=metadata.lamps[row][phase];assert(glow,'Lamp feedback is rendered');
     const field=m.patchNightLight(world,viewport);
     assert.equal(field.x,glow[1]);assert.equal(field.y,glow[2],'The night lighting field is centred on the registered lamp');
     assert.equal(glow[1],ground.x+(dx+(lx-128)*ratio)*artScale);assert.equal(glow[2],ground.y+(dy+(ly-228)*ratio)*artScale,'Lamp follows this exact gait cell');
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
   assert.deepEqual(damaged.calls.find(c=>c[0]==='drawImage').slice(6),[ground.x-128*artScale,ground.y-228*artScale,256*artScale,256*artScale],'The damaged pose is enlarged by the same amount');
   world.patchRepair={worked:3,duration:6,held:true};const half=render('repair-half');
   const arc=half.calls.filter(c=>c[0]==='moveTo'||c[0]==='lineTo');assert.equal(arc.length,21);
   assert.equal(arc[0][0],'moveTo');assert.equal(arc[0][1],ground.x);assert(Math.abs(arc[0][2]-(ground.y-8*artScale/.3))<1e-7);assert(Math.abs(arc.at(-1)[1]-128)<1e-7);assert.equal(arc.at(-1)[2],ground.y+12*artScale/.3,'Half repair draws only the right half of the larger ring');
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
   assert(q.servoInstalled);assert.equal(m.patchSpeech(world),'That’s both feet under me. Thank you.');
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
   assert.equal(checkSpeech('speech-repair','That’s both feet under me. Thank you.').calls.filter(call=>call[0]==='fillText').length,2);
   assert(m.recruitPatch(world));checkSpeech('speech-recruited','I know that camp. Lead the way.');
   Object.assign(q,{returnedToCamp:true,suppliesDelivered:true});
   for(const [command,line] of [['follow','With you.'],['stay','I will wait here.'],['camp','Returning to camp.']]){
    assert(m.inspectPatch(world));assert(m.choosePatchChat(world,command));checkSpeech('speech-'+command,line);
   }
   world.player.x+=1100;assert(!render().calls.some(call=>call[0]==='fillText'),'A distant actor cannot speak across the screen');world.player.x-=1100;
   world.tick+=181;assert.equal(m.patchSpeech(world),undefined,'The existing three-second command lifetime remains intact');
   assert(!render().calls.some(call=>call[0]==='fillText'),'Expired bubbles leave no persistent world UI');
   // Every word of the industrial-gate answer must survive real choices,
   // including page changes. The HUD owns that transcript in a meeting.
   Object.assign(world.player,{x:q.position.x+68,y:q.position.y+26});
   assert(m.inspectPatch(world));assert(m.choosePatchChat(world,'ask'));assert(m.choosePatchChat(world,'topic:reclamation'));assert(m.choosePatchChat(world,'tell-wire'));
   const reply=[],phoneBounds=[
    {width:568,height:320,scale:.53,x:245,y:130},
    {width:667,height:320,scale:.38,x:330,y:156},
    {width:844,height:390,scale:.9,x:96,y:55},
    {width:390,height:844,scale:1.8,x:310,y:790},
   ];
   do{
    const page=m.patchChat(world);reply.push(page.line);
    for(const phone of phoneBounds){
     const {width:pw,height:ph,scale,x,y}=phone;
     const notch=pw>ph&&pw>568?44:0;
     const safe={left:notch,right:notch,top:0,bottom:pw===568?0:18};
     const {bounds}=m.patchReplyStripLayout(pw,ph,safe);
     m.setPatchChatBounds(world,bounds,safe);
     const framed=m.patchMeetingCamera(world,{x:0,y:0,scale},pw,ph,world.tick/60);
     for(const [actor,half,tall] of [[q.position,92*artScale,200*artScale],[world.player,39,119]]){
      const left=(actor.x-half-framed.x)*framed.scale,right=(actor.x+half-framed.x)*framed.scale;
      const top=(actor.y-tall-framed.y)*framed.scale,bottom=(actor.y-framed.y)*framed.scale;
      assert(left>=safe.left&&right<=pw-safe.right&&top>=0&&bottom<=ph,'Both complete sprites stay inside the safe viewport');
      assert(bottom<bounds.y,'The reply strip clears both staged actors');
     }
     // Use the same logical-point pose, bubble height and candidate selection
     // as the live clients, including a page at its maximum measured height.
     m.publishPatchChatActors(world,q.position,framed);
     const actors=m.patchChatActors(world),metrics=m.conversationBubbleMetrics(pw,ph,safe,bounds.y);
     const bubble=m.placeConversationBubble(pw,ph,safe,bounds.y,actors.patch,actors.survivor,
      metrics.width,2*metrics.padY+metrics.headerHeight+metrics.maxLines*metrics.lineHeight);
     assert(bubble.x>=safe.left&&bubble.x+bubble.width<=pw-safe.right&&bubble.y>=safe.top&&bubble.y+bubble.height<bounds.y,'The full speech page fits between safe insets and the reply row');
     for(const actor of [actors.patch,actors.survivor]){
      assert(actor.x+actor.width<=bubble.x||actor.x>=bubble.x+bubble.width||actor.y+actor.height<=bubble.y||actor.y>=bubble.y+bubble.height,'Speech leaves both characters visible in the settled shot '+JSON.stringify({pw,ph,bubble,actor,bounds}));
     }
     const view={x:q.position.x-x/scale,y:q.position.y-y/scale,width:pw/scale,height:ph/scale,scale};
     const phoneSurface=api.Surface.Make(pw,ph),ctx=new adapter.SkiaContext(phoneSurface.getCanvas(),pw,ph,font);
     ctx.fillStyle='#59614b';ctx.fillRect(0,0,pw,ph);ctx.scale(scale,scale);ctx.translate(-view.x,-view.y);
     const painted=[];
     ctx.fillText=(line)=>{painted.push(line)};
     const display=m.presentPlayer(world,m.samplePlayer(world),.5);
     m.patchDrawables(ctx,images,display,view)[0].draw();
     m.drawPatchFeedback(ctx,images,display,view);
     assert.equal(painted.length,0,'Active meeting dialogue is outside the ambient bubble painter');
     ctx.translate(view.x,view.y);ctx.scale(1/scale,1/scale);
     m.drawPatchMeeting(ctx,pw,ph,1);
     assert.deepEqual(painted,[],'The canvas does not repeat the speech bubble transcript');
     const projected=m.patchChatActors(world).patch;
     assert(Math.abs(projected.x+projected.width/2-x)<=1,'Changing camera scale and position moves the speech anchor with the visible Patch');
     phoneSurface.flush();
     if(previews){const shot=phoneSurface.makeImageSnapshot();fs.writeFileSync(path.join(previews,target+'-chat-'+pw+'-'+page.pageIndex+'.png'),Buffer.from(shot.encodeToBytes()));shot.dispose()}
     ctx.dispose();phoneSurface.dispose();
    }
    if(!page.choices.some(c=>c.id==='more'))break;
    assert(m.choosePatchChat(world,'more'));
   }while(true);
   assert.equal(reply.join(' '),m.patchDialogueReply(world,'reclamation'));
   assert(reply.length>1);m.setPatchChatBounds(world,undefined);m.closePatchChat(world);
   m.patchMeetingCamera(world,{x:0,y:0,scale:1},844,390,world.tick/60);
   // Render-space framing never changes actor coordinates or the user's zoom.
   const followView={follow:true,playing:true,zoom:.73,x:0,y:0,grid:false,collision:false};
   const sourcePose=structuredClone(q.position);
   const camera=(time,density=1)=>m.editorCamera(844*density,390*density,world,followView,density,time);
   world.weather.reducedMotion=false;world.player.x=q.position.x+55;world.player.y=q.position.y+24;
   const baseline=camera(10);assert(m.inspectPatch(world));const enter=camera(10),mid=camera(10.32),close=camera(10.65),retina=camera(10.65,2);
   assert.deepEqual(enter,baseline);assert(mid.scale>baseline.scale&&mid.scale<close.scale);
   assert(close.scale<=.70*1.5679918032786886+1e-10,'The greeting retains its reduced lens or widens to fit the full speech page');
   const phoneSafe={top:0,right:44,bottom:0,left:44};
   const controlsTop=m.patchReplyStripLayout(844,390,phoneSafe).bounds.y;
   const speech=m.conversationBubbleMetrics(844,390,phoneSafe,controlsTop);
   const maximumPageHeight=speech.headerHeight+2*speech.padY+speech.lineHeight*speech.maxLines;
   const actorTop=Math.min(q.position.y-(q.servoInstalled?200:158)*m.PATCH_ROBOT_SCALE,world.player.y-119);
   assert((actorTop-close.y)*close.scale>=maximumPageHeight+8,'A full bubble fits above both actors in the greeting');
   assert.equal(close.meeting,1);assert.equal(retina.scale,close.scale*2);assert.equal(retina.x,close.x);
   for(const actor of [q.position,world.player]){
    const sx=(actor.x-close.x)*close.scale,sy=(actor.y-close.y)*close.scale;
    assert(sx>40&&sx<844-40,'Both subjects remain between landscape safe insets');
    assert(sy>45&&sy<m.patchReplyStripLayout(844,390,{top:0,right:44,bottom:0,left:44}).bounds.y,'Their feet clear the reply strip');
   }
   const mapReference=m.editorCamera(844,390,world,followView,1,10.65,false);
   assert.deepEqual(mapReference,baseline,'Atlas queries can sample the unmodified gameplay frame');
   assert(m.choosePatchChat(world,'ask'));assert(m.choosePatchChat(world,'topic:reclamation'));assert(m.choosePatchChat(world,'tell-wire'));
   assert.deepEqual(camera(10.7),close,'Changing speaker coverage starts at the previous frame');
   const answer=camera(11.2);assert(answer.scale>=close.scale-1e-10&&answer.scale<=.70*1.7422131147540982+1e-10,'The answer may move closer while retaining its reduced lens and full-page headroom');
   assert((actorTop-answer.y)*answer.scale>=maximumPageHeight+8,'A long account still clears both silhouettes');
   assert(m.choosePatchChat(world,'more'));assert.deepEqual(camera(11.4),answer,'Paging holds the shot');
   m.closePatchChat(world);assert.deepEqual(camera(11.4),answer);
   const leaving=camera(11.61);assert(leaving.scale>baseline.scale&&leaving.scale<answer.scale);
   assert.deepEqual(camera(11.9),baseline);assert.deepEqual(q.position,sourcePose);assert.equal(followView.zoom,.73);
   world.weather.reducedMotion=true;assert(m.inspectPatch(world));assert.equal(camera(12).meeting,1);
   m.closePatchChat(world);assert.deepEqual(camera(12),baseline,'Reduced motion changes shots without travel');
   results.push({target,skiaVersion:JSON.parse(fs.readFileSync(path.join(skiaRoot,'package.json'))).version,walkFrames:frameHashes.size,legFrames:legHashes.size,smallestAdjacentLegChange:smallestLegDifference,maxParityMean:maxParityError,maxParityPixels:mostParityPixels});
  }finally{for(const image of Object.values(images))image?.dispose();surface.dispose();dialogueFont.dispose();font.dispose();face.dispose();adapter.disposeLighting()}
 }
 const report={passed:true,results,checks:['eight headings and eight actual leg poses','256-pixel bounds and transparent cell gutters','30 percent larger standing/damaged/walking scale','distance-driven phases and continuous turns','steady planted idle','essential reduced-motion locomotion','per-frame lamp registration','larger partial repair arc','browser/native offline atlas parity','shared depth and expanded culling','real repair/recruitment/command speech bubbles and timed expiry','one/two-line speech and native/web bubble rendering parity','per-frame actor projection, maximum page clearance and safe-area reply placement at four viewport sizes','two-actor camera entry/exit, atlas isolation, depth-independent zoom and reduced motion'],physicalIPhoneTested:false};
 if(previews)fs.writeFileSync(path.join(previews,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(temporary,{recursive:true,force:true})}
