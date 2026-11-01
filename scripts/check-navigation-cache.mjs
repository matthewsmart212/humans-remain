import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'navigation-cache-'));
try{
 await build({stdin:{contents:`export {default as snapshot} from './native/assets/world-snapshot.json';
  export {installImportedArt} from './src/imported-art';
  export {validateLayout,placementBodies,emptyLayout} from './src/world-layout';
  export {ASSET_BY_ID} from './src/world-assets';
  export {gateColliders} from './src/camp-gates';
  export {prepareAuthoredWorld} from './src/authored-world';
  export {createCampPlaySession} from './src/studio-play';
  export {pathTo,worldBlocked} from './src/survival-engine';
  export {worldBounds} from './src/world-bounds';
  export {groundFootprint} from './src/terrain-footprint';
  export {OUTDOOR_TILES,OUTDOOR_FOOTPRINT} from './src/outdoor-terrain';
  export {HOME_TERRAIN} from './src/terrain-art';
  export {EAST_TERRAIN_SCALE} from './src/east-approach';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs'),loader:{'.webp':'empty','.png':'empty','.ttf':'empty'},logLevel:'warning'});
 const m=createRequire(import.meta.url)(path.join(temp,'test.cjs'));
 let seed=20261101;const random=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff};

 // The previous uncached search, kept verbatim as the reference.
 const reference=(start,target,w,maxVisited,bodyRadius)=>{
  const size=45,bounds=m.worldBounds(w),cols=Math.ceil(bounds.width/size),rows=Math.ceil(bounds.height/size),key=(x,y)=>y*cols+x;
  const cell=p=>({x:Math.max(0,Math.min(cols-1,Math.floor((p.x-bounds.left)/size))),y:Math.max(0,Math.min(rows-1,Math.floor((p.y-bounds.top)/size)))});
  const open=(x,y)=>x>=0&&x<cols&&y>=0&&y<rows&&!m.worldBlocked(w,bounds.left+(x+.5)*size,bounds.top+(y+.5)*size,bodyRadius);
  const a=cell(start);let b=cell(target);
  if(!open(b.x,b.y)){const choices=[];for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(open(b.x+dx,b.y+dy))choices.push({x:b.x+dx,y:b.y+dy});choices.sort((u,v)=>Math.hypot(bounds.left+(u.x+.5)*size-target.x,bounds.top+(u.y+.5)*size-target.y)-Math.hypot(bounds.left+(v.x+.5)*size-target.x,bounds.top+(v.y+.5)*size-target.y));if(!choices.length)return[];b=choices[0]}
  const from=key(a.x,a.y),goal=key(b.x,b.y),queue=[from],parents=new Map([[from,-1]]);let head=0;
  while(head<queue.length&&head<maxVisited){const n=queue[head++];if(n===goal)break;const x=n%cols,y=Math.floor(n/cols);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,id=key(nx,ny);if(parents.has(id)||!open(nx,ny))continue;parents.set(id,n);queue.push(id)}}
  if(!parents.has(goal))return[];const path=[];for(let n=goal;n!==from&&n!==-1;n=parents.get(n)??-1)path.unshift({x:bounds.left+(n%cols+.5)*size,y:bounds.top+(Math.floor(n/cols)+.5)*size});return path;
 };
 let routes=0,found=0;
 // Gates move while the static cache stays warm: compare routes through a doorway both ways.
 // The current library has no painted gates, so a doorway is registered on a solid asset.
 const plan=JSON.parse(fs.readFileSync('src/camp-perimeter-layout.json','utf8')),template=[...m.ASSET_BY_ID.values()].find(a=>a.solid&&a.width>=150&&a.height>=80);
 assert(template,'A solid asset can host the test gate');
 m.ASSET_BY_ID.set('navigation-test-gate',{...template,id:'navigation-test-gate',gate:{a:[.08,.85],b:[.92,.85],height:.4,leaf:template.image,leafSize:[1,1],post:template.image,postSize:[1,1],postWidth:12,postHeight:40}});
 const gate={...plan.placements[0],id:'navigation-test-gate-1',assetId:'navigation-test-gate',x:1700,y:1700,scale:1.4,solid:true,collision:undefined,frame:undefined};
 const gateLayout={...m.emptyLayout(),items:[gate]},gateCheck=m.validateLayout(gateLayout);assert(gateCheck.layout&&!gateCheck.errors.length,gateCheck.errors.join(' '));
 const gateWorld=m.createCampPlaySession(gateLayout),[A,B]=m.gateColliders(gate,0),mid={x:(A.x+B.x)/2,y:(A.y+B.y)/2},len=Math.hypot(B.x-A.x,B.y-A.y),normal={x:-(B.y-A.y)/len,y:(B.x-A.x)/len};
 assert(gateWorld.editorPreview);
 const crossings=[];for(const d of [60,140,260])for(const t of [-.3,0,.3])crossings.push([{x:mid.x+normal.x*d+(B.x-A.x)*t,y:mid.y+normal.y*d+(B.y-A.y)*t},{x:mid.x-normal.x*d,y:mid.y-normal.y*d}]);
 let gateDifferences=0;
 for(const radius of [19,21,23]){
  const closed=crossings.map(([a,b])=>{const route=m.pathTo(a,b,gateWorld,3500,radius);assert.deepEqual(route,reference(a,b,gateWorld,3500,radius),'closed gate route');return route});
  gateWorld.gateMotions={[gate.id]:{amount:1,target:1,swing:1}};
  crossings.forEach(([a,b],i)=>{const route=m.pathTo(a,b,gateWorld,3500,radius);assert.deepEqual(route,reference(a,b,gateWorld,3500,radius),'open gate route');if(JSON.stringify(route)!==JSON.stringify(closed[i]))gateDifferences++;routes+=2});
  gateWorld.gateMotions={};
 }
 assert(gateDifferences>0,'Opening the gate changes at least one route');

 m.installImportedArt(m.snapshot.records);
 const checked=m.validateLayout(m.snapshot.layout);assert(checked.layout,checked.errors?.join(' '));
 const layout=m.prepareAuthoredWorld(checked.layout),w=m.createCampPlaySession(layout,undefined,'survival'),camp=w.progression.camp;
 assert(w.editorPreview,'Survival play uses the cached authored-world navigation');
 const near=layout.items.filter(p=>Math.hypot(p.x-camp.x,p.y-camp.y)<1400&&p.solid!==false).flatMap(p=>m.placementBodies(p).map(c=>c.id));
 const tiles=m.OUTDOOR_TILES.map(t=>t.key);
 // Live state changes between searches after the static cache is warm.
 const scenarios=[
  ['raid navigation',{...w,outdoorReady:undefined}],
  ['streamed ground still loading',{...w,outdoorReady:new Set(tiles.filter((_,i)=>i%3!==1))}],
  ['mined rocks',{...w,outdoorReady:undefined,minedRockColliders:new Set(near.filter((_,i)=>i%4===0))}],
  ['rocks restored',{...w,outdoorReady:undefined,minedRockColliders:new Set()}],
 ];
 const bounds=m.worldBounds(w),changes=(world,span)=>{for(let i=0;i<40000;i++){const x=span?camp.x+(random()-.5)*span:bounds.left+random()*bounds.width,y=span?camp.y+(random()-.5)*span:bounds.top+random()*bounds.height;if(m.worldBlocked(world,x,y,23)!==m.worldBlocked(scenarios[0][1],x,y,23))return true}return false};
 assert(changes(scenarios[1][1]),'Loading ground changes collision somewhere');
 assert(changes(scenarios[2][1],3200),'Mined rocks change collision around the raided camp');
 for(const [name,world]of scenarios)for(const radius of [21,23,30])for(let i=0;i<14;i++){
  const angle=random()*Math.PI*2,distance=300+random()*1300,start={x:camp.x+Math.cos(angle)*distance,y:camp.y+Math.sin(angle)*distance};
  const target={x:camp.x+(random()-.5)*900,y:camp.y+(random()-.5)*900},limit=i%5===0?12000:3500;
  const expected=reference(start,target,world,limit,radius),actual=m.pathTo(start,target,world,limit,radius);
  assert.deepEqual(actual,expected,`${name}: route ${i} with radius ${radius} matches the uncached search`);
  routes++;if(actual.length)found++;
 }
 assert(found>routes/3,'The comparison exercises real routes, not only failures');

 // Bucketed ground containment equals the previous exhaustive test.
 const exhaustive=rects=>{
  const inside=(r,x,y)=>x>=r.x&&x<=r.x+r.width&&y>=r.y&&y<=r.y+r.height,clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  const xs=[...new Set(rects.flatMap(r=>[r.x,r.x+r.width]))].sort((a,b)=>a-b),ys=[...new Set(rects.flatMap(r=>[r.y,r.y+r.height]))].sort((a,b)=>a-b);
  const cells=ys.slice(1).map((_,j)=>xs.slice(1).map((_,i)=>rects.some(r=>inside(r,(xs[i]+xs[i+1])/2,(ys[j]+ys[j+1])/2)))),edges=[];
  for(let j=0;j<ys.length-1;j++)for(let i=0;i<xs.length-1;i++)if(cells[j][i]){if(!cells[j-1]?.[i])edges.push([xs[i],ys[j],xs[i+1],ys[j]]);if(!cells[j+1]?.[i])edges.push([xs[i],ys[j+1],xs[i+1],ys[j+1]]);if(!cells[j]?.[i-1])edges.push([xs[i],ys[j],xs[i],ys[j+1]]);if(!cells[j]?.[i+1])edges.push([xs[i+1],ys[j],xs[i+1],ys[j+1]])}
  return (x,y,r=0)=>rects.some(t=>inside(t,x,y))&&(r<=0||edges.every(([ax,ay,bx,by])=>{const dx=x-clamp(x,ax,bx),dy=y-clamp(y,ay,by);return dx*dx+dy*dy>=r*r-1e-7}));
 };
 const s=m.EAST_TERRAIN_SCALE,base={x:-m.HOME_TERRAIN.border*s,y:-m.HOME_TERRAIN.border*s,width:m.HOME_TERRAIN.fullSize*s,height:m.HOME_TERRAIN.fullSize*s};
 const ground=[base,...m.OUTDOOR_TILES.map(t=>({...t,width:t.width-t.paintRight,height:t.height-t.paintBottom}))];
 const synthetic=Array.from({length:24},()=>({x:Math.round(random()*40)*50,y:Math.round(random()*40)*50,width:50+Math.round(random()*12)*50,height:50+Math.round(random()*12)*50}));
 let samples=0;
 for(const [rects,fast]of [[ground,m.OUTDOOR_FOOTPRINT.contains],[synthetic,m.groundFootprint(synthetic).contains]]){
  const slow=exhaustive(rects),b=m.groundFootprint(rects).bounds,points=[];
  for(let i=0;i<40000;i++)points.push([b.x-300+random()*(b.width+600),b.y-300+random()*(b.height+600)]);
  for(const t of rects)for(const [x,y]of [[t.x,t.y],[t.x+t.width,t.y+t.height],[t.x+t.width/2,t.y],[t.x,t.y+t.height/2],[t.x-19,t.y+t.height/2],[t.x+t.width+21,t.y+5]])points.push([x,y],[x+1e-9,y-1e-9]);
  for(const [x,y]of points)for(const r of [0,.5,12,19,21,23,30,60,400,NaN,Infinity]){assert.equal(fast(x,y,r),slow(x,y,r),`contains(${x}, ${y}, ${r})`);samples++}
  assert.equal(fast(NaN,0,19),slow(NaN,0,19));
 }
 console.log(JSON.stringify({passed:true,routes,found,footprintSamples:samples,checks:['cached navigation equals the uncached search','streamed ground, gates and mined rocks stay live','bucketed ground footprint equals the exhaustive test, including edges and corners']},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
