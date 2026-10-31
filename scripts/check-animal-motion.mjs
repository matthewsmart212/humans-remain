// Behaviour regression: rapidly contradictory headings must not flash atlases,
// while a sustained turn must remain responsive. Also exercise real world AI.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'animal-motion-')),baseline=process.argv.includes('--baseline');
const expect=(condition,message)=>{if(!baseline)assert(condition,message)};
try{
 await build({stdin:{contents:`export * from './src/camp-chickens';export * from './src/camp-rabbits';export * from './src/camp-deer';export * from './src/animal-motion';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/studio-play';export * from './src/imported-art';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),directions=['right','down-right','down','down-left','left','up-left','up','up-right'];
 const stream=(initial,headings,wasMoving=()=>true)=>{
  const motion={direction:initial,distance:41};let previous=initial,changes=0;
  for(let i=0;i<headings.length;i++){m.updateChickenFacing(motion,Math.cos(headings[i]),Math.sin(headings[i]),i/60,wasMoving(i));if(motion.direction!==previous){changes++;previous=motion.direction}}
  expect(motion.distance===41,'Facing selection must never reset animation distance');return{changes,direction:motion.direction};
 };
 const facingMetrics=[];
 for(let sector=0;sector<8;sector++){
  const center=sector*Math.PI/4,boundary=center+Math.PI/8;
  for(const initial of [directions[sector],directions[(sector+1)%8]]){
   const headings=Array.from({length:120},(_,i)=>boundary+(i%2?2:-2)*Math.PI/180),r=stream(initial,headings);
   expect(r.changes===0,'All eight adjacent sector boundaries preserve a stable view from either side');
  }
  const reverse=stream(directions[sector],Array.from({length:120},(_,i)=>center+(i%2?Math.PI:0)));
  expect(reverse.changes<=1,'Single-frame opposite headings cannot alternate the sprite every frame');
  const restart=stream(directions[sector],Array.from({length:120},(_,i)=>center+(i%2?Math.PI:0)),()=>false);
  expect(restart.changes<=1,'Collision stop/restart spam must not bypass facing confirmation');
  const burst=stream(directions[sector],Array.from({length:120},(_,i)=>center+(Math.floor(i/3)%2?Math.PI/2:0)),i=>i%3!==0);
  expect(burst.changes<=1,'Short alternating 90-degree wall-slide bursts cannot flash another view');
  const sustained={direction:directions[sector],distance:41};let response;
  for(let i=0;i<=24;i++){m.updateChickenFacing(sustained,Math.cos(center+Math.PI),Math.sin(center+Math.PI),i/60,i%2===0);if(sustained.direction===directions[(sector+4)%8]){response=i/60;break}}
  expect(response!==undefined&&response<=.4,'A sustained real reversal responds within 400 ms, including brief stops');
  const paused={direction:directions[sector],distance:41};
  m.updateChickenFacing(paused,Math.cos(center),Math.sin(center),0,true);
  m.updateChickenFacing(paused,Math.cos(center+Math.PI),Math.sin(center+Math.PI),.5,true);
  for(let i=1;i<30;i++)m.updateChickenFacing(paused,.001,.001,.5+i/60,false);
  m.updateChickenFacing(paused,Math.cos(center+Math.PI),Math.sin(center+Math.PI),1.5,false);
  expect(paused.direction===directions[sector],'An old pending turn must not mature while the animal is blocked or idle');
  for(let i=1;i<=24;i++)m.updateChickenFacing(paused,Math.cos(center+Math.PI),Math.sin(center+Math.PI),1.5+i/60,true);
  expect(paused.direction===directions[(sector+4)%8],'A fresh sustained turn after a long pause remains responsive');
  facingMetrics.push({sector:directions[sector],rapidReverseChanges:reverse.changes,restartChanges:restart.changes,slideBurstChanges:burst.changes,sustainedResponseSeconds:response});
 }
 const saved=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));m.installImportedArt(saved.records);
 const authored=m.createCampPlaySession(saved.layout),initial=JSON.parse(JSON.stringify(authored.animals));
 const steps={chicken:m.stepCampChickens,rabbit:m.stepCampRabbits,deer:m.stepCampDeer},radii={chicken:12,rabbit:12,deer:20},leashes={chicken:m.CHICKEN_LEASH,rabbit:m.RABBIT_LEASH,deer:m.DEER_LEASH};
 function measure(w,a,species,offset,ticks=1200){
  w.animals=[a];w.enemies=[];w.tick=0;const motion=a[species];let previous=motion.direction,lastChange=-10,changes=0,quickReversals=0,movingTicks=0,lastVelocityAngle,lastVelocityTurn=-10,physicalSharpTurns=0,rapidPhysicalTurns=0,maxStep=0;
  for(let i=0;i<ticks;i++){
   w.player.x=a.x+offset[0];w.player.y=a.y+offset[1];const x=a.x,y=a.y;w.tick++;steps[species](w,m.STEP);
   const dx=a.x-x,dy=a.y-y,d=Math.hypot(dx,dy);maxStep=Math.max(maxStep,d);
   if(d>.1){const angle=Math.atan2(dy,dx);if(lastVelocityAngle!==undefined&&Math.cos(angle-lastVelocityAngle)<.01){physicalSharpTurns++;if(m.timeOf(w)-lastVelocityTurn<.25)rapidPhysicalTurns++;lastVelocityTurn=m.timeOf(w)}lastVelocityAngle=angle}
   expect(!m.worldBlocked(w,a.x,a.y,radii[species]),'Collision recovery must not enter scenery or cross a wall');
   expect(Math.hypot(a.x-motion.home.x,a.y-motion.home.y)<=m.animalTravelLeash(motion,leashes[species],m.timeOf(w))+1,'Flee steering must remain inside its home leash');
   if(a.moving)movingTicks++;
   if(motion.direction!==previous){const now=m.timeOf(w),delta=m.DIRECTION_ANGLES[motion.direction]-m.DIRECTION_ANGLES[previous];changes++;if(now-lastChange<.25&&Math.cos(delta)<.01)quickReversals++;lastChange=now;previous=motion.direction}
  }
  expect(maxStep<=(species==='chicken'?165:species==='rabbit'?215:275)/60+.01,'Recovery is real movement, never a clamp teleport');
  return{changes,quickReversals,movingTicks,physicalSharpTurns,rapidPhysicalTurns,maxStep};
 }
 // These actual authored-world fixtures reproduced the reported rapid flipping
 // before this patch. Follow a fixed offset to keep pressure on the home leash.
 const authoredFixtures=[{species:'chicken',index:3,offset:[-30,50],before:{changes:12,quickReversals:10}},{species:'rabbit',index:4,offset:[50,30],before:{changes:4,quickReversals:1}},{species:'deer',index:0,offset:[-50,30],before:{changes:186,quickReversals:182}}],worldMetrics=[];
 for(const f of authoredFixtures){
  const a=JSON.parse(JSON.stringify(initial.filter(a=>a[f.species])[f.index])),r=measure(authored,a,f.species,f.offset);
  expect(r.quickReversals<=1,`${f.species}: actual authored scenery/leash steering must not chatter between opposing views`);
  if(f.species==='deer')expect(r.changes<46,'Deer leash steering must remove the rapid oscillation, not only change its timing');
  worldMetrics.push({...f,after:r});
 }
 // Open-ground escape legs stay straight even when a pursuer zigzags, and
 // losing the proximity trigger cannot cancel the committed run early.
 const escapeLegs=[];
 for(const species of ['chicken','rabbit','deer'])for(const pursuit of ['zigzag','stationary']){
  const a=JSON.parse(JSON.stringify(initial.find(a=>a[species]&&(!a.deer||a.deer.kind==='doe')))),home={x:1600,y:1500};
  Object.assign(a,home);Object.assign(a[species],{home,direction:'right',distance:0,state:'idle',since:0,until:10,thinkAt:0,target:{...home},cycle:0});
  const w=m.createWorld({...m.emptyLayout(),spawn:{x:1550,y:1500}});w.editorPreview=true;w.animals=[a];w.enemies=[];
  let goal,heading,travel=0;
  for(let i=0;i<110;i++){
   if(pursuit==='zigzag'){w.player.x=a.x-50;w.player.y=a.y+(Math.floor(i/3)%2?40:-40)}
   const x=a.x,y=a.y;w.tick++;steps[species](w,m.STEP);
   const dx=a.x-x,dy=a.y-y,d=Math.hypot(dx,dy),motion=a[species];
   goal??={...motion.target};heading??=Math.atan2(dy,dx);travel+=d;
   expect(d>.5,`${species}: an unobstructed escape must keep moving for the committed leg`);
   expect(Math.cos(Math.atan2(dy,dx)-heading)>.99999,`${species}: a zigzagging or receding player cannot continually re-aim a committed leg`);
   expect(Math.hypot(motion.target.x-goal.x,motion.target.y-goal.y)<.001,`${species}: fleeing holds a fixed waypoint for at least two seconds`);
  }
  expect(a[species].escapeUntil>=2,`${species}: initial escape commitment is at least two seconds`);
  escapeLegs.push({species,pursuit,straightSeconds:110/60,travel});
 }
 const controlled=[];
 for(const species of ['chicken','rabbit','deer'])for(const scenario of ['leash','corner']){
  const base=initial.find(a=>a[species]&&(!a.deer||a.deer.kind==='doe')),a=JSON.parse(JSON.stringify(base)),home={x:1600,y:1500};
  a.x=scenario==='leash'?home.x+leashes[species]-12:1610;a.y=scenario==='leash'?1500:1510;
  Object.assign(a[species],{home,direction:'right',distance:0,state:'run',since:0,until:10,thinkAt:0,target:{x:a.x,y:a.y},cycle:0});
  const w=m.createWorld({...m.emptyLayout(),spawn:{x:1500,y:1500}});w.editorPreview=true;
  if(scenario==='corner')w.scene={id:'motion-corner',name:'test',width:4000,height:4000,background:'#000',terrain:{key:'none',url:''},walkable:[[0,0],[4000,0],[4000,4000],[0,4000]],blockers:[[[1640,1400],[1660,1400],[1660,1700],[1640,1700]],[[1500,1460],[1660,1460],[1660,1480],[1500,1480]]],foreground:[],spawns:{},portals:[]};
  const r=measure(w,a,species,scenario==='leash'?[-50,30]:[-50,50]);
  expect(r.quickReversals<=1,`${species}: ${scenario} must settle or choose a steady course without rapid opposing poses`);
  if(scenario==='leash')expect(r.rapidPhysicalTurns<=1,`${species}: open-ground leash movement must not physically ping-pong underneath the facing filter`);
  controlled.push({species,scenario,...r});
 }
 // A committed stag charge may legitimately leave its roaming leash. Returning
 // must use normal movement, never project its body back to the home circle.
 const charged=m.createWorld({...m.emptyLayout(),spawn:{x:2100,y:1500}}),stag=JSON.parse(JSON.stringify(initial.find(a=>a.deer?.kind==='stag')));
 charged.editorPreview=true;charged.combatTest=true;charged.animals=[stag];charged.enemies=[];
 Object.assign(stag,{x:1990,y:1500});Object.assign(stag.deer,{home:{x:1600,y:1500},target:{x:1990,y:1500},state:'idle',since:0,until:10,thinkAt:0});
 m.hitAnimal(charged,stag,16);charged.tick++;m.stepCampDeer(charged,m.STEP);charged.player.x=3000;
 let maxChargeStep=0,leftLeash=false,retreatSeen=false;
 for(let i=0;i<130;i++){const x=stag.x,y=stag.y;charged.tick++;m.stepCampDeer(charged,m.STEP);maxChargeStep=Math.max(maxChargeStep,Math.hypot(stag.x-x,stag.y-y));if(Math.hypot(stag.x-1600,stag.y-1500)>m.DEER_LEASH+20)leftLeash=true;if(leftLeash&&!stag.deer.retaliation)retreatSeen=true}
 expect(leftLeash&&retreatSeen,'Fixture actually exercises a charge beyond the home leash and the following retreat');
 expect(maxChargeStep<=m.STAG_ATTACK.speed*m.STEP+.01,'Returning after a charge cannot snap or teleport to the home leash');
 Object.assign(stag.deer,{retaliation:undefined,escapeCalmAt:undefined,avoidAngle:undefined,avoidUntil:undefined,state:'walk',until:Infinity,thinkAt:Infinity,target:{...stag.deer.home}});charged.player.x=1000;
 for(let i=0;i<1000;i++){const x=stag.x,y=stag.y;charged.tick++;m.stepCampDeer(charged,m.STEP);maxChargeStep=Math.max(maxChargeStep,Math.hypot(stag.x-x,stag.y-y))}
 expect(Math.hypot(stag.x-1600,stag.y-1500)<=m.DEER_LEASH+1,'Stag can walk continuously back to normal roaming bounds after a longer escape');
 const report={passed:!baseline,baselineOnly:baseline,facingMetrics,worldMetrics,escapeLegs,controlled,chargeReturn:{leftLeash,retreatSeen,maxChargeStep},checks:['all eight neighbouring-sector boundaries','rapid opposite headings and repeated stop/restart','short contradictory collision-slide bursts','pending turns expire across idle/blocked gaps','real turn responds within 400 ms','actual authored-world chicken/rabbit/doe regressions','two-second straight escape commitment despite zigzag pursuit or loss of proximity','all species at leash limits and solid corners','actual displacement tracked separately from facing','collision and leash conservation; no clamp teleport','continuous return from a stag charge beyond its home leash','gait distance preserved']};
 if(!baseline)fs.writeFileSync('docs/qa/animal-motion/checks.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
