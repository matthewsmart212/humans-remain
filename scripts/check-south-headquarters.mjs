import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require('@napi-rs/canvas'),sharp=require('sharp');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hq-south-'));
const out=process.argv[2]||'.qa/headquarters-south';fs.mkdirSync(out,{recursive:true});
try{
 const modules=['world-assets','world-layout','imported-art','authored-world','headquarters-south-placement','headquarters-south-art','headquarters-roof','headquarters-interior','headquarters-wall-mask','studio-play','survival-engine','run-progression','placed-world-renderer','terrain-renderer','worker-renderer','survivor-art','camp-restoration','station-access','run-save'];
 await build({stdin:{contents:modules.map(n=>`export * from './src/${n}';`).join(''),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error'});
 const m=require(path.join(temp,'model.cjs')),snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
 m.installImportedArt(snapshot.records);
 const layout=m.prepareAuthoredWorld(snapshot.layout),hq=layout.items.find(p=>p.id===m.HEADQUARTERS_PLACEMENT_ID),b=m.placementBounds(hq);
 assert.equal(layout.headquartersSouthVersion,1);assert.equal(m.prepareAuthoredWorld(layout),layout);
 assert.equal(m.validateLayout(layout).layout.headquartersSouthVersion,1);
 const fire=layout.items.find(p=>p.role==='hearth');assert.equal(hq.rotation,0);
 assert.equal(hq.scale,1.3,'Preserve the owner-sized headquarters');
 assert.equal(layout.headquartersInteriorVersion,1);
 assert.equal(m.validateLayout(layout).layout.headquartersInteriorVersion,1);
 const hqBefore=snapshot.layout.items.find(p=>p.id===hq.id);assert.deepEqual(hq,hqBefore,'Keep the exact saved hall placement and dimensions');
 const point=(u,v)=>({x:b.x+u*b.width,y:b.y+v*b.height});
 const people=[[.44,.46],[.56,.46],[.44,.60],[.56,.60]].map(([u,v])=>point(u,v));
 for(const p of people){assert(m.insideBuilding(hq,p.x,p.y));assert(!m.layoutBlocked(layout,p.x,p.y,24),'Four independently clear standing positions');}
 for(let i=0;i<people.length;i++)for(let j=i+1;j<people.length;j++)assert(Math.hypot(people[i].x-people[j].x,people[i].y-people[j].y)>80);
 const legacy=structuredClone(layout);delete legacy.headquartersSouthVersion;
 const oldHall=legacy.items.find(p=>p.id===hq.id);Object.assign(oldHall,{x:2210.977308579538,y:742.1057490143437,layer:-4});
 const upgraded=m.placeSouthFacingHeadquarters(legacy);
 assert.deepEqual(upgraded.items.filter(p=>p.assetId.startsWith('camp_circular_wall_')),legacy.items.filter(p=>p.assetId.startsWith('camp_circular_wall_')),'Wall design and placements are untouched');
 const moved={...upgraded,items:upgraded.items.map(p=>p.id===hq.id?{...p,x:p.x+100}:p)};assert.equal(m.placeSouthFacingHeadquarters(moved),moved,'Later editor adjustments survive');
 const continued=m.createCampPlaySession(legacy);m.startExpedition(continued);const progress=JSON.stringify(continued.progression),inventory=JSON.stringify([continued.bag,continued.stock,continued.gear]);
 Object.assign(continued.player,point(.2,.8));assert(m.migrateSavedCampPerimeter(continued,[]));assert(!m.layoutBlocked(continued.layout,continued.player.x,continued.player.y,19),'Returning survivor cannot be trapped by new walls');
 assert.equal(JSON.stringify(continued.progression),progress);assert.equal(JSON.stringify([continued.bag,continued.stock,continued.gear]),inventory,'Continued runs retain health, resources, unlocks and equipment');
 const customFurniture={...layout,items:layout.items.map(p=>p.id==='63081463-b478-4601-8c5e-e8da8206f317'?{...p,x:p.x+15}:p)};assert.equal(m.fitHeadquartersInterior(customFurniture),customFurniture,'Later furniture edits survive');
 const beforeRefit={...snapshot.layout};delete beforeRefit.headquartersInteriorVersion;const refitted=m.fitHeadquartersInterior(beforeRefit);assert.deepEqual(refitted.items.find(p=>p.id===hq.id),hqBefore);
 for(const p of refitted.items.filter(p=>p.id.startsWith('hq-props-v1-')||p.assetId==='art_hq_storage_chest'||p.assetId==='art_camp_planning_board')){const [x,y]=m.placementPoint(hq,p.x,p.y,true);assert(x>b.x+b.width*.08&&x<b.x+b.width*.92&&y>b.y+b.height*.25&&y<b.y+b.height*.8,'Furniture anchors fit the resized room');}
 const masks=m.headquartersWallMasks(layout);assert.equal(m.headquartersWallMasks(layout),masks,'Reuse cached room masks');
 const maskCanvas=createCanvas(1536,1024),maskCtx=maskCanvas.getContext('2d');maskCtx.scale(1536/b.width,1024/b.height);maskCtx.translate(-b.x,-b.y);m.clipWallsOutsideHeadquarters(maskCtx,masks,b);maskCtx.fillStyle='#ff00ff';maskCtx.fillRect(b.x,b.y,b.width,b.height);
 const maskPixel=(u,v)=>maskCtx.getImageData(Math.round(u*1536),Math.round(v*1024),1,1).data[3];
 assert.equal(maskPixel(.5,.5),0,'Palisade pixels cannot appear in the room');assert.equal(maskPixel(.5,.18),0,'Palisade cannot appear through the broken rear wall');assert.equal(maskPixel(.01,.15),255,'Surrounding camp wall remains visible');
 const world=m.createCampPlaySession(layout);world.enemies=[];world.animals=[];world.loot=[];
 const door=point(.5,.96),back=point(.5,.39),bench=m.headquartersBench(world),dock=m.headquartersDock(bench);
 for(const target of [back,dock,...people]){const route=m.pathTo(door,target,world,10000,23);assert(route.length&&Math.hypot(route.at(-1).x-target.x,route.at(-1).y-target.y)<75,'Entrance reaches rear floor, table and four standing positions');}
 for(let t=0;t<=1;t+=.01){const x=door.x+(back.x-door.x)*t,y=door.y+(back.y-door.y)*t;assert(!m.layoutBlocked(layout,x,y,32),'64-unit central walking aisle');}
 Object.assign(world.player,dock);assert(m.openHeadquarters(world),'Planning table opens from its clear approach');world.stationPanel=undefined;
 const chest=layout.items.find(p=>p.assetId==='art_hq_storage_chest'),chestDock={x:chest.x,y:chest.y+50};assert(!m.layoutBlocked(layout,chestDock.x,chestDock.y,19));Object.assign(world.player,chestDock);assert.equal(m.nearbyChest(world),chest.id,'Resized supply chest remains accessible');
 assert(m.withinRoofApproach(hq,door.x,door.y));assert(m.withinRoofApproach(hq,back.x,back.y));
 assert(m.layoutBlocked(layout,...Object.values(point(.5,.32)),19),'Rear wall blocks walking through it');
 const original=snapshot.records.find(r=>r.id==='base_shelter_t1'),custom={...original,config:{...original.config,base:{...original.config.base,id:'future-owner-upload'}}};assert.equal(m.resolveSouthHeadquarters(custom),custom);
 const bundle=fs.readFileSync('native/bundled-art.ts','utf8');
 for(const name of ['cutaway','exterior','ruined','ruined-cutaway']){
  const url=m.HQ_SOUTH_ROOT+'/'+name+'.webp',file='public'+url,meta=await sharp(file).metadata();
  assert.deepEqual([meta.width,meta.height],[1536,1024]);assert(meta.hasAlpha);assert(bundle.includes(url),'Native offline bundle includes '+name);
 }
 const viewport={x:b.x-200,y:b.y-180,width:b.width+400,height:b.height+560};
 const local=layout.items.filter(p=>{const q=m.placementBounds(p);return q.x<viewport.x+viewport.width&&q.x+q.width>viewport.x&&q.y<viewport.y+viewport.height&&q.y+q.height>viewport.y});
 const redirects=JSON.parse(fs.readFileSync('server/lossless-artwork-redirects.json'));
 const images={},sources={...m.requiredImages(local.map(p=>p.assetId)),...m.SURVIVOR_IMAGE_SOURCES};
 for(const [key,url]of Object.entries(sources)){
  const resolved=redirects[url]||url;let file='public'+resolved;if(url.startsWith('/api/asset-files/'))file='native/assets/world/'+url.split('/').pop()+'.png';
  if(!fs.existsSync(file)){assert(!Object.hasOwn(m.SURVIVOR_IMAGE_SOURCES,key),'Character artwork must resolve: '+url);continue}images[key]=await loadImage(file);
 }
 m.startExpedition(world);
 const terrain=await loadImage('public/survival/camp-ground-v3/preview.webp');
 for(const broken of [false,true])for(const interior of [false,true]){
  const canvas=createCanvas(1600,1120),ctx=canvas.getContext('2d'),scale=1600/viewport.width;
  ctx.fillStyle='#31443b';ctx.fillRect(0,0,1600,1120);ctx.scale(scale,scale);ctx.translate(-viewport.x,-viewport.y);
  ctx.drawImage(terrain,-600,-600,4800,4800);
  world.layout={...layout,items:layout.items.map(p=>p===hq?{...p,roof:'auto'}:p)};
  world.progression.restoredBuildings=broken?[]:['headquarters'];world.progression.campLevel=broken?0:1;
  Object.assign(world.player,point(.5,interior?.61:1.18));
  m.drawPlacedGround(ctx,images,world.layout,false,viewport);
  const draws=m.placedDrawables(ctx,images,world,true,viewport);
  if(interior)for(const [i,p] of people.entries()){
   const actor=m.createCampPlaySession(layout);Object.assign(actor.player,p,{direction:['down','left','right','up'][i],equipped:undefined});
   draws.push({y:p.y,draw:()=>m.drawWorker(ctx,images,actor)});
  }
  draws.sort(m.compareWorldDrawables).forEach(d=>d.draw());
  fs.writeFileSync(path.join(out,`${broken?'ruined':'repaired'}-${interior?'interior':'exterior'}.png`),canvas.toBuffer('image/png'));
 }
 const report={result:'pass',placements:layout.items.length,room:{width:Math.round(b.width*.84),depth:Math.round(b.height*.44)},fourPlayers:true,centralAisle:64,entranceAndTableReachable:true,offlineNativeAssets:4,limit:'Shared production renderer and collision/navigation checks; no physical iPhone test'};
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
