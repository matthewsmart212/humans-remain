import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'survival-hud-'));
try{
 const modules=['camp-hud','field-kit','field-kit-target','studio-play','authored-world','imported-art','camp-repair-site','camp-restoration','camp-materials','expedition-inventory','building-damage','survival-engine','building-repair','camp-siege','building-condition-renderer','world-layout'];
 await build({stdin:{contents:modules.map(m=>`export * from './src/${m}';`).join('\n'),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(dir,'model.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(dir,'model.cjs')),snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
 m.installImportedArt(snapshot.records);const layout=m.prepareAuthoredWorld(snapshot.layout);
 const make=()=>{const w=m.createCampPlaySession(layout,undefined,'survival');w.tick=600;w.enemies=[];w.loot=[];w.animals=[];w.notice='';w.noticeUntil=0;w.progression.campLevel=1;w.progression.restoredBuildings=['headquarters'];w.player.equipped='repairHammer';w.player.hurtUntil=0;Object.assign(w.player,m.campRepairSite(w,'warehouse'));return w};
 const w=make(),c=new m.FieldKitController();m.setItemCount(w,'pallets',0);m.setStoredCount(w,'pallets',0);
 let a=c.sample(w).action;assert(a.disabled);assert(a.target.revealed,'Nearby repair requirements appear before pressing');assert(!m.buildingHudState(w,'warehouse'),'Idle ruins have no billboard');
 assert.equal(c.press(w,a),false,'An unavailable repair cannot spend or start work');a=c.sample(w).action;assert(a.target.revealed,'An attempted blocked action reveals its requirements');assert(a.target.blocked);assert(!m.buildingHudState(w,'warehouse'),'Inspecting an untouched ruin does not add a duplicate empty health card');assert(!w.buildingRepair);assert(!w.waypoint);
 w.player.x+=500;c.sample(w);assert(!m.buildingHudState(w,'warehouse'),'Untouched ruins hide when the interaction ends');
 Object.assign(w.player,m.campRepairSite(w,'warehouse'));m.setStoredCount(w,'pallets',4);a=c.sample(w).action;assert(!a.disabled);assert(c.press(w,a));a=c.sample(w).action;assert.equal(a.target.repairState,'holding');assert.equal(a.label,'HOLD');assert.equal(a.target.detail,'Cost: 4 logs');assert(!m.buildingHudState(w,'warehouse'),'Repair progress has one location');assert(a.target.revealed);c.release();w.tick+=1;m.stepBuildingRepair(w,{x:0,y:0});assert.equal(c.sample(w).action.label,'REPAIR');
 m.cancelBuildingRepair(w,false);w.progression.restoredBuildings.push('warehouse');w.progression.buildingHp={warehouse:180};c.reset();w.player.x+=500;w.tick+=121;c.sample(w);assert(!m.buildingHudState(w,'warehouse'),'Idle damaged buildings do not leave labels on screen');
 const tracker=new m.CampThreatTracker();w.phase='night';assert.equal(tracker.sample(w),null,'Night alone is not an attack');
 const mark={x:12,y:34,sceneId:'camp'};w.waypoint=mark;m.stepCampSiege(w);assert.deepEqual(w.waypoint,mark,'Night start preserves player-chosen navigation');assert(!w.notice.includes('Defend'));
 assert(m.damageBuilding(w,'warehouse',20));let threat=tracker.sample(w);assert(threat?.compact,'The first attack already uses the slim warning');assert.equal(threat.title,'Warehouse under attack');assert.equal(threat.detail,'Warehouse');assert(m.buildingHudState(w,'warehouse').hit);
 w.tick+=181;m.damageBuilding(w,'warehouse',2);threat=tracker.sample(w);assert(threat.compact,'Repeated hits retain the single slim warning');
 const before=c.sample(w);w.tick+=210;m.setFieldKitTarget(w,{buildingId:'warehouse',revealed:true,x:0,y:0,label:'Warehouse'});const fading=m.buildingHudState(w,'warehouse');assert(fading&&fading.alpha>0&&fading.alpha<1,'Actual damage fades even while its building is selected');w.tick+=91;assert.equal(tracker.sample(w),null,'An ended attack clears');assert(!m.buildingHudState(w,'warehouse'),'Selection cannot extend a world health bar beyond its hit tail');assert(!m.sameFieldKit(before,c.sample(w)),'Alert disappearance must reach the UI');
 m.damageBuilding(w,'headquarters',10);const hq=m.buildingHudState(w,'headquarters');assert(hq&&hq.percent<100&&hq.label==='HQ defences'&&hq.shield,'HQ shows the defence actually taking damage in one bar');
 const ruin=make();ruin.progression.campLevel=0;ruin.progression.restoredBuildings=[];const rc=new m.FieldKitController(),ra=rc.sample(ruin).action;assert.equal(ra.label,'INSPECT');assert(!rc.press(ruin,ra));assert(rc.sample(ruin).action.target.revealed);assert(!ruin.waypoint,'Inspecting a locked ruin never creates an objective waypoint');
 const next=make();next.phase='night';next.enemies=[{hp:30,siegeNight:1}];const approaching=new m.CampThreatTracker();assert.equal(approaching.sample(next).title,'Robots approaching');
 const inside=make();inside.scene={id:'bunker'};inside.enemies=[];m.setCampThreatSource(inside,next);assert.equal(new m.CampThreatTracker().sample(inside).title,'Robots approaching','Camp raids remain visible from an interior');
 next.progression.restoredBuildings.push('warehouse');m.damageBuilding(next,'warehouse',210);assert(new m.CampThreatTracker().sample(inside).critical,'Interior alerts use actual outdoor building health');
 assert.equal(approaching.sample(next).title,'Warehouse critical','One critical site is named directly');next.progression.restoredBuildings.push('well');m.damageBuilding(next,'well',10);assert.equal(approaching.sample(next).title,'Camp under attack','Multiple attacked buildings share one camp warning');

 const finished=make();finished.progression.restoredBuildings.push('warehouse');finished.notice='';finished.noticeUntil=0;
 const fc=new m.FieldKitController();m.setFieldKitTarget(finished,{buildingId:'warehouse',revealed:true,x:0,y:0,label:'Warehouse'});assert(!m.buildingHudState(finished,'warehouse'),'Healthy buildings stay quiet after repair');
 const blocked=make(),bc=new m.FieldKitController();m.setItemCount(blocked,'pallets',0);m.setStoredCount(blocked,'pallets',0);bc.press(blocked,bc.sample(blocked).action);assert(bc.sample(blocked).action.target.revealed);blocked.tick+=241;assert(bc.sample(blocked).action.target.revealed,'Repair help stays visible while standing nearby');
 m.setItemCount(finished,'pallets',60);assert.notEqual(fc.sample(finished).loadLabel,'Comfortable');assert.equal(fc.sample(finished).notice,'','Weight stays on the bag button, not the world');
 m.damageBuilding(next,'warehouse',100);const destroyed=approaching.sample(next);assert.equal(destroyed.title,'Warehouse destroyed');assert(destroyed.compact);assert(!m.buildingHudState(next,'warehouse'),'Destroyed structures do not retain empty health cards');assert.equal(next.notice,'','Destruction uses the same alert, not an overlapping toast');
 const completion=make(),cc=new m.FieldKitController();m.setStoredCount(completion,'pallets',4);assert(cc.press(completion,cc.sample(completion).action));for(let i=0;i<361;i++){completion.tick++;m.stepBuildingRepair(completion,{x:0,y:0})}assert(!cc.sample(completion).action.target?.revealed,'Completing a repair clears its help instead of replacing it with a sticky storage caption');
 const p=m.campBuildingPlacements(layout).find(p=>p.id==='warehouse').placement;
 for(const scale of [.5,1,2])for(const rotation of [0,30,90]){
  const place={...p,rotation},view={x:p.x-350/scale,y:p.y-200/scale,width:700/scale,height:400/scale};
  const first=m.buildingHudRect(place,scale,120,view),actor={x:first.x,y:first.y,width:first.width,height:first.height};
  const shifted=m.buildingHudRect(place,scale,120,view,[actor]);
  assert(shifted.y>=view.y+108/scale,'Health never enters the toolbar');
  assert(shifted.x+shifted.width<=actor.x||shifted.x>=actor.x+actor.width||shifted.y+shifted.height<=actor.y||shifted.y>=actor.y+actor.height,'Health moves away from actors');
 }
 next.phase='over';assert.equal(approaching.sample(next),null);
 console.log('PASS: quiet exploration, attempted blocked interactions, no duplicate ruin or repair cards, repair state/cost feedback, one-line single/multiple/critical damage alerts, selection-independent hit fade-out, compact HQ defence, preserved player waypoints, expired inspection, single destruction alert, actor-safe positioning, and ended-run cleanup.');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
