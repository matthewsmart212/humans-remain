// Offline composition on the installed terrain. The game loads reviewed placements,
// never random scatter or biome generation in its animation loop.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'world-planting-')),out='docs/qa/world-planting-v1';
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/world-roads';export * from './src/world-master-plan';export * from './src/world-bounds';export * from './src/east-approach';export * from './src/river-collision';export * from './src/tree-chopping';export * from './src/woodland-zones';export * from './src/camp-collision';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs')});
 const m=require(path.join(tmp,'model.cjs')),saved=JSON.parse(fs.readFileSync(out+'/before.json')),base=m.refineApprovedWoodlandZones(saved.draft);
 m.installImportedArt(JSON.parse(fs.readFileSync('.qa/world-plant-artwork.json')).records);
 const s=m.EAST_TERRAIN_SCALE,world=([x,y])=>[(x-600)*s,(y-600)*s],source=p=>[p.x/s+600,p.y/s+600];
 let seed=171058;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),choose=a=>a[Math.floor(rand()*a.length)];
 const palettes={
  pine:{plants:['juniper_cushion','juniper_cushion','dusky_heather','copper_bracken','moss_cushions'],rocks:['lichen_twin_stones','split_forest_rock','forest_pebble_patch'],log:'twisted_root_log'},
  birch:{plants:['blue_sword_fern','blue_sword_fern','ground_ivy','bluebell_patch','meadow_fescue'],rocks:['moss_capped_boulder','mossy_flat_shelf','forest_pebble_patch'],log:'hollow_birch_log'},
  oak:{plants:['hazel_scrub','hazel_scrub','ground_ivy','blue_sword_fern','moss_cushions'],rocks:['split_forest_rock','moss_capped_boulder','forest_pebble_patch'],log:'mossy_fallen_oak'},
  dry:{plants:['silver_sage','silver_sage','golden_tussock','dusky_heather','russet_bilberry'],rocks:['broad_granite_erratic','lichen_twin_stones','dry_scree_scatter'],log:'twisted_root_log'},
  snag:{plants:['silver_sage','golden_tussock','golden_tussock','copper_bracken'],rocks:['dark_basalt_blocks','broad_granite_erratic','dry_scree_scatter'],log:'twisted_root_log'},
  meadow:{plants:['meadow_fescue','meadow_fescue','meadow_yarrow','dock_rosette','amber_blackberry'],rocks:['ochre_lone_boulder','chalk_cracked_rock','dry_scree_scatter'],log:'mossy_fallen_oak'},
  warm:{plants:['golden_tussock','copper_bracken','russet_bilberry','amber_blackberry'],rocks:['layered_sandstone_shelf','rust_sandstone_fin','dry_scree_scatter'],log:'twisted_root_log'},
  wet:{plants:['river_sedge','river_sedge','wetland_butterbur','willow_scrub','reed_cluster'],rocks:['smooth_river_boulder','flat_river_slab','river_shingle_patch'],log:'mossy_fallen_oak'},
 };
 // Broad regions, with one tree family per grove. Their irregular local shapes
 // cross terrain tile boundaries and leave room for district buildings later.
 const regions=[
  {id:'logging-pines',name:'Logging pine woods',rect:[-6800,-5550,4000,4500],groves:10,tree:'pine',palette:'pine',form:'forest'},
  {id:'northern-birches',name:'Northern birch woods',rect:[-2750,-5550,5100,4700],groves:10,tree:'birch',palette:'birch',form:'woodland'},
  {id:'village-oaks',name:'Village oak margins',rect:[2350,-5400,4400,4700],groves:8,tree:'oak',palette:'oak',form:'woodland'},
  {id:'factory-ridge',name:'Factory pine and stone ridge',rect:[6900,-5500,5300,4900],groves:8,tree:'pine',palette:'dry',form:'heath'},
  {id:'western-oaks',name:'Western deep oak woods',rect:[-6800,-650,2150,6200],groves:8,tree:'oak',palette:'oak',form:'forest'},
  {id:'north-passage',name:'Northern birch passage',rect:[750,-800,4700,950],groves:3,tree:'birch',palette:'birch',form:'woodland'},
  {id:'eastern-pines',name:'Eastern pine heath',rect:[4700,-450,4150,6500],groves:10,tree:'pine',palette:'pine',form:'woodland'},
  {id:'eastern-hollows',name:'Weathered eastern hollows',rect:[9250,200,2900,5950],groves:8,tree:'deadwood',palette:'snag',form:'scree'},
  {id:'waterworks-woods',name:'Waterworks fern woods',rect:[-6700,5600,3300,4700],groves:7,tree:'oak',palette:'oak',form:'woodland'},
  {id:'lake-meadows',name:'Lake and southern clearings',rect:[-1500,5800,5200,3700],groves:8,tree:'rowan',palette:'meadow',form:'meadow'},
  {id:'southwest-heath',name:'Southwestern rocky heath',rect:[-6650,10600,4100,2500],groves:5,tree:'pine',palette:'dry',form:'heath'},
  {id:'southern-meadows',name:'Open southern meadows',rect:[-1400,9700,5450,3450],groves:8,tree:'rowan',palette:'meadow',form:'meadow'},
  {id:'scrapyard-scrub',name:'Scrapyard stony scrub',rect:[4700,6400,7400,3750],groves:8,tree:'deadwood',palette:'snag',form:'scree'},
  {id:'southeast-rowans',name:'Southeastern rowan heath',rect:[4650,10600,7450,2600],groves:8,tree:'rowan',palette:'warm',form:'meadow'},
 ];
 const segment=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t)};
 function grid(size){const cells=new Map();return{insert(value,x,y,r=0){for(let a=Math.floor((x-r)/size);a<=Math.floor((x+r)/size);a++)for(let b=Math.floor((y-r)/size);b<=Math.floor((y+r)/size);b++){const key=a+','+b,list=cells.get(key)||[];list.push(value);cells.set(key,list);}},query(x,y,r=0){const found=new Set();for(let a=Math.floor((x-r)/size);a<=Math.floor((x+r)/size);a++)for(let b=Math.floor((y-r)/size);b<=Math.floor((y+r)/size);b++)for(const q of cells.get(a+','+b)||[])found.add(q);return [...found];}}}
 const roads=grid(400),segments=[];
 for(const road of m.WORLD_ROADS)for(let i=1;i<road.sourcePoints.length;i++){const a=road.sourcePoints[i-1],b=road.sourcePoints[i],q={a,b,width:road.width};segments.push(q);roads.insert(q,(a[0]+b[0])/2,(a[1]+b[1])/2,Math.hypot(b[0]-a[0],b[1]-a[1])/2+road.width/2+230);}
 const roadClear=(x,y,pad)=>roads.query(x,y,pad).every(q=>segment(x,y,q.a,q.b)>q.width/2+pad);
 const nearestRoad=(x,y)=>Math.min(...segments.map(q=>segment(x,y,q.a,q.b)));
 const pointIn=(x,y,poly)=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
 const reservations=m.WORLD_PLAN_DISTRICTS.filter(d=>d.id!=='camp'&&d.id!=='meadow').map(d=>({id:d.id,polygon:d.outline.map(([x,y])=>[d.centre[0]+(x-d.centre[0])*.68,d.centre[1]+(y-d.centre[1])*.68])}));
 const railClear=(x,y,pad)=>m.WORLD_PLAN_RAIL.every(r=>r.points.slice(1).every((b,i)=>segment(x,y,r.points[i],b)>190+pad));
 const futureWaterClear=(x,y,pad)=>m.WORLD_PLAN_RIVERS.filter(r=>r.id!=='western-river').every(r=>r.points.slice(1).every((b,i)=>segment(x,y,r.points[i],b)>r.width/2+100+pad));
 const reserveClear=(x,y,pad=0)=>!reservations.some(r=>pointIn(x,y,r.polygon))&&railClear(x,y,pad)&&futureWaterClear(x,y,pad);
 const protectedCamp=(x,y)=>x>-200&&x<4650&&y>0&&y<4800;
 const baseGrid=grid(350),plantGrid=grid(180),solidGrid=grid(350);
 for(const p of base.items){const b=m.placementBounds(p),plant=!!m.ASSET_BY_ID.get(p.assetId)?.foliage;baseGrid.insert({p,b,plant},p.x,p.y,Math.max(b.width,b.height)+150);if(plant)plantGrid.insert(p,p.x,p.y);else solidGrid.insert({p,kind:m.TREE_ART.has(p.assetId)?'tree':'rock'},p.x,p.y);}
 const additions=[],groups=[],centres=[];const maxNew=2100;
 function safe(p,kind,wet=false){
  const [sx,sy]=source(p),b=m.placementBounds(p),plant=kind==='plant',tree=kind==='tree';
  const groundRadius=Math.max(0,...m.placementBodies(p).flatMap(body=>{const r=m.colliderBounds(body);return [[r.left,r.top],[r.right,r.top],[r.left,r.bottom],[r.right,r.bottom]].map(([x,y])=>Math.hypot(x-p.x,y-p.y));}));
  if(sx< -6900||sx>12400||sy< -5850||sy>13400||protectedCamp(sx,sy)||!m.campContains(base,p.x,p.y,160))return false;
  if(!reserveClear(sx,sy,plant?30:100)||!roadClear(sx,sy,Math.max(tree?160:plant?65:135,groundRadius/s+65)))return false;
  if(m.RIVER_BRIDGES.some(q=>segment(sx,sy,q.from,q.to)<q.width/2+Math.max(tree?250:180,groundRadius/s+70)))return false;
  if(m.riverWaterBlocked(p.x,p.y,Math.max(tree?155:plant?60:115,groundRadius+40)))return false;
  if(wet&&!m.riverWaterBlocked(p.x,p.y,tree?850:600))return false;
  for(const [u,v] of (tree?[[.15,.2],[.5,.08],[.85,.2],[.15,.6],[.5,.6],[.85,.6],[.5,.95]]:[[.12,.6],[.88,.6],[.5,.15],[.5,.95]])){
   const x=b.x+b.width*u,y=b.y+b.height*v,[tx,ty]=source({x,y});if(m.riverWaterBlocked(x,y,30)||!roadClear(tx,ty,tree?40:15)||!reserveClear(tx,ty,10))return false;
  }
  if(baseGrid.query(p.x,p.y,200).some(q=>q.plant?Math.hypot(q.p.x-p.x,q.p.y-p.y)<(plant?85:250):p.x>q.b.x-150&&p.x<q.b.x+q.b.width+150&&p.y>q.b.y-100&&p.y<q.b.y+q.b.height+170))return false;
  if(plant){if(plantGrid.query(p.x,p.y,100).some(q=>Math.hypot(q.x-p.x,q.y-p.y)<80))return false;}
  else if(solidGrid.query(p.x,p.y,800).some(q=>Math.hypot(q.p.x-p.x,q.p.y-p.y)<(tree&&q.kind==='tree'?Math.max(250,(b.width+m.placementBounds(q.p).width)*.57):tree||q.kind==='tree'?180:Math.max(150,(b.width+m.placementBounds(q.p).width)*.48))))return false;
  return true;
 }
 function make(id,kind,assetId,pt,scale){const [x,y]=world(pt);return{...m.newPlacement(assetId,+x.toFixed(1),+y.toFixed(1)),id,scale:+scale.toFixed(3),locked:false,...(kind==='plant'?{rotation:Math.round(rand()*24-12+360)%360,allowTransparency:false}:{})};}
 function centreOkay(cx,cy,wet){
  const [x,y]=world([cx,cy]);if(protectedCamp(cx,cy)||!reserveClear(cx,cy,160)||!roadClear(cx,cy,210)||!m.campContains(base,x,y,500))return false;
  if(m.riverWaterBlocked(x,y,wet?185:660))return false;
  if(centres.some(q=>Math.hypot(q[0]-cx,q[1]-cy)<(wet?750:1000)))return false;
  const nearby=baseGrid.query(x,y,700);if(nearby.filter(q=>Math.hypot(q.p.x-x,q.p.y-y)<700).length>5)return false;
  return true;
 }
 function plantGrove(region,cx,cy,number,wet=false){
  const id=region.id+'-'+number,palette=palettes[region.palette],angle=rand()*Math.PI*2,rx=region.form==='forest'?580:region.form==='woodland'?510:480,ry=rx*(.48+rand()*.25),own=[];
  const counts=region.form==='forest'?[5+(number%3===0?1:0),14,3,number%2===0?1:0]:region.form==='woodland'?[4,11,2,number%3===0?1:0]:region.form==='heath'?[2,8,3,0]:region.form==='scree'?[2,6,4,number%4===0?1:0]:wet?[2,11,2,0]:[1,9,2,0];
  const spot=()=>{const a=rand()*Math.PI*2,r=Math.sqrt(rand()),dx=Math.cos(a)*rx*r,dy=Math.sin(a)*ry*r;return[cx+dx*Math.cos(angle)-dy*Math.sin(angle),cy+dx*Math.sin(angle)+dy*Math.cos(angle)];};
  for(const [ki,kind] of ['tree','rock','log','plant'].entries()){
   const total=counts[{tree:0,plant:1,rock:2,log:3}[kind]];let made=0;
   for(let attempt=0;made<total&&attempt<600&&additions.length<maxNew;attempt++){
    let pt=spot();const anchors=own.filter(q=>q.kind!=='plant');
    if(kind==='plant'&&anchors.length&&rand()<.72){const [ax,ay]=source(choose(anchors).p),a=rand()*Math.PI*2,r=90+rand()*220;pt=[ax+Math.cos(a)*r,ay+Math.sin(a)*r];}
    const landmark=kind==='rock'&&made===0&&number%4===0&&!wet;
    const assetId=kind==='tree'?'art_tree_'+region.tree:kind==='plant'?'art_foliage_world_'+choose(palette.plants):kind==='log'?'art_scenery_'+palette.log:landmark?'art_scenery_'+(region.palette==='warm'||region.palette==='meadow'?'ochre_crag':'slate_ridge'):'art_rock_'+palette.rocks[made%palette.rocks.length];
    if(!m.ASSET_BY_ID.has(assetId))throw Error('Missing asset '+assetId);
    const scale=kind==='tree'?.76+rand()*.4:kind==='plant'?.72+rand()*.42:landmark?1.1+rand()*.28:kind==='log'?.75+rand()*.25:.78+rand()*.38;
    const p=make('world-plant-v1-'+id+'-'+kind+'-'+(made+1),kind,assetId,pt,scale);
    if(!safe(p,kind,wet))continue;const q={kind,region:region.id,group:id,p};additions.push(q);own.push(q);made++;if(kind==='plant')plantGrid.insert(p,p.x,p.y);else solidGrid.insert({p,kind},p.x,p.y);
   }
  }
  if(own.length){centres.push([cx,cy]);groups.push({id,region:region.id,name:region.name,tree:region.tree,sourceCentre:[Math.round(cx),Math.round(cy)],radius:rx,counts:Object.fromEntries(['tree','plant','rock','log'].map(k=>[k,own.filter(q=>q.kind===k).length]))});}
 }
 // Both banks along actual installed water, including the wide lake. Existing
 // camp-side planting is protected; empty opposite banks receive new pockets.
 let bank=0;
 for(const sy of [-5500,-4100,-2700,-1250,150,1500,2850,4300,5750,7100,8450,9800,11150,12500]){
  const wet=[];for(let sx=-6650;sx< -600;sx+=45){const [x,y]=world([sx,sy]);if(m.riverWaterBlocked(x,y,0))wet.push(sx);}if(!wet.length)continue;
  for(const [edge,side] of [[wet[0],-1],[wet.at(-1),1]])for(let attempt=0;attempt<45;attempt++){
   const cx=edge+side*(330+rand()*210),cy=sy+(rand()-.5)*400;if(!centreOkay(cx,cy,true))continue;
   plantGrove({id:'river-willows',name:'River and lake willow banks',tree:'willow',palette:'wet',form:'wet'},cx,cy,++bank,true);break;
  }
 }
 // Balanced rounds mean every region receives scenery before any receives its
 // second grove. Candidate centres are irregular and biased toward discoveries
 // beside routes, with off-road pockets for exploration.
 for(let number=1;number<=10;number++)for(const region of regions){
  if(number>region.groves)continue;const [x,y,w,h]=region.rect;let found;
  for(let attempt=0;attempt<700;attempt++){
   const cx=x+rand()*w,cy=y+rand()*h;if(!centreOkay(cx,cy,false))continue;
   const distance=nearestRoad(cx,cy);if(number%3!==0&&distance>1550&&attempt<400)continue;
   found=[cx,cy];break;
  }
  if(found)plantGrove(region,...found,number);else console.log('No clear centre: '+region.id+'-'+number);
 }
 const report={sourceRevision:saved.revision,existing:base.items.length,added:additions.length,total:base.items.length+additions.length,remainingEditorSlots:5000-base.items.length-additions.length,groves:groups.length,counts:Object.fromEntries(['tree','plant','rock','log'].map(k=>[k,additions.filter(q=>q.kind===k).length])),regions:[...regions.map(r=>({id:r.id,name:r.name,tree:r.tree,groves:groups.filter(g=>g.region===r.id).length,placements:additions.filter(q=>q.region===r.id).length})),{id:'river-willows',name:'River and lake willow banks',tree:'willow',groves:groups.filter(g=>g.region==='river-willows').length,placements:additions.filter(q=>q.region==='river-willows').length}]};
 fs.writeFileSync('src/world-planting.json',JSON.stringify({version:1,regions:report.regions,reservations,groups,placements:additions.map(q=>q.p)},null,2)+'\n');
 fs.writeFileSync(out+'/planting-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
