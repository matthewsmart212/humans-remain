import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'road-plan-')),require=createRequire(import.meta.url);
await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-roads';export * from './src/world-road-materials';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
const m=require(path.join(temp,'model.cjs'));
const old=[{x:350,y:350,width:4100,height:4100,camp:true},{x:4100,y:4000,width:1536,height:1024},...JSON.parse(fs.readFileSync('src/camp-road-patches.json')),...JSON.parse(fs.readFileSync('src/district-road-patches.json'))];
const contains=(r,p,margin=96)=>p.x-p.radius>=r.x+margin&&p.y-p.radius>=r.y+margin&&p.x+p.radius<=r.x+r.width-margin&&p.y+p.radius<=r.y+r.height-margin;
const points=[];
for(const road of m.WORLD_ROADS)for(let i=1;i<road.sourcePoints.length;i++){
 const a=road.sourcePoints[i-1],b=road.sourcePoints[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/40);
 const len=Math.hypot(b[0]-a[0],b[1]-a[1]);
 for(let j=0;j<n;j++)for(const offset of [-road.width/2-40,0,road.width/2+40])points.push({x:a[0]+(b[0]-a[0])*j/n-(b[1]-a[1])/len*offset,y:a[1]+(b[1]-a[1])*j/n+(b[0]-a[0])/len*offset,radius:0,road:road.id,kind:road.kind});
}
const remaining=points.filter(p=>!old.some(r=>contains(r,p,r.camp?0:96))),uncovered=new Set(remaining.map((_,i)=>i));
const candidates=[];
for(let i=0;i<remaining.length;i++){const p=remaining[i];for(const [width,height] of [[1536,1024],[1024,1536]]){
 const r={x:Math.round((p.x-width/2)/16)*16,y:Math.round((p.y-height/2)/16)*16,width,height};
 candidates.push({...r,covered:remaining.flatMap((p,j)=>contains(r,p)?[j]:[])});
}}
const picked=[];
while(uncovered.size){
 let best,score=0;
 for(const c of candidates){const s=c.covered.reduce((n,i)=>n+Number(uncovered.has(i)),0);if(s>score){score=s;best=c}}
 if(!best)throw Error('Uncovered road samples '+JSON.stringify([...uncovered].slice(0,5).map(i=>remaining[i])));
 picked.push(best);for(const i of best.covered)uncovered.delete(i);candidates.splice(candidates.indexOf(best),1);
}
picked.sort((a,b)=>Math.hypot(a.x+a.width/2-2400,a.y+a.height/2-2400)-Math.hypot(b.x+b.width/2-2400,b.y+b.height/2-2400));
const patches=picked.map((p,i)=>{
 const roadIds=[...new Set(points.filter(q=>q.x>p.x&&q.x<p.x+p.width&&q.y>p.y&&q.y<p.y+p.height).map(q=>q.road))];
 const weights=m.roadMaterialWeights(p.x+p.width/2,p.y+p.height/2),material=['camp-stone','dry-earth','dark-earth','works-gravel','salvage-gravel'][weights.indexOf(Math.max(...weights))];
 const id=`route-${String(i+1).padStart(2,'0')}`;return {id,key:`roadComplete${i+1}`,x:p.x,y:p.y,width:p.width,height:p.height,roads:roadIds,material};
});
fs.writeFileSync('src/complete-road-patches.json',JSON.stringify(patches,null,2)+'\n');
fs.mkdirSync('docs/qa/complete-roads-v1',{recursive:true});
const coverage=m.WORLD_ROADS.map(r=>({id:r.id,kind:r.kind,samples:points.filter(p=>p.road===r.id).length,uncovered:points.filter(p=>p.road===r.id&&!old.some(q=>contains(q,p,q.camp?0:96))&&!patches.some(q=>contains(q,p))).length,patches:patches.filter(p=>p.roads.includes(r.id)).map(p=>p.id)}));
fs.writeFileSync('docs/qa/complete-roads-v1/coverage.json',JSON.stringify({newPatches:patches.length,routes:coverage},null,2)+'\n');console.log(JSON.stringify({newPatches:patches.length,roadSamples:points.length,uncovered:coverage.reduce((n,r)=>n+r.uncovered,0),materials:patches.reduce((v,p)=>(v[p.material]=(v[p.material]||0)+1,v),{})}));fs.rmSync(temp,{recursive:true,force:true});
