import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fishing-gameplay-'));
try{
 const modules=['survival-engine','fishing','fishing-site-art','fishing-site-geometry','fishing-site-placement','fishing-water-life','world-assets','world-layout','imported-art','outdoor-terrain','play-interaction','player-gear','expedition-inventory','studio-play'];
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
 const cast=(w,hold=0)=>{assert(m.pressFishingAction(w));assert.equal(w.fishingSession.phase,'aiming');advance(w,hold);assert(m.releaseFishingAction(w));assert.equal(w.fishingSession.phase,'casting')};
 const bite=w=>{for(let i=0;i<600&&w.fishingSession?.phase!=='bite';i++)advance(w,1/60);assert.equal(w.fishingSession?.phase,'bite')};
 const playCatch=w=>{
  cast(w);bite(w);assert(m.pressFishingAction(w));m.releaseFishingAction(w);assert.equal(w.fishingSession.phase,'reeling');
  const start=w.tick;
  for(let i=0;i<3600&&w.fishingSession;i++){
   const s=w.fishingSession;
   if(s.phase==='reeling'){
    if(s.holding&&s.tension>.68)m.releaseFishingAction(w);
    else if(!s.holding&&s.tension<.3)m.pressFishingAction(w);
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
 assert(Math.hypot(ambient.x-committed.fish.x,ambient.y-committed.fish.y)<1e-7,'The reserved fish starts exactly at its visible ambient pose');assert.equal(committed.fish.variant,0);
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
 m.setItemCount(landed,'fuel',0);assert(m.resolveFishingCatch(landed,true));assert.equal(landed.bag.rawFish,1);assert.equal(landed.fishing.kept,1);assert.equal(landed.fishing.caught,1);assert(!m.resolveFishingCatch(landed,true));assert.equal(landed.bag.rawFish,1);
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

 const report={result:'pass',standingSpots:standing.length,castStanding:stand,tackleStanding:claimSpot,baitStanding:baitSite.position,fightSeconds,checks:['actual tackle claim and capacity','reachable renewable bait','safe water and visible perch continuity','hold/release/cancel casting','bite bait accounting','missed bite and snapped line','playable reel/ease loop','bag-full retention and one catch award','release without inventory grant','timing and motor assists','movement/damage/menu/equipment cancellation']};
 console.log(JSON.stringify(report));
 if(process.argv[2]){fs.mkdirSync(path.dirname(process.argv[2]),{recursive:true});fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n')}
}finally{fs.rmSync(temp,{recursive:true,force:true})}
