import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'patch-site-'));
try{
 const modules=['patch-placement','patch-art','world-layout','world-assets','world-bounds','authored-world',
  'imported-art','river-collision','survival-engine','outdoor-terrain'];
 await build({stdin:{contents:modules.map(name=>`export * from './src/${name}';`).join('\n'),resolveDir:process.cwd()},
  outfile:path.join(temp,'model.cjs'),bundle:true,platform:'node',format:'cjs',logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temp,'model.cjs'));
 const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));m.installImportedArt(snapshot.records);
 const ids=new Set([m.PATCH_STATION_PLACEMENT_ID,m.PATCH_LOCKER_PLACEMENT_ID]);
 const routeIds=Object.values(m.PATCH_ROUTE_IDS);
 const routeItem=p=>routeIds.some(id=>p.id===id||p.id.startsWith(id+'-'));
 const ownerItems=l=>l.items.filter(p=>!ids.has(p.id)&&!routeItem(p));
 const base=structuredClone(snapshot.layout);base.items=ownerItems(base);delete base.patchSiteVersion;delete base.patchRouteVersion;
 const original=JSON.stringify(base),layout=m.placePatchMaintenanceStation(base),site=m.patchQuestSite(layout);
 assert(site,'The published world gets the complete maintenance site');
 assert.deepEqual([site.station.x,site.station.y],[-3850,7000],'The surveyed west bank stays the first choice');
 assert.equal(layout.patchSiteVersion,1);assert.equal(layout.patchRouteVersion,1);
 const upgraded={...layout,items:layout.items.filter(p=>!routeItem(p))};delete upgraded.patchRouteVersion;
 const upgrade=m.placePatchMaintenanceStation(upgraded);
 assert.deepEqual(upgrade.items,layout.items,'Continue from the original station gains the same rescue route');
 assert.equal(m.validateLayout(layout).layout.patchRouteVersion,1);
 for(const version of [0,2,true,null])assert(m.validateLayout({...layout,patchRouteVersion:version}).errors.some(e=>/Patch route/.test(e)));
 assert.equal(JSON.stringify(base),original,'Do not mutate the original published layout');
 assert.deepEqual(ownerItems(layout),base.items,'Camp, roads, shore, bridge, trees and all existing POIs stay intact');
 assert.equal(layout.updatedAt,base.updatedAt,'Keep the owner’s publication timestamp');
 assert.equal(m.placePatchMaintenanceStation(layout),layout,'Repeated preparation is a no-op');
 assert.equal(m.prepareAuthoredWorld(layout).items.filter(p=>ids.has(p.id)).length,2,'The authored-world pipeline cannot duplicate scenery');
 assert.equal(m.validateLayout(layout).layout?.patchSiteVersion,1,'Serialization retains the installed marker');

 const edited={...layout,items:layout.items.map(p=>ids.has(p.id)?{...p,x:p.x-80,y:p.y+110,rotation:23,scale:1.2,flipX:true}:p)};
 assert.equal(m.placePatchMaintenanceStation(edited),edited,'Owner transforms and positions remain authoritative');
 // In v5 P-04 waits outside his awning. Moving the retired shed or empty
 // locker no longer moves the damaged robot or the map destination.
 assert.deepEqual(m.patchRescueSite(edited),m.patchRescueSite(layout));
 const originalShelter=m.patchRouteSite(layout,'shelter').placement;
 const movedShelter={...originalShelter,x:originalShelter.x+187,y:originalShelter.y-90,rotation:25,scale:1.35,flipX:true};
 const moved={...layout,items:layout.items.map(p=>p===originalShelter?movedShelter:p)};
 const [rx,ry]=m.placementPoint(movedShelter,movedShelter.x+88*movedShelter.scale,movedShelter.y+46*movedShelter.scale);
 const companion=m.patchRescueSite(moved);
 assert(Math.hypot(companion.robot.x-rx,companion.robot.y-ry)<1e-7,'Bedside anchor follows the actual rotated and mirrored shelter');
 const noLocker={...layout,items:layout.items.filter(p=>p!==site.lockerPlacement)};
 assert.deepEqual(m.patchRescueSite(noLocker),m.patchRescueSite(layout),'An empty locker cannot hide Patch');
 const movedHauler=m.patchRouteSite(layout,'hauler').placement;
 const editedHauler={...movedHauler,rotation:30,flipX:true,scale:1.6,frame:{sourceAssetId:movedHauler.assetId,width:440,height:215,anchor:[.45,.8]}};
 const editedYard={...layout,items:layout.items.map(p=>p===movedHauler?editedHauler:p)};
 const chassis=m.patchRouteSite(editedYard,'hauler'),art=m.ASSET_BY_ID.get(movedHauler.assetId);
 const brake=m.placementArtPoint(editedHauler,.5-120/art.width,.88+56/art.height);
 assert.deepEqual(chassis.release,brake,'Brake housing honors the owner’s frame and transforms');
 for(const kind of ['shelter','dispatch','hauler']){
  const removed={...layout,items:layout.items.filter(p=>p.id!==m.PATCH_ROUTE_IDS[kind])};
  assert.equal(m.placePatchMaintenanceStation(removed),removed,'Never replace removed chapter scenery');
  assert.equal(m.patchRouteSite(removed,kind),null,'Removed landmark has no phantom interaction');
  if(kind==='shelter')assert.equal(m.patchRescueSite(removed),null,'An empty stretch of road cannot host an unrepaired robot');
 }
 for(const remove of [[site.station.id],[site.lockerPlacement.id],[...ids]]){
  const removed={...layout,items:layout.items.filter(p=>!remove.includes(p.id))};
  assert.equal(m.placePatchMaintenanceStation(removed),removed,'Do not restore deliberately removed scenery');
  assert.equal(m.patchQuestSite(removed),null,'Removed quest scenery has no phantom interaction');
 }
 const unmarked={...edited};delete unmarked.patchSiteVersion;
 assert.deepEqual(m.placePatchMaintenanceStation(unmarked).items,edited.items,'An existing unmarked site is marked without replacing it');
 for(const version of [0,2,true,'1',null,{}]){
  const invalid={...base,patchSiteVersion:version};
  assert(m.validateLayout(invalid).errors.some(e=>/Patch site/.test(e)));
  assert.equal(m.placePatchMaintenanceStation(invalid),invalid,'Unknown version is never overwritten');
 }
 const custom={...base,terrainImage:{...base.terrainImage,url:'/survival/owner-ground.webp'}};
 assert.equal(m.placePatchMaintenanceStation(custom),custom,'Unrelated custom worlds stay unchanged');
 const obstruction=(x,y,id)=>({...base.items.find(p=>p.solid),id,x,y,scale:1,
  frame:{sourceAssetId:base.items.find(p=>p.solid).assetId,width:32,height:32,anchor:[.5,.5]},
  collision:{lineWidth:.01,paths:[{closed:true,points:[[0,0],[1,0],[1,1],[0,1]]}]}});
 const obstructed={...base,items:[...base.items,obstruction(-3620,7000,'owner-service-bay-prop')]};
 const fallback=m.placePatchMaintenanceStation(obstructed);
 assert(m.patchQuestSite(fallback),'A neighboring surveyed clearing can host the site');
 assert.notEqual(m.patchQuestSite(fallback).station.y,site.station.y,'Occupied primary site is skipped');
 assert.deepEqual(ownerItems(fallback),obstructed.items,'Never clear an obstruction by deleting the owner’s prop');
 const oldWithEdits={...upgraded,items:[...upgraded.items,
  obstruction(-3440,4720,'owner-signal-post-prop'),obstruction(-4910,-2610,'owner-cable-works-prop')]};
 const rerouted=m.placePatchMaintenanceStation(oldWithEdits);
 assert.equal(rerouted.patchRouteVersion,1,'Both remote workstations have alternate published-road clearings');
 assert.notEqual(m.patchRouteSite(rerouted,'dispatch').placement.x,-3440);
 assert.notEqual(m.patchRouteSite(rerouted,'hauler').placement.x,-4910);
 assert.deepEqual(rerouted.items.slice(0,oldWithEdits.items.length),oldWithEdits.items);
 const blocked={...base,items:[...base.items,...m.PATCH_SURVEYED_SITES.map((p,i)=>obstruction(p.x,p.y,'owner-blocked-'+i))]};
 assert.equal(m.placePatchMaintenanceStation(blocked),blocked,'Defer when every surveyed clearing is occupied');

 const world=m.createWorld(layout);world.editorPreview=true;world.outdoorReady=new Set(m.OUTDOOR_TILES.map(t=>t.key));
 const routes=[];
 for(const key of ['robot','locker','approach']){
  const target=site[key];
  assert(!m.worldBlocked(world,target.x,target.y,24),`${key} has a full-body dry approach`);
  assert(!m.riverWaterBlocked(target.x,target.y,24,layout),`${key} is on existing dry land`);
  const route=m.pathTo(layout.spawn,target,world,Infinity,19);
  assert(route.length&&Math.hypot(route.at(-1).x-target.x,route.at(-1).y-target.y)<65,`Camp connects to ${key} across existing routes`);
  for(const point of route)assert(!m.worldBlocked(world,point.x,point.y,19),`${key} route remains collision-clear`);
  routes.push({target:key,steps:route.length,end:route.at(-1)});
 }
 const returnRoute=m.pathTo(site.robot,layout.spawn,world,Infinity,19);
 assert(returnRoute.length&&Math.hypot(returnRoute.at(-1).x-layout.spawn.x,returnRoute.at(-1).y-layout.spawn.y)<65,'Patch can navigate back to camp');
 const dispatch=m.patchRouteSite(layout,'dispatch'),hauler=m.patchRouteSite(layout,'hauler');
 assert(Math.hypot(dispatch.approach.x-site.robot.x,dispatch.approach.y-site.robot.y)>1900);
 assert(Math.hypot(dispatch.approach.x-hauler.approach.x,dispatch.approach.y-hauler.approach.y)>6500);
 assert(Math.hypot(hauler.release.x-hauler.approach.x,hauler.release.y-hauler.approach.y)>200);
 let last=site.robot;
 for(const [label,target] of [['Signal post',dispatch.approach],['Cable works chassis',hauler.approach],['Brake housing',hauler.release],['Bedside repair',site.robot]]){
  assert(!m.worldBlocked(world,target.x,target.y,24)&&!m.riverWaterBlocked(target.x,target.y,24,layout),label+' has a dry approach');
  const waypoints=m.pathTo(last,target,world,Infinity,19);
  assert(waypoints.length&&Math.hypot(waypoints.at(-1).x-target.x,waypoints.at(-1).y-target.y)<50,label+' is reachable on foot');
  assert(waypoints.every(p=>!m.worldBlocked(world,p.x,p.y,19)),label+' route is collision-clear');
  routes.push({target:label,steps:waypoints.length,end:waypoints.at(-1)});last=target;
 }
 const report={passed:true,existingPlacementsPreserved:base.items.length,newPlacements:layout.items.length-base.items.length,site:{station:{x:site.station.x,y:site.station.y},robot:site.robot,locker:site.locker},routes,
  checks:['authored migration and validation','immutable owner placement preservation','transforms and deliberate removals','occupied-site fallback','dry full-body approaches','camp-to-site and return navigation'],physicalIPhoneTested:false};

 console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
