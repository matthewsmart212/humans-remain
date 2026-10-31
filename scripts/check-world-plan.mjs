// Production checks for the blueprint: connectivity, planned crossings,
// consecutive artwork contacts, fixed camp scale and unchanged playable bounds.
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'check-world-plan-'));
try{
 await build({stdin:{contents:"export * from './src/world-master-plan';export * from './src/world-plan-geometry';export * from './src/outdoor-terrain';export * from './src/east-approach';export * from './src/terrain-art';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'plan.cjs')});
 const p=createRequire(import.meta.url)(path.join(temp,'plan.cjs'));
 assert.deepEqual(p.validateWorldPlan(),[],'Invalid world geography');
 const reachable=p.connectedPlanNodes();for(const d of p.WORLD_PLAN_DISTRICTS)assert.ok(reachable.has(d.node),d.name+' cannot be reached from camp');
 const bridges=p.riverRouteCrossings();assert.equal(bridges.length,6);assert.ok(bridges.every(b=>b.bridge),'A road crosses water without a reserved bridge');
 for(const area of p.WORLD_PLAN_QUIET)assert.ok(area.polygon.every(v=>p.insideRect(v,p.WORLD_PLAN_BOUNDS)),area.id+' leaves the planned world');
 for(const r of [...p.WORLD_PLAN_RIVERS,...p.WORLD_PLAN_RAIL])assert.ok(r.points.every(v=>p.insideRect(v,p.WORLD_PLAN_BOUNDS)),r.id+' leaves the planned world');
 for(const d of p.WORLD_PLAN_DISTRICTS)assert.ok(d.outline.every(v=>p.insideRect(v,p.WORLD_PLAN_BOUNDS)),d.id+' leaves the planned world');
 const rectangles=new Map([['original-camp',{x:0,y:0,width:p.HOME_TERRAIN.fullSize,height:p.HOME_TERRAIN.fullSize}],...p.OUTDOOR_SOURCE_TILES.map(t=>[path.basename(t.image,'.webp'),t])]);
 const overlap=(a,b)=>({width:Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x),height:Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)});
 for(const batch of p.WORLD_PLAN_BATCHES){
  assert.ok(p.insideRect([batch.bounds.x,batch.bounds.y],p.WORLD_PLAN_BOUNDS)&&p.insideRect([batch.bounds.x+batch.bounds.width,batch.bounds.y+batch.bounds.height],p.WORLD_PLAN_BOUNDS));
  for(const id of batch.joins){const neighbour=rectangles.get(id);assert.ok(neighbour,batch.id+' depends on unavailable neighbour '+id);const contact=overlap(batch.bounds,neighbour);assert.ok(contact.width>0&&contact.height>0,batch.id+' does not overlap '+id)}
  rectangles.set(batch.id,batch.bounds);
 }
 const a1=p.WORLD_PLAN_BATCHES[0],piece21=rectangles.get('21-camp-south-trail');assert.equal(overlap(a1.bounds,piece21).width,132);assert.equal(overlap(a1.bounds,rectangles.get('original-camp')).height,388);
 assert.deepEqual(new Set(p.patchRouteContacts(a1.bounds).map(c=>c.side)),new Set(['north','west']),'The southwest batch lost a required route contact');
 assert.equal(p.patchRouteContacts(p.WORLD_PLAN_BATCHES.find(b=>b.id==='A4').bounds).length,0,'The reserved western woodland patch must stay road-free');
 // Only completed artwork may expand the game's actual walk/build bounds.
 assert.equal(p.OUTDOOR_SOURCE_TILES.length,26);assert.deepEqual(p.OUTDOOR_SOURCE_BOUNDS,{x:-1528,y:0,width:11508,height:6206});
 for(const batch of p.WORLD_PLAN_BATCHES.filter(b=>b.status==='built')){const [x,y]=p.sourcePointToWorld([batch.bounds.x+batch.bounds.width/2,batch.bounds.y+batch.bounds.height/2],p.EAST_TERRAIN_SCALE);assert(p.OUTDOOR_FOOTPRINT.contains(x,y),batch.id+' is marked built outside playable ground')}
 const [hx,hy]=p.sourcePointToWorld(p.WORLD_PLAN_CAMP,p.EAST_TERRAIN_SCALE);
 assert.ok(Math.abs(hx-1718.1675873489273)<1e-8&&Math.abs(hy-1573.5124773329626)<1e-8,'Saved hearth anchor changed');
 assert.ok(p.OUTDOOR_FOOTPRINT.contains(hx,hy));
 for(const d of p.WORLD_PLAN_DISTRICTS.filter(d=>d.status==='planned')){const [x,y]=p.sourcePointToWorld(d.centre,p.EAST_TERRAIN_SCALE);assert.equal(p.OUTDOOR_FOOTPRINT.contains(x,y),false,d.name+' was unlocked before terrain was built')}
 const output={districtsConnected:p.WORLD_PLAN_DISTRICTS.length,reservedCrossings:bridges.length,roadFreeAreas:p.WORLD_PLAN_QUIET.length,adjoiningBatches:p.WORLD_PLAN_BATCHES.length,completedBatches:p.WORLD_PLAN_BATCHES.filter(b=>b.status==='built').map(b=>b.id),campAnchorUnchanged:true,runtimeSourceBounds:p.OUTDOOR_SOURCE_BOUNDS,futureDistrictsRemainUnbuilt:true};
 fs.mkdirSync('docs/qa/world-master-plan',{recursive:true});fs.writeFileSync('docs/qa/world-master-plan/checks.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
