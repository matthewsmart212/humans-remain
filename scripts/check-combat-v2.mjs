import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'combat-v2-'));
try{
 await build({stdin:{contents:`export * from './src/studio-combat';export * from './src/studio-play';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/combat-model';export * from './src/combat-renderer';export * from './src/walker-sprites';export * from './src/skia-adapter';export * from './src/studio-monitoring';export {CombatAudio} from './src/combat-audio';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'combat.cjs'),logLevel:'error'});
 const m=require(path.join(temp,'combat.cjs')),draft={...m.emptyLayout(),spawn:{x:1200,y:1200}},fresh=()=>m.createCampPlaySession(draft);
 const tick=(w,n,input={x:0,y:0})=>{for(let i=0;i<n;i++)m.stepCampPlaySession(w,input,false,false)};
 const enemy=(w,angle=0)=>{m.spawnCombatEnemies(w,'scrap-walker',1);const e=w.enemies[0];Object.assign(e,{x:1200,y:1200,attackAt:0});Object.assign(w.player,{x:1200+Math.cos(angle)*60,y:1200+Math.sin(angle)*60});return e};
 const directions=Object.entries(m.DIRECTION_ANGLES);
 for(const [dir,angle] of directions){
  const w=fresh(),e=enemy(w,angle);tick(w,1);assert.equal(e.motion.phase,'windup');assert.equal(e.motion.direction,dir);
  assert.equal(m.walkerFrame(e,m.timeOf(w)),4);tick(w,30);assert.equal(w.player.hp,100,'Wind-up cannot deal early damage');
  tick(w,5);assert.equal(w.player.hp,90,'Strike makes contact in '+dir);const hp=w.player.hp;tick(w,35);assert.equal(w.player.hp,hp,'Exactly one damage application per attack');
  const miss=fresh(),me=enemy(miss,angle);tick(miss,1);const locked=me.motion.angle;
  miss.player.x=1200-Math.cos(angle)*60;miss.player.y=1200-Math.sin(angle)*60;tick(miss,40);
  assert.equal(me.motion.angle,locked,'Committed strike cannot track a sidestep');assert.equal(miss.player.hp,100,'Walking behind a strike is safe in '+dir);
  const frames=new Set();for(let i=0;i<64;i++){e.moving=true;e.motion.phase='chase';e.walkDistance=i;frames.add(m.walkerFrame(e,m.timeOf(w)))}assert.equal(frames.size,4);
  e.moving=false;assert.equal(m.walkerFrame(e,m.timeOf(w)),3,'Stationary legs stay planted');
 }
 const interrupt=fresh(),ie=enemy(interrupt);interrupt.player.direction='left';tick(interrupt,1);assert(m.swingAxe(interrupt));tick(interrupt,16);assert.equal(ie.hp,40);assert.equal(ie.motion.phase,'stagger');assert.equal(interrupt.combatStats.interrupts,1);tick(interrupt,15);assert.equal(interrupt.player.hp,100,'Interrupted wind-up cannot deliver a ghost hit');
 const evade=fresh();assert(m.dodgePlayer(evade,{x:1,y:0}));assert(!m.dodgePlayer(evade,{x:1,y:0}),'Cooldown prevents dodge spam');assert(!m.swingAxe(evade),'No attacking while dodging');assert.equal(m.damagePlayer(evade,10),false,'Early dodge avoids a hit');tick(evade,12);assert.equal(m.damagePlayer(evade,10),true,'Invulnerability ends before recovery');tick(evade,5);assert(!evade.dodge);assert(evade.player.x>1310&&evade.player.x<1340,'Dodge displacement is bounded');tick(evade,84);assert(m.dodgePlayer(evade,{x:0,y:1}));
 const committed=fresh();m.swingAxe(committed);assert(!m.dodgePlayer(committed),'Cannot cancel attack before contact');tick(committed,17);assert(m.dodgePlayer(committed),'Dodge can cancel the resolved attack recovery');
 const buffered=fresh();m.requestAttack(buffered);tick(buffered,34);assert(!m.requestAttack(buffered));assert(buffered.attackQueuedUntil);tick(buffered,6);assert(buffered.axeSwing&&buffered.axeSwing.started>.6,'A tap near recovery end triggers the next legal swing');assert(!buffered.attackQueuedUntil);const expired=fresh();m.requestAttack(expired);expired.attackReady=10;expired.axeSwing=undefined;m.requestAttack(expired);tick(expired,50);assert(!expired.axeSwing&&!expired.attackQueuedUntil,'An old tap must not fire much later');
 const collision=fresh(),wall=m.newPlacement('base_well_t1',1300,1220);wall.collision={lineWidth:.025,paths:[{closed:true,points:[[.05,.05],[.95,.05],[.95,.95],[.05,.95]]}]};collision.layout.items=[wall];const saved=JSON.stringify(collision.layout);assert(m.dodgePlayer(collision,{x:1,y:0}));for(let i=0;i<20;i++){tick(collision,1);assert(!m.worldBlocked(collision,collision.player.x,collision.player.y,19),'Dodge respects thin authored blockers')}assert.equal(JSON.stringify(collision.layout),saved);
 const pack=fresh();for(let i=0;i<3;i++)m.spawnCombatEnemies(pack,'scrap-walker',5);assert.equal(pack.enemies.length,12);
 for(let i=0;i<600;i++){tick(pack,1);assert(pack.enemies.filter(e=>['windup','strike'].includes(e.motion?.phase)).length<=2,'Attack admission budget');assert(pack.effects.length<48,'Effects expire rather than accumulating');if(pack.player.hp<35)m.restoreCombatHealth(pack)}
 const start=performance.now();for(let i=0;i<3600;i++){tick(pack,1);if(pack.player.hp<35)m.restoreCombatHealth(pack)}const simulationMs=(performance.now()-start)/3600;
 // Every atlas has a real alpha channel, safe cell gutters and distinct poses.
 const meta=JSON.parse(fs.readFileSync('public/survival/scrap-walker-v2/atlas.json','utf8'));
 assert.equal(Object.keys(meta.directions).length,8);assert.equal(Object.keys(m.WALKER_IMAGE_SOURCES).length,5);assert.deepEqual(meta.cell,[384,384]);
 const kit=await require('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)}),skia=m.JsiSkApi(kit),adapter=m.createSkiaAdapter(skia),images={};let totalBytes=0;
 for(const [key,url] of Object.entries(m.WALKER_IMAGE_SOURCES)){
  const bytes=fs.readFileSync('public'+url),data=skia.Data.fromBytes(bytes),image=skia.Image.MakeImageFromEncoded(data);data.dispose();assert(image,key);images[key]=image;totalBytes+=bytes.length;
  assert.equal(image.width(),1536);assert.equal(image.height(),768);const pixels=image.readPixels();assert(pixels instanceof Uint8Array);let signatures=new Set();
  for(let frame=0;frame<8;frame++){let solid=0,checksum=0;const sx=(frame%4)*384,sy=Math.floor(frame/4)*384;
   for(let y=0;y<384;y++)for(let x=0;x<384;x++){const i=((sy+y)*1536+sx+x)*4,a=pixels[i+3];if(x<8||y<8||x>=376||y>=376)assert.equal(a,0,'No cropped claws or neighbouring cells');if(a>16){solid++;checksum=(checksum+pixels[i]*(x+1)+pixels[i+1]*(y+1))%2147483647}}
   assert(solid>15000&&solid<100000,'Complete transparent sprite');signatures.add(checksum);
  }assert.equal(signatures.size,8,'Eight distinct keyposes');
 }
 assert(totalBytes<2500000,'Mobile artwork download budget');
 const surface=skia.Surface.Make(1000,620),canvas=surface.getCanvas(),font=skia.Font(undefined,15),ctx=new adapter.SkiaContext(canvas,1000,620,font),w=fresh();
 for(const [i,[dir,angle]] of directions.entries()){m.spawnCombatEnemies(w,'scrap-walker',1);const e=w.enemies.at(-1);Object.assign(e,{x:135+i%4*240,y:245+Math.floor(i/4)*265,spawnedAt:-1,moving:true,walkDistance:i*16});e.motion.direction=dir;e.motion.angle=angle}
 w.tick=120;
 canvas.clear(skia.Color('#243b34'));for(const drawable of m.combatDrawables(ctx,images,w))drawable.draw();surface.flush();
 const snapshot=surface.makeImageSnapshot();assert(snapshot.readPixels().some(n=>n>100),'Real Skia atlas drawing');
 const output=process.argv[2];if(output){fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'walker-directions.png'),snapshot.encodeToBytes())}snapshot.dispose();ctx.dispose();
 // Render all animation frames, telegraphs, recoil, defeat and screen damage.
 let renderMs=0;for(let frame=0;frame<120;frame++){const renderStart=performance.now();w.tick=120+frame;canvas.clear(skia.Color('#243b34'));for(const e of w.enemies){e.walkDistance=frame*2;e.motion.phase=frame<40?'chase':frame<70?'windup':frame<82?'strike':'recover';e.motion.since=(frame<40?120:frame<70?160:frame<82?190:202)*m.STEP}
  m.drawCombatGround(ctx,w);for(const drawable of m.combatDrawables(ctx,images,w))drawable.draw();m.drawCombatFeedback(ctx,w);m.drawCombatScreenFeedback(ctx,w);surface.flush();ctx.dispose();
  renderMs+=performance.now()-renderStart;
  if(output&&[8,16,24,32,50,69,73,79,92,110].includes(frame)){const image=surface.makeImageSnapshot();fs.writeFileSync(path.join(output,'pose-'+String(frame).padStart(3,'0')+'.png'),image.encodeToBytes());image.dispose()}
 }
 const drawMs=renderMs/120;
 const hurt=fresh();hurt.tick=50;m.damagePlayer(hurt,10);m.drawCombatFeedback(ctx,hurt);m.drawCombatScreenFeedback(ctx,hurt);ctx.dispose();
 for(const image of Object.values(images))image.dispose();font.dispose();surface.dispose();adapter.disposeLighting();
 assert(!m.dodgePlayer(m.createWorld(draft)),'Build cannot dodge');
 // Audio gracefully does nothing before a user gesture or without a browser.
 const audio=new m.CombatAudio();audio.update(fresh(),true);audio.setEnabled(false);audio.update(interrupt,true);audio.dispose();
 console.log(`PASS: eight-direction windup/contact/recovery; dodge/whiff/interrupt, invulnerability and collision; <=2 committed attackers; 12-enemy stress; 40 alpha-safe poses; real Skia directional/attack drawing. Art ${(totalBytes/1e6).toFixed(2)} MB; simulation ${simulationMs.toFixed(3)} ms/tick, software Skia ${drawMs.toFixed(2)} ms/frame for 8 robots (not iPhone FPS).`);
}finally{fs.rmSync(temp,{recursive:true,force:true})}
