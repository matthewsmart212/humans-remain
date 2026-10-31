import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-polish-')),out='docs/qa/camp-polish-v1';
try{
 await build({stdin:{contents:`export * from './src/world-bounds';export * from './src/world-layout';export * from './src/world-assets';export * from './src/world-camera';export {editorCamera} from './src/placed-world-renderer';export * from './src/imported-art';export * from './src/camp-puddles';export * from './src/studio-play';export * from './src/survival-engine';export * from './src/terrain-art';export {MAP_WIDTH,MAP_HEIGHT} from './src/factory-map';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'test.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'test.mjs')));m.installImportedArt(JSON.parse(fs.readFileSync(out+'/artwork-before.json')).records);
 const before=JSON.parse(fs.readFileSync(out+'/layout-before.json')).draft,encoded=JSON.stringify(before),after=m.addApprovedCampPuddles(before),puddles=after.items.filter(p=>m.ASSET_BY_ID.get(p.assetId)?.puddle);
 assert.equal(puddles.length,8);assert.equal(after.items.length,before.items.length-12);assert.equal(after.terrainPuddleVersion,2);assert.equal(JSON.stringify(before),encoded);
 for(const p of after.items)assert.deepEqual(p,before.items.find(q=>q.id===p.id),'Every surviving placement retains exact coordinates, transformations and custom settings');
 assert.equal(m.addApprovedCampPuddles(after),after);const deleted={...after,items:after.items.filter(p=>p.id!==puddles[0].id)};assert.equal(m.addApprovedCampPuddles(deleted),deleted);
 assert.deepEqual(m.validateLayout(after).errors,[]);assert.equal(m.validateLayout(JSON.parse(JSON.stringify(after))).layout.terrainPuddleVersion,2);
 const unrelated={...m.newPlacement('art_puddle_round',400,400),id:'owner-water'},manual={...before,items:[...before.items,unrelated]};assert(m.addApprovedCampPuddles(manual).items.some(p=>p.id===unrelated.id));
 const empty=m.emptyLayout(),b=m.campBounds(empty),extra=600/3600*m.MAP_WIDTH;assert(Math.abs(b.left+extra)<1e-8);assert(Math.abs(b.right-m.MAP_WIDTH-extra)<1e-8);assert.equal(m.MAP_WIDTH,2400*Math.SQRT2);
 const movement=[];
 for(const [edge,start,input,axis,limit] of [['west',{x:30,y:1600},{x:-1,y:0},'x',b.left+19],['east',{x:m.MAP_WIDTH-30,y:1600},{x:1,y:0},'x',b.right-19],['north',{x:1600,y:30},{x:0,y:-1},'y',b.top+19],['south',{x:1600,y:m.MAP_HEIGHT-30},{x:0,y:1},'y',b.bottom-19]]){
  for(const sprint of [false,true]){
   const w=m.createCampPlaySession({...empty,spawn:start});for(let i=0;i<450;i++)m.stepCampPlaySession(w,input,sprint,false);
   assert(Math.abs(w.player[axis]-limit)<9,edge+' stops at new boundary');assert(!m.worldBlocked(w,w.player.x,w.player.y));
   assert(m.dodgePlayer(w,input));for(let i=0;i<30;i++)m.stepCampPlaySession(w,input,true,false);assert(!m.worldBlocked(w,w.player.x,w.player.y),'dodge respects new edge');movement.push({edge,sprint,position:w.player[axis]});
  }
 }
 const prop={...m.newPlacement('base_well_t1',-250,1580),frame:{sourceAssetId:'base_well_t1',width:110,height:240,anchor:[.5,.5]},collision:{lineWidth:.008,paths:[{closed:true,points:[[0,0],[1,0],[1,1],[0,1]]}]}},outside={...empty,spawn:{x:-460,y:1580},items:[prop]};assert.deepEqual(m.validateLayout(outside).errors,[]);
 const w=m.createCampPlaySession(outside),route=m.pathTo(w.player,{x:350,y:1580},w);assert(route.length>10);assert(route.some(p=>p.x<0));assert(route.every(p=>!m.worldBlocked(w,p.x,p.y,21)));assert(route.some(p=>Math.abs(p.y-1580)>100),'route detours around the outer-area blocker');
 const custom={...empty,terrainImage:{id:'custom',url:'/api/asset-files/custom',name:'custom.png',mime:'image/png',width:4800,height:4800,bytes:100},terrainBorder:600};assert.equal(m.campBounds(custom).left,0);assert(m.layoutBlocked(custom,-50,100));assert(m.validateLayout({...custom,spawn:{x:-100,y:200}}).errors.length);assert(m.validateLayout({...custom,items:[prop]}).errors.length);
 const scene=m.worldBounds({layout:empty,scene:{width:5000,height:4500}});assert.deepEqual(scene,{left:0,top:0,width:5000,height:4500,right:5000,bottom:4500});assert(!m.layoutBlocked(empty,4500,4000,19,[],undefined,scene));assert(m.layoutBlocked(empty,-30,4000,19,[],undefined,scene));
 for(const [width,height]of [[390,844],[844,390],[1800,900]])for(const [x,y]of [[b.left+19,1700],[b.right-19,1700],[1700,b.top+19],[1700,b.bottom-19]]){const c=m.worldCamera(width,height,{x,y},b),e=m.editorCamera(width,height,{...w,player:{...w.player,x,y}},{follow:true,zoom:1});assert(e.x>=b.left-1e-6&&e.y>=b.top-1e-6);assert(e.x+width/e.scale<=b.right+1e-6&&e.y+height/e.scale<=b.bottom+1e-6);assert(c.x>=b.left-1e-6&&c.y>=b.top-1e-6);assert(c.x+width/c.scale<=b.right+1e-6&&c.y+height/c.scale<=b.bottom+1e-6)}
 const r=m.terrainWorldRect(600,600,3600,3600,m.MAP_WIDTH,m.MAP_HEIGHT);assert.deepEqual(r,{x:0,y:0,width:m.MAP_WIDTH,height:m.MAP_HEIGHT});
 const profiles=JSON.parse(fs.readFileSync('src/camp-ground-profiles.json')),covered=new Set(profiles.flatMap(p=>p.sources));
 const props=after.items.filter(p=>!m.ASSET_BY_ID.get(p.assetId)?.foliage&&!m.ASSET_BY_ID.get(p.assetId)?.puddle&&!p.assetId.startsWith('misc_d9795'));
 for(const p of props)assert(covered.has(m.ASSET_BY_ID.get(p.assetId).image),'ground-contact profile for '+p.assetId);
 const report={result:'pass',puddles:8,removed:12,placementsPreserved:after.items.length,foliage:after.items.filter(p=>m.ASSET_BY_ID.get(p.assetId)?.foliage).length,groundedProps:props.length,bounds:b,extraTerrainPixelsPerSide:600,movement,checks:['walking and sprinting across all four old edges','dodge stops at all four new edges','pathfinding detours in negative coordinates','negative spawn and placement validation','custom terrain and scene bounds preserved','portrait and landscape cameras','terrain registration and surviving placements unchanged','puddle deletion and owner water preserved']};
 fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2)+'\n');fs.writeFileSync(out+'/layout-after.json',JSON.stringify({fixtureOnly:true,draft:after})+'\n');console.log(JSON.stringify(report));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
