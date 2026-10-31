import {build} from 'esbuild';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createRequire} from 'node:module';import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
const sharp=createRequire(import.meta.url)('sharp'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'world-tier-check-'));
try{
 await build({stdin:{contents:`export * from './src/world-tiers';export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/placed-world-renderer';export * from './src/survival-engine';export * from './src/catalogue-model';export * from './server/world-layout';export {default as TierControls} from './src/WorldTierControls';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:path.join(temp,'test.mjs')});
 // React lives in the project's installed dependencies, not the temporary directory.
 fs.symlinkSync(path.resolve('node_modules'),path.join(temp,'node_modules'),'dir');
 const m=await import(pathToFileURL(path.join(temp,'test.mjs')));
 const React=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
 const manifest=JSON.parse(fs.readFileSync('src/wall-artwork-replacements.json'));
 const fixtureRecords=manifest.map((v,i)=>({id:v.entryId,revision:1,updatedAt:'2026-01-01T00:00:00.000Z',customAsset:{id:v.entryId,name:`Base wall ${i+1}`,createdAt:'2026-01-01T00:00:00.000Z'},config:{kind:'sprite',base:{id:v.sourceId,url:'/api/asset-files/'+v.sourceId,name:'wall.png',mime:'image/png',width:v.width/2,height:v.height/2,bytes:1000},frames:[],fps:8,worldWidth:v.width/2,anchor:[.5,.94],solid:true,footprint:{width:.6,depth:.1},collision:{lineWidth:.012,paths:[{closed:false,points:[[.15,.6],[.5,.7],[.85,.9]]}]}}}));
 m.installImportedArt(fixtureRecords);const fixture=m.emptyLayout();fixture.items=[...Array.from({length:11},(_,i)=>({...m.newPlacement(manifest[i%8].entryId,550+(i%4)*600,500+Math.floor(i/4)*900),scale:1.55+(i%3)*.25,rotation:i*11,flipX:i%2===0,flipY:i===9,layer:-i||0,locked:true})),{...m.newPlacement('base_shelter_t1',1700,900),scale:1.8,locked:true},{...m.newPlacement('base_hearth_t1',1700,1900),scale:2.7}];
 const raw=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2])):{records:fixtureRecords},snapshot=process.argv[3]?JSON.parse(fs.readFileSync(process.argv[3])):{draft:fixture};
 m.installImportedArt(raw.records);const assets=m.ASSET_BY_ID,original=snapshot.draft,originalJSON=JSON.stringify(original);
 assert.deepEqual(m.validateLayout(original).errors,[],'current saved layout is still valid');
 const walls=original.items.filter(p=>m.wallIdentity(p.assetId)),selected=walls[0];assert.equal(walls.length,11,'real fixture includes repeated and mirrored wall pieces');
 const omitTier=p=>{const {assetId,frame,...rest}=p;return rest};
 let current=original;
 for(const tier of [2,3,1,3,2,1]){
  const next=m.changePlacementTier(current,selected.id,tier);assert.notEqual(next,current);
  for(const before of original.items){const after=next.items.find(p=>p.id===before.id);
   assert.deepEqual(omitTier(after),omitTier(before),'all placement settings survive');
   assert.deepEqual(m.placementBounds(after),m.placementBounds(before),'exact position and rectangle');
   assert.deepEqual(m.placementBodies(after),m.placementBodies(before),'exact collision polygons/lines');
   if(m.wallIdentity(before.assetId)){assert.equal(m.wallIdentity(after.assetId).tier,tier);assert.equal(m.wallIdentity(after.assetId).piece,m.wallIdentity(before.assetId).piece)}else assert.equal(after,before,'unrelated placements untouched');
   const b=m.placementBounds(before);for(const point of [[b.x,b.y],[b.x+b.width,b.y+b.height]])assert.deepEqual(m.placementPoint(after,...point),m.placementPoint(before,...point),'rotated/mirrored corners stay fixed');
  }
  const saved=m.validateLayout(JSON.parse(JSON.stringify(next)));assert.deepEqual(saved.errors,[]);assert.deepEqual(saved.layout.items,next.items,'fixed frame and tier survive export/validation/reload');current=next;
 }
 assert.equal(JSON.stringify(original),originalJSON,'pure changes never mutate the user fixture');
 assert.equal(m.changePlacementTier(current,selected.id,1),current,'same tier creates no undo entry');
 const upgraded=m.changePlacementTier(original,selected.id,3),newId=m.wallAssetForLayout(walls[1].assetId,upgraded);assert.equal(m.wallIdentity(newId).tier,3,'new walls inherit the perimeter tier');
 const incomplete=new Map(assets);incomplete.delete(m.wallAssetId(m.wallIdentity(walls[2].assetId).baseId,3));assert.throws(()=>m.changePlacementTier(original,selected.id,3,incomplete),/Nothing was changed/,'missing variant aborts the whole operation');
 const pending=[];let live=original,history=[];
 const prepared=await m.prepareTierChange(live,selected.id,2,async ids=>pending.push(...ids),()=>live);history.push(live);live=prepared;assert.equal(pending.length,new Set(walls.map(p=>p.assetId)).size);assert.equal(history.length,1);live=history.pop();assert.equal(live,original,'one undo restores all walls');
 await assert.rejects(()=>m.prepareTierChange(original,selected.id,2,async()=>{throw Error('image failed')},()=>original),/image failed/);
 await assert.rejects(()=>m.prepareTierChange(original,selected.id,2,async()=>{},()=>({...original})),/draft changed/,'loading cannot overwrite newer edits');
 assert.equal(m.placementEditable(selected,{assetId:newId}),true,'intentional tier switch works on locked objects');assert.equal(m.placementEditable(selected,{x:selected.x+1}),false);
 // Test every available checklist tier in both directions, including different aspect ratios and anchors.
 let checked=0;
 for(const entry of m.entries){if(!assets.has(entry.id))continue;const options=m.tierOptions(entry.id).filter(o=>o.available);if(options.length<2)continue;
  const p={...m.newPlacement(entry.id,1700,2000),scale:1.85,rotation:37,flipX:true,flipY:true,locked:true,layer:-4},layout={...m.emptyLayout(),items:[p]};
  for(const option of options){let next;try{next=m.changePlacementTier(layout,p.id,option.tier)}catch(e){throw Error(`${entry.id} -> ${option.assetId}: ${e.message}`)}const q=next.items[0];assert.deepEqual(m.placementBounds(q),m.placementBounds(p));assert.deepEqual(m.placementBodies(q),m.placementBodies(p));assert.deepEqual(omitTier(q),omitTier(p));assert.deepEqual(m.validateLayout(next).errors,[]);checked++}
 }
 const fire=original.items.find(p=>p.assetId==='base_hearth_t1');let destination;
 for(const tier of [1,2,3]){const layout=m.changePlacementTier(original,fire.id,tier),p=layout.items.find(p=>p.id===fire.id),a=assets.get(p.assetId),w=m.createWorld({...layout,items:[p]}),draws=[];
  const ctx=new Proxy({globalAlpha:1,drawImage(...args){draws.push(args)}},{get:(o,k)=>k in o?o[k]:(()=>{})}),images=Object.fromEntries(Object.entries(m.requiredImages([a.id])).map(([k,url])=>[k,url]));Object.assign(w.player,{x:0,y:3000});
  for(const fuel of [0,100])for(let frame=0;frame<8;frame++){w.camp.hearth.fuel=fuel;w.tick=frame*6;draws.length=0;m.placedDrawables(ctx,images,w,true).forEach(d=>d.draw());assert.equal(draws.length,1);destination??=draws[0].slice(-4);assert.deepEqual(draws[0].slice(-4),destination,'all tiers, flames and unlit share one destination')}
 }
 for(const bad of [{width:NaN},{height:0},{anchor:[2,0]},{sourceAssetId:'missing'},null]){const copy=structuredClone(upgraded);copy.items[0].frame=bad===null?null:{...copy.items[0].frame,...bad};assert(m.validateLayout(copy).errors.length,'reject invalid frame')}
 const html=renderToStaticMarkup(React.createElement(m.TierControls,{layout:original,placement:selected,pending:false,disabled:false,onChange(){}}));assert(html.includes('Changes all 11 placed wall pieces'));assert(html.includes('aria-pressed="true"'));assert.equal((html.match(/<button/g)||[]).length,3);
 const headquarters=original.items.find(p=>p.assetId==='base_shelter_t1'),hqUI=renderToStaticMarkup(React.createElement(m.TierControls,{layout:original,placement:headquarters,pending:false,disabled:false,onChange(){}}));assert(hqUI.includes('Artwork needed'),'missing art is explicit');assert(/disabled=""/.test(hqUI));
 // Exercise the same D1-backed handler used by the published site, without external writes.
 const sql=new DatabaseSync(':memory:');for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+file,'utf8'));
 for(const record of raw.records){if(record.customAsset)sql.prepare('INSERT INTO custom_assets (id,name,created_at) VALUES (?,?,?)').run(record.id,record.customAsset.name,record.customAsset.createdAt);sql.prepare('INSERT INTO asset_artwork (id,entry_id,revision,config_json,created_at) VALUES (?,?,?,?,?)').run('fixture-'+record.id,record.id,record.revision,JSON.stringify(record.config),record.updatedAt)}
 const db={prepare(query){let params=[];return{bind(...values){params=values;return this},async all(){return{results:sql.prepare(query).all(...params)}},async run(){const r=sql.prepare(query).run(...params);return{meta:{changes:Number(r.changes)}}}}}};
 const origin='https://tier-test.local',request=(layout,revision,action='save',originHeader=origin)=>new Request(origin+'/api/world-layout',{method:'PUT',headers:{Origin:originHeader,'Content-Type':'application/json'},body:JSON.stringify({layout,revision,action})});
 const saveLayout={...upgraded,terrainImage:undefined,terrainBorder:undefined};
 assert.equal((await m.handleWorldLayout(request(saveLayout,0),db,false)).status,403);assert.equal((await m.handleWorldLayout(request(saveLayout,0,'save','https://wrong.local'),db,true)).status,403);
 assert.equal((await m.handleWorldLayout(request(saveLayout,0),db,true)).status,200);let reloaded=await(await m.handleWorldLayout(new Request(origin+'/api/world-layout'),db,true)).json();assert.deepEqual(reloaded.draft.items,saveLayout.items,'server retains wall variants and fixed geometry');assert.equal(reloaded.applied,null);
 assert.equal((await m.handleWorldLayout(request(saveLayout,0),db,true)).status,409,'stale revisions still protected');
 const gameplay={...m.changePlacementTier(saveLayout,fire.id,3),items:saveLayout.items.map(p=>({...p,solid:false}))};gameplay.items= m.changePlacementTier(gameplay,fire.id,3).items;
 for(const [id,x,y]of [['exp_generation_t1',350,3000],['base_well_t1',850,3000],['base_shared_store_t1',1350,3000]])if(!gameplay.items.some(p=>p.role===assets.get(id).role))gameplay.items.push(m.newPlacement(id,x,y));
 const applied=await m.handleWorldLayout(request(gameplay,1,'apply'),db,true);assert.equal(applied.status,200,await applied.clone().text());reloaded=await(await m.handleWorldLayout(new Request(origin+'/api/world-layout'),db,true)).json();assert.deepEqual(reloaded.applied.items,gameplay.items,'applied game preserves tiers and placement frames');
 m.installImportedArt(raw.records);assert.deepEqual(m.validateLayout(reloaded.applied,true).errors,[],'fresh reload recognizes tier IDs');sql.close();
 for(const a of assets.values())if(a.image.startsWith('/survival/wall-tiers-v1/')){const meta=await sharp('public'+a.image).metadata();assert.equal(meta.width,a.crop[2]);assert.equal(meta.height,a.crop[3]);assert(meta.hasAlpha);assert.deepEqual(m.imageDimensions[a.image],[meta.width,meta.height])}
 console.log(`PASS: ${checked} checklist-tier transitions; 11 linked walls and 16 registered variants; fixed transforms/colliders; locked items; atomic undo; loading failure/races; JSON persistence; inspector controls; all 48 hearth animation destinations.`);
}finally{fs.rmSync(temp,{recursive:true,force:true})}
