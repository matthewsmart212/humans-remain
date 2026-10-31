// Author one bounded, repeatable planting pass from the actual revision-68 terrain.
// Randomness is offline only; the game consumes the reviewed placement records.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'outskirts-'));
try {
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/world-roads';export * from './src/world-master-plan';export * from './src/east-approach';export * from './src/river-collision';export * from './src/tree-chopping';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs')});
 const m=require(path.join(tmp,'model.cjs')),saved=JSON.parse(fs.readFileSync('.qa/populate-layout-before.json')),base=saved.draft;
 m.installImportedArt(JSON.parse(fs.readFileSync('.qa/populate-artwork.json')).records);
 const zones=[
  ['northwest-grove','Northwest oak grove',950,880,430,5,'woodland'],
  ['west-near','West gathering grove',340,2100,390,5,'woodland'],
  ['west-lower','Lower west birches',210,3430,390,4,'woodland'],
  ['southwest-near','Southwest bracken pocket',1260,4200,400,4,'dry'],
  ['south-near','South meadow edge',2080,4480,410,4,'meadow'],
  ['southeast-near','Southeast rowans',3680,4100,420,4,'meadow'],
  ['east-near','Eastern stony pocket',4250,2770,430,5,'dry'],
  ['northeast-near','Northeast woodland',3920,1410,380,4,'woodland'],
  ['north-near','Northern birch grove',2580,370,440,5,'woodland'],
  ['northwest-outer','Outer northwest pines',-400,800,470,6,'woodland'],
  ['west-outer','Outer west oak grove',-1050,3550,470,6,'woodland'],
  ['southwest-outer','Southwest open scrub',-240,4410,430,4,'meadow'],
  ['east-outer','Outer eastern shelves',5270,2550,500,5,'dry'],
  ['south-outer','Southern trail grove',1550,5400,470,5,'meadow'],
 ];
 const palettes={
  woodland:{trees:['oak','oak','birch','birch','pine','rowan'],plants:['blue_sword_fern','hazel_scrub','ground_ivy','moss_cushions','juniper_cushion','bluebell_patch','meadow_fescue'],rocks:['moss_capped_boulder','lichen_twin_stones','split_forest_rock','forest_pebble_patch','mossy_flat_shelf']},
  dry:{trees:['pine','pine','rowan','deadwood','oak'],plants:['silver_sage','copper_bracken','russet_bilberry','golden_tussock','dusky_heather','dock_rosette'],rocks:['ochre_lone_boulder','rust_sandstone_fin','chalk_cracked_rock','dry_scree_scatter','layered_sandstone_shelf']},
  meadow:{trees:['rowan','birch','oak','birch'],plants:['meadow_fescue','meadow_fescue','meadow_yarrow','dock_rosette','amber_blackberry','golden_tussock','copper_bracken'],rocks:['smooth_river_boulder','river_stone_trio','flat_river_slab','forest_pebble_patch','broad_granite_erratic']},
 };
 let seed=161026;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),choose=a=>a[Math.floor(rand()*a.length)];
 const s=m.EAST_TERRAIN_SCALE,world=([x,y])=>[(x-600)*s,(y-600)*s],source=([x,y])=>[x/s+600,y/s+600];
 const segment=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t)};
 const inside=(x,y,poly)=>{let v=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])v=!v;}return v;};
 const camp=m.WORLD_PLAN_DISTRICTS.find(d=>d.id==='camp').outline;
 const routes=m.WORLD_ROADS.map(r=>({id:r.id,points:r.sourcePoints,half:r.width/2}));
 const roadClear=(x,y,pad)=>routes.every(r=>r.points.slice(1).every((b,i)=>segment(x,y,r.points[i],b)>r.half+pad));
 const additions=[],groups=[];
 function safe(p,kind){
  const [sx,sy]=source([p.x,p.y]),a=m.ASSET_BY_ID.get(p.assetId),b=m.placementBounds(p);
  if(inside(sx,sy,camp)||camp.some((v,i)=>segment(sx,sy,v,camp[(i+1)%camp.length])<110))return false;
  if(!roadClear(sx,sy,kind==='tree'?150:kind==='plant'?65:130)||m.riverWaterBlocked(p.x,p.y,kind==='tree'?160:100))return false;
  if(m.layoutBlocked(base,p.x,p.y,kind==='plant'?35:100))return false;
  if(kind==='tree'){
   // Crown samples protect exits and route readability as well as trunk access.
   for(const [u,v] of [[.2,.35],[.8,.35],[.5,.15],[.5,.55],[.5,.9]]){const [x,y]=source([b.x+b.width*u,b.y+b.height*v]);if(!roadClear(x,y,38))return false;}
   if(additions.some(q=>q.kind==='tree'&&Math.hypot(q.p.x-p.x,q.p.y-p.y)<Math.max(195,(b.width+m.placementBounds(q.p).width)*.55)))return false;
  }else if(kind==='plant'){
   if(base.items.some(q=>m.ASSET_BY_ID.get(q.assetId)?.foliage&&Math.hypot(q.x-p.x,q.y-p.y)<65))return false;
   if(additions.some(q=>q.kind==='plant'&&Math.hypot(q.p.x-p.x,q.p.y-p.y)<68))return false;
  }
  if(kind!=='plant'&&additions.some(q=>q.kind!=='plant'&&Math.hypot(q.p.x-p.x,q.p.y-p.y)<(kind==='tree'||q.kind==='tree'?150:175)))return false;
  // Avoid covering existing buildings, doors and owner-placed props.
  if(base.items.some(q=>{const qa=m.ASSET_BY_ID.get(q.assetId);if(!qa||qa.foliage||qa.puddle)return false;const r=m.placementBounds(q);return p.x>r.x-90&&p.x<r.x+r.width+90&&p.y>r.y-50&&p.y<r.y+r.height+100;}))return false;
  return true;
 }
 for(let zi=0;zi<zones.length;zi++){
  const [id,name,cx,cy,radius,count,biome]=zones[zi],palette=palettes[biome],own=[];
  const spot=()=>{const angle=rand()*Math.PI*2,r=Math.sqrt(rand())*radius;return [cx+Math.cos(angle)*r,cy+Math.sin(angle)*r*.8];};
  for(const [kind,total] of [['tree',count],['rock',3],['log',biome==='woodland'&&zi%2===0?1:0],['plant',biome==='dry'?16:23]]){
   let made=0;
   for(let attempt=0;made<total&&attempt<1500;attempt++){
    let pt=spot();
    if(kind==='plant'&&rand()<.72&&own.length){const anchor=choose(own.filter(q=>q.kind!=='plant'));if(anchor){const [x,y]=source([anchor.p.x,anchor.p.y]),angle=rand()*Math.PI*2,r=90+rand()*210;pt=[x+Math.cos(angle)*r,y+Math.sin(angle)*r];}}
    const assetId=kind==='tree'?'art_tree_'+choose(palette.trees):kind==='plant'?'art_foliage_world_'+choose(palette.plants):kind==='rock'?'art_rock_'+palette.rocks[(zi+made)%palette.rocks.length]:'art_scenery_'+(zi%4?'hollow_birch_log':'mossy_fallen_oak');
    const [x,y]=world(pt),p={...m.newPlacement(assetId,+x.toFixed(1),+y.toFixed(1)),id:`camp-outskirts-v1-${id}-${kind}-${made+1}`,scale:+(kind==='tree'?.82+rand()*.26:kind==='plant'?.7+rand()*.38:kind==='log'?.7+rand()*.22:.68+rand()*.38).toFixed(3),locked:false,...(kind==='plant'?{rotation:Math.round(rand()*18-9+360)%360,allowTransparency:false}:{})};
    if(!safe(p,kind))continue;
    const item={kind,zone:id,p};additions.push(item);own.push(item);made++;
   }
   if(made!==total)console.log(`${id}: ${kind} ${made}/${total}`);
  }
  groups.push({id,name,sourceCentre:[cx,cy],radius,biome,counts:Object.fromEntries(['tree','plant','rock','log'].map(k=>[k,own.filter(q=>q.kind===k).length]))});
 }
 fs.mkdirSync('docs/qa/camp-outskirts-v1',{recursive:true});
 fs.writeFileSync('src/camp-outskirts-planting.json',JSON.stringify({version:1,groups,placements:additions.map(q=>q.p)},null,2)+'\n');
 const report={sourceRevision:saved.revision,existing:base.items.length,added:additions.length,counts:Object.fromEntries(['tree','plant','rock','log'].map(k=>[k,additions.filter(q=>q.kind===k).length])),groups};
 fs.writeFileSync('docs/qa/camp-outskirts-v1/planting-report.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
