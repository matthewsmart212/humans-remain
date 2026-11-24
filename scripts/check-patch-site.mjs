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
 const base=structuredClone(snapshot.layout);base.items=base.items.filter(p=>!ids.has(p.id));delete base.patchSiteVersion;
 const original=JSON.stringify(base),layout=m.placePatchMaintenanceStation(base),site=m.patchQuestSite(layout);
 assert(site,'The published world gets the complete maintenance site');
 assert.deepEqual([site.station.x,site.station.y],[-3850,7000],'The surveyed west bank stays the first choice');
 assert.equal(layout.patchSiteVersion,1);
 assert.equal(JSON.stringify(base),original,'Do not mutate the original published layout');
 assert.deepEqual(layout.items.filter(p=>!ids.has(p.id)),base.items,'Camp, roads, shore, bridge, trees and all existing POIs stay intact');
 assert.equal(layout.updatedAt,base.updatedAt,'Keep the owner’s publication timestamp');
 assert.equal(m.placePatchMaintenanceStation(layout),layout,'Repeated preparation is a no-op');
 assert.equal(m.prepareAuthoredWorld(layout).items.filter(p=>ids.has(p.id)).length,2,'The authored-world pipeline cannot duplicate scenery');
 assert.equal(m.validateLayout(layout).layout?.patchSiteVersion,1,'Serialization retains the installed marker');

 const edited={...layout,items:layout.items.map(p=>ids.has(p.id)?{...p,x:p.x-80,y:p.y+110,rotation:23,scale:1.2,flipX:true}:p)};
 assert.equal(m.placePatchMaintenanceStation(edited),edited,'Owner transforms and positions remain authoritative');
 const transformed=m.patchQuestSite(edited),s=transformed.station;
 const [rx,ry]=m.placementPoint(s,s.x+125*s.scale,s.y+80*s.scale);
 assert.deepEqual(transformed.robot,{x:rx,y:ry},'Robot discovery follows the transformed service bay');
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
 assert.deepEqual(fallback.items.filter(p=>!ids.has(p.id)),obstructed.items,'Never clear an obstruction by deleting the owner’s prop');
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
 const report={passed:true,existingPlacementsPreserved:base.items.length,newPlacements:2,site:{station:{x:site.station.x,y:site.station.y},robot:site.robot,locker:site.locker},routes,
  checks:['authored migration and validation','immutable owner placement preservation','transforms and deliberate removals','occupied-site fallback','dry full-body approaches','camp-to-site and return navigation'],physicalIPhoneTested:false};
 fs.mkdirSync('docs/qa/patch-v1',{recursive:true});fs.writeFileSync('docs/qa/patch-v1/site-checks.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
