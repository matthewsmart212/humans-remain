// Read-only revision-78 fixtures and the final registered sprites/colliders.
// No network calls, hosted-world writes, or player-save writes are performed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const fixtureDir=path.resolve(process.argv[2]||'docs/qa/circular-wall-v1');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const source=read(path.join(fixtureDir,'source-world.json'));
const artwork=read(path.join(fixtureDir,'source-artwork.json'));
const plan=read('src/camp-circular-wall-layout.json');
const roads=read('src/player-map-camp-roads.json').roads;
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'circular-wall-layout-'));
const round=value=>Math.round(value*1000)/1000;
try{
 const modules=['world-assets','world-layout','imported-art','camp-perimeter','camp-collision','player-map'];
 await build({stdin:{contents:modules.map(id=>`export * from './src/${id}';`).join(''),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temp,'model.cjs'));
 assert(source.draft&&artwork.records.length>=15,'Use the fresh complete world/artwork capture, not the older native snapshot');
 assert.equal(source.draft.campPerimeterVersion,4,'The migration fixture must precede the circular-wall install');
 m.installImportedArt(artwork.records);
 const before=source.draft,serialized=JSON.stringify(before),after=m.addApprovedCampPerimeter(before);
 const isWall=p=>p.assetId.startsWith('camp_circular_wall_');
 const walls=after.items.filter(isWall),originalIds=new Set(plan.sourceProvenance.originalWallPlacementIds);
 const movedIds=new Set(plan.sceneryAdjustments.map(p=>p.id));
 const byId=new Map(after.items.map(p=>[p.id,p]));
 assert.equal(after.campPerimeterVersion,5);
 assert.equal(walls.length,16);
 assert.equal(before.items.filter(p=>originalIds.has(p.id)).length,11);
 assert.equal(after.items.length,before.items.length-11+16);
 assert.deepEqual(m.validateLayout(after).errors,[]);
 assert.equal(JSON.stringify(before),serialized,'Migration must not mutate its source');
 assert.deepEqual({...after,items:before.items,campPerimeterVersion:before.campPerimeterVersion,updatedAt:before.updatedAt},before,'All non-perimeter layout fields survive unchanged');
 const scenery=[];
 let preserved=0;
 for(const old of before.items){
  const current=byId.get(old.id);
  if(originalIds.has(old.id)){assert(!current,'An original camp wall survived');continue;}
  assert(current,`Unrelated placement removed: ${old.id}`);
  if(movedIds.has(old.id)){
   assert.deepEqual({...current,x:old.x,y:old.y},old,'Only the audited scenery position may change');
   const displacement=Math.hypot(current.x-old.x,current.y-old.y);
   assert(Math.abs(displacement-160)<1e-8,'Audited scenery moves exactly 160 units');
   const beforeRadius=Math.hypot(old.x-plan.centre[0],old.y-plan.centre[1]);
   const afterRadius=Math.hypot(current.x-plan.centre[0],current.y-plan.centre[1]);
   assert(Math.abs(afterRadius-beforeRadius-160)<1e-8,'Scenery only moves radially outward');
   scenery.push({id:old.id,displacement:round(displacement)});
  }else{assert.deepEqual(current,old,`Unrelated object changed: ${old.id}`);preserved++;}
 }
 assert.strictEqual(m.addApprovedCampPerimeter(after),after,'Migration is idempotent');
 const edited=structuredClone(after);
 edited.items=edited.items.filter(p=>p.id!==walls[0].id);
 edited.items.find(isWall).x+=120;
 assert.strictEqual(m.addApprovedCampPerimeter(edited),edited,'Later moved/deleted wall pieces stay edited');
 const ownerScenery=structuredClone(before);
 for(const p of ownerScenery.items)if(movedIds.has(p.id))p.x+=1;
 const ownerMigrated=m.addApprovedCampPerimeter(ownerScenery);
 for(const p of ownerScenery.items.filter(p=>movedIds.has(p.id)))assert.deepEqual(ownerMigrated.items.find(v=>v.id===p.id),p,'Owner-edited scenery is not repositioned');
 const remote={...before.items.find(p=>originalIds.has(p.id)),id:'owner-remote-wall',x:4300,y:4300};
 assert.deepEqual(m.addApprovedCampPerimeter({...before,items:[...before.items,remote]}).items.find(p=>p.id===remote.id),remote,'An old wall reused outside camp is preserved');
 const noHearth={...before,items:before.items.filter(p=>p.id!==plan.hearthPlacementId)};
 assert.strictEqual(m.addApprovedCampPerimeter(noHearth),noHearth);
 const customTerrain={...before,terrainImage:{...before.terrainImage,id:'owner-custom-terrain',url:'/api/asset-files/owner-custom-terrain'}};
 assert.strictEqual(m.addApprovedCampPerimeter(customTerrain),customTerrain);
 const shiftedHearth={...before,items:before.items.map(p=>p.id===plan.hearthPlacementId?{...p,x:p.x+20,y:p.y-10}:p)};
 const shiftedWalls=m.addApprovedCampPerimeter(shiftedHearth).items.filter(isWall);
 for(let i=0;i<walls.length;i++){
  assert(Math.abs(shiftedWalls[i].x-walls[i].x-20)<1e-8);
  assert(Math.abs(shiftedWalls[i].y-walls[i].y+10)<1e-8);
 }

 // Use final placementBodies, including the exact road-end post footprints;
 // the guide manifest's conservative placeholder polygons are not used here.
 const bodies=walls.flatMap(p=>m.placementBodies(p));
 assert(bodies.length>16,'Finished road-end posts must have collision footprints');
 for(const body of bodies){
  assert.equal(body.shape,'polygon');
  assert(body.points.length>=3&&body.points.length<=64);
  assert(body.points.every(p=>p.every(Number.isFinite)));
  const twiceArea=body.points.reduce((sum,[x,y],i)=>{const [u,v]=body.points[(i+1)%body.points.length];return sum+x*v-u*y},0);
  assert(Math.abs(twiceArea)>1,'No empty final collision polygon');
 }
 const wallBlocked=(x,y,r=19)=>bodies.some(body=>m.hitCollider(body,x,y,r));
 for(const p of walls){
  const curve=m.ASSET_BY_ID.get(p.assetId).perimeterCurve;
  const [dx,dy]=curve[Math.floor(curve.length/2)],x=p.x+dx,y=p.y+dy;
  assert(wallBlocked(x,y,0),`${p.assetId}: the foundation blocks at its actual centre`);
  const rx=x-plan.centre[0],ry=y-plan.centre[1],length=Math.hypot(rx,ry);
  for(const offset of [-100,100])assert(!wallBlocked(x+rx/length*offset,y+ry/length*offset,19),'The wall must not gain a rectangular sprite-sized blocker');
 }
 let corridorSamples=0;
 for(const road of roads){
  let checked=0;
  for(let i=1;i<road.points.length;i++){
   const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),steps=Math.ceil(length/8);
   for(let j=0;j<=steps;j++){
    const x=a[0]+dx*j/steps,y=a[1]+dy*j/steps;
    if(Math.abs(Math.hypot(x-plan.centre[0],y-plan.centre[1])-plan.radius)>120)continue;
    for(const lateral of [-35,0,35]){
     assert(!wallBlocked(x-dy/length*lateral,y+dx/length*lateral,19),`${road.id}: a final wall/post blocks the road corridor`);
     checked++;corridorSamples++;
    }
   }
  }
  assert(checked>20,`${road.id}: no ring-crossing samples found`);
 }

 // Points on the existing approaches inside and outside the ring. A bounded
 // search checks complete segments against every collider in the full world.
 const endpoints=[
  ['camp-northwest',[800,520],[440,180]],
  ['camp-northeast',[2680,700],[3000,160]],
  ['camp-west',[400,2060],[-120,2060]],
  ['camp-southwest',[860,2680],[420,2940]],
  ['camp-south',[1620,2980],[1780,3460]],
  ['camp-southeast',[2720,2580],[3080,2880]],
 ];
 const blocked=(x,y)=>m.layoutBlocked(after,x,y,19);
 const clearSegment=(a,b)=>{
  const samples=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/7));
  for(let i=0;i<=samples;i++)if(blocked(a[0]+(b[0]-a[0])*i/samples,a[1]+(b[1]-a[1])*i/samples))return false;
  return true;
 };
 const routes=[];
 for(const [road,start,end] of endpoints){
  assert(Math.hypot(start[0]-plan.centre[0],start[1]-plan.centre[1])<1500);
  assert(Math.hypot(end[0]-plan.centre[0],end[1]-plan.centre[1])>1850);
  assert(!blocked(...start)&&!blocked(...end),`${road}: route endpoints must be accessible`);
  const key=point=>point.join(','),queue=[start],parents=new Map([[key(start),null]]);
  const left=Math.min(start[0],end[0])-320,right=Math.max(start[0],end[0])+320;
  const top=Math.min(start[1],end[1])-320,bottom=Math.max(start[1],end[1])+320;
  const offsets=[[20,0],[-20,0],[0,20],[0,-20],[20,20],[20,-20],[-20,20],[-20,-20]];
  for(let head=0;head<queue.length&&!parents.has(key(end));head++){
   const point=queue[head];
   for(const [dx,dy] of offsets){
    const next=[point[0]+dx,point[1]+dy],id=key(next);
    if(parents.has(id)||next[0]<left||next[0]>right||next[1]<top||next[1]>bottom||!clearSegment(point,next))continue;
    parents.set(id,point);queue.push(next);
   }
  }
  assert(parents.has(key(end)),`${road}: no traversable route through this entrance`);
  const route=[];
  for(let point=end;point;point=parents.get(key(point)))route.unshift(point);
  for(let i=1;i<route.length;i++)assert(clearSegment(route[i-1],route[i])&&clearSegment(route[i],route[i-1]),`${road}: both directions must be clear`);
  routes.push({road,playerRadius:19,routePoints:route.length,start,end,route});
 }

 const paths=layout=>m.playerMapFeatures(layout).paths;
 const circular=layout=>paths(layout).filter(p=>p.id.startsWith('circular-camp-'));
 const legacy=layout=>paths(layout).filter(p=>p.id==='camp-palisade-posts'||p.id==='camp-palisade-shade');
 const stone=layout=>circular(layout).find(p=>p.id==='circular-camp-stone-base')?.path.match(/M[^M]+/g)||[];
 assert.equal(circular(after).length,3);
 assert.equal(legacy(after).length,0,'The old decorative circle must not remain over the new wall');
 const originalMap=stone(after);assert.equal(originalMap.length,16);
 const removed={...after,items:after.items.filter(p=>p.id!==walls[0].id)};
 assert.deepEqual(stone(removed),originalMap.slice(1),'Deleting a wall removes exactly its own map section');
 assert.equal(legacy(removed).length,0);
 const moved={...after,items:after.items.map(p=>p.id===walls[0].id?{...p,x:p.x+120,y:p.y-80}:p)};
 const movedMap=stone(moved);
 assert.deepEqual(movedMap.slice(1),originalMap.slice(1),'Moving one section leaves the other map sections unchanged');
 const coordinates=svg=>svg.match(/-?\d+(?:\.\d+)?/g).map(Number);
 const from=coordinates(originalMap[0]),to=coordinates(movedMap[0]);
 assert.equal(from.length,to.length);
 for(let i=0;i<from.length;i++)assert(Math.abs(to[i]-from[i]-(i%2?-80:120))<.02,'Map coordinates follow the actual moved section');
 const empty={...after,items:after.items.filter(p=>!isWall(p))};
 assert.equal(circular(empty).length,0);assert.equal(legacy(empty).length,0,'Deleting all sections does not restore the old circle');
 console.log(JSON.stringify({result:'pass',sourceRevision:source.revision,artworkRecords:artwork.records.length,before:before.items.length,after:after.items.length,oldWallsRemoved:11,newWalls:walls.length,unrelatedPlacementsPreserved:preserved,scenery,finalCollisionPolygons:bodies.length,roadCorridorSamples:corridorSamples,routes,ownerEditsPreserved:true,remoteLegacyWallPreserved:true,idempotent:true,mapFollowsMovedAndDeletedSections:true,legacyMapCircleAbsent:true},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
