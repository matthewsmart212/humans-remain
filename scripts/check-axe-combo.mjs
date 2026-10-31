import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'axe-combo-'));
try{
 await build({stdin:{contents:`export * from './src/survival-engine';export * from './src/axe-combat';export * from './src/world-layout';export * from './src/studio-play';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'game.cjs'),logLevel:'error'});
 const m=require(path.join(temp,'game.cjs'));
 const make=()=>{const w=m.createCampPlaySession({...m.emptyLayout(),spawn:{x:1500,y:1500}});w.gear.bag.axe=1;w.player.equipped='axe';w.player.direction='right';return w};
 const target=(id,x,y)=>({id,x,y,hp:200,maxHp:200,attackAt:999,path:[],repathAt:999,flashUntil:0});
 const advance=(w,n,input={x:0,y:0},sprint=false)=>{for(let i=0;i<n;i++){m.movePlayer(w,input,sprint);w.tick++;m.stepAxe(w)}};
 for(const [direction,angle] of Object.entries(m.DIRECTION_ANGLES)){
  const w=make(),input={x:Math.cos(angle),y:Math.sin(angle)};w.player.direction=direction;
  const e=target(1,1500+input.x*100,1500+input.y*100),rear=target(2,1500-input.x*110,1500-input.y*110);w.enemies=[e,rear];
  assert(m.requestAttack(w));advance(w,15,input,true);assert.equal(e.hp,200,'No early contact in '+direction);assert(m.distance(w.player,{x:1500,y:1500})>40,'Walking continues through wind-up');assert(!w.player.sprinting);
  advance(w,1,input);assert.equal(e.hp,160);assert.equal(rear.hp,200,'Forward cut cannot hit behind');m.stepAxe(w);assert.equal(e.hp,160,'One contact per cut');
  assert(m.requestAttack(w));assert(w.axeSwing.queued);advance(w,10,input);assert.equal(w.axeSwing.cut,2,'Second input links the return cut');
  const secondStart=w.axeSwing.started;advance(w,17,input);assert.equal(e.hp,160,'Return wind-up has no early hit');advance(w,1,input);assert.equal(e.hp,112,'Return hit deals 48 damage');assert.equal(rear.hp,200);
  assert.equal(w.axeSwing.started,secondStart);assert(m.distance(w.player,e)>=36.8,'No walking through the target');
  advance(w,35,input);assert(!w.axeSwing,'Two cuts terminate without another input');assert.equal(e.hp,112);
 }
 const strafe=make();m.attack(strafe);const angle=strafe.axeSwing.angle;advance(strafe,10,{x:0,y:1});assert.equal(strafe.axeSwing.angle,angle,'Moving cannot rotate an in-progress hit');assert(strafe.player.y>1520);
 const cancel=make();m.attack(cancel);advance(cancel,12);assert(m.requestAttack(cancel));m.clearAttackQueue(cancel);advance(cancel,40);assert(!cancel.axeSwing,'Closing a menu/blur clears queued continuation');
 const dodge=make();m.attack(dodge);advance(dodge,17);m.requestAttack(dodge);assert(m.dodgePlayer(dodge,{x:0,y:1}));assert(!dodge.axeSwing&&!dodge.attackQueuedUntil,'Dodge cancels follow-up after contact');
 const down=make();m.attack(down);advance(down,12);m.requestAttack(down);down.player.downedUntil=99;advance(down,20);assert(!down.axeSwing);
 const stamina=m.createWorld(m.emptyLayout());stamina.gear.bag.axe=1;Object.assign(stamina.player,{x:1500,y:1500,direction:'right',stamina:0,equipped:'axe'});assert(m.attack(stamina),'An exhausted player can still chop');advance(stamina,12);m.requestAttack(stamina);advance(stamina,65);assert.equal(stamina.player.stamina,0,'Both axe cuts are free');assert(!stamina.axeSwing);
 const safe=make();safe.combatTest=false;const untouched=target(1,1590,1500);safe.enemies=[untouched];const draft=JSON.stringify(safe.layout);m.attack(safe);advance(safe,12);m.requestAttack(safe);advance(safe,45);assert.equal(untouched.hp,200,'Walk preview remains harmless');assert.equal(JSON.stringify(safe.layout),draft);
 const block=make(),wall=m.newPlacement('base_well_t1',1600,1520);wall.collision={lineWidth:.025,paths:[{closed:true,points:[[.05,.05],[.95,.05],[.95,.95],[.05,.95]]}]};block.layout.items=[wall];m.attack(block);for(let i=0;i<70;i++){advance(block,1,{x:1,y:0});assert(!m.worldBlocked(block,block.player.x,block.player.y,19),'Moving strikes respect authored collision')}
 const hold=make(),cuts=[];for(let i=0;i<200;i++){const before=hold.axeSwing?.started;m.stepCampPlaySession(hold,{x:0,y:0},false,true);if(hold.axeSwing?.started!==before&&hold.axeSwing)cuts.push(hold.axeSwing.cut)}assert.deepEqual(cuts,[1,2,1,2,1,2],'Held input keeps linking deliberate free pairs');const foodBefore=hold.hunger;for(let i=0;i<600;i++)m.stepCampPlaySession(hold,{x:0,y:0},false,true);assert.equal(hold.player.stamina,100);assert(Math.abs(foodBefore-hold.hunger-.5)<.001,'Axe swings add no stamina-recovery food cost');
 const tap=make();m.requestAttack(tap);for(let i=0;i<60;i++){m.stepCampPlaySession(tap,{x:0,y:0},false,i<11);assert.notEqual(tap.axeSwing?.cut,2,'A 180 ms tap produces exactly one cut')}
 const early=make();m.requestAttack(early);advance(early,1);m.requestAttack(early);for(let i=0;i<26;i++)m.stepCampPlaySession(early,{x:0,y:0},false,false);assert.equal(early.axeSwing.cut,2,'An early double tap is caught by the short buffer');
 const ordinary=make(),equipped=make();ordinary.player.equipped=null;for(let i=0;i<90;i++){m.movePlayer(ordinary,{x:.7,y:.7},true);m.movePlayer(equipped,{x:.7,y:.7},true)}for(const key of ['x','y','walkDistance','runBlend','walkBlend','direction'])assert.equal(equipped.player[key],ordinary.player[key],'Non-combat locomotion remains unchanged');
 console.log('PASS: eight-direction moving cuts, two-hit combo timing/damage, fixed aim, body/wall collision, held/tapped input, safe preview, stamina, dodge/downed/reset cancellation and unchanged ordinary gait.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
