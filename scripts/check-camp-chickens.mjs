import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-chickens-'));
try{
 await build({stdin:{contents:"export * from './src/studio-play';export * from './src/animal-motion';export * from './src/survival-engine';export * from './src/imported-art';export * from './src/camp-chickens';export * from './src/chicken-renderer';export * from './src/chicken-art';export * from './src/world-layout';",resolveDir:process.cwd()},outfile:path.join(temp,'model.cjs'),bundle:true,platform:'node',format:'cjs'});
 const m=require(path.join(temp,'model.cjs')),saved=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));m.installImportedArt(saved.records);
 // Reproduce boundary chatter around all eight sectors, including N/NW and
 // S/SE. The old stateless facing() flips on every alternating sample.
 const degrees=n=>n*Math.PI/180,dirs=['right','down-right','down','down-left','left','up-left','up','up-right'];
 for(let sector=0;sector<8;sector++){
  const center=sector*Math.PI/4,boundary=center+Math.PI/8,headings=Array.from({length:120},(_,i)=>boundary+degrees(i%2?2:-2));
  assert(headings.slice(1).every((a,i)=>m.facing(Math.cos(a),Math.sin(a))!==m.facing(Math.cos(headings[i]),Math.sin(headings[i]))),'Old quantizer reproduces the rapid flip');
  for(const initial of [dirs[sector],dirs[(sector+1)%8]]){const motion={direction:initial,distance:41};for(let i=0;i<headings.length;i++){m.updateChickenFacing(motion,Math.cos(headings[i]),Math.sin(headings[i]),i/60,true);assert.equal(motion.direction,initial,'Neighbouring-view boundary jitter holds its current facing')}assert.equal(motion.distance,41,'Facing never restarts the gait')}
 }
 const slide={direction:'up-left',distance:41};
 for(let i=0;i<120;i++){const angle=i%2?-Math.PI/2:-Math.PI*3/4;m.updateChickenFacing(slide,Math.cos(angle),Math.sin(angle),i/60,true);assert.equal(slide.direction,'up-left','Alternating diagonal/cardinal wall slides cannot flash a sprite')}
 for(let i=0;i<=16;i++)m.updateChickenFacing(slide,0,-1,3+i/60,true);assert.equal(slide.direction,'up','A sustained adjacent turn completes after confirmation');
 for(let i=0;i<=16;i++)m.updateChickenFacing(slide,0,1,4+i/60,true);assert.equal(slide.direction,'down','A sustained reversal is confirmed');
 m.updateChickenFacing(slide,-1,0,5,false);assert.equal(slide.direction,'down','A collision restart cannot bypass confirmation');for(let i=1;i<=16;i++)m.updateChickenFacing(slide,-1,0,5+i/60,true);assert.equal(slide.direction,'left','Sustained new route completes its turn');
 m.updateChickenFacing(slide,0,0,6,true);assert.equal(slide.direction,'left','Stopping retains the last view');
 m.updateChickenFacing(slide,Math.cos(degrees(155)),Math.sin(degrees(155)),7,false);assert.equal(slide.direction,'left','A restarted route still respects the angle buffer');
 const angled=m.createWorld({...m.emptyLayout(),spawn:{x:1000,y:1500}});
 angled.animals=[{id:999,home:0,hp:32,moving:true,right:false,flashUntil:0,x:1600,y:1500,chicken:{home:{x:1600,y:1500},direction:'up',distance:0,state:'walk',since:0,until:Infinity,thinkAt:Infinity,target:{x:1600,y:1400},seed:1,cycle:0}}];
 for(let i=0;i<120;i++){const a=angled.animals[0],angle=degrees(-112.5+(i%2?2:-2));a.chicken.target={x:a.x+Math.cos(angle)*100,y:a.y+Math.sin(angle)*100};angled.tick++;m.stepCampChickens(angled,m.STEP);assert(a.moving);assert.equal(a.chicken.direction,'up','Actual moving birds retain a stable view through boundary jitter')}
 const before=JSON.stringify(saved.layout),w=m.createCampPlaySession(saved.layout),birds=w.animals.filter(a=>a.chicken);
 assert.equal(birds.length,20,'Twenty chickens spawn across five meadows');
 assert.equal(w.animals.filter(a=>!a.chicken&&!a.rabbit&&!a.deer&&!a.predator).length,0,'No retired wildlife is added');
 const homes=birds.map(a=>({id:a.id,x:Math.round(a.x),y:Math.round(a.y)}));
 for(const a of birds){assert(!m.worldBlocked(w,a.x,a.y,22));assert.equal(a.hp,32)}
 m.seedCampChickens(w);assert.equal(w.animals.filter(a=>a.chicken).length,20,'Seeding is idempotent');
 const active=birds[0];Object.assign(w.player,{x:active.x-220,y:active.y+120});
 let moved=0,pecked=false;
 for(let i=0;i<60*60;i++){
  m.stepCampPlaySession(w,{x:0,y:0},false,false);
  for(const a of birds){if(a.moving)moved++;if(a.chicken.state==='peck')pecked=true;assert(!m.worldBlocked(w,a.x,a.y,12),'Chickens cannot enter walls, water or rocks');assert(Math.hypot(a.x-a.chicken.home.x,a.y-a.chicken.home.y)<=Math.max(m.CHICKEN_LEASH,a.chicken.escapeLeash||0)+1,'Fleeing remains bounded while the bird walks back to its ordinary roaming area');}
 }
 assert(moved>100);assert(pecked,'Idle peck behavior is visible');
 // With no close player threat, a bird should still take spontaneous runs.
 const roam=m.createWorld({...m.emptyLayout(),spawn:{x:1000,y:1500}});
 roam.animals=[{...active,x:1600,y:1500,chicken:{...active.chicken,home:{x:1600,y:1500},target:{x:1600,y:1500},state:'idle',until:0,thinkAt:0,cycle:0}}];
 let roamingRunTicks=0;for(let i=0;i<3600;i++){roam.tick++;m.stepCampChickens(roam,m.STEP);const a=roam.animals[0];assert(Math.hypot(a.x-roam.player.x,a.y-roam.player.y)>160);if(a.moving&&a.chicken.state==='run')roamingRunTicks++}
 assert(roamingRunTicks>300,'Unthreatened chickens visibly run during ordinary roaming');
 Object.assign(w.player,{x:active.x-30,y:active.y});active.chicken.thinkAt=0;m.stepCampChickens(w,m.STEP);assert.equal(active.chicken.state,'run');
 const distance=active.chicken.distance;active.moving=false;active.chicken.state='idle';const f=m.chickenFrame(w,active);assert([8,9].includes(f));assert.equal(active.chicken.distance,distance,'Idle never advances gait');
 const sleeping=birds.at(-1),position=[sleeping.x,sleeping.y];Object.assign(w.player,{x:sleeping.x+3000,y:sleeping.y});m.stepCampChickens(w,m.STEP);assert.deepEqual([sleeping.x,sleeping.y],position);assert(!sleeping.moving);
 // One real authored-Play axe cut, resolved through its committed contact frame.
 const hunt=m.createCampPlaySession(saved.layout),victim=hunt.animals[0];
 Object.assign(hunt.player,{x:victim.x-45,y:victim.y,direction:'right',stamina:100});hunt.axeSwing={started:m.timeOf(hunt),angle:0,resolved:false,cut:1};hunt.tick+=17;m.stepAxe(hunt);
 assert.equal(victim.hp,0,'Axe can hunt wildlife in authored Play');assert.notEqual(victim.chicken.deadAt,undefined);
 assert.equal(hunt.loot.filter(l=>l.kind==='rawMeat').length,1);m.hitAnimal(hunt,victim,50);assert.equal(hunt.loot.filter(l=>l.kind==='rawMeat').length,1,'Corpse never duplicates a drop');
 const raw=hunt.bag.rawMeat;assert(m.doAction(hunt,'pickup'),'Harvested meat uses the real manual pickup action');assert.equal(hunt.bag.rawMeat,raw+1);
 hunt.tick+=60;assert.equal(m.chickenFrame(hunt,victim),15,'Dead animals hold the final pose');
 const punching=m.createCampPlaySession(saved.layout),prey=punching.animals[0];Object.assign(punching.player,{x:prey.x-45,y:prey.y,equipped:null});assert(m.attack(punching));assert.equal(prey.hp,16,'First punch leaves a chicken alive');assert.equal(punching.loot.filter(l=>l.kind==='rawMeat').length,0);punching.tick+=33;assert(m.attack(punching));assert.equal(prey.hp,0,'Second punch kills the chicken');assert.equal(punching.loot.filter(l=>l.kind==='rawMeat').length,1);
 const ctx={save(){},restore(){},beginPath(){},ellipse(){},fill(){},translate(){},scale(){},drawImage(){this.draws++},draws:0};
 const imgs=Object.fromEntries(Object.keys(m.CHICKEN_IMAGES).map(k=>[k,{}]));
 assert.equal(m.chickenDrawables(ctx,imgs,w,{x:-9999,y:-9999,width:100,height:100,scale:1}).length,0,'Offscreen sprites are culled');
 const draws=m.chickenDrawables(ctx,imgs,w);assert.equal(draws.length,20);draws.forEach(d=>d.draw());assert.equal(ctx.draws,20,'One atlas image draw per visible bird');
 assert.equal(JSON.stringify(saved.layout),before,'Runtime wildlife never changes the authored map');
 // Prepare generator inputs from the unchanged authoritative included snapshot.
 fs.mkdirSync('.qa/native-world',{recursive:true});fs.writeFileSync('.qa/native-world/artwork.json',JSON.stringify({records:saved.records}));fs.writeFileSync('.qa/native-world/world.json',JSON.stringify({revision:saved.revision,draft:saved.layout}));
 const report={passed:true,count:20,homes,movementTicks:moved,states:['idle','blink','walk','run','peck','hit','fall','downed'],textureFiles:5,checks:['eight-way boundary chatter reproduced and suppressed from either side','alternating collision-slide headings stay stable','all turns confirmed, including reversals and short collision restarts','facing does not reset animation distance','twenty clear starts across meadows','bounded movement with collision','nearby flee and idle peck','distant simulation sleeping','distance-driven gait','authored Play axe hunting','one raw-meat drop per animal','corpse holds downed pose','offscreen render culling','one image draw per bird','no editor draft mutation'],physicalIPhoneTested:false};
 fs.mkdirSync('docs/qa/camp-chickens-v1',{recursive:true});fs.writeFileSync('docs/qa/camp-chickens-v1/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
