// Compose a sparse, irregular transition from the actual existing leaf edge.
// Writes compact reviewed instance data; the game does no noise/scatter work.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-fringe-')),out='docs/qa/camp-feather-v1';
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/world-roads';export * from './src/world-bounds';export * from './src/east-approach';export * from './src/river-collision';export * from './src/camp-fringe';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs')});
 const m=require(path.join(tmp,'model.cjs')),saved=JSON.parse(fs.readFileSync(out+'/before.json')),base=saved.draft,s=m.EAST_TERRAIN_SCALE;
 m.installImportedArt(JSON.parse(fs.readFileSync('.qa/camp-feather-artwork.json')).records);
 const natural=base.items.filter(p=>p.id.startsWith('camp-natural-v1-')).map(p=>{const b=m.placementBounds(p);return{p,x:b.x+b.width*.5,y:b.y+b.height*.5};});
 const old=m.originalCampBounds(),edge={left:old.left+75,top:old.top+65,right:old.right-95,bottom:old.bottom-105};
 const assets=[...new Set(natural.map(q=>q.p.assetId))],items=[],details=[];
 let seed=171079;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),choose=a=>a[Math.floor(rand()*a.length)],clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const hash=(x,y,k)=>{let h=Math.imul(x^k,374761393)+Math.imul(y,668265263);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};
 const smooth=n=>n*n*(3-2*n);
 const noise=(x,y,span,k)=>{x/=span;y/=span;const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy);return(hash(ix,iy,k)*(1-u)+hash(ix+1,iy,k)*u)*(1-v)+(hash(ix,iy+1,k)*(1-u)+hash(ix+1,iy+1,k)*u)*v;};
 const segment=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);};
 const routes=m.WORLD_ROADS.flatMap(r=>r.sourcePoints.slice(1).map((b,i)=>({a:r.sourcePoints[i],b,half:r.width/2})));
 const roadClear=(x,y,pad)=>routes.every(r=>segment(x/s+600,y/s+600,r.a,r.b)>r.half+pad/s);
 const candidates=[];
 // Jittered samples are shuffled before acceptance, so no edge gets priority.
 for(let y=edge.top-1450;y<edge.bottom+1450;y+=72)for(let x=edge.left-1450;x<edge.right+1450;x+=72)candidates.push([x+(rand()-.5)*68,y+(rand()-.5)*68,rand()]);
 candidates.sort((a,b)=>a[2]-b[2]);
 for(const [cx,cy] of candidates){
  const qx=clamp(cx,edge.left,edge.right),qy=clamp(cy,edge.top,edge.bottom),distance=Math.hypot(cx-qx,cy-qy);
  // Keep the entire established patch. Only a tiny seam overlap joins crowns.
  if(cx>edge.left+20&&cx<edge.right-20&&cy>edge.top+20&&cy<edge.bottom-20)continue;
  const reach=600+noise(qx,qy,610,101)*950+Math.sin((qx+qy)*.0043)*140;
  const t=distance/reach;if(t>1)continue;
  const nearby=natural.map(q=>({q,d:Math.hypot(q.x-qx,q.y-qy)})).filter(q=>q.d<420).sort((a,b)=>a.d-b.d);
  if(!nearby.length)continue;
  const continuity=clamp(nearby.reduce((n,q)=>n+Math.exp(-q.d*q.d/(2*180*180)),0)/4,.05,1);
  const clumps=clamp((noise(cx,cy,285,53)-.2)*1.7,0,1);
  const chance=1.7*continuity*Math.pow(1-t,2.15)*(.3+.7*clumps);
  if(rand()>chance)continue;
  const low=rand()<.16+t*.65,palette=low?['art_foliage_forest_ivy','art_foliage_forest_ivy','art_foliage_fern','art_foliage_ochre_meadow_grass']:nearby.slice(0,7).map(q=>q.q.p.assetId);
  const assetId=choose(palette),a=m.ASSET_BY_ID.get(assetId),width=(low?78+rand()*34:132+rand()*55)*(1-t*.35),scale=+clamp(width/a.width,.25,3).toFixed(3);
  const x=+(cx+(a.anchor[0]/a.crop[2]-.5)*a.width*scale).toFixed(1),y=+(cy+(a.anchor[1]/a.crop[3]-.5)*a.height*scale).toFixed(1);
  const p={id:'candidate',assetId,x,y,scale,rotation:Math.round(rand()*22-11+360)%360,flipX:rand()<.5,locked:false,layer:0,solid:false,allowTransparency:false,roof:'auto',role:'prop'},b=m.placementBounds(p);
  if(!m.campFringePlacementClear(base,p)||!roadClear(x,y,62)||m.riverWaterBlocked(x,y,70))continue;
  if([[.1,.15],[.9,.15],[.1,.9],[.9,.9]].some(([u,v])=>{const [px,py]=m.placementPoint(p,b.x+b.width*u,b.y+b.height*v);return !roadClear(px,py,25)||m.riverWaterBlocked(px,py,25);}))continue;
  if(details.some(q=>Math.hypot(q.p.x-x,q.p.y-y)<Math.max(60,(q.width+width)*.31)))continue;
  items.push([assets.indexOf(assetId),x,y,scale,p.rotation,p.flipX?1:0]);
  const side=cx<edge.left?'west':cx>edge.right?'east':cy<edge.top?'north':'south';details.push({p,width,distance,side,t});
 }
 if(items.length>650||base.items.length+items.length>4900)throw Error('Fringe exceeded its placement budget: '+items.length);
 const report={sourceRevision:saved.revision,existingPreserved:base.items.length,added:items.length,total:base.items.length+items.length,remainingEditorSlots:5000-base.items.length-items.length,edge,bySide:Object.fromEntries(['north','south','east','west'].map(side=>[side,details.filter(q=>q.side===side).length])),bands:[0,200,450,750,1100].map((start,i,a)=>{const end=a[i+1]??1500,b=details.filter(q=>q.distance>=start&&q.distance<end);return{from:start,to:end,count:b.length,averageWidth:Math.round(b.reduce((n,q)=>n+q.width,0)/Math.max(1,b.length))};}),additionalImages:0};
 fs.writeFileSync('src/camp-fringe.json',JSON.stringify({version:1,assets,items})+'\n');fs.writeFileSync(out+'/planting-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
