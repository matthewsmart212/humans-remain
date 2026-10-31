import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'predators-'));
try{
 await build({stdin:{contents:`export * from './src/camp-predators';export * from './src/predator-renderer';export * from './src/predator-art';export * from './src/studio-play';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/imported-art';export * from './src/food-items';export * from './src/camp-kitchen';export * from './src/expedition-inventory';export * from './src/bag-loads';export * from './src/quick-items';export {stationFront} from './src/camp-stations';export {FieldKitController} from './src/field-kit';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'game.cjs')});
 const m=require(path.join(temp,'game.cjs')),snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));m.installImportedArt(snapshot.records);
 const before=JSON.stringify(snapshot.layout),authored=m.createCampPlaySession(snapshot.layout),predators=authored.animals.filter(a=>a.predator);
 assert.equal(predators.length,14);assert.equal(predators.filter(a=>a.predator.kind==='boar').length,7);assert.equal(predators.filter(a=>a.predator.kind==='wolf').length,7);
 m.seedCampPredators(authored);assert.equal(authored.animals.filter(a=>a.predator).length,14);
 for(const a of predators){assert(!m.worldBlocked(authored,a.x,a.y,28));assert(Math.hypot(a.x-authored.player.x,a.y-authored.player.y)>650);assert(authored.animals.filter(b=>b!==a).every(b=>Math.hypot(a.x-b.x,a.y-b.y)>=75))}
 for(let i=0;i<600;i++)m.stepCampPlaySession(authored,{x:0,y:0},false,false);
 assert.equal(authored.player.hp,100,'Camp start stays safe');assert.equal(JSON.stringify(snapshot.layout),before);
 const make=kind=>{
  const w=m.createWorld({...m.emptyLayout(),spawn:{x:1500,y:1500}});w.editorPreview=true;w.combatTest=true;w.survivalEnabled=true;w.enemies=[];w.loot=[];
  const a=structuredClone(predators.find(a=>a.predator.kind===kind));Object.assign(a,{x:1600,y:1500});Object.assign(a.predator,{home:{x:1600,y:1500},target:{x:1600,y:1500},state:'idle',since:0,until:10,thinkAt:0,readyAt:0,engaged:false});w.animals=[a];return{w,a};
 };
 const step=(w,n)=>{for(let i=0;i<n;i++){w.tick++;m.stepCampPredators(w,m.STEP)}};
 const result=[];
 for(const kind of ['boar','wolf']){
  const r=m.PREDATOR_RULES[kind];
  const hunt=make(kind);Object.assign(hunt.w.player,{x:1555,direction:'right',equipped:null});for(let i=0;i<r.health/16;i++){hunt.w.player.stamina=100;assert(m.attack(hunt.w));hunt.w.tick+=33}assert.equal(hunt.a.hp,0,'Consistent sixteen damage per punch');assert.equal(hunt.w.loot.length,1);
  const axe=make(kind);Object.assign(axe.w.player,{x:1555,direction:'right',equipped:'axe'});for(let i=0;i<Math.ceil(r.health/40);i++){axe.w.axeSwing={started:m.timeOf(axe.w),angle:0,resolved:false,cut:1};axe.w.tick+=18;m.stepAxe(axe.w)}assert.equal(axe.a.hp,0);assert.equal(axe.w.player.stamina,100);
  const food={w:m.createCampPlaySession(snapshot.layout),a:make(kind).a};food.w.animals=[food.a];food.w.loot=[];m.hitAnimal(food.w,food.a,999);Object.assign(food.w.player,{x:food.a.x,y:food.a.y});assert(m.pickup(food.w));assert.equal(food.w.bag.rawVenison,r.meat);Object.assign(food.w.player,m.stationFront(food.w.camp,'hearth'));assert(m.doAction(food.w,'cook','venison'));food.w.tick+=1080;m.stepBonfireCooking(food.w);assert.equal(m.collectFood(food.w),1);Object.assign(food.w.player,snapshot.layout.spawn);assert(m.selectQuickItem(food.w,'venisonMeal'));food.w.hunger=30;food.w.player.hp=60;assert(m.doAction(food.w,'eat'));assert.equal(food.w.hunger,80);assert.equal(food.w.player.hp,72);
  result.push({kind,health:r.health,damage:r.damage,warning:r.warning,meat:r.meat});
 }
 const ctx={save(){},restore(){},beginPath(){},ellipse(){},fill(){},translate(){},scale(){},drawImage(){this.draws++},draws:0},imgs=Object.fromEntries(Object.keys(m.PREDATOR_IMAGES).map(k=>[k,{}]));
 assert.equal(m.predatorDrawables(ctx,imgs,authored,{x:-9999,y:-9999,width:1,height:1,scale:1}).length,0);const draws=m.predatorDrawables(ctx,imgs,authored);assert.equal(draws.length,14);draws.forEach(d=>d.draw());assert.equal(ctx.draws,14);
 const report={passed:true,animals:result,checks:['isolated draft and fourteen collision-clear spawns outside camp','camp start safety and idempotent seeds','species combat verified separately by check-wolf-hunt and check-boar-hunt','punch and axe kills; no axe stamina cost','one harvest; carry, cook, collect, equip and eat shared wild meat','one draw per visible animal; viewport culling'],physicalIPhoneTested:false};fs.mkdirSync('docs/qa/predators-playable',{recursive:true});fs.writeFileSync('docs/qa/predators-playable/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
