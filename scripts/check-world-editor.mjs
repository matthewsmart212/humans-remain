import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'safety-last-world-'));
try{
 await build({stdin:{contents:`export * from './src/world-layout';export * from './src/world-assets';export * from './src/survival-engine';export * from './server/world-layout';export * as map from './src/factory-map';`,resolveDir:process.cwd()},outfile:path.join(dir,'check.mjs'),bundle:true,platform:'node',format:'esm'});
 const m=await import(pathToFileURL(path.join(dir,'check.mjs')));
 assert.equal(new Set(m.WORLD_ASSETS.map(a=>a.id)).size,m.WORLD_ASSETS.length);
 for(const a of m.WORLD_ASSETS)for(const file of [a.image,a.roof,a.unlit,...(a.frames||[])].filter(Boolean))assert(fs.existsSync('public'+file),file);
 assert.equal(m.map.MAP_HEIGHT,2400*Math.SQRT2,'existing world height preserved');
 assert.equal(m.map.MAP_WIDTH,m.map.MAP_HEIGHT,'world is square');
 const expanded=m.emptyLayout();expanded.spawn={x:3000,y:1700};expanded.items=[m.newPlacement('base_hearth_t1',3000,1900)];
 assert.deepEqual(m.validateLayout(expanded).errors,[],'new eastern area accepts saved placements');
 assert(!m.layoutBlocked(expanded,3000,1700),'new eastern area is walkable');
 assert(!m.layoutBlocked(expanded,m.map.MAP_WIDTH-5,1700),'original edge opens into the 600px border');assert(m.layoutBlocked(expanded,m.map.MAP_WIDTH*(1+600/3600)-5,1700),'expanded edge contains the player');
 const layout=m.starterLayout();assert.deepEqual(m.validateLayout(layout,true).errors,[]);let w=m.createWorld(layout);
 assert.equal(w.animals.length,2,'starter kit supports hunting and cooking');
 assert.equal(m.worldBase(w).x,layout.items.find(p=>p.role==='generator').x);
 for(const role of ['well','hearth','storage'])assert.equal(w.camp[role].x,layout.items.find(p=>p.role===role).x);
 assert.equal(m.worldBlocked(w,m.map.ROOMS[0].x,m.map.ROOMS[0].y+100),false,'removed original building leaves no invisible walls');
 for(const role of ['well','hearth','storage','generator']){const p=layout.items.find(p=>p.role===role);assert(m.pathTo(w.player,{x:p.x,y:p.y+(role==='generator'?85:65)},w).length,'new station is reachable: '+role)}
 Object.assign(w.player,{x:w.camp.well.x,y:w.camp.well.y+65});w.thirst=10;assert(m.doAction(w,'drink'));assert.equal(w.thirst,100);
 Object.assign(w.player,{x:w.camp.storage.x,y:w.camp.storage.y+65});w.bag.scrap=10;w.loads=1;assert(m.doAction(w,'deposit'));assert.equal(w.stock.scrap,10);assert(!m.doAction(w,'deposit'),'no repeated deposits');
 Object.assign(w.player,{x:m.worldBase(w).x,y:m.worldBase(w).y+85});w.generator.hp=50;assert(m.doAction(w,'repair'));assert.equal(w.generator.hp,105);
 const crate=m.newPlacement('existing_smashable_crate',1100,2250);crate.scale=2;crate.footprint={width:200,depth:100};
 const crateLayout={...layout,items:[...layout.items,crate]};w=m.createWorld(crateLayout);assert(m.layoutBlocked(crateLayout,crate.x+160,crate.y-50));assert(m.worldBlocked(w,crate.x+160,crate.y-50),'custom crate collision matches preview');
 w.breakables[0].hp=0;assert(!m.worldBlocked(w,crate.x+160,crate.y-50),'destroyed crate stops blocking');
 const moved={...layout,items:layout.items.map(p=>p.role==='well'?{...p,x:p.x-160,y:p.y-120}:p)};const old=layout.items.find(p=>p.role==='well'),updated=m.createWorld(moved);assert(!m.worldBlocked(updated,old.x,old.y-20),'moved well does not leave its old footprint');assert.equal(updated.camp.well.x,old.x-160);
 const shelter=m.newPlacement('base_shelter_t3',1550,2200),open={...m.emptyLayout(),items:[shelter]},a=m.ASSET_BY_ID.get(shelter.assetId);const preview=m.createWorld(open);preview.editorPreview=true;Object.assign(preview.player,{x:shelter.x,y:shelter.y+20});for(let i=0;i<50;i++)m.movePlayer(preview,{x:0,y:-1});assert(m.insideBuilding(shelter,preview.player.x,preview.player.y),'worker enters visible shelter doorway');assert(!m.layoutBlocked(open,preview.player.x,preview.player.y));assert(m.placementBodies(shelter).length>0);
 assert(m.validateLayout({...layout,items:[...layout.items,layout.items[0]]}).errors.length,'duplicate placement ID rejected');assert(m.validateLayout({...layout,spawn:{x:NaN,y:0}}).errors.length);assert(m.validateLayout({...layout,items:layout.items.map(p=>({...p,assetId:'../../bad.png'}))}).errors.length);
 // Per-placement blockers survive validation, moving, scaling and save/apply.
 const custom={lineWidth:.012,paths:[{closed:true,points:[[.2,.55],[.8,.55],[.8,.85],[.2,.85]]}]};
 const target={...m.newPlacement('base_hearth_t1',1200,1700),collision:custom},asset=m.ASSET_BY_ID.get(target.assetId);
 const sample=(p,u,v)=>({x:p.x+(u-asset.anchor[0]/asset.crop[2])*asset.width*p.scale,y:p.y+(v-asset.anchor[1]/asset.crop[3])*asset.height*p.scale});
 for(const scale of [.25,1,3]){const p={...target,scale},l={...m.emptyLayout(),items:[p]},inside=sample(p,.5,.7),outside=sample(p,.95,.7);assert(m.layoutBlocked(l,inside.x,inside.y,1));assert(!m.layoutBlocked(l,outside.x,outside.y,1));assert.deepEqual(m.validateLayout(l).layout.items[0].collision,custom)}
 const movedTarget={...target,x:1600},at=sample(target,.5,.7);assert(!m.layoutBlocked({...m.emptyLayout(),items:[movedTarget]},at.x,at.y,1));
 const inherited=JSON.stringify(asset.collision),cleared={...target,collision:{lineWidth:.012,paths:[]}};assert.equal(m.placementBodies(cleared).length,0);assert.equal(JSON.stringify(asset.collision),inherited,'placement does not modify library defaults');
 assert(m.validateLayout({...m.emptyLayout(),items:[{...target,collision:{...custom,paths:[{closed:true,points:[[0,0],[2,0],[0,1]]}]}}]}).errors.length,'invalid placement outline rejected');
 layout.items.find(p=>p.role==='well').collision=custom;
 assert.deepEqual(m.validateLayout(layout,true).errors,[]);
 // Rotation follows the ground anchor for artwork hit testing, blockers and roofs.
 for(const rotation of [0,15,90,180,270,359])for(const scale of [.25,1,3])for(const [flipX,flipY] of [[false,false],[true,false],[false,true],[true,true]]){
  const p={...target,rotation,scale,flipX,flipY,locked:true},l={...m.emptyLayout(),items:[p]},local=sample(p,.5,.7),[x,y]=m.placementPoint(p,local.x,local.y);
  assert(m.placementContains(p,x,y),'rotated image remains selectable');assert(m.layoutBlocked(l,x,y,1),'rotated outline blocks at its new position');
  const back=m.placementPoint(p,x,y,true);assert(Math.hypot(back[0]-local.x,back[1]-local.y)<1e-8);
  const clean=m.validateLayout(l).layout.items[0];assert.equal(clean.rotation,rotation);assert.equal(clean.locked,true);assert.equal(clean.flipX,flipX);assert.equal(clean.flipY,flipY);
  assert(!m.placementEditable(p,{flipX:true}));assert(!m.placementEditable(p,{flipY:true}));
  assert(!m.placementEditable(p,{x:1400}));assert(!m.placementEditable(p,{rotation:30}));assert(!m.placementEditable(p,{scale:2}));assert(m.placementEditable(p,{locked:false}));
 }
 const rotatedShelter={...shelter,rotation:90},interior=a.interior;
 const [ix,iy]=m.placementPoint(rotatedShelter,shelter.x+interior.x+interior.width/2,shelter.y+interior.y+interior.height/2);assert(m.insideBuilding(rotatedShelter,ix,iy),'rotated roof detects interior');
 const rotatedCrate={...crate,rotation:90};assert.equal(m.placementBodies(rotatedCrate)[0].shape,'polygon');
 const line={...target,rotation:90,collision:{lineWidth:.01,paths:[{closed:false,points:[[.2,.5],[.8,.5]]}]}};assert.equal(m.placementBodies(line)[0].shape,'segment');
 for(const patch of [{rotation:NaN},{rotation:-1},{rotation:361},{rotation:'90'},{locked:'true'},{flipX:'true'},{flipY:1}])assert(m.validateLayout({...m.emptyLayout(),items:[{...target,...patch}]}).errors.length);
 assert.equal(m.normalizeRotation(-15),345);assert.equal(m.normalizeRotation(360),0);
 const bounds=m.placementBounds(target),mirrored=m.placementPoint({...target,flipX:true,flipY:true},bounds.x,bounds.y);assert(Math.abs(mirrored[0]-(bounds.x+bounds.width))<1e-8);assert(Math.abs(mirrored[1]-(bounds.y+bounds.height))<1e-8);
 // Layer order and overlap selection include locked objects, without changing old depth sorting.
 const lower={...target,id:'layer-lower',layer:-1,locked:true},upper={...target,id:'layer-upper',layer:2};
 const hitPoint=sample(target,.5,.7);
 assert.deepEqual(m.placementHitStack([upper,lower],hitPoint.x,hitPoint.y).map(p=>p.id),['layer-upper','layer-lower']);
 assert.deepEqual(m.placementHitStack([{...lower,layer:3},upper],hitPoint.x,hitPoint.y).map(p=>p.id),['layer-lower','layer-upper']);
 assert.deepEqual(m.placementHitStack([{...lower,layer:undefined},{...upper,layer:undefined}],hitPoint.x,hitPoint.y).map(p=>p.id),['layer-upper','layer-lower'],'ties select last drawn object');
 assert(m.compareWorldDrawables({layer:2,y:0},{layer:1,y:100000})>0,'layer overrides roof and ground depth');
 assert(m.compareWorldDrawables({y:5},{y:10})<0,'legacy automatic depth preserved');
 assert(m.placementEditable(lower,{layer:5}),'position locks still permit layer changes');
 for(const layer of [NaN,Infinity,1.5,'1',-10001,10001])assert(m.validateLayout({...m.emptyLayout(),items:[{...target,layer}]}).errors.length,'invalid layer rejected');
 for(const layer of [-10000,0,10000])assert.equal(m.validateLayout({...m.emptyLayout(),items:[{...target,layer}]}).layout.items[0].layer,layer);
 layout.items.push({...m.newPlacement('prop_planks',1400,2400),rotation:73,flipX:true,flipY:true,locked:true,layer:-2});
 // Exercise the actual SQL persistence flow, including competing tabs and access guards.
 const sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
 const db={prepare(query){let params=[];return{bind(...values){params=values;return this},async all(){return{results:sql.prepare(query).all(...params)}},async run(){const r=sql.prepare(query).run(...params);return{meta:{changes:Number(r.changes)}}}}}};
 const req=(action,revision,origin='https://example.test')=>new Request('https://example.test/api/world-layout',{method:'PUT',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({layout,revision,action})});
 assert.equal((await m.handleWorldLayout(req('apply',0),db,false)).status,403);
 assert.equal((await m.handleWorldLayout(req('apply',0,'https://other.test'),db,true)).status,403);
 let response=await m.handleWorldLayout(req('apply',0),db,true);assert.equal(response.status,200);assert.equal((await response.json()).revision,1);
 response=await m.handleWorldLayout(new Request('https://example.test/api/world-layout'),db,false);let saved=await response.json();assert.deepEqual(saved.applied.items,layout.items);assert.equal(saved.canEdit,false);
 assert.equal((await m.handleWorldLayout(req('save',0),db,true)).status,409,'stale tab cannot overwrite the world');
 assert.equal((await m.handleWorldLayout(req('original',1),db,true)).status,200);saved=await(await m.handleWorldLayout(new Request('https://example.test/api/world-layout'),db,true)).json();assert.equal(saved.applied,null);assert.equal(saved.draft.items.length,layout.items.length,'restoring original preserves draft');sql.close();
 console.log(`World editor checks passed: ${m.WORLD_ASSETS.length} unique art assets; moved services and reachable doors; matching crate collision; starter food loop; protected save/apply/reload; conflict protection; original-camp restore.`);
}finally{fs.rmSync(dir,{recursive:true,force:true})}
