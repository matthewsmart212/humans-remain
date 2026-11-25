import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'patch-quest-'));
try{
 await build({stdin:{contents:[
  ...['patch-quest','patch-chat','patch-map','patch-placement','studio-play','survival-engine','imported-art','loot-chest','run-save','scene-travel','world-scenes','world-layout','world-assets','layout-views','field-kit','station-access','camp-gates'].map(id=>`export * from './src/${id}';`),
  "export * from './native/run-save-store';",
 ].join('\n'),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temporary,'model.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temporary,'model.cjs'));
 const authored=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));m.installImportedArt(authored.records);
 const layout=m.placePatchMaintenanceStation(authored.layout),site=m.patchQuestSite(layout);assert(site,'Authored station must be installed');
 const fresh=()=>m.createCampPlaySession(layout,undefined,'survival');
 const step=(w,n=1,input={x:0,y:0})=>{for(let i=0;i<n;i++){w.tick++;m.stepPatchQuest(w,input)}};
 const playerAt=(w,p)=>Object.assign(w.player,{x:p.x,y:p.y,hp:100,hurtUntil:0,downedUntil:0});
 const world=fresh(),q=m.ensurePatchQuest(world),originalLayout=JSON.stringify(world.layout);
 assert(q&&!q.noteRead&&!q.discovered&&!q.servoClaimed&&!q.servoInstalled);
 assert.equal(m.patchStatus(world).title,'P-04');
 assert.equal(m.patchMapLead(world),undefined,'No map spoiler on a new run');
 assert(m.PATCH_NOTE_TEXT.includes('I am going to try there.'),'The note precedes the stranding');
 assert(m.PATCH_NOTE_TEXT.endsWith('P-04'));

 // Find the guaranteed part first, with an already overloaded bag. Neither
 // a quest item nor the note consumes an inventory slot or weight allowance.
 world.bag.pallets=999;playerAt(world,site.locker);
 assert(m.claimPatchServo(world));assert(!m.claimPatchServo(world),'No duplicate servo');
 assert(q.servoClaimed&&!q.discovered&&!q.noteRead);
 assert.deepEqual(m.patchMapLead(world),{...site.approach,label:'Maintenance station'});
 assert.equal(world.bag.pallets,999);assert.equal(m.beginPatchRepair(world),false);
 playerAt(world,{x:site.robot.x,y:site.robot.y+45});
 assert(m.inspectPatch(world));assert(q.discovered&&!q.noteRead);
 assert(m.beginPatchRepair(world),'No hammer or workshop is required');m.holdPatchRepair(world,true);step(world,120);
 assert(m.patchRepairProgress(world)>.3&&!q.servoInstalled);
 step(world,1,{x:1,y:0});assert(!world.patchRepair&&q.servoClaimed&&!q.servoInstalled,'Movement cancels without consuming');
 assert(m.beginPatchRepair(world));m.holdPatchRepair(world,true);step(world,60);world.player.hp-=1;step(world);
 assert(!world.patchRepair&&!q.servoInstalled,'Damage cancels the hold');world.player.hp=100;
 assert(m.beginPatchRepair(world));m.holdPatchRepair(world,true);step(world,60);m.holdPatchRepair(world,false);
 assert(!world.patchRepair&&!q.servoInstalled,'Release never leaves a background hold');
 assert(m.beginPatchRepair(world));m.holdPatchRepair(world,true);step(world,359);assert(!q.servoInstalled);
 step(world);assert(q.servoInstalled&&!world.patchRepair);assert(!m.beginPatchRepair(world),'The repair cannot be paid twice');
 assert(m.recruitPatch(world));assert(!m.recruitPatch(world));assert.equal(q.command,'follow');
 assert.equal(m.patchStatus(world).title,'P-04','The nickname waits for homecoming');
 const campLead=m.campLootChest(world);
 assert.deepEqual(m.patchMapLead(world),{x:campLead.x,y:campLead.y+78,label:'Camp chest'});

 // Follow the real authored route around Stillwater and over its bridge.
 // The test survivor opens the real camp gates before walking home; the NPC
 // never receives a teleport or collision exemption for water/structures.
 for(const p of m.layoutViews(world.layout).gates)(world.gateMotions??={})[p.id]={amount:1,target:1};
 const chest=m.campLootChest(world),home={x:chest.x,y:chest.y+78};
 const route=m.pathTo(world.player,home,world,Infinity,31);assert(route.length>20,'This is an actual outdoor route');route.push(home);
 let routeIndex=0,walked=0,stalled=0,lastDistance=Infinity;
 for(let tick=0;tick<18000&&!q.suppliesDelivered;tick++){
  const target=route[routeIndex];
  if(target){
   const dx=target.x-world.player.x,dy=target.y-world.player.y,d=Math.hypot(dx,dy);
   if(d<10){routeIndex++;stalled=0;lastDistance=Infinity}
   else{
    if(d>=lastDistance-.01)stalled++;else stalled=0;lastDistance=d;
    assert(stalled<120,`Survivor route stalled at ${routeIndex}: ${JSON.stringify({target,player:{x:world.player.x,y:world.player.y},home,blocked:m.worldBlocked(world,target.x,target.y,19),robot:q.position,delivered:q.suppliesDelivered})}`);
    m.moveBody(world,world.player,dx/d*Math.min(285/60,d),dy/d*Math.min(285/60,d));walked++;
   }
  }
  const before={...q.position};step(world);
  assert(!m.worldBlocked(world,q.position.x,q.position.y,15),'Patch stays on clear physical ground');
  assert(Math.hypot(q.position.x-before.x,q.position.y-before.y)<=470/60+.01,'Recovery does not teleport');
 }
 assert(q.suppliesDelivered&&q.returnedToCamp,'The companion reaches the chest over the authored route');
 assert.equal(m.patchSpeech(world),'Shelter occupied.');
 assert.equal(world.notice,'This time, someone brought the rescuer home.');
 assert.deepEqual(m.patchMapLead(world),{...q.position,label:'Patch'});
 assert.equal(m.patchStatus(world).title,'Patch');assert.equal(q.command,'stay');
 assert.equal(world.bag.pallets,999,'The parcel remains outside a full bag');
 let contents=m.lootChestContents(world,m.LOOT_CHEST_ID);assert.equal(contents.pallets,2);assert.equal(contents.scrap,2);
 const emptied=fresh(),emptiedState=m.ensurePatchQuest(emptied);
 Object.assign(emptiedState,{discovered:true,servoClaimed:true,servoInstalled:true,recruited:true,position:{...home}});
 emptied.lootChests={[m.LOOT_CHEST_ID]:{openedAt:0,rewardVersion:2,menuShown:true}};
 playerAt(emptied,site.approach);assert(!m.deliverPatchSupplies(emptied),'Homecoming waits for the survivor to be there');
 playerAt(emptied,home);assert(m.deliverPatchSupplies(emptied));assert.deepEqual(emptied.lootChests[m.LOOT_CHEST_ID].contents,{pallets:2,scrap:2});
 assert(!m.deliverPatchSupplies(world));step(world,120);assert.equal(contents.pallets,2);assert.equal(contents.scrap,2);
 assert.equal(JSON.stringify(world.layout),originalLayout,'Runtime progress never mutates the editor layout');

 // All commands are physical. Stay is stable, and Return uses the walked
 // ground trail even when the camera's texture-stream mask is elsewhere.
 playerAt(world,q.position);assert(m.commandPatch(world,'follow'));
 assert.equal(m.patchMapLead(world),undefined,'Nearby followers leave the atlas clear');
 assert.deepEqual(m.patchMapLead({...world,player:{...world.player,...site.approach}}),{...q.position,label:'Patch'},'A separated follower can be located again');
 const away=m.pathTo(world.player,site.approach,world,Infinity,31).slice(0,15);assert(away.length);
 for(const target of away){for(let i=0;i<180;i++){
  const dx=target.x-world.player.x,dy=target.y-world.player.y,d=Math.hypot(dx,dy);if(d<10)break;
  m.moveBody(world,world.player,dx/d*Math.min(285/60,d),dy/d*Math.min(285/60,d));step(world);
 }}
 step(world,90);playerAt(world,q.position);assert(m.commandPatch(world,'stay'));const stayed={...q.position};step(world,90);assert.deepEqual(q.position,stayed);
 assert(m.commandPatch(world,'camp'));world.outdoorReady=new Set();
 for(let i=0;i<3000&&q.command!=='stay';i++)step(world);
 world.outdoorReady=undefined;assert.equal(q.command,'stay',`Patch returns over known ground even off camera: ${JSON.stringify({pos:q.position,home,trail:q.homeTrail})}`);
 assert(Math.hypot(q.position.x-home.x,q.position.y-home.y)<80);

 // Isolate follower ergonomics from the authored world without replacing the
 // actual collision, movement, routing, interaction or quest implementation.
 const follower=(player={x:1300,y:1000},position={x:1000,y:1000})=>{
  const w=m.createWorld({...m.emptyLayout(),spawn:player});w.editorPreview=true;w.progression=structuredClone(world.progression);
  w.patchQuest={...structuredClone(q),position:{...position},command:'follow',moving:false,walkDistance:0,followTrail:[],homeTrail:[]};return w;
 };
 const corner=follower({x:1040,y:1000},{x:960,y:1000});
 const wallId='patch-corner-fixture';m.ASSET_BY_ID.set(wallId,{id:wallId,name:'Corner fixture',group:'Test',image:'/fixture.webp',crop:[0,0,20,180],anchor:[10,90],width:20,height:180,solid:true,role:'prop',body:[{x:0,y:0,hw:10,hh:90}]});
 corner.layout={...corner.layout,items:[{id:wallId,assetId:wallId,x:1000,y:1000,scale:1,solid:true,role:'prop',roof:'auto'}]};
 assert.equal(m.patchInteraction(corner),null,'A wall blocks conversation even at short straight-line distance');
 corner.player.x=970;assert(m.inspectPatch(corner));corner.player.x=1040;
 assert(!m.choosePatchChat(corner,'ask')&&!m.patchChat(corner),'A wall breaks a conversation before a stale response can be selected');
 for(let i=0;i<480;i++){step(corner);assert(!m.worldBlocked(corner,corner.patchQuest.position.x,corner.patchQuest.position.y,15))}
 assert(corner.patchQuest.position.x>1025,'The follower rounds the wall instead of stopping within 88 units on its far side');

 const catching=follower({x:1219,y:1000});let before={...catching.patchQuest.position};step(catching);
 const firstStride=Math.hypot(catching.patchQuest.position.x-before.x,catching.patchQuest.position.y-before.y);
 catching.player.x=catching.patchQuest.position.x+221;before={...catching.patchQuest.position};step(catching);
 const secondStride=Math.hypot(catching.patchQuest.position.x-before.x,catching.patchQuest.position.y-before.y);
 assert(firstStride<1&&secondStride>firstStride,'The motor takes up speed from a standstill');
 assert(Math.abs(firstStride-secondStride)<.5,'Crossing the old catch-up threshold does not abruptly switch walking speed');
 assert.equal(m.patchStatus(catching).line,'With you.');
 const settled=follower();let walkedDistance=0;
 for(let i=0;i<180;i++){before={...settled.patchQuest.position};step(settled);walkedDistance+=Math.hypot(settled.patchQuest.position.x-before.x,settled.patchQuest.position.y-before.y)}
 const gap=Math.hypot(settled.player.x-settled.patchQuest.position.x,settled.player.y-settled.patchQuest.position.y);
 assert(gap>80&&gap<=91,'The intentional stand-off leaves the tool action available');
 assert.equal(m.patchInteraction(settled),null);
 assert(Math.abs(settled.patchQuest.walkDistance-walkedDistance%112)<1e-6,'Walking frames remain driven by actual ground travel');
 const rest={...settled.patchQuest.position},restGait=settled.patchQuest.walkDistance;step(settled,90);
 assert.deepEqual(settled.patchQuest.position,rest);assert.equal(settled.patchQuest.walkDistance,restGait);assert(!settled.patchQuest.moving,'Settled feet do not creep or cycle the gait');
 settled.player.x=settled.patchQuest.position.x+76;step(settled,30);assert.deepEqual(settled.patchQuest.position,rest,'Patch does not back away when approached');
 assert.equal(m.patchInteraction(settled)?.target,'robot');assert(m.commandPatch(settled,'stay'));
 assert.equal(m.patchStatus(settled).line,'I will wait here.','Waiting away from camp does not claim shelter occupancy');
 const talking=follower({x:1040,y:1000});talking.patchQuest.command='camp';talking.patchQuest.homeTrail=[{x:700,y:1000}];
 assert.equal(m.patchStatus(talking).line,'On my way home.');
 talking.patchQuest.moving=true;talking.patchQuest.direction='left';
 assert(m.inspectPatch(talking));assert(!talking.patchQuest.moving,'Starting a conversation plants both feet while the simulation continues');
 assert.equal(talking.patchQuest.direction,'right','A repaired Patch turns to the person he is talking to');
 const talkingPosition={...talking.patchQuest.position};step(talking,90);
 assert.deepEqual(talking.patchQuest.position,talkingPosition,'Opening conversation pauses Return to camp without changing its command');
 assert.equal(talking.patchQuest.command,'camp');m.closePatchChat(talking);step(talking,30);
 assert(talking.patchQuest.position.x<talkingPosition.x,'Closing conversation resumes the selected command');
 const signalling=fresh();let pulses=0,lit=false;
 for(let tick=0;tick<324;tick++){signalling.tick=tick;const next=m.patchBeacon(signalling)>.5;if(next&&!lit)pulses++;lit=next}
 assert.equal(pulses,3,'The unrepaired beacon matches the three-flash clue');
 signalling.weather={reducedMotion:true};const steady=m.patchBeacon(signalling);
 for(const tick of [0,54,108,250]){signalling.tick=tick;assert.equal(m.patchBeacon(signalling),steady,'Reduced motion keeps the beacon steady')}

 // Reading after recruitment never resets discovery or unique grants.
 playerAt(world,{x:chest.x,y:chest.y+45});world.lootChestId=m.LOOT_CHEST_ID;world.stationPanel='rare-cache';
 assert(m.readPatchNote(world));assert(q.noteRead&&q.suppliesDelivered&&q.servoInstalled);
 const missing=fresh();missing.layout={...missing.layout,items:missing.layout.items.filter(p=>p.id!==m.PATCH_STATION_PLACEMENT_ID)};
 const missingChest=m.campLootChest(missing);missing.lootChests={[m.LOOT_CHEST_ID]:{openedAt:0,menuShown:true,rewardVersion:2,contents:{}}};
 missing.lootChestId=m.LOOT_CHEST_ID;missing.stationPanel='rare-cache';playerAt(missing,{x:missingChest.x,y:missingChest.y+45});
 assert(m.readPatchNote(missing),'Owner removal cannot hide the paper');assert.equal(m.patchMapLead(missing),undefined,'No ghost lead for missing scenery');assert(!m.patchInteraction({...missing,stationPanel:undefined}));

 // Exercise the same primary-action controller and simulation loop that both
 // web and native use, including the opening/reveal and range guards.
 const integrated=fresh(),controller=new m.FieldKitController();
 integrated.enemies=[];integrated.animals=[];integrated.loot=[];integrated.survivalEnabled=false;
 const liveStep=(n=1,input={x:0,y:0})=>{for(let i=0;i<n;i++)m.stepCampPlaySession(integrated,input,false,false)};
 const integratedChest=m.campLootChest(integrated);playerAt(integrated,{x:integratedChest.x,y:integratedChest.y+45});
 let shown=controller.sample(integrated).action;assert(shown.key.startsWith('rare-chest:'));assert(controller.press(integrated,shown));controller.release();
 liveStep(m.LOOT_CHEST_OPEN_TICKS+m.LOOT_CHEST_REVEAL_HOLD_TICKS);assert.equal(integrated.stationPanel,'rare-cache');
 assert(m.readPatchNote(integrated));assert.deepEqual(m.patchMapLead(integrated),{...site.approach,label:'Maintenance station'});
 const preservedWaypoint={x:270,y:300,sceneId:'camp'};integrated.waypoint=preservedWaypoint;
 const staged=fresh();m.ensurePatchQuest(staged);playerAt(staged,site.robot);m.inspectPatch(staged);
 assert.deepEqual(m.patchMapLead(staged),{...site.locker,label:'Service locker'});
 m.closePatchChat(staged);playerAt(staged,site.locker);m.claimPatchServo(staged);
 assert.deepEqual(m.patchMapLead(staged),{...site.robot,label:'P-04'});
 assert.equal(m.patchMapLead({...staged,scene:{id:'bunker'}}),undefined,'Camp leads stay outdoors');
 integrated.stationPanel='patch-note';assert(m.atStation(integrated));
 controller.sample(integrated);assert.equal(integrated.stationPanel,'patch-note','Paper stays open beside its chest');
 integrated.player.x+=500;controller.sample(integrated);assert.equal(integrated.stationPanel,undefined,'The paper closes outside chest range');
 playerAt(integrated,site.locker);shown=controller.sample(integrated).action;
 assert.equal(shown.key,'patch:locker');assert(controller.press(integrated,shown));controller.release();
 playerAt(integrated,{x:site.robot.x,y:site.robot.y+45});shown=controller.sample(integrated).action;
 assert.equal(shown.label,'INSPECT');assert(controller.press(integrated,shown));controller.release();
 assert.equal(integrated.stationPanel,undefined);assert(!m.atStation(integrated));assert(m.patchChat(integrated));
 const startedX=integrated.player.x;liveStep(3,{x:1,y:0});assert(integrated.player.x>startedX,'Player movement continues during a conversation');assert(m.patchChat(integrated));
 integrated.player.x+=300;liveStep();assert(!m.patchChat(integrated),'Walking away ends the live exchange');
 playerAt(integrated,{x:site.robot.x,y:site.robot.y+45});shown=controller.sample(integrated).action;
 assert.equal(shown.label,'TALK');assert(controller.press(integrated,shown));controller.release();
 assert(m.patchChat(integrated),'The player can still ask about the part before fitting it');m.closePatchChat(integrated);
 shown=controller.sample(integrated).repairAction;
 assert.equal(shown.key,'patch:repair');assert(shown.repair&&shown.patchRepair&&!shown.disabled);
 assert(controller.pressRepair(integrated,shown));assert(controller.holdingRepair);liveStep(90);
 assert.equal(controller.sample(integrated).repairAction.target.detail,'Opening the drive housing');
 assert.equal(controller.sample(integrated).repairAction.label,'HOLD');assert(m.patchRepairProgress(integrated)>.24);
 controller.release();assert(!integrated.patchRepair&&!integrated.patchQuest.servoInstalled);
 shown=controller.sample(integrated).repairAction;assert(controller.pressRepair(integrated,shown));liveStep(30);controller.cancel();
 assert(!integrated.patchRepair,'Input reset/background cancellation cannot retain a held repair');
 shown=controller.sample(integrated).repairAction;assert(controller.pressRepair(integrated,shown));liveStep(180);assert.equal(controller.sample(integrated).repairAction.target.detail,'Seating the servo');
 liveStep(179);assert.equal(controller.sample(integrated).repairAction.target.detail,'Calibrating the joint');assert(!integrated.patchQuest.servoInstalled);
 liveStep();assert(integrated.patchQuest.servoInstalled&&!integrated.patchRepair);controller.release();
 assert.equal(controller.sample(integrated).action.key,'patch:robot');
 assert.equal(integrated.waypoint,preservedWaypoint,'The chapter never replaces the player’s navigation pin');
 integrated.phase='over';assert.equal(m.patchInteraction(integrated),null);assert(!m.recruitPatch(integrated));

 // The published camp now has permanent road openings. Owner-authored and
 // older saves can retain the real retired gate geometry: that closing gate
 // must also wait for the companion's feet, without allowing shut-gate travel.
 const gated=fresh(),gatedState=m.ensurePatchQuest(gated),gateArt=JSON.parse(fs.readFileSync('src/camp-perimeter-art.json','utf8')).find(a=>a.gate);assert(gateArt);
 if(!m.ASSET_BY_ID.has(gateArt.id))m.ASSET_BY_ID.set(gateArt.id,{...gateArt,crop:[0,0,...gateArt.size],anchor:gateArt.anchor.map((v,i)=>v*gateArt.size[i]),perimeter:'gate',role:'prop',body:[],solid:true});
 const gate={id:'patch-gate-fixture',assetId:gateArt.id,x:site.approach.x+800,y:site.approach.y,scale:1,solid:true,role:'prop'};
 gated.layout={...gated.layout,items:[...gated.layout.items,gate]};
 Object.assign(gatedState,{discovered:true,servoClaimed:true,servoInstalled:true});
 const leaf=m.gateColliders(gate,0).find(c=>c.id.endsWith(':leaf-closed'));assert(leaf);
 gated.enemies=[];gated.animals=[];playerAt(gated,site.approach);gatedState.position={x:(leaf.x+leaf.ex)/2,y:(leaf.y+leaf.ey)/2};
 gated.gateMotions={[gate.id]:{amount:1,target:0,held:true,clearFor:0}};
 for(let i=0;i<60;i++)m.stepGates(gated,1/60);assert.equal(gated.gateMotions[gate.id].amount,1);
 gatedState.position={...site.robot};for(let i=0;i<20;i++)m.stepGates(gated,1/60);assert.equal(gated.gateMotions[gate.id].amount,0);

 // Real production serializers retain the exact milestones/trails and reject
 // corrupt linked states. Native and web both discard a held repair input.
 const travel=new m.SceneTravel(world,{pin(){},prepare:async()=>{},ready:()=>true});
 world.patchRepair={worked:2,duration:6,held:true,updatedAt:world.tick/60,origin:{x:0,y:0},hp:100,hurtUntil:0};
 const encoded=m.encodeRun(travel);assert(encoded&&!encoded.includes('patchRepair'));
 const active=snapshot=>snapshot.worlds.find(([id])=>id===m.CAMP_SCENE_ID)[1];
 const loaded=active(m.decodeRun(encoded));assert.deepEqual(loaded.patchQuest,q);assert(!loaded.patchRepair);
 const values=new Map(),store=new m.NativeRunSaveStore({async getItem(key){return values.get(key)??null},async setItem(key,value){values.set(key,value)}});
 const prepared=store.prepare(travel);assert(prepared&&!prepared.text.includes('patchRepair'));await store.save(prepared);assert.equal(store.error,'');
 assert.deepEqual(active(await store.load()).patchQuest,q);
 const raw=JSON.parse(encoded),old=structuredClone(raw);delete active(old).patchQuest;
 const migrated=active(m.decodeRun(JSON.stringify(old)));assert(migrated.patchQuest&&!migrated.patchQuest.noteRead&&!migrated.patchQuest.servoClaimed,'An older run gains fresh optional quest facts');
 for(const corrupt of [
  v=>v.version=2,v=>v.position.x=NaN,v=>v.servoClaimed=false,v=>v.discovered=false,v=>v.servoInstalled=false,
  v=>v.recruited=false,v=>v.returnedToCamp=false,v=>v.command='fly',v=>v.homeTrail=[{x:1e9,y:0}],v=>v.followTrail=null,
 ]){const bad=structuredClone(raw);corrupt(active(bad).patchQuest);assert.throws(()=>m.decodeRun(JSON.stringify(bad)),/Patch|patch|companion|incomplete|supported/)}
 const newRun=fresh(),newState=m.ensurePatchQuest(newRun);assert(!newState.noteRead&&!newState.servoClaimed&&!newState.suppliesDelivered);assert(!newRun.lootChests?.[m.LOOT_CHEST_ID]);
 console.log(`PASS: stage-aware atlas leads, separate conversation and repair controls, staged feedback, homecoming, out-of-order note/discovery/servo, full-bag unique claims, movement/damage/release cancellation, exact six-second repair, authored bridge journey (${walked} movement ticks), physical follow/stay/return, wall-corner approach, smooth catch-up and stable tool-safe stopping, travel-driven gait, conversation pause/resume, once-only chest parcel, owner-removal paper, actual FieldKit/controller/studio-loop repair and range guards, companion gate occupancy, fresh-run reset, strict web/native round trips and transient-input omission.`);
}finally{fs.rmSync(temporary,{recursive:true,force:true})}
