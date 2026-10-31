import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'bomber-check-'));
try{
 await build({stdin:{contents:`export * from './src/studio-combat';export * from './src/studio-play';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/bomber-model';export * from './src/bomber-sprites';export * from './src/bomber-renderer';export * from './src/combat-renderer';export * from './src/skia-adapter';export {drawWorldEditor,editorCamera} from './src/placed-world-renderer';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs'),logLevel:'error'});
 const m=require(path.join(temp,'test.cjs'));
 const fresh=()=>{const w=m.createCampPlaySession({...m.emptyLayout(),spawn:{x:1200,y:1200}});w.survivalEnabled=false;w.animals=[];w.loot=[];w.gear.bag.axe=1;w.player.equipped='axe';return w};
 const tick=(w,n=1)=>{for(let i=0;i<n;i++)m.stepCampPlaySession(w,{x:0,y:0},false,false)};
 const enemy=(w,angle=0)=>{assert.equal(m.spawnCombatEnemies(w,'scrap-bomber',1).spawned,1);const e=w.enemies.at(-1);Object.assign(e,{x:1200,y:1200,attackAt:0});Object.assign(w.player,{x:1200+Math.cos(angle)*60,y:1200+Math.sin(angle)*60});return e};
 const directions=Object.entries(m.DIRECTION_ANGLES);
 for(const [dir,angle] of directions){
  const w=fresh(),e=enemy(w,angle);tick(w);assert.equal(e.motion.phase,'arming');assert.equal(e.motion.direction,dir);assert(e.bomber);
  const position=[e.x,e.y],armedAt=e.bomber.armedAt;
  tick(w,110);assert.equal(w.player.hp,100,'No damage before full fuse in '+dir);assert.deepEqual([e.x,e.y],position,'Planted fuse position');assert.equal(e.bomber.armedAt,armedAt);
  tick(w,8);assert(w.player.hp<100,'Blast contact in '+dir);assert.equal(w.effects.filter(e=>e.type==='bomber-blast').length,1);assert.equal(w.enemies.length,0);assert.equal(w.kills,0,'Self detonation is not a player kill');assert.equal(w.loot.filter(e=>e.kind==='scrap').length,0);
  const hp=w.player.hp;tick(w,50);assert.equal(w.player.hp,hp,'One damage application per blast');tick(w,80);assert(!w.effects.some(e=>e.type.startsWith('bomber-')),'Effects expire');
  const frames=new Set();e.bomber=undefined;e.motion.phase='chase';e.motion.hitAt=-10;e.moving=true;for(let i=0;i<56;i++){e.walkDistance=i;frames.add(m.bomberFrame(e,10))}assert.equal(frames.size,4);e.moving=false;assert.equal(m.bomberFrame(e,10),0);
 }
 const retreat=fresh(),re=enemy(retreat);tick(retreat);const locked=[re.x,re.y];retreat.player.x=1500;tick(retreat,120);assert.equal(retreat.player.hp,100,'Outside warning circle is safe');assert.deepEqual([re.x,re.y],locked,'Bomb never homes during countdown');
 const hit=fresh(),he=enemy(hit);tick(hit);const deadline=he.bomber.armedAt;hit.player.direction='left';assert(m.swingAxe(hit));tick(hit,17);assert.equal(he.hp,40);assert.equal(he.bomber.armedAt,deadline,'Nonlethal hit cannot restart the fuse');assert.equal(he.x,1200,'Hit cannot move an armed blast circle');assert.equal(hit.combatStats.interrupts,0);
 const killed=fresh(),ke=enemy(killed);ke.hp=30;tick(killed);killed.player.direction='left';assert(m.swingAxe(killed));tick(killed,18);assert.equal(killed.enemies.length,0);assert.equal(killed.kills,1);assert(killed.effects.some(e=>e.type==='kill'&&e.enemyKind==='scrap-bomber'));tick(killed,150);assert.equal(killed.player.hp,100,'Destroying a bomber disarms it');assert(!killed.effects.some(e=>e.type==='bomber-blast'));
 const covered=fresh(),ce=enemy(covered);tick(covered);const wall=m.newPlacement('base_well_t1',1230,1200);wall.scale=.25;const wb=m.placementBounds(wall);wall.x+=1230-(wb.x+wb.width/2);wall.y+=1200-(wb.y+wb.height/2);wall.collision={lineWidth:.04,paths:[{closed:true,points:[[.05,.05],[.95,.05],[.95,.95],[.05,.95]]}]};covered.layout.items=[wall];m.invalidateLayoutCollision(covered.layout);assert(!m.lineClear(ce,covered.player,covered),'Cover fixture blocks the blast');tick(covered,120);assert.equal(covered.player.hp,100,'Solid cover blocks blast damage');
 const dodge=fresh();enemy(dodge);tick(dodge);tick(dodge,111);assert(m.dodgePlayer(dodge,{x:0,y:1}));tick(dodge,8);assert.equal(dodge.player.hp,100,'Dodge invulnerability can evade a blast');
 const pack=fresh();for(let i=0;i<3;i++)m.spawnCombatEnemies(pack,'scrap-bomber',5);assert.equal(pack.enemies.length,12);for(const [i,e] of pack.enemies.entries())Object.assign(e,{x:1200+(i%3-1)*8,y:1200+Math.floor(i/3)*8,attackAt:0});tick(pack);assert.equal(pack.enemies.filter(e=>e.bomber).length,2,'Bounded simultaneous countdowns');const draft=JSON.stringify(pack.layout);m.clearCombatEnemies(pack);tick(pack,180);assert.equal(pack.enemies.length,0);assert(!pack.effects.some(e=>e.type.startsWith('bomber-')));assert.equal(JSON.stringify(pack.layout),draft);
 const kit=await require('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)}),skia=m.JsiSkApi(kit),adapter=m.createSkiaAdapter(skia),images={};
 let bytes=0;
 for(const [key,url] of Object.entries(m.BOMBER_IMAGE_SOURCES)){const raw=fs.readFileSync('public'+url),data=skia.Data.fromBytes(raw),im=skia.Image.MakeImageFromEncoded(data);data.dispose();assert(im,key);images[key]=im;bytes+=raw.length;if(key!=='bomber-explosion'){assert.equal(im.width(),1536);assert.equal(im.height(),1152);const pixels=im.readPixels();for(let f=0;f<12;f++){let count=0;const sx=f%4*384,sy=Math.floor(f/4)*384;for(let y=0;y<384;y++)for(let x=0;x<384;x++){const a=pixels[((sy+y)*1536+sx+x)*4+3];if(x<8||y<8||x>=376||y>=376)assert.equal(a,0,'Alpha-safe frame gutters');if(a>100)count++}assert(count>18000,'Complete sprite '+key+' '+f)}}}

 // Compare the authored warning centre to the actual four-pose silhouette,
 // including mirrored headings. A foot-anchor circle fails this centring check.
 for(const [dir] of directions){
  const view=m.bomberView(dir),im=images[view.key],pixels=im.readPixels(),bounds=[384,384,0,0];
  for(let f=4;f<8;f++)for(let y=0;y<384;y++)for(let x=0;x<384;x++)if(pixels[(((Math.floor(f/4)*384+y)*1536+(f%4)*384+x)*4)+3]>100){bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x+1);bounds[3]=Math.max(bounds[3],y+1)}
  const e={x:12000,y:18000,motion:{direction:dir}},centre=m.bomberWarningCentre(e),k=150/384;
  assert(Math.abs(centre.x-(e.x+((bounds[0]+bounds[2])/2-192)*k*(view.mirror?-1:1)))<.01,'Ring centred horizontally: '+dir);
  assert(Math.abs(centre.y-(e.y+((bounds[1]+bounds[3])/2-310)*k))<.01,'Ring centred vertically: '+dir);
 }
 assert(bytes<3000000,'Mobile asset budget');
 const surface=skia.Surface.Make(1120,620),canvas=surface.getCanvas(),font=skia.Font(undefined,15),ctx=new adapter.SkiaContext(canvas,1120,620,font),w=fresh();w.enemies=[];
 for(const [i,[dir,angle]] of directions.entries()){const e=enemy(w,angle);Object.assign(e,{x:145+i%4*275,y:230+Math.floor(i/4)*280,spawnedAt:-1});e.motion.direction=dir;e.motion.angle=angle;e.bomber=undefined}
 w.tick=120;const output=process.argv[2];if(output)fs.mkdirSync(output,{recursive:true});
 const capture=(name)=>{surface.flush();const im=surface.makeImageSnapshot();if(output)fs.writeFileSync(path.join(output,name+'.png'),im.encodeToBytes());assert(im.readPixels().some(n=>n>150));im.dispose()};
 canvas.clear(skia.Color('#253c32'));for(const d of m.combatDrawables(ctx,images,w))d.draw();m.drawBomberEmissives(ctx,w);capture('directions');ctx.dispose();
 canvas.clear(skia.Color('#253c32'));for(const d of m.combatDrawables(ctx,images,w))d.draw();ctx.drawNightLighting([],1,{x:0,y:0,width:1120,height:620});m.drawBomberEmissives(ctx,w);capture('walking-directions-night');ctx.dispose();
 const arm=fresh(),ae=enemy(arm);Object.assign(ae,{x:560,y:380,spawnedAt:-1});ae.motion.direction='down-left';ae.bomber={armedAt:0,beep:0};w.enemies=[];
 // Check the complete red circumference at phone/desktop zoom and large map
 // coordinates, throughout the fuse (the old partial arc was not sufficient).
 let previous=0;
 const growUntil=m.BOMBER_ATTACK.fuse-m.BOMBER_COLLAPSE;
 for(let i=0;i<=100;i++){const r=m.bomberWarningRadius(growUntil*i/100);assert(r>=previous,'Ring grows without pulsing');previous=r}
 assert.equal(m.bomberWarningRadius(0),0);assert.equal(previous,m.BOMBER_ATTACK.radius);
 for(let i=1;i<=100;i++){const r=m.bomberWarningRadius(growUntil+m.BOMBER_COLLAPSE*i/100);assert(r<=previous,'Final collapse moves inward');previous=r}
 assert(previous<.00001);assert.equal(m.bomberWarningRadius(m.BOMBER_ATTACK.fuse+.1),0);
 for(const age of [0,.7,1.8,1.9])assert.equal(m.bomberWarningRadius(age,true),m.BOMBER_ATTACK.radius,'Reduced motion remains steady');
 for(const scale of [.65,1,1.4])for(const age of [.2,.7,1.2,growUntil,1.85]){
  arm.tick=Math.round(age/m.STEP);Object.assign(ae,{x:12000,y:18000});
  canvas.clear(skia.Color('#00000000'));ctx.save();ctx.translate(560,310);ctx.scale(scale,scale);ctx.translate(-ae.x,-ae.y);m.drawBomberGround(ctx,arm);ctx.restore();surface.flush();
  const im=surface.makeImageSnapshot(),pixels=im.readPixels();im.dispose();
  const radius=m.bomberWarningRadius(m.timeOf(arm))*scale;
  for(let i=0;i<72;i++){
   const a=i*Math.PI*2/72,x=Math.round(560+1.171875*scale+Math.cos(a)*radius),y=Math.round(310-47.265625*scale+Math.sin(a)*radius);let red=false;
   for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const at=((y+dy)*1120+x+dx)*4;if(pixels[at]>200&&pixels[at+1]>90&&pixels[at+2]<200&&pixels[at+3]>150)red=true}
   assert(red,`Complete circular warning at angle ${i*5}, zoom ${scale}, fuse ${age}`);
  }ctx.dispose();
 }
 Object.assign(ae,{x:560,y:380});
 for(const [name,time] of [['start',.2],['arming',1.2],['ready',1.7],['collapse',1.85]]){arm.tick=Math.round(time/m.STEP);canvas.clear(skia.Color('#253c32'));m.drawCombatGround(ctx,arm);for(const d of m.combatDrawables(ctx,images,arm))d.draw();m.drawBomberGround(ctx,arm);m.drawBomberEmissives(ctx,arm);capture(name);ctx.dispose()}
 // Exercise the actual world render order: day, dusk and unlit midnight.
 // Bright warning details must be composited after its real night shader.
 arm.tick=Math.round(1.2/m.STEP);arm.camp.hearth.fuel=0;
 const view={x:560,y:330,zoom:1,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true};
 const camera=m.editorCamera(1120,620,arm,view,1),point=(x,y)=>({x:Math.round((x-camera.x)*camera.scale),y:Math.round((y-camera.y)*camera.scale)});
 const redAt=(pixels,point)=>{let red=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)red=Math.max(red,pixels[((point.y+dy)*1120+point.x+dx)*4]);return red};
 for(const [dir] of directions){
  ae.motion.direction=dir;const frame=m.bomberFrame(ae,m.timeOf(arm)),mirrored=m.bomberView(dir).mirror?-1:1,k=150/384;
  const lensPoints=m.bomberWarningEyes(dir,frame).map(([x,y])=>point(ae.x+(x-192)*k*mirrored,ae.y+(y-310)*k));
  const [bx,by]=m.bomberBeacon(dir,frame),beacon=point(ae.x+(bx-192)*k*mirrored,ae.y+(by-310)*k);
  const centre=m.bomberWarningCentre(ae),ring=point(centre.x+m.bomberWarningRadius(m.timeOf(arm)),centre.y),samples=[...lensPoints,beacon,ring];let daylight;
  for(const amount of [0,.5,1]){
   arm.nightAmount=amount;arm.phase=amount?'night':'day';m.drawWorldEditor(ctx,{frames:{}},images,arm,view);surface.flush();
   const im=surface.makeImageSnapshot(),pixels=im.readPixels();im.dispose();const brightness=samples.map(p=>redAt(pixels,p));
   if(!amount)daylight=brightness;else brightness.forEach((r,i)=>{assert(r>210,'Visible emissive warning at night: '+dir+' sample '+i);assert(r>=daylight[i]-15,'Night cannot dim warning core: '+dir+' sample '+i)});
   if(dir==='down-left')capture('warning-'+(amount===0?'day':amount===1?'night':'dusk'));ctx.dispose();
  }
 }
 // Every walking pose keeps its normal amber lenses and the painted red dome,
 // including the diagonal source frames where the dome was originally absent.
 ae.bomber=undefined;ae.moving=true;ae.motion.hitAt=-10;
 const hasColour=(pixels,point,test)=>{for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const at=((point.y+dy)*1120+point.x+dx)*4;if(test(...pixels.slice(at,at+4)))return true}return false};
 for(const [dir] of directions)for(let frame=0;frame<4;frame++){
  ae.motion.direction=dir;ae.walkDistance=frame*14;assert.equal(m.bomberFrame(ae,m.timeOf(arm)),frame);
  const mirror=m.bomberView(dir).mirror?-1:1,k=150/384,eyes=m.bomberEyes(dir,frame);
  assert.equal(eyes.length,dir==='down'?2:['down-left','down-right'].includes(dir)?2:['left','right'].includes(dir)?1:0,'Visible walking lens count: '+dir);
  const [bx,by]=m.bomberBeacon(dir,frame),beacon=point(ae.x+(bx-192)*k*mirror,ae.y+(by-310)*k);
  for(const amount of [0,1]){
   arm.nightAmount=amount;arm.phase=amount?'night':'day';m.drawWorldEditor(ctx,{frames:{}},images,arm,view);surface.flush();const im=surface.makeImageSnapshot(),pixels=im.readPixels();im.dispose();
   for(const [x,y] of eyes){const lens=point(ae.x+(x-192)*k*mirror,ae.y+(y-310)*k);assert(hasColour(pixels,lens,(r,g,b)=>r>210&&g>130&&b<215),'Amber walking eye in day/night: '+dir+' '+frame)}
   assert(redAt(pixels,beacon)>210,'Visible walking beacon: '+dir+' '+frame);
   if(dir==='down-left'&&frame===0)capture('walking-'+(amount?'night':'day'));ctx.dispose();
  }
  // Render just the painted robot: a glow dot alone cannot satisfy this check.
  canvas.clear(skia.Color('#00000000'));for(const d of m.combatDrawables(ctx,images,arm))d.draw();surface.flush();const im=surface.makeImageSnapshot(),pixels=im.readPixels();im.dispose();
  const physical={x:Math.round(ae.x+(bx-192)*k*mirror),y:Math.round(ae.y+(by-310)*k)};
  assert(hasColour(pixels,physical,(r,g,b,a)=>a>180&&r>85&&r>g*1.6&&r>b*1.8),'Painted beacon remains attached: '+dir+' '+frame);ctx.dispose();
 }
 ae.moving=false;ae.bomber={armedAt:0,beep:0};
 ae.motion.direction='down-left';arm.nightAmount=0;arm.phase='day';
 const light=m.bomberLights(arm);assert.equal(light.length,1);assert.equal(light[0].radius,110);ae.hp=0;assert.equal(m.bomberLights(arm).length,0,'Disabled bombers emit no light');ae.hp=ae.maxHp;
 arm.enemies=[];arm.effects=[{x:560,y:380,id:100,born:0,type:'bomber-blast',label:'',enemyKind:'scrap-bomber'}];
 for(const [name,time] of [['blast',.2],['smoke',.7]]){arm.tick=Math.round(time/m.STEP);canvas.clear(skia.Color('#253c32'));m.drawCombatGround(ctx,arm);for(const d of m.combatDrawables(ctx,images,arm))d.draw();m.drawBomberGround(ctx,arm);m.drawBomberEmissives(ctx,arm);capture(name);ctx.dispose()}
 for(const im of Object.values(images))im.dispose();font.dispose();surface.dispose();adapter.disposeLighting();
 console.log(`PASS: eight-direction fuse, planted position, damage timing/once, escape, cover, dodge, nonlethal fuse commitment, lethal disarm and drops, cap/clear/reset, 60 alpha-safe sprites, single outward growth and final collapse, reduced motion, eight-heading silhouette-centred neon circle, full circumference at 15 zoom/fuse combinations, day/dusk/night emissive brightness, amber walking eyes and painted beacons across 32 poses in the actual world renderer, real Skia direction/charge/blast rendering; art ${(bytes/1e6).toFixed(2)} MB.`);
}finally{fs.rmSync(temp,{recursive:true,force:true})}
