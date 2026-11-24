import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fishing-gameplay-'));
try{
 const modules=['survival-engine','fishing','fishing-catalog','fishing-rewards','fishing-site-art','fishing-site-geometry','fishing-site-placement','fishing-water-life','world-assets','world-layout','imported-art','outdoor-terrain','play-interaction','player-gear','expedition-inventory','studio-play'];
 await build({stdin:{contents:modules.map(n=>`export * from './src/${n}';`).join('\n'),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'game.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temp,'game.cjs'));
 const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));m.installImportedArt(snapshot.records);
 const layout=m.placeStillwaterFishingSite(snapshot.layout),pier=layout.items.find(p=>p.id===m.FISHING_PIER_PLACEMENT_ID);
 assert(pier,'The current production lake has its pier');
 const make=()=>{
  const w=m.createWorld(layout);w.animals=[];w.enemies=[];w.loot=[];w.breakables=[];w.editorPreview=true;w.outdoorReady=new Set(m.OUTDOOR_TILES.map(t=>t.key));
  for(const side of ['bag','chest'])for(const id of Object.keys(m.GEAR))m.gear(w)[side][id]=0;
  for(const kind of m.INVENTORY_KINDS)m.setItemCount(w,kind,0);
  return w;
 };
 const advance=(w,seconds)=>{for(let i=0;i<Math.round(seconds*60);i++){w.tick++;m.stepFishing(w,1/60)}};
 const ready=w=>{w.gear.bag.fishingRod=1;w.player.equipped='fishingRod';Object.assign(m.fishingProgress(w),{claimed:true,bait:10});return w};
 const g=m.fishingPierGeometry(pier),probe=ready(make()),standing=[];
 for(let y=g.deckBounds.y+24;y<g.deckBounds.y+g.deckBounds.height-24;y+=15)for(let x=g.deckBounds.x+24;x<g.deckBounds.x+g.deckBounds.width-24;x+=15){
  if(!m.fishingPierDeckContains(pier,x,y,24)||m.worldBlocked(probe,x,y,19))continue;
  Object.assign(probe.player,{x,y});if(!m.fishingHud(probe)?.disabled)standing.push({x,y});
 }
 assert(standing.length>=8,'There is generous actual standing room with valid casts');
 const stand=standing[Math.floor(standing.length/2)],atPier=()=>{const w=ready(make());Object.assign(w.player,stand);return w};
 const cast=(w,hold=0)=>{assert(m.pressFishingAction(w));assert.equal(w.fishingSession.phase,'aiming');advance(w,hold);const preview={...m.fishingRenderState(w).aimPreview};assert(m.releaseFishingAction(w));assert.equal(w.fishingSession.phase,'casting');assert.deepEqual(w.fishingSession.target,preview,'The released float lands on the exact displayed preview')};
 const bite=w=>{for(let i=0;i<600&&w.fishingSession?.phase!=='bite';i++)advance(w,1/60);assert.equal(w.fishingSession?.phase,'bite')};
 const playCatch=w=>{
  if(!w.fishingSession)cast(w);bite(w);assert(m.pressFishingAction(w));m.releaseFishingAction(w);assert.equal(w.fishingSession.phase,'reeling');
  const start=w.tick;let warningAt=0,lastBehavior='calm';
  for(let i=0;i<3600&&w.fishingSession;i++){
   const s=w.fishingSession;
   if(s.phase==='reeling'){
    if(s.fightBehavior!==lastBehavior){
     if(s.fightBehavior==='warning')warningAt=w.tick;
     if(s.fightBehavior==='surge')assert((w.tick-warningAt)/60>=.8,'Every strong pull has at least 0.8 seconds of visible warning');
     lastBehavior=s.fightBehavior;
    }
    const ease=s.fightBehavior==='warning'||s.fightBehavior==='surge'||s.tension>.68;
    if(s.holding&&ease)m.releaseFishingAction(w);
    else if(!s.holding&&!ease&&s.tension<.6)m.pressFishingAction(w);
   }
   advance(w,1/60);
   if(w.fishingSession?.phase==='reeling')assert(m.fishingOpenWater(w,w.fishingSession.fish,26),'The hooked fish remains in lake water');
  }
  assert(w.fishing.pendingCatch,'Reeling and easing off can land the actual fish');
  return (w.tick-start)/60;
 };

 // Tackle is a real discoverable interaction with one capacity-aware award.
 const claim=make(),box=m.fishingTackleTargets(claim)[0];assert(box);
 let claimSpot;
 for(let radius=22;radius<=54&&!claimSpot;radius+=8)for(let a=0;a<Math.PI*2;a+=Math.PI/8){
  const position={x:box.x+Math.cos(a)*radius,y:box.y+Math.sin(a)*radius};
  if(m.worldBlocked(claim,position.x,position.y,19))continue;
  Object.assign(claim.player,position);const action=m.playInteraction(claim);
  if(action?.key.startsWith('fishing-tackle:')){claimSpot=position;break}
 }
 assert(claimSpot,'Player can reach the painted tackle box without clipping scenery');
 m.setItemCount(claim,'fuel',300);assert(!m.claimFishingTackle(claim,pier.id));assert(!claim.fishing.claimed);assert(!m.hasGear(claim,'fishingRod'));
 m.setItemCount(claim,'fuel',0);assert(m.playInteraction(claim).perform());assert.equal(claim.fishing.bait,10);assert.equal(claim.gear.bag.fishingRod,1);assert.equal(claim.player.equipped,'fishingRod');
 assert(!m.claimFishingTackle(claim,pier.id));assert.equal(claim.gear.bag.fishingRod,1);
 const stored=make();Object.assign(stored.player,claimSpot);stored.gear.chest.fishingRod=1;assert(m.claimFishingTackle(stored,pier.id));assert(!stored.gear.bag.fishingRod,'Claim cannot duplicate a rod already in storage');

 // Replenishable damp reed beds are reachable from the bank, not from water.
 claim.fishing.bait=1;let baitSite;
 for(const target of m.fishingBaitTargets(claim)){
  for(let radius=0;radius<60&&!baitSite;radius+=10)for(let a=0;a<Math.PI*2;a+=Math.PI/8){
   const position={x:target.x+Math.cos(a)*radius,y:target.y+Math.sin(a)*radius};if(m.worldBlocked(claim,position.x,position.y,19))continue;
   Object.assign(claim.player,position);const action=m.playInteraction(claim);if(action?.key.startsWith('fishing-bait:')&&!action.disabled){baitSite={target,position};break}
  }
 }
 assert(baitSite,'A dry bank approach can gather worms beside the reeds');assert(m.gatherFishingBait(claim,baitSite.target.id));assert.equal(claim.fishing.bait,5);assert(!m.gatherFishingBait(claim,baitSite.target.id));advance(claim,45);assert(m.gatherFishingBait(claim,baitSite.target.id));assert.equal(claim.fishing.bait,9);

 // Canceled casts, retrieval and out-of-range attempts cannot spend bait.
 const canceled=atPier();assert(m.pressFishingAction(canceled));advance(canceled,.6);m.releaseFishingAction(canceled,true);assert(!canceled.fishingSession);assert.equal(canceled.fishing.bait,10);assert.equal(canceled.fishing.attempts,0);
 cast(canceled);const committed=canceled.fishingSession,ambient=m.fishingFishPosition(m.fishingFishSchool(pier)[committed.fishIndex],canceled.tick/60);
 assert(Math.hypot(ambient.x-committed.fish.x,ambient.y-committed.fish.y)<1e-7,'The reserved fish starts exactly at its visible ambient pose');assert.equal(committed.fish.variant,m.fishingFishSchool(pier)[committed.fishIndex].variant);assert.equal(committed.weight,m.fishingAmbientFishWeight(m.fishingFishSchool(pier)[committed.fishIndex],committed.fishIndex));
 advance(canceled,1);assert(m.pressFishingAction(canceled));assert(!canceled.fishingSession);assert.equal(canceled.fishing.bait,10);
 const far=atPier();Object.assign(far.player,{x:1800,y:1800});assert(!m.pressFishingAction(far));assert(m.fishingHud(far).disabled);
 const short=atPier(),long=atPier();cast(short);cast(long,1.2);assert(long.fishingSession.charge>short.fishingSession.charge);assert(m.fishingOpenWater(long,long.fishingSession.target,32));
 const reduced=atPier();reduced.tick=1200;reduced.weather={...reduced.weather,reducedMotion:true};cast(reduced);const frozen=m.fishingFishPosition(m.fishingFishSchool(pier)[reduced.fishingSession.fishIndex],0);assert(Math.hypot(frozen.x-reduced.fishingSession.fish.x,frozen.y-reduced.fishingSession.fish.y)<1e-7,'Reduced motion reserves the visible frozen fish rather than a hidden moving pose');

 // A bite spends one worm. Missing it or constantly pulling can lose a fish.
 const missed=atPier();cast(missed);bite(missed);assert.equal(missed.fishing.bait,9);advance(missed,4);assert(!missed.fishingSession);assert(!missed.fishing.pendingCatch);assert.equal(missed.fishing.bait,9);
 const snapped=atPier();cast(snapped);bite(snapped);m.pressFishingAction(snapped);m.releaseFishingAction(snapped);m.pressFishingAction(snapped);advance(snapped,14);assert(!snapped.fishing.pendingCatch);assert.equal(snapped.bag.rawFish,0);assert.equal(snapped.fishing.bait,9);

 // Adaptive hold/release wins. Full pack does not discard the undecided fish.
 const landed=atPier(),fightSeconds=playCatch(landed),caught=landed.fishing.pendingCatch;
 assert.equal(landed.fishing.bait,9);assert.equal(landed.bag.rawFish,0);assert(m.fishingHud(landed).active);assert(m.fishingHud(landed).disabled);
 m.setItemCount(landed,'fuel',290);assert(!m.fishingHud(landed).canKeep);assert(!m.resolveFishingCatch(landed,true));assert.equal(landed.fishing.pendingCatch,caught);
 landed.player.equipped=null;assert.equal(m.fishingHud(landed).phase,'caught','Pending catch stays actionable when unequipped');m.stopFishing(landed);assert(landed.fishing.pendingCatch);
 const rewards=m.fishingCatchRewards(caught);m.setItemCount(landed,'fuel',0);assert(m.resolveFishingCatch(landed,true));for(const reward of rewards)assert.equal(m.itemCount(landed,reward.kind),reward.count);assert.equal(landed.fishing.kept,1);assert.equal(landed.fishing.caught,1);assert(!m.resolveFishingCatch(landed,true));for(const reward of rewards)assert.equal(m.itemCount(landed,reward.kind),reward.count);
 const released=atPier();playCatch(released);assert(m.resolveFishingCatch(released,false));assert.equal(released.bag.rawFish,0);assert.equal(released.fishing.released,1);assert.equal(released.fishing.caught,1);assert(!m.resolveFishingCatch(released,false));

 // Both motor/timing assists use the same bite and fight rules.
 const assist=atPier();m.setFishingAssist(assist,{autoHook:true,toggleReel:true});cast(assist);advance(assist,6);assert.equal(assist.fishingSession.phase,'reeling');assert.equal(assist.fishing.bait,9);
 assert(m.pressFishingAction(assist));m.releaseFishingAction(assist);assert(assist.fishingSession.holding);assert(m.pressFishingAction(assist));m.releaseFishingAction(assist);assert(!assist.fishingSession.holding);
 m.pressFishingAction(assist);m.releaseFishingAction(assist,true);assert(!assist.fishingSession.holding,'Lost touch always releases load even with toggle assist');

 // Movement, damage, equipment, panels, removed piers and death stop attempts.
 for(const interrupt of [w=>m.movePlayer(w,{x:1,y:0}),w=>{w.player.hp-=1},w=>{w.player.equipped=null},w=>{w.stationPanel='fire'},w=>{w.layout={...w.layout,items:w.layout.items.filter(p=>p.id!==pier.id)}},w=>{w.phase='over'}]){
  const w=atPier();cast(w);interrupt(w);advance(w,1/60);assert(!w.fishingSession);assert.equal(w.bag.rawFish,0);
 }
 const movement=atPier();cast(movement);m.movePlayer(movement,{x:0,y:0});assert(movement.fishingSession,'Neutral input does not cancel fishing');
 m.movePlayer(movement,{x:0,y:0},true);assert(movement.fishingSession,'A persistent sprint preference does not cancel a stationary cast');
 const production=atPier();cast(production);for(let i=0;i<90;i++)m.stepCampPlaySession(production,{x:0,y:0},true,false);assert.equal(production.fishingSession?.phase,'waiting','The production simulation advances fishing with stationary sprint preference');

 // A nibble never asks for HOOK or spends bait. Only the decisive bite does.
 const nibbles=atPier();cast(nibbles);
 while(nibbles.fishingSession.phase!=='nibble')advance(nibbles,1/60);
 assert.equal(m.fishingHud(nibbles).command,'WAIT');assert.equal(m.fishingHud(nibbles).action,'WAIT');
 assert.equal(nibbles.fishing.bait,10);assert(!m.pressFishingAction(nibbles));
 const nibbleEvent=m.fishingHud(nibbles).event;assert.equal(nibbleEvent.type,'nibble');advance(nibbles,.2);
 assert.equal(m.fishingHud(nibbles).event.id,nibbleEvent.id,'Feedback events do not repeat every rendered frame');
 bite(nibbles);assert.equal(m.fishingHud(nibbles).command,'TAP HOOK');assert.equal(nibbles.fishing.bait,9);
 assert.equal(m.fishingHud(nibbles).event.type,'bite');assert(m.fishingHud(nibbles).event.id>nibbleEvent.id);

 // The real movement API becomes aiming only while CAST is held.
 const aiming=atPier(),origin={x:aiming.player.x,y:aiming.player.y};assert(m.pressFishingAction(aiming));
 advance(aiming,.3);const beforeAim={...aiming.fishingSession.target};m.movePlayer(aiming,{x:1,y:0},true);
 assert.deepEqual({x:aiming.player.x,y:aiming.player.y},origin);assert(aiming.fishingSession.aimManual);
 assert.notEqual(aiming.fishingSession.target.x,beforeAim.x);assert(m.fishingRenderState(aiming).aimPreview);
 m.releaseFishingAction(aiming,true);assert.equal(aiming.fishing.attempts,0);assert.equal(aiming.fishing.bait,10);
 let invalidAim=false;
 for(const direction of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]){
  const w=atPier();assert(m.pressFishingAction(w));advance(w,1.2);
  for(let i=0;i<100;i++){m.movePlayer(w,direction);advance(w,1/60)}
  if(!w.fishingSession.castValid){assert.equal(m.fishingHud(w).command,'ADJUST YOUR AIM');assert(!m.releaseFishingAction(w));assert.equal(w.fishing.attempts,0);assert.equal(w.fishing.bait,10);invalidAim=true;break}
 }
 assert(invalidAim,'Invalid landing points are shown and cannot spend a cast or worm');

 // Drive the production aiming handler toward an actual visible animal.
 const aimAt=(w,target)=>{
  if(!m.pressFishingAction(w))return false;advance(w,1.2);
  for(let i=0;i<180;i++){
   const point=target(w),current=w.fishingSession.target,dx=point.x-current.x,dy=point.y-current.y,distance=Math.hypot(dx,dy);
   if(distance<2.5&&w.fishingSession.aimManual)break;
   m.movePlayer(w,{x:dx/Math.max(1,distance),y:dy/Math.max(1,distance)});advance(w,1/60);
  }
  const preview={...m.fishingRenderState(w).aimPreview},committed=m.releaseFishingAction(w);
  if(committed)assert.deepEqual(w.fishingSession.target,preview,'A deliberate cast cannot move its preview on release');
  return committed;
 };
 const school=m.fishingFishSchool(pier),speciesTimes={};
 for(const species of ['perch','carp','pike']){
  let w;
  for(const point of standing.filter((_,index)=>index%8===0)){
   for(let index=0;index<school.length;index++){
    if(school[index].species!==species)continue;
    const candidate=atPier();Object.assign(candidate.player,point);
    if(aimAt(candidate,world=>m.fishingFishPosition(school[index],world.tick/60))&&candidate.fishingSession.species===species){w=candidate;break}
   }
   if(w)break;
  }
  assert(w,`A player can deliberately aim for a visible ${species}`);
  const animal=school[w.fishingSession.fishIndex],visual=w.fishingSession.fish;
  assert.equal(visual.size,animal.size);assert.equal(w.fishingSession.weight,m.fishingAmbientFishWeight(animal,w.fishingSession.fishIndex));
  speciesTimes[species]=playCatch(w);const caught=w.fishing.pendingCatch;
  assert.equal(caught.species,species);assert.equal(caught.portions,m.fishingPortions(species,caught.kg));
  assert(m.fishingFishUnavailable(w,caught.pierId,caught.fishIndex),'The held animal cannot also appear in its ambient school');
  assert(m.resolveFishingCatch(w,false));w.player.equipped=null;
  const aftermath=m.fishingRenderState(w).aftermath;assert.equal(aftermath.kind,'release');assert.equal(aftermath.fish.species,species);
  assert.deepEqual(aftermath.to,caught.water);advance(w,2.3);assert(!m.fishingFishUnavailable(w,caught.pierId,caught.fishIndex));
 }
 assert(Object.values(speciesTimes).every(seconds=>seconds>=11&&seconds<=22),'Normal species fights stay short, including their landing animation');
 const feeding=atPier(),spotBefore=m.fishingFeedingSpots(feeding).find(spot=>spot.kind==='fish');feeding.tick=m.FISHING_FEEDING_SECONDS*60;
 const spotAfter=m.fishingFeedingSpots(feeding).find(spot=>spot.kind==='fish');assert.notEqual(spotBefore.fishIndex,spotAfter.fishIndex,'Feeding activity moves between actual visible fish');

 // The rare metal clue is optional, visible, physically reachable and distinct from fish.
 let salvageWorld;
 for(let epoch=0;epoch<100&&!salvageWorld;epoch++){
  const scout=atPier();scout.tick=epoch*m.FISHING_FEEDING_SECONDS*60;const spot=m.fishingFeedingSpots(scout).find(spot=>spot.kind==='salvage');if(!spot)continue;
  for(const point of standing.filter((_,index)=>index%8===0)){
   const candidate=atPier();candidate.tick=scout.tick;Object.assign(candidate.player,point);
   if(aimAt(candidate,()=>spot)&&candidate.fishingSession.species==='drone'){salvageWorld=candidate;break}
  }
 }
 assert(salvageWorld,'A visible rare drone clue can be deliberately cast onto');assert.equal(salvageWorld.fishingSession.fishIndex,-1);
 const salvageSeconds=playCatch(salvageWorld),drone=salvageWorld.fishing.pendingCatch;assert.equal(drone.species,'drone');assert.equal(drone.isRecord,false);
 assert(m.resolveFishingCatch(salvageWorld,true));assert.equal(m.itemCount(salvageWorld,'scrap'),6);assert.equal(m.itemCount(salvageWorld,'ironOre'),2);
 assert(!m.fishingFeedingSpots(salvageWorld).some(spot=>spot.kind==='salvage'),'A recovered drone cannot be farmed again in the same feeding window');

 const report={result:'pass',standingSpots:standing.length,castStanding:stand,tackleStanding:claimSpot,baitStanding:baitSite.position,fightSeconds,speciesTimes,salvageSeconds,checks:['actual tackle claim and capacity','reachable renewable bait','safe water and visible fish continuity','hold/release/cancel casting','bite bait accounting','missed bite and snapped line','playable reel/ease loop','bag-full retention and one catch award','release without inventory grant','timing and motor assists','movement/damage/menu/equipment cancellation','real left-stick aiming and invalid landing feedback','WAIT nibbles and TAP HOOK bites with one-shot events','three deliberately targeted species and size/weight continuity','telegraphed variable fights and short catch times','release animation and hidden held fish','shifting feeding spots','visible rare drone and atomic salvage']};
 console.log(JSON.stringify(report));
 if(process.argv[2]){fs.mkdirSync(path.dirname(process.argv[2]),{recursive:true});fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n')}
}finally{fs.rmSync(temp,{recursive:true,force:true})}
