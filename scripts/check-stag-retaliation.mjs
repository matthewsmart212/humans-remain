import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'stag-retaliation-'));
try{
 await build({stdin:{contents:`export * from './src/camp-deer';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/studio-play';export * from './src/imported-art';export {drawCombatGround} from './src/combat-renderer';export {FieldKitController} from './src/field-kit';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs')});
 const m=require(path.join(temp,'test.cjs')),snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));m.installImportedArt(snapshot.records);
 const authored=m.createCampPlaySession(snapshot.layout);
 for(const a of authored.animals)assert.equal(a.hp,a.predator?(a.predator.kind==='boar'?128:96):a.deer?(a.deer.kind==='stag'?96:64):32,'Actual health hierarchy: chicken/rabbit 32, doe 64, stag 96');
 const make=(kind='stag')=>{
  const w=m.createWorld({...m.emptyLayout(),spawn:{x:1500,y:1500}});w.editorPreview=true;w.combatTest=true;w.survivalEnabled=true;w.enemies=[];w.loot=[];
  const a={x:1600,y:1500,id:w.serial++,home:0,hp:m.DEER_HEALTH[kind],moving:false,right:false,flashUntil:0,deer:{kind,home:{x:1600,y:1500},direction:'down',distance:0,stride:0,state:'idle',since:0,until:10,thinkAt:0,target:{x:1600,y:1500},seed:203,cycle:0}};w.animals=[a];return{w,a};
 };
 const step=(w,n)=>{for(let i=0;i<n;i++){w.tick++;m.stepCampDeer(w,m.STEP)}};
 const peaceful=make();step(peaceful.w,120);assert.equal(peaceful.w.player.hp,100);assert(!peaceful.a.deer.retaliation,'Walking near an unprovoked stag is safe');
 const walking=make();walking.w.player.x=walking.a.x-136;m.hitAnimal(walking.w,walking.a,16);for(let i=0;i<120;i++){m.movePlayer(walking.w,{x:-1,y:0},false);step(walking.w,1)}assert.equal(walking.w.player.hp,88,'A provoked stag can catch an ordinary walking retreat from maximum first-axe range');
 const crossing=make();m.hitAnimal(crossing.w,crossing.a,16);for(let i=0;i<120;i++){m.movePlayer(crossing.w,{x:1,y:0},false);step(crossing.w,1)}assert.equal(crossing.w.player.hp,88,'A player walking through the warning is targeted at launch rather than at their stale position');
 const sprinting=make();m.hitAnimal(sprinting.w,sprinting.a,16);for(let i=0;i<120;i++){m.movePlayer(sprinting.w,{x:-1,y:0},true);step(sprinting.w,1)}assert.equal(sprinting.w.player.hp,100,'Sprinting directly away still escapes the charge');
 const axe=make();axe.w.player.x=axe.a.x-45;axe.w.player.direction='right';axe.w.player.equipped='axe';assert(m.attack(axe.w));for(let i=0;i<120;i++)m.stepCampPlaySession(axe.w,{x:1,y:0},false,false);assert.equal(axe.a.hp,56,'Actual moving axe windup lands one cut');assert.equal(axe.w.player.hp,88,'Actual gameplay loop permits a stag counterattack while the player walks through the hit');
 const stale=make();Object.assign(stale.a.deer,{escapeGoal:{x:2300,y:1500},escapeAngle:0,escapeUntil:10,avoidAngle:0,avoidUntil:10,avoidRetryAt:10});m.hitAnimal(stale.w,stale.a,16);
 for(let i=0;i<90&&stale.w.player.hp===100;i++){m.movePlayer(stale.w,{x:1,y:0},false);step(stale.w,1)}
 assert.equal(stale.w.player.hp,88,'A crossing attacker is counterattacked despite an existing escape goal and detour');
 const contactX=stale.a.x,contactGap=Math.hypot(stale.a.x-stale.w.player.x,stale.a.y-stale.w.player.y);step(stale.w,30);
 assert(stale.a.x<contactX-100&&Math.hypot(stale.a.x-stale.w.player.x,stale.a.y-stale.w.player.y)>contactGap+100,'Retreat builds a fresh leg away from the current attacker instead of following stale forward steering or retry delay');
 const doe=make('doe');m.hitAnimal(doe.w,doe.a,16);step(doe.w,90);assert.equal(doe.w.player.hp,100);assert(!doe.a.deer.retaliation,'Doe flee rather than fight');
 const {w,a}=make();m.hitAnimal(w,a,16);step(w,1);assert.equal(a.deer.retaliation.phase,'warn');const warningX=a.x;
 const kit=new m.FieldKitController();assert(kit.sample(w).combat,'Dodge is available before the charge lands');assert.equal(kit.sample(w).action.label,'ATTACK');
 step(w,20);assert.equal(w.player.hp,100);assert.equal(a.x,warningX,'Warning gives time to react');assert([10,11].includes(m.deerFrame(w,a)));
 const ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){this.lines++},closePath(){},fill(){},stroke(){},lines:0};m.drawCombatGround(ctx,w);assert.equal(ctx.lines,0,'Stag warning uses its head-lowering pose without a ground box');
 step(w,35);assert.equal(w.player.hp,88,'A landed stag charge deals twelve damage');assert.equal(a.deer.retaliation,undefined);assert(a.deer.fleeUntil>m.timeOf(w));const hitHp=w.player.hp;
 step(w,65);assert.equal(w.player.hp,hitHp,'Retreat never repeats contact damage');assert(Math.hypot(a.x-w.player.x,a.y-w.player.y)>100,'Stag retreats after striking');
 m.hitAnimal(w,a,1);step(w,1);assert(!a.deer.retaliation,'A new hit during cooldown cannot restart the charge');
 const evade=make();m.hitAnimal(evade.w,evade.a,16);step(evade.w,35);const angle=evade.a.deer.retaliation.angle;assert.equal(evade.a.deer.retaliation.phase,'charge');evade.w.player.y+=180;step(evade.w,75);assert.equal(evade.w.player.hp,100,'A perpendicular sidestep after launch evades the committed charge');assert.equal(evade.a.deer.retaliation,undefined);assert.equal(angle,Math.PI);
 const dodge=make();m.hitAnimal(dodge.w,dodge.a,16);step(dodge.w,33);dodge.w.dodge={started:m.timeOf(dodge.w),angle:0};step(dodge.w,20);assert.equal(dodge.w.player.hp,100,'The normal dodge invulnerability prevents stag damage');assert.equal(dodge.a.deer.retaliation,undefined);
 const wall=make();wall.w.player.x=1525;wall.w.scene={id:'test-wall',name:'test',width:4000,height:4000,background:'#000',terrain:{key:'none',url:''},walkable:[[0,0],[4000,0],[4000,4000],[0,4000]],blockers:[[[1550,1400],[1554,1400],[1554,1600],[1550,1600]]],foreground:[],spawns:{},portals:[]};m.hitAnimal(wall.w,wall.a,16);step(wall.w,90);assert.equal(wall.w.player.hp,100,'No damage through even a thin wall');assert(!m.worldBlocked(wall.w,wall.a.x,wall.a.y,20),'Charging never embeds the stag in a wall');
 const dead=make();m.hitAnimal(dead.w,dead.a,16);step(dead.w,1);m.hitAnimal(dead.w,dead.a,999);step(dead.w,90);assert.equal(dead.w.player.hp,100,'A killed stag cannot finish its charge');assert.equal(dead.a.deer.retaliation,undefined);assert.equal(dead.w.loot.length,1);assert.equal(dead.w.loot[0].amount,3);
 const down=make();m.hitAnimal(down.w,down.a,16);step(down.w,1);down.w.player.downedUntil=99;step(down.w,1);assert.equal(down.a.deer.retaliation,undefined);
 const result={passed:true,health:{chicken:32,rabbit:32,doe:64,stag:96},charge:m.STAG_ATTACK,checks:['actual authored-world health hierarchy','peaceful unless hit; doe remain prey','walking retreat from maximum axe range can be caught','walking through windup updates aim at launch','actual moving axe gameplay triggers and lands retaliation','post-contact retreat discards stale flee goals, detours and retry waits','sprinting away, post-launch sidestep and dodge remain valid escapes','head-lowering warning without ground box and early Dodge controls','one twelve-damage contact followed by retreat','cooldown prevents immediate repeat retaliation','committed direction permits sidestep evasion','standard dodge invulnerability applies','thin-wall collision and line-of-sight protection','death cancels charge without duplicate loot','downed-player guard'],physicalIPhoneTested:false};
 fs.mkdirSync('docs/qa/camp-deer-v1',{recursive:true});fs.writeFileSync('docs/qa/camp-deer-v1/retaliation.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
