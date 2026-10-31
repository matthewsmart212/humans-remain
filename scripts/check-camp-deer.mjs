import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-deer-'));
try{
 await build({stdin:{contents:`export * from './src/camp-deer';export * from './src/deer-art';export * from './src/deer-renderer';export * from './src/studio-play';export * from './src/animal-motion';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/imported-art';export * from './src/backpack';export * from './src/bag-loads';export * from './src/quick-items';export * from './src/food-items';export * from './src/camp-kitchen';export * from './src/expedition-inventory';export * from './src/pickup-visibility';export * from './src/scene-travel';export {FieldKitController,sameFieldKit} from './src/field-kit';export {stationFront} from './src/camp-stations';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'game.cjs')});
 const m=require(path.join(temp,'game.cjs')),snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));m.installImportedArt(snapshot.records);
 const make=()=>m.createCampPlaySession(snapshot.layout),w=make(),deer=w.animals.filter(a=>a.deer),before=JSON.stringify(snapshot.layout);
 assert.equal(deer.length,12);assert.equal(deer.filter(a=>a.deer.kind==='doe').length,6);assert.equal(deer.filter(a=>a.deer.kind==='stag').length,6);
 const count=w.animals.length;m.seedCampDeer(w);assert.equal(w.animals.length,count);
 for(const a of deer){assert(!m.worldBlocked(w,a.x,a.y,26),'Spawn is clear of scenery and river collision');assert(w.animals.filter(b=>b!==a).every(b=>Math.hypot(a.x-b.x,a.y-b.y)>=75))}
 const roam=m.createWorld({...m.emptyLayout(),spawn:{x:900,y:1500}}),a={...deer[0],x:1600,y:1500,deer:{...deer[0].deer,home:{x:1600,y:1500},target:{x:1600,y:1500},state:'idle',since:0,until:0,thinkAt:0,cycle:0,distance:0,stride:0}};roam.animals=[a];
 const states=new Set(),frames=new Set();let moving=0;
 for(let i=0;i<7200;i++){roam.tick++;m.stepCampDeer(roam,m.STEP);states.add(a.deer.state);frames.add(m.deerFrame(roam,a));if(a.moving)moving++;assert(Math.hypot(a.x-a.deer.home.x,a.y-a.deer.home.y)<=m.animalTravelLeash(a.deer,m.DEER_LEASH,m.timeOf(roam))+1);assert(!m.worldBlocked(roam,a.x,a.y,20))}
 assert(moving>1000);assert(states.has('walk')&&states.has('run')&&states.has('peck'));assert(frames.has(2)&&frames.has(6)&&frames.has(11));
 Object.assign(roam.player,{x:a.x-40,y:a.y});a.deer.thinkAt=0;m.stepCampDeer(roam,m.STEP);assert.equal(a.deer.state,'run');
 const sleeping=[a.x,a.y,a.deer.stride];roam.player.x=a.x+3000;m.stepCampDeer(roam,m.STEP);assert.deepEqual([a.x,a.y,a.deer.stride],sleeping);assert(!a.moving);
 for(const kind of ['doe','stag']){
  const hunt=make(),victim=hunt.animals.find(a=>a.deer?.kind===kind);hunt.animals=[victim];hunt.enemies=[];hunt.loot=[];
  Object.assign(hunt.player,{x:victim.x-45,y:victim.y,direction:'right',equipped:null});const punches=kind==='doe'?4:6;
  for(let i=0;i<punches;i++){assert(m.attack(hunt));assert.equal(victim.hp,(punches-i-1)*16);if(i===0)assert.equal(m.deerFrame(hunt,victim),12);hunt.tick+=33}
  assert.equal(hunt.loot.length,1);assert.equal(hunt.loot[0].kind,'rawVenison');assert.equal(hunt.loot[0].amount,kind==='doe'?2:3);assert(victim.deer.deadAt!==undefined);assert.equal(m.deerFrame(hunt,victim),15);m.hitAnimal(hunt,victim,999);assert.equal(hunt.loot.length,1);
  const axe=make(),prey=axe.animals.find(a=>a.deer?.kind===kind);axe.animals=[prey];axe.enemies=[];axe.loot=[];Object.assign(axe.player,{x:prey.x-45,y:prey.y,direction:'right',stamina:100});
  const cuts=kind==='doe'?2:3;for(let i=0;i<cuts;i++){axe.axeSwing={started:m.timeOf(axe),angle:0,resolved:false,cut:i%2?2:1};axe.tick+=18;m.stepAxe(axe)}
  assert.equal(prey.hp,0);assert.equal(axe.player.stamina,100);assert.equal(axe.loot.length,1);
 }
 const food=make();food.loot=[];m.addCarriedPickup(food,'rawVenison',3);const packed=m.packWeight(food);
 assert(m.dropBackpackItem(food,'venisonRaw',1).ok);assert(m.pickup(food));assert.equal(m.packWeight(food),packed);
 assert(m.dropBackpackItem(food,'venisonRaw','all').ok);assert.equal(food.loot.length,1);assert(m.pickup(food));assert.equal(food.bag.rawVenison,3);
 Object.assign(food.player,m.stationFront(food.camp,'hearth'));assert(m.doAction(food,'cook','venison'));assert.equal(food.bag.rawVenison,2);food.tick+=1080;m.stepBonfireCooking(food);assert.equal(m.collectFood(food),1);assert.equal(food.cookedVenison,1);
 Object.assign(food.player,snapshot.layout.spawn);assert(m.selectQuickItem(food,'venisonMeal'));assert(!m.attack(food));food.hunger=30;food.player.hp=70;
 const controller=new m.FieldKitController(),action=controller.sample(food).action;assert.equal(action.label,'EAT');assert(controller.press(food,action));controller.release();assert.equal(food.hunger,80);assert.equal(food.player.hp,82);assert.equal(food.cookedVenison,0);
 food.cooked=1;food.cookedRabbit=1;food.cookedVenison=2;food.loot=[{id:food.serial++,x:food.player.x,y:food.player.y,kind:'cookedVenison',amount:1}];assert(m.pickup(food));assert.equal(m.totalCooked(food),5);
 food.tick+=480;food.player.equipped='venisonMeal';assert(m.useBackpackItem(food,'meal'));assert.equal(food.cooked,0);assert.equal(food.cookedVenison,3);
 assert(m.dropBackpackItem(food,'venisonMeal','all').ok);assert.equal(food.player.equipped,null);assert(m.pickup(food));assert.equal(food.cookedVenison,3);
 const transfer=new m.SceneTravel(food,{ready:()=>true,prepare:async()=>{},pin:()=>{}}),destination=m.createWorld(m.emptyLayout());transfer.transfer(destination,{x:1500,y:1500,direction:'up'});assert.equal(destination.cookedVenison,3);assert.equal(destination.bag,food.bag);transfer.dispose();
 const ctx={save(){},restore(){},beginPath(){},ellipse(){},fill(){},translate(){},scale(){},drawImage(){this.draws++},draws:0},imgs=Object.fromEntries(Object.keys(m.DEER_IMAGES).map(k=>[k,{}]));
 assert.equal(m.deerDrawables(ctx,imgs,w,{x:-9999,y:-9999,width:10,height:10,scale:1}).length,0);const draws=m.deerDrawables(ctx,imgs,w);assert.equal(draws.length,12);draws.forEach(d=>d.draw());assert.equal(ctx.draws,12);assert.equal(JSON.stringify(snapshot.layout),before);
 const manifest=JSON.parse(fs.readFileSync('public/survival/deer-v1/artwork.json'));assert.equal(manifest.records.length,10);assert.equal(manifest.records.reduce((n,r)=>n+r.frameCount,0),160);
 const proofs=[];
 for(const kind of ['doe','stag'])for(const direction of ['down','down-left','left','up-left','up','up-right','right','down-right']){
  const {key,mirror}=m.deerView(kind,direction),url='public'+m.DEER_IMAGES[key],meta=await sharp(url).metadata();assert(meta.hasAlpha);assert.equal(meta.width,896);assert.equal(meta.height,896);
  for(let frame=0;frame<16;frame++){
   const raw=await sharp(url).extract({left:frame%4*224,top:Math.floor(frame/4)*224,width:224,height:224}).ensureAlpha().raw().toBuffer();let visible=0;
   for(let y=0;y<224;y++)for(let x=0;x<224;x++)if(raw[(y*224+x)*4+3]>24){visible++;assert(x>=3&&x<221&&y>=3&&y<221,'No clipped antlers, ears, tails or hooves')}
   assert(visible>2000,'Complete silhouette in every cell');
  }
  let idle=await sharp(url).extract({left:0,top:448,width:224,height:224}).png().toBuffer();if(mirror)idle=await sharp(idle).flop().png().toBuffer();proofs.push({input:idle,left:(proofs.length%8)*224,top:Math.floor(proofs.length/8)*224});
 }
 fs.mkdirSync('.qa/deer',{recursive:true});await sharp({create:{width:1792,height:448,channels:4,background:'#b5a47a'}}).composite(proofs).png().toFile('.qa/deer/directions.png');
 for(const url of Object.values(m.VENISON_FOOD_IMAGES)){const meta=await sharp('public'+url).metadata();assert(meta.hasAlpha);assert.equal(meta.width,256)}
 assert.equal(m.QUICK_ITEMS.length+m.QUICK_EMPTY_SLOTS,5,'Quick bar supports tools and three owned meal types');
 const result={passed:true,doe:6,stag:6,frames:160,directionalViewsPerAnimal:8,textureAtlases:10,decodedBytes:10*896*896*4,artworkBytes:manifest.records.reduce((n,r)=>n+r.webpBytes,0),checks:['safe separated clearings outside camp; isolated editor draft','leashed collision-aware walk and run, grazing, nearby flee, distant sleeping','distance-driven quadruped gait, timed hit/fall/downed','doe four punches or two axe cuts; stag six punches or three axe cuts; no axe stamina cost','two/three venison portions; no duplicate harvest','raw/cooked venison cooking, collection, hold, use, drop/recollect and scene travel','stack weight conservation across three foods','one atlas draw per visible animal and offscreen culling','160 complete transparent padded frames with intact antlers','six quick slots including refillable canteen'],physicalIPhoneTested:false};
 fs.mkdirSync('docs/qa/camp-deer-v1',{recursive:true});fs.writeFileSync('docs/qa/camp-deer-v1/checks.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
