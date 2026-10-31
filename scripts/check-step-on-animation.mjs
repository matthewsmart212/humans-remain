import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-step-on-')),db=new DatabaseSync(':memory:');
try{
 await build({stdin:{contents:`
 export * from './src/asset-animation'; export * from './src/asset-animation-defaults';
 export * from './src/step-on-animation'; export * from './src/studio-play';
 export * from './src/world-layout'; export * from './src/world-assets';
 export * from './src/imported-art'; export * from './src/custom-assets';
 export {placedDrawables} from './src/placed-world-renderer';
 export {handleArtwork} from './server/artwork';
 import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server';
 import ArtworkImporter from './src/ArtworkImporter'; import {ChecklistPreview} from './src/ChecklistPreview';
 export const renderImporter=(entry,record)=>renderToStaticMarkup(<ArtworkImporter entry={entry} record={record} canEdit onSaved={()=>{}}/>);
 export const renderPreview=(entry)=>renderToStaticMarkup(<ChecklistPreview entry={entry}/>);
 `,resolveDir:process.cwd(),loader:'tsx'},outfile:path.join(temp,'test.cjs'),bundle:true,platform:'node',format:'cjs',logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temp,'test.cjs'));
 const fixture=JSON.parse(fs.readFileSync('scripts/fixtures/bunker-step-on.json'));
 const {record,placement,animationArea}=fixture,original=JSON.stringify(fixture);
 const resolved=m.resolveAnimationDefaults(record);
 assert.equal(resolved.config.animationMode,'step-on');assert.deepEqual(resolved.config.animationArea,animationArea);
 assert.equal(m.animationAreaError(animationArea),'');
 assert.deepEqual({...resolved.config,animationMode:undefined,animationArea:undefined},{...record.config,animationMode:undefined,animationArea:undefined},'Only playback metadata changes');
 assert.equal(m.resolveAnimationDefaults({...record,config:{...record.config,animationMode:'loop'}}).config.animationMode,'loop','Explicit settings override the bunker default');
 assert.equal(m.resolveAnimationDefaults({...record,id:'misc_other'}).config.animationMode,undefined);
 assert.equal(m.resolveAnimationDefaults({...record,config:{...record.config,frames:[...record.config.frames].reverse()}}).config.animationMode,undefined,'Other frame sets never inherit a mismatched trigger');
 m.installImportedArt([record]);
 const asset=m.ASSET_BY_ID.get(record.id);assert.equal(asset.frames.length,3);assert.deepEqual(asset.animationArea,animationArea);
 const point=(p,u,v)=>{const b=m.placementBounds(p);const [x,y]=m.placementPoint(p,b.x+u*b.width,b.y+v*b.height);return{x,y}};
 const inside=point(placement,.5,.66),outside=point(placement,.26,.9);
 const layout={...m.emptyLayout(),spawn:outside,items:[placement]},before=JSON.stringify(layout);
 assert(!m.layoutBlocked(layout,inside.x,inside.y,19),'The real placed bunker steps are reachable, not a solid activation collider');
 assert(!m.layoutBlocked(layout,outside.x,outside.y,19),'Approach is clear');
 const world=m.createCampPlaySession(layout),frame=()=>m.placedAnimationFrame(world,placement,asset);
 const tick=(n=1)=>{for(let i=0;i<n;i++)m.stepCampPlaySession(world,{x:0,y:0},false,false)};
 tick(180);assert.equal(frame(),0,'Off the steps stays closed indefinitely');
 const frames=new Set();
 // Approach through the actual concave blockers with the game movement engine.
 for(let i=0;i<300&&Math.hypot(world.player.x-inside.x,world.player.y-inside.y)>4;i++){
  const dx=inside.x-world.player.x,dy=inside.y-world.player.y,length=Math.hypot(dx,dy);
  m.stepCampPlaySession(world,{x:dx/length,y:dy/length},false,false);frames.add(frame());
 }
 assert(Math.hypot(world.player.x-inside.x,world.player.y-inside.y)<5,'Player can walk onto the real bunker steps');
 tick(60);frames.add(frame());assert.deepEqual([...frames].sort(),[0,1,2],'All three existing images play in sequence');
 tick(600);assert.equal(frame(),2,'Holds last frame without looping');
 const endPosition=world.stepOnMotions[placement.id].position;
 Object.assign(world.player,outside);tick(8);
 assert(world.stepOnMotions[placement.id].position<endPosition);assert(world.stepOnMotions[placement.id].position>0,'Leaving reverses, not an instant close');
 const partiallyClosed=world.stepOnMotions[placement.id].position;
 Object.assign(world.player,inside);tick();
 assert(Math.abs(world.stepOnMotions[placement.id].position-partiallyClosed-asset.fps/60)<1e-8,'Re-entry resumes from the current point');
 Object.assign(world.player,outside);const reverse=[];for(let i=0;i<70;i++){tick();if(reverse.at(-1)!==frame())reverse.push(frame())}
 assert.deepEqual(reverse,[2,1,0]);tick(180);assert.equal(frame(),0,'Holds first frame after reversing');
 Object.assign(world.player,inside);tick(13);const partiallyOpen=world.stepOnMotions[placement.id].position;
 Object.assign(world.player,outside);tick();assert(Math.abs(world.stepOnMotions[placement.id].position-partiallyOpen+asset.fps/60)<1e-8,'Leaving during opening reverses without jumping');
 assert.equal(JSON.stringify(layout),before,'Simulation never edits authored dimensions, position or blockers');
 assert.equal(JSON.stringify(fixture),original,'Source artwork and placements remain byte-for-byte unchanged');
 assert.equal(m.placedAnimationFrame(m.createCampPlaySession(layout),placement,asset),0,'Restart begins closed');
 // Transform the same image-relative area with all supported placement geometry.
 for(const scale of [.25,.5,1.5])for(const rotation of [0,37,90,231])for(const flipX of [false,true])for(const flipY of [false,true]){
  const p={...placement,scale,rotation,flipX,flipY},on=point(p,.5,.66),off=point(p,.12,.45);
  assert(m.onAnimationArea(p,asset,on.x,on.y));assert(!m.onAnimationArea(p,asset,off.x,off.y));
 }
 const heldGeometry={...placement,frame:{sourceAssetId:asset.id,width:820,height:750,anchor:[.3,.8]},rotation:24,flipX:true};
 const on=point(heldGeometry,.5,.66);assert(m.onAnimationArea(heldGeometry,asset,on.x,on.y),'Captured tier geometry also preserves the trigger');
 const other={...placement,id:'second-bunker',x:placement.x+900};world.layout.items.push(other);
 Object.assign(world.player,point(placement,.5,.66));tick(80);
 assert.equal(m.placedAnimationFrame(world,placement,asset),2);assert.equal(m.placedAnimationFrame(world,other,asset),0,'Copies activate independently');
 Object.assign(world.player,point(other,.5,.66));tick(80);
 assert.equal(m.placedAnimationFrame(world,placement,asset),0);assert.equal(m.placedAnimationFrame(world,other,asset),2);
 // The actual renderer selects the same held frame without advancing playback.
 const draws=[],ctx=new Proxy({globalAlpha:1,drawImage:(im)=>draws.push(im)},{get:(o,k)=>k in o?o[k]:()=>{}});
 const images=Object.fromEntries(asset.frames.map(url=>[m.assetImageKey(url),url]));
 m.placedDrawables(ctx,images,world,true).forEach(d=>d.draw());
 assert(draws.includes(asset.frames[2]));assert(draws.includes(asset.frames[0]));
 const motions=JSON.stringify(world.stepOnMotions);m.placedDrawables(ctx,images,world,true).forEach(d=>d.draw());assert.equal(JSON.stringify(world.stepOnMotions),motions,'Drawing has no simulation side effects');
 const loop={...asset,animationMode:'loop'};
 assert.deepEqual([0,20,40,60].map(tick=>m.placedAnimationFrame({...world,tick},placement,loop)),[0,1,2,0],'Existing looping assets retain their timing');
 world.layout.items=[];tick();assert.deepEqual(world.stepOnMotions,{},'Removed placements discard runtime animation state');

 // Exercise the real storage handler, including canonical configuration and revisions.
 for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+file,'utf8'));
 db.prepare('INSERT INTO custom_assets (id,name,created_at) VALUES (?,?,?)').run(record.id,'Bunker',record.customAsset.createdAt);
 db.prepare('INSERT INTO asset_artwork (id,entry_id,revision,config_json,created_at) VALUES (?,?,?,?,?)').run('prior',record.id,record.revision,JSON.stringify(record.config),record.updatedAt);
 for(const f of record.config.frames)db.prepare('INSERT INTO asset_art_files(id,entry_id,object_key,name,mime,width,height,bytes,published,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(f.id,record.id,f.id,f.name,f.mime,f.width,f.height,f.bytes,1,record.updatedAt);
 const DB={prepare(sql){
  let args=[];
  return{
   bind(...values){args=values;return this},
   async all(){return{results:db.prepare(sql).all(...args)}},
   async run(){return{meta:{changes:Number(db.prepare(sql).run(...args).changes)}}},
  };
 }};
 const get=()=>m.handleArtwork(new Request('https://test.local/api/asset-artwork'),{DB},false);
 const current=(await(await get()).json()).records.find(r=>r.id===record.id);
 assert.equal(current.config.animationMode,'step-on','Existing bunker is enabled automatically in the API and library');
 const wire={...record.config,base:record.config.base.id,frames:record.config.frames.map(f=>f.id),animationMode:'step-on',animationArea};
 const save=(config=wire,revision=record.revision,canEdit=true,origin='https://test.local')=>m.handleArtwork(new Request('https://test.local/api/asset-artwork',{method:'PUT',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({id:record.id,revision,config})}),{DB},canEdit);
 assert.equal((await save(wire,record.revision,false)).status,403);assert.equal((await save(wire,record.revision,true,'https://other.test')).status,403);
 for(const config of [
  {...wire,animationMode:'auto'}, {...wire,animationArea:undefined}, {...wire,frames:[]},
  {...wire,animationArea:{points:[]}}, {...wire,animationArea:{points:[[0,0],[1,1],[1,0],[0,1]]}},
  {...wire,animationArea:{points:[[0,0],[2,0],[0,1]]}}, {...wire,animationArea:{points:[[0,0],[0,0],[1,1]]}}
 ])assert.equal((await save(config)).status,400,'Invalid step-on settings are rejected');
 const saved=await save();assert.equal(saved.status,200,await saved.clone().text());
 const next=(await saved.json()).record;assert.deepEqual(next.config,resolved.config);assert.equal(next.revision,record.revision+1);
 assert.equal((await save()).status,409,'Stale saves cannot overwrite new artwork');
 assert.equal((await save({...wire,animationMode:'loop',animationArea:undefined},next.revision)).status,200);
 assert.equal((await(await get()).json()).records.find(r=>r.id===record.id).config.animationMode,'loop','Owner can turn the default off durably');
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM asset_artwork').get().n,3,'Old artwork revisions remain intact');

 const entry=m.withImportedArt(m.customCatalogueEntry(record.customAsset),resolved);
 const importer=m.renderImporter(entry,resolved),preview=m.renderPreview(entry);
 for(const label of ['Animation behaviour','Step on','Step off','Activation area drawing canvas','Collision drawing canvas','Save asset settings'])assert(importer.includes(label),label);
 assert(importer.includes('value="step-on" selected'));assert(preview.includes('Step on'));assert(preview.includes('Step off'));assert(!preview.includes('Play animation'),'Triggered preview does not offer an endless loop');
 console.log('PASS: real bunker stairs reachable; 3 original frames open once, hold and reverse; mid-animation exits/re-entry continuous; transforms, independent copies, renderer, restart and draft preservation pass. API defaults/save/reload, validation, permissions, conflicts, opt-out and editor/library controls pass.');
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true})}
