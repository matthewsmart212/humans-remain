// Refine the existing authored planting; no new trees or per-frame scatter.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'woodland-zones-')),out='docs/qa/woodland-zones-v1';
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/east-approach';export * from './src/world-roads';export * from './src/river-collision';export * from './src/tree-chopping';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs')});
 const m=require(path.join(tmp,'model.cjs')),batches=['camp-outskirts','camp-river'].map(name=>({prefix:name+'-v1-',...JSON.parse(fs.readFileSync('src/'+name+'-planting.json'))}));
 const zones={
  birch:{name:'Northern birch woodland',tree:'birch',plants:['meadow_fescue','blue_sword_fern','bluebell_patch','ground_ivy']},
  oak:{name:'Western oak woodland',tree:'oak',plants:['hazel_scrub','blue_sword_fern','ground_ivy','moss_cushions','copper_bracken']},
  pine:{name:'Eastern pine ridge',tree:'pine',plants:['juniper_cushion','silver_sage','dusky_heather','golden_tussock','copper_bracken']},
  rowan:{name:'Southern rowan meadow',tree:'rowan',plants:['meadow_fescue','amber_blackberry','copper_bracken','dock_rosette','meadow_yarrow']},
  willow:{name:'Lower riverside willows',tree:'willow',plants:['willow_scrub','river_sedge','wetland_butterbur','blue_sword_fern']},
 };
 const assigned={
  'camp-outskirts':{birch:['northwest-grove','north-near','northwest-outer'],oak:['west-near','west-lower','west-outer'],pine:['southeast-near','east-near','northeast-near','east-outer'],rowan:['southwest-near','south-near','southwest-outer','south-outer']},
  'camp-river':{birch:['north-trail','stream-east','stream-head','stream-meadow','west-upper'],oak:['upper-glade','upper-link','river-bend','west-trail-north','central-rise','middle-meadow','lower-link','southern-birches'],willow:['bridge-glade','west-trail-south','river-shelf','lower-riverside'],rowan:['south-meadow','bridge-scrub','south-link']},
 };
 const hash=str=>{let h=2166136261;for(const c of str)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
 const segment=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t)};
 const roadClear=(x,y)=>m.WORLD_ROADS.every(r=>r.sourcePoints.slice(1).every((b,i)=>segment(x,y,r.sourcePoints[i],b)>r.width/2+32));
 const crownClear=p=>{const b=m.placementBounds(p);for(const u of [.12,.38,.62,.88])for(const v of [.1,.3,.5,.7]){const x=b.x+b.width*u,y=b.y+b.height*v;if(m.riverWaterBlocked(x,y,30)||!roadClear(x/m.EAST_TERRAIN_SCALE+600,y/m.EAST_TERRAIN_SCALE+600))return false;}return true;};
 function scaleFor(p,assetId,tree){
  const old=m.placementBounds(p),next=m.placementBounds({...p,assetId,scale:1});
  let scale=tree?Math.min(p.scale,old.height/next.height):Math.min(p.scale,(p.x-old.x)/(p.x-next.x),(old.x+old.width-p.x)/(next.x+next.width-p.x),(p.y-old.y)/(p.y-next.y),(old.y+old.height-p.y)/(next.y+next.height-p.y));
  if(tree)while(scale>.26&&!crownClear({...p,assetId,scale}))scale*=.97;
  scale=Math.max(.25,Math.floor(scale*1000)/1000);
  if(tree&&!crownClear({...p,assetId,scale}))throw Error('No clear crown for '+p.id);
  return scale;
 }
 const changes=[],groups=[],treeCounts={},foliageCounts={};
 for(const batch of batches){
  const assignments=assigned[batch.prefix.slice(0,-4)];
  for(const g of batch.groups){
   const zone=Object.keys(assignments).find(z=>assignments[z].includes(g.id));if(!zone)throw Error('Missing zone '+g.id);
   const palette=zones[zone],items=batch.placements.filter(p=>p.id.startsWith(batch.prefix+g.id+'-')),trees=items.filter(p=>m.TREE_ART.has(p.assetId));
   const group={id:batch.prefix+g.id,zone,sourceCentre:g.sourceCentre,treeIds:trees.map(p=>p.id),beforeSpecies:[...new Set(trees.map(p=>p.assetId))],afterSpecies:trees.length?['art_tree_'+palette.tree]:[]};groups.push(group);
   for(const p of items){
    const isTree=m.TREE_ART.has(p.assetId),isPlant=!!m.ASSET_BY_ID.get(p.assetId)?.foliage;if(!isTree&&!isPlant)continue;
    let assetId;
    if(isTree){assetId='art_tree_'+palette.tree;treeCounts[zone]=(treeCounts[zone]||0)+1;}
    else{
     // Reeds and sedges remain specific to the actual bank, even at a woodland transition.
     const nearWater=m.riverWaterBlocked(p.x,p.y,340),names=nearWater?['river_sedge','willow_scrub','alder_sapling','wetland_butterbur','reed_cluster']:palette.plants;
     const allowed=names.map(n=>'art_foliage_world_'+n);assetId=allowed.includes(p.assetId)?p.assetId:allowed[hash(p.id)%allowed.length];
     foliageCounts[zone]=(foliageCounts[zone]||0)+1;
    }
    if(assetId!==p.assetId)changes.push({id:p.id,assetId,scale:scaleFor(p,assetId,isTree)});
   }
  }
 }
 const data={version:1,zones:Object.entries(zones).map(([id,z])=>({id,name:z.name,tree:z.tree,trees:treeCounts[id]||0})),groups,changes};
 fs.writeFileSync('src/woodland-zones.json',JSON.stringify(data,null,2)+'\n');
 const report={groups:groups.length,treeGroves:groups.filter(g=>g.treeIds.length).length,trees:Object.values(treeCounts).reduce((a,b)=>a+b,0),treeCounts,foliageCounts,changed:changes.length,changedTrees:changes.filter(p=>m.TREE_ART.has(p.assetId)).length,changedFoliage:changes.filter(p=>m.ASSET_BY_ID.get(p.assetId)?.foliage).length,beforeMeanSpeciesPerGrove:groups.reduce((n,g)=>n+g.beforeSpecies.length,0)/groups.filter(g=>g.treeIds.length).length,afterMaxSpeciesPerGrove:1};
 fs.writeFileSync(out+'/zone-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
