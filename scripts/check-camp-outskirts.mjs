import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'outskirts-check-')),out='docs/qa/camp-outskirts-v1';
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/survival-engine';export * from './src/studio-play';export * from './src/camp-outskirts';export * from './src/tree-chopping';export * from './src/layout-views';export * from './src/world-roads';export * from './src/east-approach';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs')});
 const m=require(path.join(tmp,'model.cjs')),saved=JSON.parse(fs.readFileSync('.qa/populate-layout-before.json')),before=saved.draft,original=JSON.stringify(before);
 m.installImportedArt(JSON.parse(fs.readFileSync('.qa/populate-artwork.json')).records);
 const after=m.addApprovedCampOutskirts(before),added=after.items.filter(p=>p.id.startsWith(m.CAMP_OUTSKIRTS_PREFIX)),trees=added.filter(p=>m.TREE_ART.has(p.assetId));
 assert.equal(trees.length,58);assert.equal(added.length,392);assert.equal(JSON.stringify(before),original);
 for(const p of before.items)assert.deepEqual(after.items.find(q=>q.id===p.id),p,'Existing placement preserved');
 assert.deepEqual(after.spawn,before.spawn);assert.deepEqual(after.terrainImage,before.terrainImage);assert.deepEqual(m.validateLayout(after).errors,[]);assert.equal(m.validateLayout(after).layout.campOutskirtsVersion,1);
 assert.equal(m.addApprovedCampOutskirts(after),after);
 const deleted={...after,items:after.items.filter(p=>p.id!==trees[0].id)};assert.equal(m.addApprovedCampOutskirts(deleted),deleted,'Never refill deleted trees');
 const changed={...after,items:after.items.map(p=>p.id===trees[1].id?{...p,x:p.x+100}:p)};assert.equal(m.addApprovedCampOutskirts(changed),changed,'Never relocate owner edits');
 const unrelated={...before,terrainImage:{...before.terrainImage,url:'/api/asset-files/different'}};assert.equal(m.addApprovedCampOutskirts(unrelated),unrelated);
 const newBuilding={...m.newPlacement('art_rock_broad_granite_erratic',trees[0].x,trees[0].y),id:'new-owner-building',scale:2};
 assert(!m.addApprovedCampOutskirts({...before,items:[...before.items,newBuilding]}).items.some(p=>p.id===trees[0].id),'Owner additions take priority');
 const world=m.createWorld(after);world.editorPreview=true;const oldWorld=m.createWorld(before);oldWorld.editorPreview=true;
 assert(!m.worldBlocked(world,after.spawn.x,after.spawn.y,19));
 let roadSamples=0;
 for(const road of m.WORLD_ROADS)for(let i=1;i<road.sourcePoints.length;i++){
  const a=road.sourcePoints[i-1],b=road.sourcePoints[i],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/45),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;
  for(let j=0;j<steps;j++)for(const offset of [-road.width*.35,0,road.width*.35]){
   const x=(a[0]+dx*j/steps-dy/len*offset-600)*m.EAST_TERRAIN_SCALE,y=(a[1]+dy*j/steps+dx/len*offset-600)*m.EAST_TERRAIN_SCALE;
   if(x<-2400||x>5400||y<-1000||y>5700||m.worldBlocked(oldWorld,x,y,23))continue;
   assert(!m.worldBlocked(world,x,y,23),`Road narrowed: ${road.id} ${x},${y}`);roadSamples++;
  }
 }
 // Flood-fill real collisions from camp, not just straight-line distance.
 const cell=50,left=-2400,top=-1100,cols=160,rows=142,free=new Uint8Array(cols*rows),seen=new Uint8Array(cols*rows);
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
 let bytes=0,pixels=0;for(const url of newSources){bytes+=fs.statSync('public'+url).size;const d=m.imageDimensions[url];assert(d,url);pixels+=d[0]*d[1]*4;}
 let peakAdditionalVisible=0;for(let x=-1800;x<4800;x+=350)for(let y=-500;y<5300;y+=350)peakAdditionalVisible=Math.max(peakAdditionalVisible,m.visiblePlacements(after,{x,y,width:1600,height:1000}).filter(p=>p.id.startsWith(m.CAMP_OUTSKIRTS_PREFIX)).length);
 assert(peakAdditionalVisible<150,'Bound visible added density');assert(bytes<6000000,'Shared compressed artwork budget');
 const report={result:'pass',sourceRevision:saved.revision,existingPreserved:before.items.length,added:added.length,trees:trees.length,reachableTrees:approaches.length,roadSamples,reachableNavigationCells:queue.length,sharedNewImages:newSources.length,newTextureBytes:bytes,newDecodedMiB:pixels/1048576,peakAdditionalVisible,checks:['Existing placements and terrain preserved','All trees reachable from camp','Real axe contact yields collectible logs once','Manual pickup and backpack capacity','No regeneration of edited or deleted placements','Routes retain existing clear width','Session-only harvesting state','Bounded visible density and shared textures'],browserQA:false,deviceFPSMeasured:false};
 fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2)+'\n');fs.writeFileSync(out+'/tree-approaches.json',JSON.stringify(approaches,null,2)+'\n');fs.writeFileSync(out+'/camp-after.json',JSON.stringify(after)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
