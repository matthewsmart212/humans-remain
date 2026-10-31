import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'woodland-zones-check-')),out='docs/qa/woodland-zones-v1';
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/survival-engine';export * from './src/studio-play';export * from './src/camp-river';export * from './src/woodland-zones';export * from './src/tree-chopping';export * from './src/layout-views';export * from './src/world-roads';export * from './src/east-approach';export * from './src/river-collision';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs')});
 const m=require(path.join(tmp,'model.cjs')),saved=JSON.parse(fs.readFileSync('docs/qa/woodland-zones-v1/before.json')),before=saved.draft,original=JSON.stringify(before);
 m.installImportedArt(JSON.parse(fs.readFileSync('.qa/zones-artwork.json')).records);
 const zoning=JSON.parse(fs.readFileSync('src/woodland-zones.json')),changes=new Map(zoning.changes.map(p=>[p.id,p]));
 const after=m.refineApprovedWoodlandZones(before),added=after.items.filter(p=>p.id.startsWith('camp-outskirts-v1-')||p.id.startsWith('camp-river-v1-')),trees=added.filter(p=>m.TREE_ART.has(p.assetId)),beforeById=new Map(before.items.map(p=>[p.id,p]));
 assert.equal(before.items.length,2299);assert.equal(after.items.length,before.items.length);assert.equal(trees.length,114);assert.equal(JSON.stringify(before),original);
 let changed=0;
 for(let i=0;i<before.items.length;i++){
  const p=before.items[i],q=after.items[i],change=changes.get(p.id);assert.equal(q.id,p.id);
  assert.deepEqual(q,change?{...p,assetId:change.assetId,scale:change.scale}:p,'Only reviewed asset/scale changes: '+p.id);
  if(change){changed++;assert(q.scale<=p.scale,'No larger ground collider: '+p.id);}
 }
 assert.equal(changed,changes.size);
 for(const group of zoning.groups)for(const id of group.treeIds)assert.equal(after.items.find(p=>p.id===id).assetId,'art_tree_'+zoning.zones.find(z=>z.id===group.zone).tree);
 assert.deepEqual(after.spawn,before.spawn);assert.deepEqual(after.terrainImage,before.terrainImage);assert.deepEqual(m.validateLayout(after).errors,[]);assert.equal(m.validateLayout(after).layout.woodlandZonesVersion,1);
 assert(m.validateLayout({...after,woodlandZonesVersion:2}).errors.length);
 assert.equal(m.refineApprovedWoodlandZones(after),after);
 const target=before.items.find(p=>changes.has(p.id)&&m.TREE_ART.has(p.assetId));
 const deleted={...before,items:before.items.filter(p=>p.id!==target.id)};assert(!m.refineApprovedWoodlandZones(deleted).items.some(p=>p.id===target.id),'Never recreate deleted trees');
 for(const patch of [{x:target.x+100},{scale:target.scale*.9},{assetId:'art_tree_oak'},{locked:true},{rotation:30},{solid:false},{layer:5}]){
  const edited={...target,...patch};if(JSON.stringify(edited)===JSON.stringify(target))continue;
  const l={...before,items:before.items.map(p=>p.id===target.id?edited:p)};
  assert.deepEqual(m.refineApprovedWoodlandZones(l).items.find(p=>p.id===target.id),edited,'Owner edits win');
 }
 const changedLater={...after,items:after.items.map(p=>p.id===target.id?{...p,x:p.x+100}:p)};assert.equal(m.refineApprovedWoodlandZones(changedLater),changedLater);
 for(const unrelated of [{...before,terrainImage:{...before.terrainImage,url:'/api/asset-files/different'}},{...before,campRiverVersion:undefined},{...before,items:before.items.filter(p=>p.role!=='hearth')}])assert.equal(m.refineApprovedWoodlandZones(unrelated),unrelated);
 const world=m.createWorld(after);world.editorPreview=true;const oldWorld=m.createWorld(before);oldWorld.editorPreview=true;
 assert(!m.worldBlocked(world,after.spawn.x,after.spawn.y,19));
 let roadSamples=0;
 for(const p of added)assert(!m.riverWaterBlocked(p.x,p.y,m.TREE_ART.has(p.assetId)?150:m.ASSET_BY_ID.get(p.assetId)?.foliage?55:105),'Water clearance: '+p.id);
 for(const b of m.RIVER_BRIDGES)for(let i=0;i<=40;i++){
  const x=(b.from[0]+(b.to[0]-b.from[0])*i/40-600)*m.EAST_TERRAIN_SCALE,y=(b.from[1]+(b.to[1]-b.from[1])*i/40-600)*m.EAST_TERRAIN_SCALE;
  if(!m.worldBlocked(oldWorld,x,y,23))assert(!m.worldBlocked(world,x,y,23),'Bridge blocked: '+b.id);
 }
 for(const road of m.WORLD_ROADS)for(let i=1;i<road.sourcePoints.length;i++){
  const a=road.sourcePoints[i-1],b=road.sourcePoints[i],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/45),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;
  for(let j=0;j<steps;j++)for(const offset of [-road.width*.35,0,road.width*.35]){
   const x=(a[0]+dx*j/steps-dy/len*offset-600)*m.EAST_TERRAIN_SCALE,y=(a[1]+dy*j/steps+dx/len*offset-600)*m.EAST_TERRAIN_SCALE;
   if(x<-6500||x>5800||y<-1800||y>5900||m.worldBlocked(oldWorld,x,y,23))continue;
   assert(!m.worldBlocked(world,x,y,23),`Road narrowed: ${road.id} ${x},${y}`);roadSamples++;
  }
 }
 // Flood-fill real collisions from camp, not just straight-line distance.
 const cell=50,left=-6500,top=-1800,cols=247,rows=159,free=new Uint8Array(cols*rows),seen=new Uint8Array(cols*rows);
 const xy=k=>({x:left+(k%cols)*cell,y:top+Math.floor(k/cols)*cell});
 for(let k=0;k<free.length;k++){const p=xy(k);free[k]=+!m.worldBlocked(world,p.x,p.y,23);}
 const at=(x,y)=>Math.round((y-top)/cell)*cols+Math.round((x-left)/cell),start=at(after.spawn.x,after.spawn.y);assert(free[start],'Spawn navigation cell');const queue=[start];seen[start]=1;
 for(let i=0;i<queue.length;i++){const k=queue[i],x=k%cols,y=Math.floor(k/cols);for(const n of [x? k-1:-1,x<cols-1?k+1:-1,y?k-cols:-1,y<rows-1?k+cols:-1])if(n>=0&&free[n]&&!seen[n]){seen[n]=1;queue.push(n);}}
 const approaches=[];
 for(const p of trees){
  const root=m.treeRoot(p);let stand;
  for(const radius of [103,115,90])for(let i=0;i<16&&!stand;i++){
   const angle=i*Math.PI/8,q={x:root.x+Math.cos(angle)*radius,y:root.y+Math.sin(angle)*radius},near=at(q.x,q.y),nav=xy(near);
   if(m.worldBlocked(world,q.x,q.y,23)||!seen[near]||!m.lineClear(nav,q,world))continue;
   const w=m.createWorld(after);w.editorPreview=true;Object.assign(w.player,q);
   if(m.chopTree(w,Math.atan2(root.y-q.y,root.x-q.x),136,1,999,(a,b)=>m.lineClear(a,b,w))&&w.treeChops?.[p.id]?.hp===0)stand=q;
  }
  assert(stand,'Tree unreachable: '+p.id);approaches.push({id:p.id,...stand});
  const w=m.createCampPlaySession(after,stand),angle=Math.atan2(root.y-stand.y,root.x-stand.x),hp=m.TREE_ART.get(p.assetId).hp;
  // Use real timed axe contacts, including its single-hit latch.
  for(let swing=0;swing<Math.ceil(hp/40);swing++){w.tick+=60;w.axeSwing={started:w.tick/60,angle,cut:1,resolved:false,queued:false};w.tick+=16;m.stepAxe(w);w.tick++;m.stepAxe(w);}
  assert.equal(w.treeChops?.[p.id]?.hp,0);const logs=w.loot.filter(l=>l.appearance==='logs');assert.equal(logs.length,1);assert.equal(logs[0].sourceTreeId,p.id);assert.equal(w.bag.pallets,0,'Manual pickup only');
  w.tick+=60;assert.equal(m.campInteraction(w)?.label,`Collect ${logs[0].amount} logs`);
  m.chopTree(w,angle,136,1,999,(a,b)=>m.lineClear(a,b,w));assert.equal(w.loot.filter(l=>l.appearance==='logs').length,1,'No duplicate yield');
  m.seedLoot(w);assert(w.loot.some(l=>l.sourceTreeId===p.id),'Uncollected logs survive dawn');
  assert(m.performCampInteraction(w),'Collect accessible logs');assert.equal(w.bag.pallets,logs[0].amount);assert.equal(w.loads,4);assert(!w.loot.some(l=>l.sourceTreeId===p.id));
  assert.equal(m.createCampPlaySession(after,stand).treeChops,undefined,'Session restart restores trees');
 }
 const full=m.createCampPlaySession(after,approaches[0]);full.loads=6;full.loot.push({id:123456,x:full.player.x,y:full.player.y,kind:'pallets',appearance:'logs',amount:3});assert.equal(m.performCampInteraction(full),false);assert.equal(full.loot.length,1,'Full pack keeps logs on ground');
 const previous=m.requiredImages(before.items.map(p=>p.assetId)),all=m.requiredImages(after.items.map(p=>p.assetId)),newSources=Object.values(all).filter(url=>!Object.values(previous).includes(url));
 assert.equal(newSources.length,0,'Reuses textures already present in this world');
 let peakVisibleBefore=0,peakVisibleAfter=0;for(let x=-6200;x<5700;x+=400)for(let y=-1600;y<5900;y+=400){const rect={x,y,width:1600,height:1000};peakVisibleBefore=Math.max(peakVisibleBefore,m.visiblePlacements(before,rect).length);peakVisibleAfter=Math.max(peakVisibleAfter,m.visiblePlacements(after,rect).length);}
 const report={result:'pass',sourceRevision:saved.revision,totalPlacements:after.items.length,changedPlacements:changed,existingUnchanged:before.items.length-changed,added:0,trees:trees.length,reachableTrees:approaches.length,groves:zoning.groups.filter(g=>g.treeIds.length).length,zoneTrees:Object.fromEntries(zoning.zones.map(z=>[z.id,z.trees])),roadSamples,reachableNavigationCells:queue.length,sharedNewImages:newSources.length,peakVisibleBefore,peakVisibleAfter,checks:['Single-species groves within five larger woodland zones','Original camp, rocks, logs and placement positions preserved','All 114 trees reachable from camp','Real axe contacts yield collectible logs once','Owner edits and deleted placements preserved','Roads and bridge approaches remain clear','Existing image sources reused; no new objects or per-frame work'],browserQA:false,deviceFPSMeasured:false};
 fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2)+'\n');fs.writeFileSync(out+'/tree-approaches.json',JSON.stringify(approaches,null,2)+'\n');fs.writeFileSync(out+'/after.json',JSON.stringify(after)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}

