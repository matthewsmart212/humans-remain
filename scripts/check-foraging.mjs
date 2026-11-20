import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'foraging-'));
try{
 await build({stdin:{contents:`export * from './src/foraging';export * from './src/field-kit-target';export * from './src/forage-art';export * from './src/crop-art';export * from './src/forage-renderer';export * from './src/forage-planting';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/world-assets';export * from './src/field-kit';export * from './src/expedition-inventory';export * from './src/food-provisions';export * from './src/authored-world';export * from './src/imported-art';export * from './src/play-interaction';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'game.cjs')});
 const m=createRequire(import.meta.url)(path.join(temp,'game.cjs'));
 const make=(kind=0)=>{
  const layout=m.emptyLayout(),p={...m.newPlacement(m.FORAGE_ART[kind].id,1600,1600),id:'plant'};layout.items=[p];layout.spawn={x:1600,y:1654};
  const w=m.createWorld(layout);w.animals=[];w.enemies=[];w.loot=[];w.breakables=[];Object.assign(w.player,layout.spawn);for(const k of Object.keys(w.gear.bag))w.gear.bag[k]=0;
  return{w,p};
 };
 const tap=(w,controller)=>{const a=controller.sample(w).action;assert(controller.press(w,a));controller.release();return a};
 const nativeRegistry=['native/forage-art.ts','native/crop-art.ts'].map(p=>fs.readFileSync(p,'utf8')).join('\n');
 for(const a of m.FORAGE_ART){
  const fruit=m.FORAGE_FRUIT_ART[a.kind],urls=[a.image,...(fruit?fruit.images:[m.cropPickedUrl(a.kind)])];
  const required=m.requiredImages([a.id]);
  for(const url of urls){
   assert.equal(required[m.assetImageKey(url)],url);
   assert(fs.existsSync('public'+url));
   assert(nativeRegistry.includes(`require('../public${url}')`),`Native bundles ${url} offline`);
  }
 }
 for(const kind of [0,1]){
  const {w,p}=make(kind),a=m.FORAGE_ART[kind],controller=new m.FieldKitController();
  w.weather={...w.weather,reducedMotion:true};
  const fruit=m.FORAGE_FRUIT_ART[a.kind],calls=[],imgs=Object.fromEntries(Object.entries(m.requiredImages([a.id])).map(([key,url])=>[key,{url}]));
  const ctx={save(){},restore(){},translate(){},scale(){},fillRect(){},createRadialGradient(){return{addColorStop(){}}},drawImage(image){calls.push(image.url)}};
  const renderedFruit=(count)=>{
   calls.length=0;
   assert(m.drawForagePlant(ctx,imgs,w,p));
   assert.deepEqual(calls,[a.image,...fruit.points.slice(0,count).map(socket=>fruit.images[socket.variation])]);
  };
  renderedFruit(a.capacity);
  for(let picked=1;picked<=a.capacity;picked++){
   const shown=controller.sample(w).action;
   assert.equal(shown.label,'PICK 1');assert.equal(shown.image,m.PROVISIONS[a.kind].image);assert(!shown.attack);assert(!shown.disabled);assert.match(shown.description,/Pick 1 /);
   assert(controller.press(w,shown));assert.equal(m.itemCount(w,a.kind),picked,'Exactly one item per press');assert.equal(m.forageRemaining(w,p),a.capacity-picked);
   renderedFruit(a.capacity-picked);
   assert(!controller.press(w,shown),'A held press cannot gather repeatedly');controller.release();assert(!m.pickForage(w,p.id),'Cooldown blocks duplicate fast taps');
   if(picked<a.capacity)assert.equal(w.forage[p.id].regrowRound,undefined,'Remaining fruit cannot regenerate during a partial harvest');
   w.tick+=Math.ceil(m.FORAGE_PICK_COOLDOWN*60)+1;
  }
  assert.equal(controller.sample(w).action.target,undefined,'Empty plants stop attracting focus');assert.equal(m.itemCount(w,a.kind),a.capacity);
  assert.equal(m.playInteraction(w),null,'No empty-plant interaction plaque');
  w.round+=a.regrowDays-1;assert.equal(m.forageRemaining(w,p),0,'Earlier dawn does not refill');
  w.round++;assert.equal(m.forageRemaining(w,p),a.capacity,'Correct dawn restores fruit');renderedFruit(a.capacity);assert(m.pickForage(w,p.id));assert.equal(m.itemCount(w,a.kind),a.capacity+1);
  assert.equal(m.playInteraction(w).target.detail,`${a.capacity-1} left`,'HUD target tracks the live count');
  const fresh=m.createWorld(w.layout);assert.equal(m.forageRemaining(fresh,p),a.capacity,'New run starts ripe');assert.equal(w.layout.items[0].remaining,undefined,'Runtime harvest cannot change the draft');
 }
 const partial=make();m.setItemCount(partial.w,'scrap',119);m.setItemCount(partial.w,'energyBar',1); // 23.88 kg: three berry portions fit, collected individually.
 assert.equal(m.canCarryCount(partial.w,'berries',4),3);
 for(let i=1;i<=3;i++){assert(m.pickForage(partial.w,'plant'));assert.equal(m.itemCount(partial.w,'berries'),i);assert.equal(m.forageRemaining(partial.w,partial.p),4-i);partial.w.tick+=30}
 assert(!m.pickForage(partial.w,'plant'));assert.equal(m.forageRemaining(partial.w,partial.p),1,'Full pack leaves remaining fruit on bush');
 m.setItemCount(partial.w,'scrap',118);assert(m.pickForage(partial.w,'plant'));assert.equal(m.itemCount(partial.w,'berries'),4);assert.equal(m.forageRemaining(partial.w,partial.p),0);
 const full=make();m.setItemCount(full.w,'scrap',120);const before=JSON.stringify(full.w.forage);assert(!m.pickForage(full.w,'plant'));assert.equal(m.forageRemaining(full.w,full.p),4);assert.equal(JSON.stringify(full.w.forage),before);assert.equal(new m.FieldKitController().sample(full.w).action.label,'PACK FULL');
 const neighbours=make();for(let i=0;i<4;i++){assert(m.pickForage(neighbours.w,'plant'));neighbours.w.tick+=30}neighbours.w.layout={...neighbours.w.layout,items:[...neighbours.w.layout.items,{...m.newPlacement(m.FORAGE_ART[0].id,1670,1600),id:'ripe-neighbour'}]};assert.equal(m.nearbyForage(neighbours.w).placement.id,'ripe-neighbour','Depleted plant cannot hide a ripe neighbour');
 const cueWorld=make(),cueController=new m.FieldKitController();m.setFieldKitTarget(cueWorld.w,cueController.sample(cueWorld.w).action.target);
 const first=cueController.sample(cueWorld.w).action.target;assert.equal(first.forageId,'plant');assert.equal(first.detail,'4 left');
 tap(cueWorld.w,cueController);const next=cueController.sample(cueWorld.w).action.target;assert.equal(next.detail,'3 left','HUD count updates after one tap, including during the pick cooldown');
 const labels=[],ctx={save(){},restore(){},translate(){},scale(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){},fill(){},fillText:t=>labels.push(t)};
 for(const scale of [.4,1,2])m.drawFieldKitTarget(ctx,cueWorld.w,scale);
 assert.equal(labels.length,0,'The interaction pin draws without a world label');
 const fullTarget=new m.FieldKitController().sample(full.w).action.target;assert(fullTarget.blocked);assert.equal(fullTarget.detail,'Backpack full');
 const distant=make();distant.w.player.y=1670;assert.equal(new m.FieldKitController().sample(distant.w).action.target,undefined,'Distant plants have no focus or labels');
 const stale=make(),c=new m.FieldKitController(),shown=c.sample(stale.w).action;stale.w.player.x+=500;assert(!c.press(stale.w,shown),'A moved-away target is revalidated');assert.equal(m.itemCount(stale.w,'berries'),0);
 const covered=make();covered.w.layout.items.push({...m.newPlacement('art_hq_storage_chest',1600,1628),id:'wall',solid:true,frame:{sourceAssetId:'art_hq_storage_chest',width:200,height:12,anchor:[.5,.5]},collision:{lineWidth:.01,paths:[{closed:true,points:[[0,0],[1,0],[1,1],[0,1]]}]}});assert.equal(m.nearbyForage(covered.w),null,'Cannot pick through a wall');assert(!m.playInteraction(covered.w)?.key.startsWith('forage:'),'No fruit focus through cover');
 for(const flag of ['axeSwing','spearThrust','swordThrust','bowShot','dodge']){const {w}=make();w[flag]={};assert(!m.pickForage(w,'plant'),flag)}
 for(const state of ['over','dead','downed','hurt','station']){const {w}=make();if(state==='over')w.phase='over';if(state==='dead')w.player.hp=0;if(state==='downed')w.player.downedUntil=50;if(state==='hurt')w.player.hurtUntil=50;if(state==='station')w.stationPanel='storage';assert(!m.pickForage(w,'plant'),state)}
 const loot=make();loot.w.loot.push({id:100,x:loot.w.player.x,y:loot.w.player.y,kind:'scrap',amount:2});assert.match(m.playInteraction(loot.w).key,/^pickup:/,'Loose loot keeps priority over picking a plant');
 const eating=make(1);assert(m.pickForage(eating.w,'plant'));eating.w.hunger=70;eating.w.thirst=80;eating.w.player.x+=500;assert(m.consumeProvision(eating.w,'apple'));assert.equal(eating.w.hunger,84);assert.equal(eating.w.thirst,86);

 const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));m.installImportedArt(snapshot.records);
 const original=JSON.stringify(snapshot.layout),layout=m.prepareAuthoredWorld(snapshot.layout),plants=layout.items.filter(p=>m.FORAGE_BY_ID.has(p.assetId));
 assert.equal(JSON.stringify(snapshot.layout),original,'Planting never edits its input');assert.equal(layout.forageVersion,1);assert.equal(m.prepareAuthoredWorld(layout),layout,'Upgrade is idempotent');
 for(const art of m.FORAGE_ART)assert(plants.some(p=>p.assetId===art.id),`Authored map includes ${art.name}`);
 assert(layout.items.length<=5000);assert.equal(m.validateLayout(layout).errors.length,0);assert.equal(m.validateLayout(layout).layout.forageVersion,1);
 assert.deepEqual(layout.items,snapshot.layout.items,'An up-to-date authored map keeps its original placements');
 const nearest=Math.min(...plants.filter(p=>p.assetId===m.FORAGE_ART[0].id).map(p=>Math.hypot(p.x-layout.spawn.x,p.y-layout.spawn.y)));assert(nearest<1000,`A first bush is discoverable near spawn: ${nearest}`);
 let accessible=0;
 const w=m.createWorld(layout);w.animals=[];w.enemies=[];w.loot=[];w.breakables=[];
 for(const p of plants){
  let clear=false;
  for(const distance of [90,70,110,50]){
   for(let i=0;i<24;i++){
    const angle=i*Math.PI/12;
    Object.assign(w.player,{x:p.x+Math.cos(angle)*distance,y:p.y+Math.sin(angle)*distance});
    if(!m.worldBlocked(w,w.player.x,w.player.y,19)&&m.nearbyForageTargets(w).some(target=>target.placement.id===p.id)){clear=true;break}
   }
   if(clear)break;
  }
  if(clear)accessible++;
 }
 assert.equal(accessible,plants.length,'Every plant has a reachable, clear picking side');
 const removed={...layout,items:layout.items.filter(p=>p.id!==plants[0].id)};assert.equal(m.prepareAuthoredWorld(removed),removed,'Removed editor plants never grow back as placements');
 console.log(`PASS: ${plants.length} accessible plants (${layout.items.length} total), fixed draft identity, nearby first bush (${Math.round(nearest)} units), one-item controller taps, single target with HUD counts and no world labels, inventory conservation, partial/full packs, no duplicate taps, day-based regrowth, stale actions, cover, combat locks and apple food/water effects.`);
}finally{fs.rmSync(temp,{recursive:true,force:true})}
