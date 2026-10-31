import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'boar-hunt-'));
try{
 await build({stdin:{contents:`export * from './src/boar-hunt';export * from './src/camp-predators';export * from './src/survival-engine';export * from './src/studio-play';export * from './src/world-layout';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'game.cjs')});
 const m=require(path.join(temp,'game.cjs'));
 const make=(distance=180)=>{
  const w=m.createWorld({...m.emptyLayout(),spawn:{x:1500,y:1500}});w.editorPreview=true;w.combatTest=true;w.survivalEnabled=true;w.enemies=[];w.loot=[];w.loads=0;w.player.direction='right';
  const a={x:1500+distance,y:1500,id:w.serial++,home:0,hp:m.BOAR_HUNT.health,maxHp:m.BOAR_HUNT.health,moving:false,right:false,flashUntil:0,predator:{kind:'boar',home:{x:1500+distance,y:1500},target:{x:1500,y:1500},seed:703,direction:'left',distance:0,state:'idle',since:0,until:2,thinkAt:0,readyAt:0,engaged:false,angle:Math.PI}};
  w.animals=[a];return{w,a};
 };
 const tick=(s,input={x:0,y:0},sprint=false,mash=false)=>{if(mash)m.requestAttack(s.w);m.stepCampPlaySession(s.w,input,sprint,false)};
 const run=(s,n,input={x:0,y:0},sprint=false,mash=false)=>{for(let i=0;i<n;i++)tick(s,input,sprint,mash)};
 const until=(s,predicate,limit=180)=>{for(let i=0;i<limit&&!predicate();i++)tick(s);assert(predicate(),'Expected encounter phase was reached')};
 const results={};
 // The reported retreat: cross the old home boundary while the quarry remains nearby.
 const chase=make(300);tick(chase);assert(chase.a.predator.engaged);
 Object.assign(chase.a,{x:2450,y:1500});Object.assign(chase.w.player,{x:2300,y:1500});chase.a.predator.state='pursue';chase.a.predator.readyAt=99;
 for(let i=0;i<90;i++){tick(chase,{x:1,y:0});assert(chase.a.predator.engaged);assert.notEqual(chase.a.predator.state,'return')}
 assert(Math.hypot(chase.a.x-chase.a.predator.home.x,chase.a.y-chase.a.predator.home.y)>650);
 const walking=make(380);walking.a.predator.readyAt=99;let initialGap=m.distance(walking.a,walking.w.player);run(walking,180,{x:-1,y:0});assert(m.distance(walking.a,walking.w.player)<initialGap-60,'Boar closes on an ordinary walk');assert(walking.a.predator.engaged);
 const catchWalk=make(380);run(catchWalk,360,{x:-1,y:0});assert(catchWalk.w.player.hp<100,'Charge catches a player walking straight away');
 results.walkingGap={before:initialGap,after:m.distance(walking.a,walking.w.player)};
 const escaping=make(380);tick(escaping);run(escaping,420,{x:-1,y:0},true);assert.equal(escaping.w.player.hp,100,'Sustained sprint can escape');
 escaping.w.player.x=escaping.a.x-1700;run(escaping,140,{x:-1,y:0},true);assert(!escaping.a.predator.engaged,'Actual separation eventually ends the hunt');
 // Close gore is grounded; the charge has a longer tell and more travel.
 for(const [kind,distance]of [['gore',70],['charge',180]]){
  const s=make(distance),spec=m.BOAR_ATTACKS[kind],start=s.a.x;tick(s);assert.equal(s.a.predator.boar.attack,kind);assert.equal(s.a.predator.state,'warn');
  run(s,Math.floor(spec.warning/m.STEP)-2);assert.equal(s.w.player.hp,100);assert.equal(s.a.x,start);
  until(s,()=>s.w.player.hp<100);assert.equal(s.w.player.hp,100-spec.damage);assert.equal(m.predatorAnimalFrame(s.w,s.a),kind==='gore'?15:14);
  const travel=Math.abs(s.a.x-start);if(kind==='gore')assert(travel<20);else assert(travel>100);
  run(s,12);assert.equal(s.w.player.hp,100-spec.damage,'One strike per attack');results[kind]={damage:spec.damage,tell:spec.warning,travel};
 }
 const combo=make(70),attacks=[];for(let i=0;i<240&&combo.w.player.hp>0;i++){tick(combo);if(combo.a.predator.state==='warn'&&combo.a.predator.since===m.timeOf(combo.w))attacks.push(combo.a.predator.boar.attack)}
 assert(attacks.filter(a=>a==='gore').length>=2,'Close contact causes grounded tusk attacks');
 const follow=make(180);until(follow,()=>follow.w.player.hp<100);const firstHitAt=m.timeOf(follow.w);Object.assign(follow.w.player,{x:follow.a.x-65,y:follow.a.y});
 until(follow,()=>follow.a.predator.state==='warn');assert.equal(follow.a.predator.boar.attack,'gore','Lunge transitions into close-range gore');assert(m.timeOf(follow.w)-firstHitAt<1.4);
 // Real controls and axe combo timings: button mashing now trades health.
 for(const [name,tool]of [['axe','axe'],['fists',null]]){
  const mash=make(85);mash.w.player.equipped=tool;
  for(let i=0;i<1200&&mash.a.hp>0&&mash.w.player.hp>0;i++)tick(mash,{x:0,y:0},false,true);
  assert(mash.w.player.hp<100,'Stationary '+name+' spam cannot stun-lock the boar');if(tool==='axe')assert.equal(mash.a.hp,0,'Boar remains killable with full axe damage');assert.equal(mash.w.loot.length,mash.a.hp===0?1:0);
  results[name+'Mash']={damageTaken:100-mash.w.player.hp,seconds:m.timeOf(mash.w),boarHealth:mash.a.hp};
 }
 // A spaced early heavy hit interrupts; further hits cannot keep restarting it.
 const stagger=make(70);tick(stagger);run(stagger,4);m.hitAnimal(stagger.w,stagger.a,40);tick(stagger);assert.equal(stagger.a.predator.state,'recover');assert(stagger.a.predator.boar.flinchUntil>m.timeOf(stagger.w));
 const ready=stagger.a.predator.readyAt;run(stagger,5);m.hitAnimal(stagger.w,stagger.a,16);tick(stagger);assert.equal(stagger.a.predator.readyAt,ready);until(stagger,()=>stagger.w.player.hp<100);
 const late=make(70);tick(late);run(late,13);m.hitAnimal(late.w,late.a,40);tick(late);assert.equal(late.a.predator.state,'warn','Committed tell is not reset by damage');until(late,()=>late.w.player.hp<100);
 // Sidestep / dodge beats a committed attack and creates a punishable recovery.
 for(const kind of ['gore','charge']){
  const dodge=make(kind==='gore'?70:180);until(dodge,()=>dodge.a.predator.state==='attack');assert(m.dodgePlayer(dodge.w,{x:0,y:1}));run(dodge,40,{x:0,y:1});assert.equal(dodge.w.player.hp,100,kind+' respects dodge and lateral movement');
  const evade=make(kind==='gore'?70:180);tick(evade);const spec=m.BOAR_ATTACKS[kind];while(m.timeOf(evade.w)-evade.a.predator.since<spec.warning-spec.commit)tick(evade);run(evade,35,{x:0,y:1},true);assert.equal(evade.w.player.hp,100,kind+' final tell permits a sidestep');
 }
 const scene=blockers=>({id:'boar-test',name:'test',width:6000,height:6000,background:'#000',terrain:{key:'none',url:''},walkable:[[0,0],[6000,0],[6000,6000],[0,6000]],blockers,foreground:[],spawns:{},portals:[]});
 const wall=make(180);until(wall,()=>wall.a.predator.state==='attack');wall.w.scene=scene([[[1580,0],[1584,0],[1584,6000],[1580,6000]]]);run(wall,160);assert.equal(wall.w.player.hp,100);assert(!m.worldBlocked(wall.w,wall.a.x,wall.a.y,22));
 const detour=make(250);tick(detour);detour.w.scene=scene([[[1610,1410],[1640,1410],[1640,1590],[1610,1590]]]);
 let around=false;for(let i=0;i<360&&detour.w.player.hp===100;i++){tick(detour);assert(!m.worldBlocked(detour.w,detour.a.x,detour.a.y,22));if(Math.abs(detour.a.y-1500)>110)around=true}
 assert(around,'Boar routes around an intervening obstacle');assert(detour.a.predator.engaged);assert(detour.w.player.hp<100,'Hunt resumes after the obstruction');
 const lost=make(180);tick(lost);lost.w.scene=scene([[[1580,0],[1584,0],[1584,6000],[1580,6000]]]);run(lost,180);assert(lost.a.predator.engaged,'Brief lost sight does not end pursuit');run(lost,420);assert(!lost.a.predator.engaged,'Hiding out of sight eventually works');
 const dead=make(70);tick(dead);m.hitAnimal(dead.w,dead.a,999);run(dead,90);assert.equal(dead.w.player.hp,100);assert.equal(dead.w.loot.length,1);assert.equal(dead.w.loot[0].amount,3);
 const down=make(70);tick(down);down.w.player.downedUntil=99;run(down,90);assert(!down.a.predator.engaged);assert.equal(down.w.player.hp,100);
 const overlap=make(50);run(overlap,4,{x:1,y:0});assert(m.distance(overlap.a,overlap.w.player)>=40,'Normal movement cannot stand inside a living boar');
 const report={passed:true,results,checks:['recorded home-boundary retreat reproduced and removed','walking is caught; sprint and real separation allow escape','distinct grounded gore and committed charge','charge follows with gore when player stays close','real stationary axe/fist spam receives damage','early spaced interruption; no cooldown reset from repeated hits','readable tells, sidestep, dodge and single-hit recovery','bounded obstacle detour, no attacks through walls','short sight loss retained; sustained hiding loses pursuit','death, downed guard, body spacing and single meat reward'],physicalIPhoneTested:false};
 fs.mkdirSync('docs/qa/boar-combat-v2',{recursive:true});fs.writeFileSync('docs/qa/boar-combat-v2/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
