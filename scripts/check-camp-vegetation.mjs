// Geometry, density and edit-preservation regression checks for the shared
// native/web authored-camp migration. No network or player-save writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-vegetation-'));
try{
 await build({stdin:{contents:['camp-vegetation','world-assets','world-layout','imported-art','foliage-renderer'].map(id=>`export * from './src/${id}';`).join(''),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temp,'model.cjs'));
 // Treat the shipped population as a synthetic old-version save. Clearing
 // only this marker keeps the checks reproducible after commits/shallow clones;
 // the explicit contact fixtures below cover walls already cleaned in source.
 const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));
 delete snapshot.layout.campVegetationVersion;
 m.installImportedArt(snapshot.records);
 const before=snapshot.layout,serialized=JSON.stringify(before),old=m.campVegetationDiagnostics(before);
 const start=performance.now(),after=m.refineCampVegetation(before),elapsed=performance.now()-start,next=m.campVegetationDiagnostics(after);
 assert.equal(after.campVegetationVersion,1);
 assert.equal(JSON.stringify(before),serialized,'Source layout is never mutated');
 assert.deepEqual(m.validateLayout(after).errors,[]);
 assert.deepEqual(next.wallOverlapIds,[],'Every standing sprite and ordinary contact-motion envelope clears every wall');
 assert.equal(old.outdoorFoliage-next.outdoorFoliage,Math.max(Math.round(old.outdoorFoliage*.3),old.outdoorWallFoliageIds.length),'Wall removals count within the overall 30% target');
 assert.equal(old.interiorFoliage-next.interiorFoliage,old.interiorWallFoliageIds.length,'Interior foliage is only removed for wall clearance');
 assert.equal(old.trees-next.trees,old.wallTreeIds.length,'Trees are only removed for wall clearance');
 assert.equal(old.forage-next.forage,old.wallForageIds.length,'Food plants are never randomly thinned');
 const byId=new Map(after.items.map(p=>[p.id,p])),wallIds=new Set(old.wallOverlapIds);
 for(const p of before.items){
  const current=byId.get(p.id),a=m.ASSET_BY_ID.get(p.assetId);
  if(current)assert.strictEqual(current,p,'Every retained placement keeps its identity, geometry and metadata');
  else assert(wallIds.has(p.id)||(a?.foliage&&!p.assetId.startsWith('art_forage_')),'Only requested vegetation may be removed');
 }
 assert.deepEqual({...after,items:before.items,campVegetationVersion:before.campVegetationVersion,updatedAt:before.updatedAt},{...before,campVegetationVersion:before.campVegetationVersion},'All unrelated world metadata survives');
 assert.strictEqual(m.refineCampVegetation(after),after,'Repeated native/editor/save loads do not thin again');
 const edited={...after,items:[...after.items,{...before.items.find(p=>wallIds.has(p.id)),id:'owner-replanted-after-migration'}]};
 assert.strictEqual(m.refineCampVegetation(edited),edited,'Later owner edits remain authoritative');
 assert.deepEqual(m.refineCampVegetation(structuredClone(before)).items,after.items,'Selection is reproducible from the same source');
 assert.deepEqual(m.refineCampVegetation({...before,items:[...before.items].reverse()}).items.map(p=>p.id).sort(),after.items.map(p=>p.id).sort(),'Selection does not depend on array order');
 for(const input of [{...before,terrain:'other'},{...before,terrainImage:{url:'/custom-ground.png'}},{...before,items:before.items.filter(p=>p.role!=='hearth')},{...before,items:before.items.filter(p=>!m.ASSET_BY_ID.get(p.assetId)?.perimeter)}])assert.strictEqual(m.refineCampVegetation(input),input,'Custom/incomplete camps are not migrated');

 // Independently regenerate conservative envelopes from the real WebP alpha,
 // catching stale geometry when artists replace an image under the same ID.
 const traced=JSON.parse(execFileSync('python3',['-c',String.raw`
import json, math
from PIL import Image
out={}
for asset in json.load(open('src/camp-circular-wall-art.json')):
 im=Image.open('public'+asset['image']).convert('RGBA'); w,h=im.size; alpha=im.getchannel('A'); rows=[]
 for i in range(24):
  box=alpha.crop((math.floor(i*w/24),0,math.ceil((i+1)*w/24),h)).getbbox()
  rows.append(None if box is None else [math.floor(box[1]*1000/h),math.ceil(box[3]*1000/h)])
 out[asset['id']]=rows
print(json.dumps(out))
`],{encoding:'utf8',maxBuffer:1024*1024}));
 assert.deepEqual(m.CAMP_WALL_ALPHA_STRIPS,traced,'Wall envelopes contain every actual nontransparent pixel');

 // Visual-canopy regression: put a tree whose ground anchor is clear directly
 // above a wall sprite strip. Transform wall and vegetation together, including
 // editor mirrors and arbitrary rotations, then require clearance removal.
 const plan=JSON.parse(fs.readFileSync('src/camp-circular-wall-layout.json','utf8'));
 const hearth=before.items.find(p=>p.id===plan.hearthPlacementId),originalWall=before.items.find(p=>p.assetId==='camp_circular_wall_01');
 const wall={...originalWall,x:hearth.x+plan.radius,y:hearth.y,scale:1};
 const berry=before.items.find(p=>p.assetId==='art_forage_berry_bush'),tree=before.items.find(p=>p.assetId==='art_tree_oak');
 assert(tree&&berry,'Fixture includes canopy and protected food-resource assets');
 const b=m.placementBounds(wall),strip=m.CAMP_WALL_ALPHA_STRIPS[wall.assetId][12],contact={x:b.x+b.width*12.5/24,y:b.y+b.height*(strip[0]+strip[1])/2000};
 const plantAsset=before.items.find(p=>m.ASSET_BY_ID.get(p.assetId)?.foliage&&!p.assetId.startsWith('art_forage_')).assetId;
 const scene=items=>({...before,campVegetationVersion:undefined,items:[hearth,...items]});
 for(const angle of [0,37,90,183])for(const flipX of [false,true])for(const flipY of [false,true]){
  const transformedWall={...wall,rotation:angle,flipX,flipY};
  const [cx,cy]=m.placementPoint(transformedWall,contact.x,contact.y);
  for(const source of [tree,berry,{...berry,assetId:plantAsset}]){
   const p={...source,id:'canopy-contact',x:cx,y:cy,scale:1,rotation:angle,flipX,flipY};
   const pb=m.placementBounds(p),[px,py]=m.placementPoint(p,pb.x+pb.width/2,pb.y+pb.height/2);
   p.x+=cx-px;p.y+=cy-py;
   const input=scene([transformedWall,p]),audit=m.campVegetationDiagnostics(input);
   assert(audit.wallOverlapIds.includes(p.id),`Detect visual overlap for ${source.assetId}, rotation ${angle}, mirrors ${flipX}/${flipY}`);
   assert(!m.refineCampVegetation(input).items.some(q=>q.id===p.id),'Remove the contact even if placement is a food plant or tree');
  }
 }
 // Mandatory clearance wins when a tiny custom population cannot meet both an
 // exact 30% count and removal of all wall-touching vegetation.
 const crowded=Array.from({length:10},(_,i)=>({...berry,id:'wall-plant-'+i,assetId:plantAsset,x:contact.x,y:contact.y}));
 const crowdedScene=scene([wall,...crowded]),crowdedAudit=m.campVegetationDiagnostics(crowdedScene),crowdedAfter=m.refineCampVegetation(crowdedScene);
 assert(crowdedAudit.wallOverlapIds.length>Math.round(crowdedAudit.outdoorFoliage*.3));
 assert.deepEqual(m.campVegetationDiagnostics(crowdedAfter).wallOverlapIds,[]);
 assert(crowdedAfter.items.every(p=>!p.id.startsWith('wall-plant-')));

 console.log(JSON.stringify({passed:true,total:[before.items.length,after.items.length],outdoorFoliage:[old.outdoorFoliage,next.outdoorFoliage],outsideRemoved:old.outdoorFoliage-next.outdoorFoliage,wallRemoved:{outdoorFoliage:old.outdoorWallFoliageIds.length,interiorFoliage:old.interiorWallFoliageIds.length,trees:old.wallTreeIds.length,forage:old.wallForageIds.length},remainingWallOverlaps:next.wallOverlapIds.length,migrationMs:Math.round(elapsed*100)/100}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
