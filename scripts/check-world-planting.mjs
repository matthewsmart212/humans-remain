import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'world-plant-check-')),out='docs/qa/world-planting-v1';
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/survival-engine';export * from './src/studio-play';export * from './src/world-planting';export * from './src/world-bounds';export * from './src/tree-chopping';export * from './src/layout-views';export * from './src/world-roads';export * from './src/east-approach';export * from './src/river-collision';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs')});
 const m=require(path.join(tmp,'model.cjs')),saved=JSON.parse(fs.readFileSync('docs/qa/world-planting-v1/before.json')),before=saved.draft,original=JSON.stringify(before);
 m.installImportedArt(JSON.parse(fs.readFileSync('.qa/world-plant-artwork.json')).records);
 const data=JSON.parse(fs.readFileSync('src/world-planting.json')),after=m.addApprovedWorldPlanting(before),added=after.items.filter(p=>p.id.startsWith(m.WORLD_PLANTING_PREFIX)),trees=after.items.filter(p=>m.TREE_ART.has(p.assetId)),newTrees=added.filter(p=>m.TREE_ART.has(p.assetId));
 assert.equal(added.length,data.placements.length,'Every reviewed placement survives integration');assert(added.length>=1750);assert(after.items.length<=4400);assert.equal(JSON.stringify(before),original);
 assert.deepEqual(after.items.slice(0,before.items.length),before.items,'All existing objects preserved');
 assert.deepEqual(added,data.placements);assert.deepEqual(after.spawn,before.spawn);assert.deepEqual(after.terrainImage,before.terrainImage);assert.deepEqual(m.validateLayout(after).errors,[]);assert.equal(m.validateLayout(after).layout.worldPlantingVersion,1);assert(m.validateLayout({...after,worldPlantingVersion:2}).errors.length);
 assert.equal(m.addApprovedWorldPlanting(after),after);
 const deleted={...after,items:after.items.filter(p=>p.id!==newTrees[0].id)};assert.equal(m.addApprovedWorldPlanting(deleted),deleted);
 const changed={...after,items:after.items.map(p=>p.id===newTrees[1].id?{...p,x:p.x+100}:p)};assert.equal(m.addApprovedWorldPlanting(changed),changed);
 for(const unrelated of [{...before,terrainImage:{...before.terrainImage,url:'/api/asset-files/different'}},{...before,woodlandZonesVersion:undefined},{...before,items:before.items.filter(p=>p.role!=='hearth')}])assert.equal(m.addApprovedWorldPlanting(unrelated),unrelated);
 const ownerAddition={...m.newPlacement('art_rock_broad_granite_erratic',newTrees[0].x,newTrees[0].y),id:'owner-new-object',scale:2};
 const protectedOwner=m.addApprovedWorldPlanting({...before,items:[...before.items,ownerAddition]});assert(!protectedOwner.items.some(p=>p.id===newTrees[0].id));assert(protectedOwner.items.some(p=>p.id===ownerAddition.id));
 const ownerPlant={...m.newPlacement('art_foliage_world_hazel_scrub',newTrees[0].x,newTrees[0].y),id:'owner-new-foliage'};assert(!m.addApprovedWorldPlanting({...before,items:[...before.items,ownerPlant]}).items.some(p=>p.id===newTrees[0].id));
 const pointIn=(x,y,poly)=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
 for(const p of added){const x=p.x/m.EAST_TERRAIN_SCALE+600,y=p.y/m.EAST_TERRAIN_SCALE+600;assert(!data.reservations.some(r=>pointIn(x,y,r.polygon)),'Future district core reserved');}
 for(const g of data.groups){const grove=added.filter(p=>p.id.startsWith(m.WORLD_PLANTING_PREFIX+g.id+'-'));for(const p of grove.filter(p=>m.TREE_ART.has(p.assetId)))assert.equal(p.assetId,'art_tree_'+g.tree);}
 for(const region of data.regions)assert(region.groves>=3,'Every region planted: '+region.id);
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
   if(m.worldBlocked(oldWorld,x,y,23))continue;
   assert(!m.worldBlocked(world,x,y,23),`Road narrowed: ${road.id} ${x},${y}`);roadSamples++;
  }
 }
 // Flood-fill real collisions from camp, not just straight-line distance.
 const bounds=m.campBounds(after),cell=50,left=bounds.left+30,top=bounds.top+30,cols=Math.ceil(bounds.width/cell),rows=Math.ceil(bounds.height/cell),free=new Uint8Array(cols*rows),seen=new Uint8Array(cols*rows);
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
 let bytes=0,pixels=0;for(const url of newSources){bytes+=fs.statSync('public'+url).size;const d=m.imageDimensions[url];assert(d,url);pixels+=d[0]*d[1]*4;}assert(pixels<12*1048576,'Additional decoded scenery budget');assert(bytes<1500000);
 // Compare the local-only query with the previous exact ordering contract.
 function referenceVisible(layout,view){const index=m.layoutViews(layout),seen=new Set(),plants=[];for(let x=Math.floor(view.x/256);x<=Math.floor((view.x+view.width)/256);x++)for(let y=Math.floor(view.y/256);y<=Math.floor((view.y+view.height)/256);y++)for(const {p,r} of index.cells.get(x+','+y)||[]){if(seen.has(p))continue;seen.add(p);if(p.x+r>=view.x&&p.x-r<=view.x+view.width&&p.y+r>=view.y&&p.y-r<=view.y+view.height)plants.push(p);}const visible=new Set(plants);return [...index.plain.filter(p=>visible.has(p)),...plants.filter(p=>m.ASSET_BY_ID.get(p.assetId)?.foliage)];}
 let peakBefore=0,peakAfter=0,peakAdded=0,cullingViews=0;const regionPeaks={};
 for(let x=bounds.left;x<bounds.right;x+=450)for(let y=bounds.top;y<bounds.bottom;y+=450){const view={x,y,width:1800,height:1000},visible=m.visiblePlacements(after,view),extra=visible.filter(p=>p.id.startsWith(m.WORLD_PLANTING_PREFIX));peakBefore=Math.max(peakBefore,m.visiblePlacements(before,view).length);peakAfter=Math.max(peakAfter,visible.length);peakAdded=Math.max(peakAdded,extra.length);assert.deepEqual(visible.map(p=>p.id),referenceVisible(after,view).map(p=>p.id),'Stable depth tie ordering');cullingViews++;}
 assert(peakAfter<=Math.max(310,peakBefore+8),'Bound normal-view density');assert(peakAdded<=115);
 const fullMapVisible=m.visiblePlacements(after,{x:bounds.left,y:bounds.top,width:bounds.width,height:bounds.height});assert.equal(fullMapVisible.length,after.items.length);
 const layoutBytes=Buffer.byteLength(JSON.stringify(after));assert(layoutBytes<2000000);
 const report={result:'pass',sourceRevision:saved.revision,existingPreserved:before.items.length,added:added.length,totalPlacements:after.items.length,remainingEditorSlots:5000-after.items.length,newTrees:newTrees.length,allReachableTrees:approaches.length,regions:data.regions.length,groves:data.groups.length,roadSamples,reachableNavigationCells:queue.length,additionalSharedImages:newSources.length,additionalCompressedBytes:bytes,additionalDecodedMiB:pixels/1048576,layoutBytes,peakVisibleBefore:peakBefore,peakVisibleAfter:peakAfter,peakAddedVisible:peakAdded,cullingViews,fullMapVisible:fullMapVisible.length,checks:['Existing camp and woodland zones preserved','All regions populated with single-species groves','District building cores and routes clear','All trees reachable, choppable and logs collectible once','Owner edits and deletions preserved','Local culling preserves previous exact draw order','Bounded local density and shared texture budget'],browserQA:false,deviceFPSMeasured:false};
 fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2)+'\n');fs.writeFileSync(out+'/tree-approaches.json',JSON.stringify(approaches,null,2)+'\n');fs.writeFileSync(out+'/after.json',JSON.stringify(after)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}

