import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-rabbits-'));
try{
 await build({stdin:{contents:`export * from './src/camp-rabbits';export * from './src/rabbit-art';export * from './src/rabbit-renderer';export * from './src/studio-play';export * from './src/animal-motion';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/imported-art';export * from './src/backpack';export * from './src/bag-loads';export * from './src/quick-items';export * from './src/food-items';export * from './src/camp-kitchen';export * from './src/expedition-inventory';export * from './src/pickup-visibility';export * from './src/bonfire-food-renderer';export * from './src/scene-travel';export {FieldKitController} from './src/field-kit';export {stationFront} from './src/camp-stations';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'game.cjs')});
 const m=require(path.join(temp,'game.cjs')),snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));m.installImportedArt(snapshot.records);
 const make=()=>m.createCampPlaySession(snapshot.layout),w=make(),rabbits=w.animals.filter(a=>a.rabbit),before=JSON.stringify(snapshot.layout);
 assert.equal(rabbits.length,18);assert.equal(w.animals.filter(a=>a.chicken).length,20);const count=w.animals.length;m.seedCampRabbits(w);assert.equal(w.animals.length,count);
 for(const a of rabbits){assert(!m.worldBlocked(w,a.x,a.y,20));assert.equal(a.hp,32);assert(w.animals.filter(b=>b!==a).every(b=>Math.hypot(a.x-b.x,a.y-b.y)>=75))}
 const roam=m.createWorld({...m.emptyLayout(),spawn:{x:1000,y:1500}}),a={...rabbits[0],x:1600,y:1500,rabbit:{...rabbits[0].rabbit,home:{x:1600,y:1500},target:{x:1600,y:1500},state:'idle',since:0,until:0,thinkAt:0,cycle:0,distance:0,hop:0}};roam.animals=[a];
 const states=new Set(),frames=new Set();let runTicks=0;
 for(let i=0;i<7200;i++){roam.tick++;m.stepCampRabbits(roam,m.STEP);states.add(a.rabbit.state);frames.add(m.rabbitFrame(roam,a));assert(Math.hypot(a.x-a.rabbit.home.x,a.y-a.rabbit.home.y)<=m.animalTravelLeash(a.rabbit,m.RABBIT_LEASH,m.timeOf(roam))+1);assert(!m.worldBlocked(roam,a.x,a.y,12));if(a.moving&&a.rabbit.state==='run')runTicks++}
 assert(runTicks>300);assert(states.has('peck')&&states.has('walk')&&states.has('run'));assert(frames.has(2)&&frames.has(6)&&frames.has(11),'Both hop loops and grazing animated');
 Object.assign(roam.player,{x:a.x-40,y:a.y});a.rabbit.thinkAt=0;m.stepCampRabbits(roam,m.STEP);assert.equal(a.rabbit.state,'run');
 const sleeping=[a.x,a.y,a.rabbit.hop];roam.player.x=a.x+3000;m.stepCampRabbits(roam,m.STEP);assert.deepEqual([a.x,a.y,a.rabbit.hop],sleeping);assert(!a.moving);
 const hunt=make(),victim=hunt.animals.find(a=>a.rabbit);hunt.enemies=[];hunt.loot=[];Object.assign(hunt.player,{x:victim.x-45,y:victim.y,direction:'right',equipped:null});
 assert(m.attack(hunt));assert.equal(victim.hp,16);assert.equal(m.rabbitFrame(hunt,victim),12);hunt.tick+=33;assert(m.attack(hunt));assert.equal(victim.hp,0);assert(victim.rabbit.deadAt!==undefined);assert.equal(hunt.loot.length,1);assert.equal(hunt.loot[0].kind,'rawRabbit');m.hitAnimal(hunt,victim,50);assert.equal(hunt.loot.length,1);
 hunt.tick+=60;assert.equal(m.rabbitFrame(hunt,victim),15);assert.equal(m.pickupBadge(hunt.loot[0]).label,'RAW RABBIT');
 assert(m.pickup(hunt));assert.equal(hunt.bag.rawRabbit,1);assert.equal(hunt.bag.rawMeat,3);assert.equal(hunt.loads,3);
 assert(m.dropBackpackItem(hunt,'rabbitRaw',1).ok);assert.equal(hunt.bag.rawRabbit,0);assert.equal(hunt.loads,2);assert.equal(hunt.loot[0].kind,'rawRabbit');assert(m.pickup(hunt));assert.equal(hunt.loads,3);
 Object.assign(hunt.player,m.stationFront(hunt.camp,'hearth'));assert(m.doAction(hunt,'cook','rabbit'));assert.equal(hunt.fire.species,'rabbit');assert.equal(hunt.bag.rawRabbit,0);assert.equal(hunt.bag.rawMeat,3);assert.equal(hunt.loads,2);assert(!m.doAction(hunt,'cook','rabbit'));
 hunt.tick+=480;m.stepBonfireCooking(hunt);assert.deepEqual(hunt.fire.rack,['rabbit']);assert.equal(m.collectFood(hunt),1);assert.equal(hunt.cookedRabbit,1);Object.assign(hunt.player,snapshot.layout.spawn);
 assert(m.selectQuickItem(hunt,'rabbitMeal'));assert.equal(m.selectedQuickItem(hunt),'rabbitMeal');assert(!m.attack(hunt),'Holding rabbit food cannot punch');
 hunt.hunger=30;hunt.player.hp=70;const controller=new m.FieldKitController(),action=controller.sample(hunt).action;assert.equal(action.label,'EAT');assert(action.description.includes('rabbit'));assert(controller.press(hunt,action));controller.release();assert.equal(hunt.hunger,55);assert.equal(hunt.player.hp,76);assert.equal(hunt.cookedRabbit,0);assert.equal(hunt.player.equipped,null);
 const axe=make(),prey=axe.animals.find(a=>a.rabbit);Object.assign(axe.player,{x:prey.x-45,y:prey.y,direction:'right',stamina:100});axe.axeSwing={started:m.timeOf(axe),angle:0,resolved:false,cut:1};axe.tick+=17;m.stepAxe(axe);assert.equal(prey.hp,0);assert.equal(axe.loot.filter(l=>l.kind==='rawRabbit').length,1);assert.equal(axe.player.stamina,100);
 const capacity=make();capacity.loot=[];capacity.cooked=3;capacity.cookedRabbit=1;capacity.loot.push({id:capacity.serial++,x:capacity.player.x,y:capacity.player.y,kind:'cookedRabbit',amount:1});assert(m.pickup(capacity));assert.equal(m.totalCooked(capacity),5);capacity.cooked=2;assert.equal(capacity.cookedRabbit,2);
 capacity.hunger=100;capacity.player.hp=100;assert(!m.useBackpackItem(capacity,'rabbitMeal'));capacity.player.hp=50;assert(m.useBackpackItem(capacity,'rabbitMeal'));assert.equal(capacity.cookedRabbit,1);assert.equal(capacity.cooked,2);assert.equal(capacity.player.hp,56);
 capacity.tick+=480;capacity.player.equipped='rabbitMeal';assert(m.useBackpackItem(capacity,'meal'));assert.equal(capacity.cooked,1,'Eating chicken from bag never consumes the held rabbit');assert.equal(capacity.cookedRabbit,1);
 assert(m.dropBackpackItem(capacity,'rabbitMeal','all').ok);assert.equal(capacity.cookedRabbit,0);assert.equal(capacity.player.equipped,null);assert.equal(capacity.loot.at(-1).kind,'cookedRabbit');assert(m.pickup(capacity));assert.equal(capacity.cookedRabbit,1);
 const transfer=new m.SceneTravel(capacity,{ready:()=>true,prepare:async()=>{},pin:()=>{}}),destination=m.createWorld(m.emptyLayout());transfer.transfer(destination,{x:1500,y:1500,direction:'up'});assert.equal(destination.cookedRabbit,1);assert.equal(destination.bag,capacity.bag);transfer.dispose();
 const ctx={save(){},restore(){},beginPath(){},ellipse(){},fill(){},translate(){},scale(){},drawImage(){this.draws++},draws:0},imgs=Object.fromEntries(Object.keys(m.RABBIT_IMAGES).map(k=>[k,{}]));
 assert.equal(m.rabbitDrawables(ctx,imgs,w,{x:-9999,y:-9999,width:10,height:10,scale:1}).length,0);const draws=m.rabbitDrawables(ctx,imgs,w);assert.equal(draws.length,18);draws.forEach(d=>d.draw());assert.equal(ctx.draws,18);assert.equal(JSON.stringify(snapshot.layout),before);
 const manifest=JSON.parse(fs.readFileSync('public/survival/rabbit-v1/artwork.json')),proofs=[];let decoded=0;
 for(const [direction,{key,mirror}]of Object.entries(Object.fromEntries(['down','down-left','left','up-left','up','up-right','right','down-right'].map(d=>[d,m.rabbitView(d)])))){
  const url=m.RABBIT_IMAGES[key],meta=await sharp('public'+url).metadata();assert(meta.hasAlpha);assert.equal(meta.width,768);assert.equal(meta.height,768);if(!mirror)decoded+=768*768*4;
  for(let frame=0;frame<16;frame++){
   const raw=await sharp('public'+url).extract({left:frame%4*192,top:Math.floor(frame/4)*192,width:192,height:192}).ensureAlpha().raw().toBuffer();let visible=0;
   for(let y=0;y<192;y++)for(let x=0;x<192;x++)if(raw[(y*192+x)*4+3]>24){visible++;assert(x>=3&&x<189&&y>=3&&y<189,'No clipped ears, paws or cross-cell pixels')}
   assert(visible>2000,'All sixteen animation frames contain a complete sprite');
  }
  let idle=await sharp('public'+url).extract({left:0,top:384,width:192,height:192}).png().toBuffer();if(mirror)idle=await sharp(idle).flop().png().toBuffer();proofs.push({input:idle,left:(proofs.length%4)*192,top:Math.floor(proofs.length/4)*192});
 }
 assert.equal(manifest.records.length,5);assert.equal(manifest.records.reduce((n,r)=>n+r.frameCount,0),80);assert(decoded<=12*1024*1024);
 fs.mkdirSync('.qa/rabbits',{recursive:true});await sharp({create:{width:768,height:384,channels:4,background:'#b5a47a'}}).composite(proofs).png().toFile('.qa/rabbits/directions.png');
 for(const key of ['rabbitRaw','rabbitCooked']){const meta=await sharp('public'+m.RABBIT_FOOD_IMAGES[key]).metadata();assert(meta.hasAlpha);assert.equal(meta.width,256)}
 const result={passed:true,rabbits:18,chickens:20,frames:80,directionalViews:8,textureAtlases:5,decodedBytes:decoded,artworkBytes:manifest.records.reduce((n,r)=>n+r.webpBytes,0),checks:['safe separated camp-outskirts spawns','idempotent seeding and isolated editor draft','leashed collision-aware roaming, fast fleeing and distant sleeping','distance-driven hop/run loops and timed idle/graze/hit/fall','two punches or one axe cut, one raw-rabbit drop','raw-rabbit drop/recollect conserves weight','rabbit cooking preserves species through queue and rack','shared weight budget across food stacks','hold, eat and inventory use consume correct species','drop/recollect cooked rabbit and transfer through scenes','readable correct pickup badges','one draw per visible rabbit and offscreen culling','80 complete transparent padded atlas frames','native/offline-ready asset URLs'],physicalIPhoneTested:false};
 fs.mkdirSync('docs/qa/camp-rabbits-v1',{recursive:true});fs.writeFileSync('docs/qa/camp-rabbits-v1/checks.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
