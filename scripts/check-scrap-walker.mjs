import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'humanoid-walker-'));
try{
 await build({stdin:{contents:"export * from './src/studio-play';export * from './src/studio-combat';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/combat-model';export * from './src/enemy-types';export * from './src/play-spawns';export * from './src/walker-sprites';export * from './src/bomber-sprites';export * from './src/combat-renderer';export * from './src/skia-adapter';export {drawWorldEditor,editorCamera} from './src/placed-world-renderer';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'test.cjs'),logLevel:'error'});
 const m=require(path.join(tmp,'test.cjs')),spec=m.ENEMY_TYPES['scrap-walker'];
 const fresh=()=>{const w=m.createCampPlaySession({...m.emptyLayout(),spawn:{x:1200,y:1200}});w.survivalEnabled=false;w.animals=[];w.loot=[];w.gear.bag.axe=1;w.player.equipped='axe';return w};
 const tick=(w,n=1)=>{for(let i=0;i<n;i++)m.stepCampPlaySession(w,{x:0,y:0},false,false)};
 const enemy=(w,angle=0)=>{assert.equal(m.spawnPlayCreature(w,'scrap-walker',1).spawned,1);const e=w.enemies.at(-1);Object.assign(e,{x:1200,y:1200,attackAt:0,spawnedAt:-1});Object.assign(w.player,{x:1200+Math.cos(angle)*60,y:1200+Math.sin(angle)*60});return e};
 const headings=Object.entries(m.DIRECTION_ANGLES);
 assert.equal(spec.health,160);assert(spec.speed>m.ENEMY_TYPES['scrap-bomber'].speed);
 assert(Math.abs(m.WALKER_ATTACK.windup-.42*.7)<1e-9,'Wind-up is 30% shorter than 0.42s');
 for(const [dir,angle] of headings){
  const w=fresh(),e=enemy(w,angle),position=[e.x,e.y];tick(w);
  assert.equal(e.motion.phase,'windup');assert.equal(e.motion.direction,dir);assert.equal(m.walkerFrame(e,m.timeOf(w)),4);assert(!e.bomber);
  tick(w,Math.floor(m.WALKER_ATTACK.windup/m.STEP));assert.equal(w.player.hp,100,'No early punch: '+dir);assert.deepEqual([e.x,e.y],position,'Wind-up remains planted');
  tick(w,Math.ceil(m.WALKER_ATTACK.contact/m.STEP)+2);assert.equal(w.player.hp,100-spec.damage,'Timed punch contact: '+dir);const hp=w.player.hp;
  const strike=w.effects.find(e=>e.type==='enemy-strike'),fist=m.walkerFistOffset(dir,5);
  assert.equal(strike.amount,spec.damage,'Contact admits the impact burst');assert(Math.abs(strike.x-e.x-fist.x)<.001&&Math.abs(strike.y-e.y-fist.y)<.001,'Impact is registered to the painted fist in '+dir);
  assert(strike.born-e.motion.since<=m.WALKER_ATTACK.contact+m.STEP,'Contact stays on the shared simulation clock');
  tick(w,35);assert.equal(w.player.hp,hp,'Punch damage resolves once');assert(!w.effects.some(e=>e.type.startsWith('bomber-')));
  const miss=fresh(),me=enemy(miss,angle);tick(miss);const locked=me.motion.angle;
  Object.assign(miss.player,{x:1200-Math.cos(angle)*60,y:1200-Math.sin(angle)*60});tick(miss,40);
  assert.equal(me.motion.angle,locked,'Punch facing cannot follow a sidestep');assert.equal(miss.player.hp,100,'Behind the committed punch is safe');
  assert.equal(miss.effects.find(e=>e.type==='enemy-strike').amount,0,'Misses have no false impact burst');
  const frames=new Set();e.motion.phase='chase';e.motion.hitAt=-10;e.moving=true;
  for(let d=0;d<m.WALKER_STRIDE*4;d++){e.walkDistance=d;frames.add(m.walkerFrame(e,m.timeOf(w)))}assert.equal(frames.size,4);
  e.moving=false;assert.equal(m.walkerFrame(e,m.timeOf(w)),0,'Blocked/idle feet do not walk in place');
 }
 const interrupted=fresh(),ie=enemy(interrupted);tick(interrupted);interrupted.player.direction='left';assert(m.swingAxe(interrupted));tick(interrupted,17);
 assert.equal(ie.hp,spec.health-40);assert.equal(ie.motion.phase,'stagger');assert.equal(interrupted.combatStats.interrupts,1);assert([8,9].includes(m.walkerFrame(ie,m.timeOf(interrupted))));tick(interrupted,40);assert.equal(interrupted.player.hp,100,'Interrupted punch has no ghost hit');
 const dodge=fresh();enemy(dodge);tick(dodge,Math.floor(m.WALKER_ATTACK.windup/m.STEP));assert(m.dodgePlayer(dodge,{x:0,y:1}));tick(dodge,8);assert.equal(dodge.player.hp,100,'Dodge avoids punch contact');assert(dodge.combatStats.evades>0);
 const covered=fresh(),ce=enemy(covered);tick(covered);const wall=m.newPlacement('base_well_t1',1230,1200);wall.scale=.25;const wb=m.placementBounds(wall);wall.x+=1230-wb.x-wb.width/2;wall.y+=1200-wb.y-wb.height/2;wall.collision={lineWidth:.04,paths:[{closed:true,points:[[.05,.05],[.95,.05],[.95,.95],[.05,.95]]}]};covered.layout.items=[wall];m.invalidateLayoutCollision(covered.layout);assert(!m.lineClear(ce,covered.player,covered));tick(covered,40);assert.equal(covered.player.hp,100,'Walls stop the punch');
 const killed=fresh(),ke=enemy(killed);ke.hp=40;tick(killed);killed.player.direction='left';assert(m.swingAxe(killed));tick(killed,18);assert.equal(killed.enemies.length,0);assert.equal(killed.kills,1);assert.equal(killed.loot.filter(e=>e.kind==='scrap').length,1);assert(killed.effects.some(e=>e.type==='kill'&&e.enemyKind==='scrap-walker'));tick(killed,90);assert.equal(killed.player.hp,100);assert.equal(killed.kills,1);
 const pack=fresh(),draft=JSON.stringify(pack.layout);for(const kind of ['scrap-walker','scrap-bomber','scrap-walker'])m.spawnPlayCreature(pack,kind,5);assert.equal(pack.enemies.length,m.COMBAT_ENEMY_LIMIT);
 for(let i=0;i<600;i++){tick(pack);assert(pack.enemies.filter(e=>e.kind==='scrap-walker'&&['windup','strike'].includes(e.motion?.phase)).length<=2);assert(pack.enemies.filter(e=>e.bomber).length<=2);assert(pack.effects.length<80);if(pack.player.hp<40)m.restoreCombatHealth(pack)}
 m.clearPlaySpawns(pack);assert.equal(pack.enemies.length,0);assert(!pack.effects.some(e=>e.type==='walker-windup'));assert.equal(JSON.stringify(pack.layout),draft,'Spawns/combat never change the map');
 const kit=await require('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)}),skia=m.JsiSkApi(kit),adapter=m.createSkiaAdapter(skia),images={};let bytes=0;
 assert.equal(Object.keys(m.WALKER_IMAGE_SOURCES).length,5);
 for(const [key,url] of Object.entries(m.WALKER_IMAGE_SOURCES)){
  assert(!m.BOMBER_IMAGE_SOURCES[key],'Walker and bomber art keys stay separate');const raw=fs.readFileSync('public'+url),data=skia.Data.fromBytes(raw),im=skia.Image.MakeImageFromEncoded(data);data.dispose();assert(im);images[key]=im;bytes+=raw.length;
  assert.equal(im.width(),1536);assert.equal(im.height(),1152);const pixels=im.readPixels(),signatures=new Set();
  for(let f=0;f<12;f++){let count=0,checksum=0;const sx=f%4*384,sy=Math.floor(f/4)*384;
   for(let y=0;y<384;y++)for(let x=0;x<384;x++){const i=((sy+y)*1536+sx+x)*4,a=pixels[i+3];if(x<8||y<8||x>=376||y>=376)assert.equal(a,0,'No cropped boots/fists or adjacent cells');if(a>16){count++;checksum=(checksum+pixels[i]*(x+1)+pixels[i+1]*(y+1))%2147483647}}
   assert(count>12000&&count<110000,'Complete painted humanoid pose');signatures.add(checksum);
  }assert.equal(signatures.size,12,'Distinct walk, punch, impact and disabled poses');
 }
 assert(bytes<4000000,'Demand-loaded mobile art budget');
 const surface=skia.Surface.Make(1120,620),canvas=surface.getCanvas(),font=skia.Font(undefined,15),ctx=new adapter.SkiaContext(canvas,1120,620,font),output=process.argv[2];if(output)fs.mkdirSync(output,{recursive:true});
 const capture=name=>{surface.flush();const im=surface.makeImageSnapshot();if(output)fs.writeFileSync(path.join(output,name+'.png'),im.encodeToBytes());im.dispose()};
 const show=fresh();show.enemies=[];show.tick=120;
 for(const [i,[dir,angle]] of headings.entries()){const e=enemy(show,angle);Object.assign(e,{x:145+i%4*275,y:235+Math.floor(i/4)*280,moving:true,walkDistance:i*m.WALKER_STRIDE});Object.assign(e.motion,{direction:dir,angle,phase:'chase',hitAt:-10})}
 for(const night of [0,1]){canvas.clear(skia.Color('#253c32'));for(const d of m.combatDrawables(ctx,images,show))d.draw();if(night)ctx.drawNightLighting([],1,{x:0,y:0,width:1120,height:620});m.drawWalkerEmissives(ctx,show);capture(night?'directions-night':'directions-day');ctx.dispose()}
 for(const [stage,phase,age,landed] of [['charge','windup',.24,false],['trail','strike',.03,false],['contact','strike',.08,true],['miss','strike',.08,false]])for(const reduced of [false,true])for(const night of [false,true]){
  show.weather.reducedMotion=reduced;show.effects=[];
  for(const e of show.enemies){Object.assign(e.motion,{phase,since:m.timeOf(show)-age});if(phase==='strike'){const f=m.walkerFistOffset(e.motion.direction,5);show.effects.push({x:e.x+f.x,y:e.y+f.y,id:e.id,born:m.timeOf(show)-.025,type:'enemy-strike',label:'',enemyKind:'scrap-walker',angle:e.motion.angle,amount:landed?spec.damage:0})}}
  canvas.clear(skia.Color('#253c32'));for(const d of m.combatDrawables(ctx,images,show))d.draw();if(night)ctx.drawNightLighting([],1,{x:0,y:0,width:1120,height:620});m.drawCombatGround(ctx,show);m.drawWalkerEmissives(ctx,show);m.drawCombatFeedback(ctx,show);capture(stage+'-'+(night?'night':'day')+(reduced?'-reduced':''));ctx.dispose();
 }
 const pose=fresh(),pe=enemy(pose);pose.tick=120;const view={x:1200,y:1170,zoom:1,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true},camera=m.editorCamera(1120,620,pose,view,1),k=m.WALKER_DISPLAY/m.WALKER_CELL;
 const frames=[['idle',0],['walk',1],['walk',2],['walk',3],['windup',4],['strike',5],['strike',6],['recover',7],['stagger',8],['stagger',9]];
 for(const [dir] of headings)for(const [phase,frame] of frames){
  Object.assign(pe,{moving:phase==='walk',walkDistance:frame*m.WALKER_STRIDE});Object.assign(pe.motion,{direction:dir,angle:m.DIRECTION_ANGLES[dir],phase:phase==='idle'||phase==='walk'?'chase':phase,since:m.timeOf(pose)-(frame===6?.14:frame===7?.1:0),hitAt:frame>=8?m.timeOf(pose)-(frame===8?.05:.2):-10,hitAngle:0});assert.equal(m.walkerFrame(pe,m.timeOf(pose)),frame);
  const lenses=m.walkerEyes(dir,frame);if(dir==='up')assert.equal(lenses.length,0,'No eyes through the back of the head');if(dir==='down')assert.equal(lenses.length,2,'Two visor eyes at the front');
  for(const night of [0,1]){
   pose.nightAmount=night;pose.phase=night?'night':'day';m.drawWorldEditor(ctx,{frames:{}},images,pose,view);surface.flush();const im=surface.makeImageSnapshot(),pixels=im.readPixels();im.dispose();
   const recoil=m.walkerRecoil(pe,m.timeOf(pose)),mirror=m.walkerView(dir).mirror?-1:1;
   for(const [x,y] of lenses){const px=Math.round((pe.x+recoil.x+(x-m.WALKER_ANCHOR[0])*k*mirror-camera.x)*camera.scale),py=Math.round((pe.y+recoil.y+(y-m.WALKER_ANCHOR[1])*k-camera.y)*camera.scale);let bright=false;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const i=((py+dy)*1120+px+dx)*4;if(pixels[i]>210&&pixels[i]>pixels[i+2]*1.25)bright=true}assert(bright,'Emissive visor stays red in day/night: '+dir+' frame '+frame)}
   if(dir==='down-left'&&[0,4,6,8].includes(frame))capture(phase+'-'+(night?'night':'day'));ctx.dispose();
  }
 }
 pose.enemies=[];pose.effects=[{x:1200,y:1200,id:100,born:m.timeOf(pose),type:'kill',label:'',enemyKind:'scrap-walker',direction:'down-left'}];
 for(const age of [.05,.3,.9]){pose.tick=Math.round((2+age)/m.STEP);m.drawWorldEditor(ctx,{frames:{}},images,pose,view);capture('disabled-'+age);ctx.dispose()}
 for(const im of Object.values(images))im.dispose();font.dispose();surface.dispose();adapter.disposeLighting();
 console.log('PASS: humanoid Walker spawn, eight-heading committed windup/contact/recovery, dodge/whiff/cover/interrupt, one-hit damage, death/drop/clear, mixed-robot caps, 60 alpha-safe distinct poses, day/night visor emission across 80 states and real Skia rendering. Art '+(bytes/1e6).toFixed(2)+' MB.');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
