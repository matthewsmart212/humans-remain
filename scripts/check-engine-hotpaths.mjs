import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'engine-hotpaths-'));
try{
 await build({stdin:{contents:`export * from './src/survival-engine';
  export * from './src/world-layout';export * from './src/world-assets';
  export * from './src/camp-gates';export * from './src/studio-play';
  export {combatEnemyBody} from './src/enemy-types';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs'),logLevel:'warning'});
 const m=createRequire(import.meta.url)(path.join(temp,'test.cjs'));
 const referenceMove=(w,p,dx,dy,r=19)=>{
  const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/8));
  const blockedAt=(x,y)=>m.worldBlocked(w,x,y,r)||(p===w.player&&w.combatTest&&!w.dodge&&(w.enemies.some(e=>e.hp>0&&Math.hypot(x-e.x,y-e.y)<r+m.combatEnemyBody(e.kind)&&Math.hypot(x-e.x,y-e.y)<m.distance(p,e)-.001)||w.animals.some(a=>a.hp>0&&a.predator&&Math.hypot(x-a.x,y-a.y)<r+22&&Math.hypot(x-a.x,y-a.y)<m.distance(p,a)-.001)));
  for(let i=0;i<n;i++){const nx=p.x+dx/n;if(!blockedAt(nx,p.y))p.x=nx;const ny=p.y+dy/n;if(!blockedAt(p.x,ny))p.y=ny}
 };
 const referenceGate=(p,amount,assets=m.ASSET_BY_ID)=>{
  const a=assets.get(p.assetId);if(!a?.gate||!p.solid)return [];
  const q=m.gateLocal(p,a,0,assets),point=v=>{const [x,y]=m.placementPoint(p,v.x,v.y,false,assets);return{x,y}},A=point(q.a),B=point(q.b);
  const posts=[{id:p.id+':post-a',shape:'circle',...A,r:20*p.scale},{id:p.id+':post-b',shape:'circle',...B,r:20*p.scale}];
  return Math.abs(amount)>=.5?posts:[...posts,{id:p.id+':leaf-closed',shape:'segment',...A,ex:B.x,ey:B.y,r:16*p.scale}];
 };
 const template=[...m.ASSET_BY_ID.values()].find(a=>a.solid&&a.width>=150&&a.height>=80);
 const gateAsset={...template,id:'hotpath-test-gate',gate:{a:[.08,.85],b:[.92,.85],height:.4,leaf:template.image,leafSize:[1,1],post:template.image,postSize:[1,1],postWidth:12,postHeight:40}};
 m.ASSET_BY_ID.set(gateAsset.id,gateAsset);
 const gate={...m.newPlacement(gateAsset.id,1700,1700),id:'hotpath-gate',solid:true};
 let gateCases=0;
 for(const rotation of [0,35,90,215])for(const flipX of [false,true])for(const flipY of [false,true])for(const scale of [.5,1,1.8]){
  Object.assign(gate,{rotation,flipX,flipY,scale});
  for(const amount of [-1,-.5,-.49,0,.49,.5,1]){assert.deepEqual(m.gateColliders(gate,amount),referenceGate(gate,amount));gateCases++}
  assert.equal(m.gateColliders(gate,0),m.gateColliders(gate,.49),'Closed pose reuses collision geometry');
  assert.equal(m.gateColliders(gate,1),m.gateColliders(gate,-1),'Open swing directions share the same posts');
 }
 const checkEdit=edit=>{const previous=m.gateColliders(gate,0);edit();assert.deepEqual(m.gateColliders(gate,0),referenceGate(gate,0));assert.notEqual(m.gateColliders(gate,0),previous)};
 checkEdit(()=>gate.x+=13);checkEdit(()=>gate.y+=11);checkEdit(()=>gate.id+='-edited');
 checkEdit(()=>gate.frame={sourceAssetId:gate.assetId,width:317,height:271,anchor:[.4,.7]});
 checkEdit(()=>gate.frame.anchor[0]=.6);checkEdit(()=>gate.frame.height=330);
 checkEdit(()=>gateAsset.gate.a[0]=.12);
 checkEdit(()=>m.ASSET_BY_ID.set(gateAsset.id,{...gateAsset}));
 gate.solid=false;assert.deepEqual(m.gateColliders(gate,0),[]);gate.solid=true;

 const layout={...m.emptyLayout(),items:[gate]},world=m.createWorld(layout);world.editorPreview=true;world.combatTest=true;
 world.enemies=[{x:1800,y:1800,hp:100,kind:'scrap-walker'}];world.animals=[{x:1650,y:1650,hp:100,predator:{}}];
 let state=7129;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 let sweeps=0;
 for(const amount of [0,1])for(const radius of [12,19,35])for(let i=0;i<1600;i++){
  world.gateMotions={[gate.id]:{amount,target:amount}};
  const start=i%10===0?{x:gate.x,y:gate.y}:{x:1400+random()*800,y:1400+random()*800};
  const dx=i%3===0?0:(random()-.5)*130,dy=i%4===0?0:(random()-.5)*130;
  Object.assign(world.player,start);referenceMove(world,world.player,dx,dy,radius);const expected={x:world.player.x,y:world.player.y};
  Object.assign(world.player,start);m.moveBody(world,world.player,dx,dy,radius);assert.deepEqual({x:world.player.x,y:world.player.y},expected,'Identical collision, sliding and crowd separation');sweeps++;
 }
 // Closing a gate never moved an overlapping stationary actor; retain that behavior.
 const [A,B]=m.gateColliders(gate,0),centre={x:(A.x+B.x)/2,y:(A.y+B.y)/2};Object.assign(world.player,centre);
 world.gateMotions={[gate.id]:{amount:0,target:0}};m.moveBody(world,world.player,0,0);assert.equal(world.player.x,centre.x);assert.equal(world.player.y,centre.y);
 let reads=0;const counted=new Proxy(world,{get(target,key){if(key==='layout')reads++;return target[key]}});
 referenceMove(counted,counted.player,0,0);const oldIdleLayoutReads=reads;reads=0;m.moveBody(counted,counted.player,0,0);assert.equal(reads,0);assert(oldIdleLayoutReads>0);

 // The profiler is optional and cannot change system order or game state.
 const base=m.createCampPlaySession({...m.emptyLayout(),items:[]},{x:1500,y:1500}),plain=structuredClone(base),profiled=structuredClone(base),phases=[];
 const expectedPhases=['simMovementMs','simProgressionMs','simCombatMs','simWildlifeMs','simEnvironmentMs','simSurvivalMs'];
 for(let i=0;i<180;i++){
  const input={x:i<60?1:i<120?0:-1,y:i<120?.4:0};
  m.stepCampPlaySession(plain,input,i<50,false);
  m.stepCampPlaySession(profiled,input,i<50,false,(phase,ms)=>{assert(Number.isFinite(ms)&&ms>=0);phases.push(phase)});
  assert.deepEqual(profiled,plain,'Profiling must not change simulation results');
 }
 for(let i=0;i<180;i++)assert.deepEqual(phases.slice(i*6,i*6+6),expectedPhases);
 console.log(JSON.stringify({passed:true,movementSweepsCompared:sweeps,gateGeometryCases:gateCases,profiledTicksCompared:180,idleLayoutReadsBefore:oldIdleLayoutReads,idleLayoutReadsAfter:0,checks:['identical overlapping-start, sliding, knockback and crowd collisions','live gate-state and authoring edits','reused open/closed collider geometry','recording-only phase timing preserves simulation'],physicalIPhoneTested:false},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
