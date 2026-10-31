// Offline authored planting only: no procedural scattering in the render loop.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'river-planting-')),out='docs/qa/camp-river-v1';
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/world-roads';export * from './src/east-approach';export * from './src/river-collision';export * from './src/river-layout';export * from './src/tree-chopping';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs')});
 const m=require(path.join(tmp,'model.cjs')),saved=JSON.parse(fs.readFileSync(out+'/before.json')),base=saved.draft;
 m.installImportedArt(JSON.parse(fs.readFileSync('.qa/river-artwork.json')).records);
 const s=m.EAST_TERRAIN_SCALE,world=([x,y])=>[(x-600)*s,(y-600)*s],source=p=>[p.x/s+600,p.y/s+600];
 let seed=171026;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),choose=a=>a[Math.floor(rand()*a.length)];
 const segment=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t)};
 const main=m.RIVER_BATCHES.flatMap(b=>b.corridor?.points||[]).filter(p=>p[1]>=-1800&&p[1]<=5996).sort((a,b)=>a[1]-b[1]);
 const eastBank=y=>{for(let i=1;i<main.length;i++)if(y>=main[i-1][1]&&y<=main[i][1]){const a=main[i-1],b=main[i],u=(y-a[1])/(b[1]-a[1]||1);return a[0]+(b[0]-a[0])*u;}return -3100;};
 // Deliberately uneven pockets, separated by meadow and the existing paths.
 const zones=[
 ['north-trail',-1540,-440,510,4,'woodland'],['stream-east',-1120,450,420,4,'woodland'],
 ['stream-head',-2320,350,320,2,'wet'],['stream-meadow',-1600,1350,510,4,'meadow'],
 ['west-upper',-3340,1050,400,4,'wet'],['upper-glade',-2640,1660,540,5,'woodland'],
 ['upper-link',-750,1860,450,4,'woodland'],['river-bend',-4070,1890,470,4,'wet'],
 ['west-trail-north',-3400,2280,470,4,'woodland'],['central-rise',-2040,2290,530,5,'woodland'],
 ['bridge-glade',-3830,3210,350,3,'wet'],['west-trail-south',-3030,3070,430,4,'woodland'],
 ['middle-meadow',-2020,3350,470,4,'meadow'],['lower-link',-1250,2630,440,3,'woodland'],
 ['southern-birches',-1950,4060,420,4,'woodland'],['river-shelf',-2330,3900,360,3,'wet'],
 ['lower-riverside',-1700,4590,330,3,'wet'],['south-meadow',-700,5050,450,4,'meadow'],
 ['bridge-scrub',-1470,5400,370,3,'meadow'],['south-link',120,4920,340,3,'meadow'],
 ];
 const palettes={
 woodland:{trees:['oak','birch','birch','pine','rowan'],plants:['blue_sword_fern','hazel_scrub','ground_ivy','moss_cushions','juniper_cushion','bluebell_patch','meadow_fescue'],rocks:['moss_capped_boulder','lichen_twin_stones','split_forest_rock','forest_pebble_patch','mossy_flat_shelf']},
 meadow:{trees:['birch','rowan','oak','birch'],plants:['meadow_fescue','meadow_fescue','meadow_yarrow','dock_rosette','amber_blackberry','golden_tussock','copper_bracken'],rocks:['ochre_lone_boulder','lichen_twin_stones','flat_river_slab','forest_pebble_patch']},
 wet:{trees:['willow','birch','birch','oak'],plants:['river_sedge','willow_scrub','alder_sapling','wetland_butterbur','blue_sword_fern','moss_cushions'],rocks:['smooth_river_boulder','river_stone_trio','flat_river_slab','moss_capped_boulder']},
 };
 const additions=[],groups=[],trees=base.items.filter(p=>m.TREE_ART.has(p.assetId)),basePlants=base.items.filter(p=>m.ASSET_BY_ID.get(p.assetId)?.foliage);
 const baseFeatures=base.items.filter(p=>{const a=m.ASSET_BY_ID.get(p.assetId);return a&&!a.foliage&&!a.puddle;}).map(p=>m.placementBounds(p));
 const roadClear=(x,y,pad)=>m.WORLD_ROADS.every(r=>r.sourcePoints.slice(1).every((b,i)=>segment(x,y,r.sourcePoints[i],b)>r.width/2+pad));
 const bridgeClear=(x,y,pad)=>m.RIVER_BRIDGES.every(b=>segment(x,y,b.from,b.to)>b.width/2+pad);
 function safe(p,kind){
  const [sx,sy]=source(p),b=m.placementBounds(p),isTree=kind==='tree',plant=kind==='plant';
  if(sx<eastBank(sy)+230||sx>450||sy< -850||sy>5680)return false;
  if(!roadClear(sx,sy,isTree?150:plant?60:125)||!bridgeClear(sx,sy,isTree?240:160))return false;
  if(m.riverWaterBlocked(p.x,p.y,isTree?150:plant?55:105)||m.layoutBlocked(base,p.x,p.y,plant?25:85))return false;
  // Protect the water silhouette and path readability, not only the trunk.
  for(const [u,v] of (isTree?[[.12,.25],[.5,.08],[.88,.25],[.15,.6],[.5,.6],[.85,.6],[.5,.9]]:[[.2,.6],[.8,.6],[.5,.15]])){
   const x=b.x+b.width*u,y=b.y+b.height*v,[tx,ty]=source({x,y});
   if(m.riverWaterBlocked(x,y,35)||!roadClear(tx,ty,isTree?35:10))return false;
  }
  if(baseFeatures.some(r=>p.x>r.x-90&&p.x<r.x+r.width+90&&p.y>r.y-50&&p.y<r.y+r.height+100))return false;
  if(isTree&&[...trees,...additions.filter(q=>q.kind==='tree').map(q=>q.p)].some(q=>Math.hypot(q.x-p.x,q.y-p.y)<Math.max(215,(b.width+m.placementBounds(q).width)*.59)))return false;
  if(plant&&(basePlants.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<75)||additions.some(q=>q.kind==='plant'&&Math.hypot(q.p.x-p.x,q.p.y-p.y)<73)))return false;
  if(!plant&&additions.some(q=>q.kind!=='plant'&&Math.hypot(q.p.x-p.x,q.p.y-p.y)<160))return false;
  return true;
 }
 function make(id,kind,assetId,pt,scale){const [x,y]=world(pt);return{...m.newPlacement(assetId,+x.toFixed(1),+y.toFixed(1)),id,scale:+scale.toFixed(3),locked:false,...(kind==='plant'?{rotation:Math.round(rand()*18-9+360)%360,allowTransparency:false}:{})};}
 for(let zi=0;zi<zones.length;zi++){
  const [id,cx,cy,radius,count,biome]=zones[zi],palette=palettes[biome],own=[];
  const spot=()=>{const a=rand()*Math.PI*2,r=Math.sqrt(rand())*radius;return[cx+Math.cos(a)*r,cy+Math.sin(a)*r*.78];};
  for(const [kind,total] of [['tree',count],['rock',biome==='meadow'?2:3],['log',zi%3===0?1:0],['plant',biome==='woodland'?21:biome==='wet'?19:16]]){
   let made=0;for(let attempt=0;made<total&&attempt<1800;attempt++){
    let pt=spot();const anchors=own.filter(q=>q.kind!=='plant');if(kind==='plant'&&anchors.length&&rand()<.62){const q=choose(anchors),[x,y]=source(q.p),a=rand()*Math.PI*2,r=80+rand()*230;pt=[x+Math.cos(a)*r,y+Math.sin(a)*r];}
    const assetId=kind==='tree'?'art_tree_'+choose(palette.trees):kind==='plant'?'art_foliage_world_'+choose(palette.plants):kind==='rock'?'art_rock_'+palette.rocks[(zi+made)%palette.rocks.length]:'art_scenery_'+choose(['mossy_fallen_oak','hollow_birch_log','twisted_root_log']);
    const p=make(`camp-river-v1-${id}-${kind}-${made+1}`,kind,assetId,pt,kind==='tree'?.78+rand()*.31:kind==='plant'?.66+rand()*.38:kind==='log'?.67+rand()*.22:.7+rand()*.32);
    if(!safe(p,kind))continue;const q={kind,zone:id,p};additions.push(q);own.push(q);made++;
   }
   if(made!==total)console.log(`${id}: ${kind} ${made}/${total}`);
  }
  groups.push({id,sourceCentre:[cx,cy],radius,biome,counts:Object.fromEntries(['tree','plant','rock','log'].map(k=>[k,own.filter(q=>q.kind===k).length]))});
 }
 // Broken, short riverside drifts follow the installed mask, including the
 // stream's separate spans. They never repaint or cover animated water.
 for(const [i,sy] of [-180,280,650,1050,1580,2100,2530,3230,3650,4100,4550,5050,5440].entries()){
  let edge;for(let x=-5500;x< -1000;x+=20){const [wx,wy]=world([x,sy]);if(m.riverWaterBlocked(wx,wy,0))edge=x;}
  if(edge===undefined)continue;let n=0;
  for(let attempt=0;n<5&&attempt<300;attempt++){
   const pt=[edge+95+rand()*130,sy+(rand()-.5)*270],assetId='art_foliage_world_'+choose(['river_sedge','river_sedge','reed_cluster','wetland_butterbur','willow_scrub']);
   const p=make(`camp-river-v1-bank-${i}-plant-${n+1}`,'plant',assetId,pt,.66+rand()*.25);
   if(!safe(p,'plant')||!m.riverWaterBlocked(p.x,p.y,320))continue;
   additions.push({kind:'plant',zone:'bank-drifts',p});n++;
  }
 }
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync('src/camp-river-planting.json',JSON.stringify({version:1,groups,placements:additions.map(q=>q.p)},null,2)+'\n');
 fs.writeFileSync(out+'/before.json',JSON.stringify(saved)+'\n');
 const report={sourceRevision:saved.revision,existing:base.items.length,added:additions.length,counts:Object.fromEntries(['tree','plant','rock','log'].map(k=>[k,additions.filter(q=>q.kind===k).length])),groups};
 fs.writeFileSync(out+'/planting-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
