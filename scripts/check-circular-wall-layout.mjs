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
 assert.equal(after.campPerimeterVersion,7);
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

 // Published v5 coordinates are independent of the revised geometry plan.
 // An existing ring changes only its two eligible northeast placements.
 const oldNortheast=[
  {id:'camp-circular-wall-v1-02',assetId:'camp_circular_wall_02',x:2537.662278621207,y:141.40617856301742,scale:1,locked:true,solid:true,allowTransparency:true,roof:'auto',role:'prop'},
  {id:'camp-circular-wall-v1-03',assetId:'camp_circular_wall_03',x:3107.041416813492,y:682.7097574064716,scale:1,locked:true,solid:true,allowTransparency:true,roof:'auto',role:'prop'},
 ];
 const oldNEById=new Map(oldNortheast.map(p=>[p.id,p]));
 const v5={...after,campPerimeterVersion:5,items:after.items.map(p=>oldNEById.get(p.id)??p)};
 const v5Before=JSON.stringify(v5),aligned=m.addApprovedCampPerimeter(v5);
 assert.equal(aligned.campPerimeterVersion,7);assert.equal(aligned.items.length,v5.items.length);
 assert.equal(JSON.stringify(v5),v5Before,'The v5 correction leaves its source unchanged');
 assert.deepEqual({...aligned,items:v5.items,campPerimeterVersion:5,updatedAt:v5.updatedAt},v5,'The correction retains every other layout field');
 for(const p of v5.items){
  const actual=aligned.items.find(next=>next.id===p.id);
  if(oldNEById.has(p.id)){
   const target=plan.placements.find(next=>next.id===p.id);
   assert.deepEqual(actual,{...p,assetId:target.assetId,x:target.x,y:target.y});
   assert.notEqual(actual.assetId,p.assetId,'Corrected shapes use new assets so custom originals retain their geometry');
  }else assert.strictEqual(actual,p,'Every unrelated v5 placement is retained unchanged');
 }
 assert.strictEqual(m.addApprovedCampPerimeter(aligned),aligned,'The v5 correction runs once');
 // Exact NE placements captured from hosted revision 80. Version 6 had
 // extended 02 while leaving the unlocked, slightly shifted original 03.
 const revision80Northeast=[
  {id:'camp-circular-wall-v1-02',assetId:'camp_circular_wall_02_ne_v2',x:2658.6622456328273,y:217.7950297283926,scale:1,locked:true,solid:true,allowTransparency:true,roof:'auto',role:'prop'},
  {id:'camp-circular-wall-v1-03',assetId:'camp_circular_wall_03',x:3101.270267780181,y:686.8197171304214,scale:1,locked:false,solid:true,allowTransparency:true,roof:'auto',role:'prop'},
 ];
 const revision80ById=new Map(revision80Northeast.map(p=>[p.id,p]));
 const revision80={...after,campPerimeterVersion:6,items:after.items.map(p=>revision80ById.get(p.id)??p)},revision80Before=JSON.stringify(revision80);
 const repaired=m.addApprovedCampPerimeter(revision80);
 assert.equal(repaired.campPerimeterVersion,7);
 assert.equal(JSON.stringify(revision80),revision80Before,'Repairing a saved mixed pair leaves its source unchanged');
 assert.deepEqual({...repaired,items:revision80.items,campPerimeterVersion:6,updatedAt:revision80.updatedAt},revision80,'Repair retains every non-perimeter layout field');
 const repaired03=repaired.items.find(p=>p.id===oldNortheast[1].id),new03=plan.placements.find(p=>p.id===oldNortheast[1].id);
 const savedOffset={x:revision80Northeast[1].x-oldNortheast[1].x,y:revision80Northeast[1].y-oldNortheast[1].y};
 assert.deepEqual(repaired03,{...revision80Northeast[1],assetId:new03.assetId,x:new03.x+savedOffset.x,y:new03.y+savedOffset.y},'Keep the actual small translation and unlocked state');
 for(const p of revision80.items)if(p.id!==oldNortheast[1].id)assert.strictEqual(repaired.items.find(next=>next.id===p.id),p,'The mixed-pair repair changes only old wall 03');
 assert.strictEqual(m.addApprovedCampPerimeter(repaired),repaired,'A repaired version 7 save is not moved again');
 const blocksWall=(layout,x,y,r=19)=>layout.items.filter(isWall).flatMap(p=>m.placementBodies(p)).some(body=>m.hitCollider(body,x,y,r));
 const paintedCrossing=[3003.28,538.63];
 assert(blocksWall(revision80,...paintedCrossing),'The live revision 80 mixed pair must reproduce the blocked painted road');
 assert(!blocksWall(repaired,...paintedCrossing),'The repaired live pair must reopen the painted road');

 const corrected02=plan.placements.find(p=>p.id===oldNortheast[0].id);
 const mixedV5={...v5,items:v5.items.map(p=>p.id===corrected02.id?corrected02:p)};
 const metadata={layer:0,locked:false,solid:false,allowTransparency:false,roof:'hidden',role:'fuel'};
 const smallChanges=[{},metadata,{x:oldNortheast[1].x+1e-10},{x:oldNortheast[1].x+16},{x:revision80Northeast[1].x,y:revision80Northeast[1].y,locked:false}];
 for(const base of [v5,mixedV5,{...v5,campPerimeterVersion:6}])for(const patch of smallChanges){
  const changed={...oldNortheast[1],...patch},input={...base,items:base.items.map(p=>p.id===changed.id?changed:p)},corrected=m.addApprovedCampPerimeter(input);
  assert.equal(corrected.campPerimeterVersion,7);
  assert.deepEqual(corrected.items.find(p=>p.id===changed.id),{...changed,assetId:new03.assetId,x:new03.x+(changed.x-oldNortheast[1].x),y:new03.y+(changed.y-oldNortheast[1].y)},'Small adjustments and nongeometry settings survive old and mixed migrations');
  assert.equal(corrected.items.find(p=>p.id===corrected02.id).assetId,corrected02.assetId,'The eligible pair adopts the same design');
  assert.strictEqual(m.addApprovedCampPerimeter(corrected),corrected);
 }
 for(const base of [v5,revision80])for(const old of oldNortheast){
  const original=base.items.find(p=>p.id===old.id),baseline=original.assetId===old.assetId?old:plan.placements.find(p=>p.id===old.id);
  const edits=[
   {x:baseline.x+16.001},{y:baseline.y-16.001},{x:baseline.x+12,y:baseline.y+12},
   {scale:1.01},{rotation:1},{flipX:true},{flipY:true},{assetId:'camp_circular_wall_04'},
   {footprint:{width:70,depth:30}},
   {frame:{sourceAssetId:original.assetId,width:400,height:250,anchor:[.5,.7]}},
   {collision:{lineWidth:.008,paths:[{closed:true,points:[[.1,.1],[.9,.1],[.9,.9],[.1,.9]]}]}},
  ];
  for(const patch of edits){
   const changed={...original,...patch},custom={...base,items:base.items.map(p=>p.id===changed.id?changed:p)};
   assert.strictEqual(m.addApprovedCampPerimeter(custom),custom,'A substantial edit defers the entire pair without moving either section: '+JSON.stringify(patch));
  }
  const deleted={...base,items:base.items.filter(p=>p.id!==old.id)};
  assert.strictEqual(m.addApprovedCampPerimeter(deleted),deleted,'A deleted section is never restored and its partner is not changed alone');
 }
 const alreadyCorrect={...after,campPerimeterVersion:6},marked=m.addApprovedCampPerimeter(alreadyCorrect);
 assert.equal(marked.campPerimeterVersion,7);assert.strictEqual(marked.items,alreadyCorrect.items,'A correct version 6 pair only advances its migration marker');
 const shiftedV5={...v5,items:v5.items.map(p=>p.id===plan.hearthPlacementId||oldNEById.has(p.id)?{...p,x:p.x+20,y:p.y-10}:p)};
 const shiftedNE=m.addApprovedCampPerimeter(shiftedV5);
 for(const old of oldNortheast){const expected=aligned.items.find(p=>p.id===old.id),actual=shiftedNE.items.find(p=>p.id===old.id);assert.deepEqual(actual,{...expected,x:expected.x+20,y:expected.y-10},'A translated authored camp retains its offset');}
 assert.strictEqual(m.addApprovedCampPerimeter({...v5,items:v5.items.filter(p=>p.id!==plan.hearthPlacementId)}).campPerimeterVersion,5,'Missing hearth defers the correction');
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
 let corridorSamples=0,repairedCorridorSamples=0;
 for(const road of roads){
  let checked=0;
  for(let i=1;i<road.points.length;i++){
   const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),steps=Math.ceil(length/8);
   for(let j=0;j<=steps;j++){
    const x=a[0]+dx*j/steps,y=a[1]+dy*j/steps;
    if(Math.abs(Math.hypot(x-plan.centre[0],y-plan.centre[1])-plan.radius)>120)continue;
    for(const lateral of [-35,0,35]){
     const sx=x-dy/length*lateral,sy=y+dx/length*lateral;
     assert(!wallBlocked(sx,sy,19),`${road.id}: a final wall/post blocks the road corridor`);
     if(road.id==='camp-northeast'){
      assert(!wallBlocked(sx,sy,19+16),'The canonical NE corridor must retain clearance for a 16-unit section adjustment');
      assert(!blocksWall(repaired,sx,sy,19),'The exact revision 80 repair must clear the NE road corridor');
      repairedCorridorSamples++;
     }
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
  ['camp-northeast',[2660,780],[3260,300]],
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
 console.log(JSON.stringify({result:'pass',sourceRevision:source.revision,artworkRecords:artwork.records.length,before:before.items.length,after:after.items.length,oldWallsRemoved:11,newWalls:walls.length,unrelatedPlacementsPreserved:preserved,scenery,finalCollisionPolygons:bodies.length,roadCorridorSamples:corridorSamples,routes,ownerEditsPreserved:true,version5NortheastCorrection:true,version5OwnerEditsAndDeletionsPreserved:true,version6MixedPairRepair:{sourceRevision:80,changedSections:1,preservedOffset:savedOffset,unlockedStatePreserved:true,roadCorridorSamples:repairedCorridorSamples},translationAllowance:16,pairUpdatesAtomic:true,remoteLegacyWallPreserved:true,idempotent:true,mapFollowsMovedAndDeletedSections:true,legacyMapCircleAbsent:true},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
