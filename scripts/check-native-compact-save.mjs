// Real saved-run fixtures with a fault-injected storage adapter. No device or
// hosted saves are read or written; this is not an iPhone timing benchmark.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'native-compact-save-'));
try{
 await build({stdin:{contents:"export * from './native/run-save-store';"+['run-save','scene-travel','studio-play','imported-art','world-scenes','world-layout'].map(id=>`export * from './src/${id}';`).join(''),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temp,'model.cjs'));
 const authored=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));m.installImportedArt(authored.records);
 const resources={pin(){},prepare:async()=>{},ready:()=>true};
 const fresh=()=>new m.SceneTravel(m.createCampPlaySession(authored.layout,undefined,'survival'),resources);
 const fromSnapshot=async snapshot=>{const t=fresh();await t.restore(snapshot);return t};
 const memory=()=>{const values=new Map(),writes=[];return{values,writes,hook:undefined,async getItem(k){return values.get(k)??null},async setItem(k,v){await this.hook?.(k,v);values.set(k,v);writes.push({key:k,text:v})}}};
 const create=storage=>new m.NativeRunSaveStore({getItem:k=>storage.getItem(k),setItem:(k,v)=>storage.setItem(k,v)});
 const active=snapshot=>snapshot.worlds.find(([id])=>id===snapshot.currentId)[1];
 const equalLoaded=(actual,expected)=>assert.deepEqual(JSON.parse(JSON.stringify(actual)),JSON.parse(JSON.stringify(expected)));

 const storage=memory(),store=create(storage),travel=fresh();
 travel.current.bag.pallets=7;travel.current.stock.scrap=13;travel.current.gear.bag.arrows=23;
 travel.current.minedRockColliders=new Set(['fixture-rock']);travel.current.tick=420;
 travel.current.player.hp=73;travel.current.player.hurtUntil=12;
 const legacy=m.encodeRun(travel),reference=m.decodeRun(legacy);
 storage.values.set(m.RUN_SAVE_KEY,legacy);
 const restored=await store.load();equalLoaded(restored,reference);
 const continued=await fromSnapshot(restored),prepared=store.prepare(continued);
 assert(prepared&&prepared.serializedLayouts===0,'Loading primes the unchanged layout cache before play');
 assert(prepared.text.length<legacy.length*.15,'Ordinary saved state no longer includes the full static camp');
 await store.save(prepared);assert.equal(store.error,'');
 assert.deepEqual(storage.writes.map(w=>w.key),[m.NATIVE_LAYOUT_SAVE_KEYS.a,m.RUN_SAVE_KEY],'Dependencies reach storage before the manifest');
 let root=JSON.parse(storage.values.get(m.RUN_SAVE_KEY));assert.equal(root.version,2);assert.equal(root.nativeStorage,'native-split-layouts');
 assert(!('items' in root.run.worlds[0][1].layout));
 equalLoaded(await create(storage).load(),m.decodeRun(m.encodeRun(continued)));

 storage.writes.length=0;continued.current.bag.pallets=11;
 const next=store.prepare(continued);assert.equal(next.serializedLayouts,0);
 await store.save(next);assert.deepEqual(storage.writes.map(w=>w.key),[m.RUN_SAVE_KEY],'Changing progress does not rewrite the layout slot');
 assert.equal(active(await create(storage).load()).bag.pallets,11);

 // The captured strings must stay at the checkpoint state while async work
 // waits. Later nested state/layout mutations cannot leak into that snapshot.
 const captured=store.prepare(continued),capturedX=continued.current.layout.items[0].x;
 continued.current.bag.pallets=29;continued.current.layout.items[0].x+=3;
 await store.save(captured);
 const capturedRun=active(await create(storage).load());assert.equal(capturedRun.bag.pallets,11);assert.equal(capturedRun.layout.items[0].x,capturedX);
 const edited=store.prepare(continued);assert.equal(edited.serializedLayouts,1,'Nested in-place placement edits invalidate cached layout text');
 await store.save(edited);assert.equal(active(await create(storage).load()).layout.items[0].x,capturedX+3);
 assert.equal(JSON.parse(storage.values.get(m.RUN_SAVE_KEY)).slot,'b');
 continued.current.layout.spawn.x+=1;
 assert.equal(store.prepare(continued).serializedLayouts,1,'Nested spawn edits are observed');
 continued.current.layout.fixtureExtra={deep:{value:1}};
 assert.equal(store.prepare(continued).serializedLayouts,1,'Added own properties are observed');
 continued.current.layout.fixtureExtra.deep.value=2;
 assert.equal(store.prepare(continued).serializedLayouts,1,'New nested metadata remains observed');
 delete continued.current.layout.fixtureExtra;
 assert.equal(store.prepare(continued).serializedLayouts,1,'Removed own properties are observed');
 const item={...continued.current.layout.items[0],id:'compact-save-extra',x:continued.current.layout.items[0].x+5};
 continued.current.layout.items.push(item);
 assert.equal(store.prepare(continued).serializedLayouts,1,'In-place array changes are observed');
 continued.current.layout.items.pop();
 const reverted=store.prepare(continued);assert.equal(reverted.serializedLayouts,1);
 await store.save(reverted);

 // Both ordinary failed writes and ambiguous reject-after-persist failures
 // protect the active slot. The next operation rereads the actual manifest.
 const stableRoot=storage.values.get(m.RUN_SAVE_KEY),stable=JSON.parse(stableRoot),stableLayout=storage.values.get(m.NATIVE_LAYOUT_SAVE_KEYS[stable.slot]),stableSnapshot=await create(storage).load();
 continued.current.layout={...continued.current.layout,name:'Failed replacement layout'};
 storage.hook=(key)=>{if(key===m.RUN_SAVE_KEY)throw Error('disk full')};
 await store.save(store.prepare(continued));assert(store.error);assert.equal(storage.values.get(m.RUN_SAVE_KEY),stableRoot);
 assert.equal(storage.values.get(m.NATIVE_LAYOUT_SAVE_KEYS[stable.slot]),stableLayout);
 equalLoaded(await create(storage).load(),stableSnapshot);
 storage.hook=key=>{if(key!==m.RUN_SAVE_KEY)throw Error('layout write failed')};
 await store.save(store.prepare(continued));assert(store.error);assert.equal(storage.values.get(m.RUN_SAVE_KEY),stableRoot);
 assert.equal(storage.values.get(m.NATIVE_LAYOUT_SAVE_KEYS[stable.slot]),stableLayout,'A failed inactive-slot write cannot damage the current layout');
 storage.hook=undefined;
 await store.save(store.prepare(continued));assert.equal(store.error,'');
 assert.equal(active(await create(storage).load()).layout.name,'Failed replacement layout');

 continued.current.layout={...continued.current.layout,name:'Persisted but rejected'};
 let rejected=false;storage.hook=(key,text)=>{if(key===m.RUN_SAVE_KEY&&!rejected){rejected=true;storage.values.set(key,text);throw Error('response lost')}};
 await store.save(store.prepare(continued));assert(store.error);
 const ambiguous=JSON.parse(storage.values.get(m.RUN_SAVE_KEY)),activeBytes=storage.values.get(m.NATIVE_LAYOUT_SAVE_KEYS[ambiguous.slot]);
 continued.current.layout={...continued.current.layout,name:'Next after ambiguous failure'};storage.hook=undefined;
 await store.save(store.prepare(continued));assert.equal(store.error,'');
 assert.equal(storage.values.get(m.NATIVE_LAYOUT_SAVE_KEYS[ambiguous.slot]),activeBytes,'Recovery never overwrites a slot that may have committed');
 assert.equal(active(await create(storage).load()).layout.name,'Next after ambiguous failure');
 assert.equal(storage.values.size,3,'Many layout changes use only two layout slots and one manifest');

 // Reopening an unchanged compact save reuses its persisted slot immediately.
 const reopened=create(storage),loaded=await reopened.load(),resumed=await fromSnapshot(loaded);
 storage.writes.length=0;const same=reopened.prepare(resumed);assert.equal(same.serializedLayouts,0);
 await reopened.save(same);assert.deepEqual(storage.writes.map(w=>w.key),[m.RUN_SAVE_KEY]);

 // The size limit includes the stored envelopes, not only run/layout bodies.
 // A near-limit preparation must not commit a manifest the loader rejects.
 const bounded=create(storage),largeTravel=await fromSnapshot(await bounded.load()),base=bounded.prepare(largeTravel);
 largeTravel.current.notice='x'.repeat(12_000_000-base.text.length-base.layoutCharacters-5);
 const nearLimit=bounded.prepare(largeTravel),beforeLimit=storage.values.get(m.RUN_SAVE_KEY);
 assert(nearLimit.text.length+nearLimit.layoutCharacters<=12_000_000);
 storage.writes.length=0;await bounded.save(nearLimit);assert(bounded.error);
 assert.equal(storage.writes.length,0,'Oversized envelopes reject before any storage mutation');assert.equal(storage.values.get(m.RUN_SAVE_KEY),beforeLimit);
 assert(await create(storage).load());
 const dedupLarge=fresh(),largeLayout={...dedupLarge.current.layout,fixturePayload:'x'.repeat(6_000_000)},sceneIds=[m.CAMP_SCENE_ID,...m.SCENES.keys()].slice(0,2);
 assert.equal(new Set(sceneIds).size,2);
 const sharedLarge={busy:false,current:dedupLarge.current,capture:()=>({currentId:m.CAMP_SCENE_ID,worlds:sceneIds.map(id=>[id,{...dedupLarge.current,layout:largeLayout}]),route:[]})};
 assert.throws(()=>bounded.prepare(sharedLarge),/too large/,'Deduplication cannot bypass the hydrated legacy decoder size limit');

 // An older delayed save cannot overtake an explicit replacement run. flush
 // cannot complete while the storage adapter has a write outstanding.
 const racing=memory(),ordered=create(racing),oldTravel=fresh(),newTravel=fresh();oldTravel.current.bag.pallets=31;newTravel.current.bag.pallets=2;
 let release,entered;const blocked=new Promise(r=>{entered=r}),gate=new Promise(r=>{release=r});let first=true;
 racing.hook=async()=>{if(first){first=false;entered();await gate}};
 const oldWrite=ordered.save(ordered.prepare(oldTravel));await blocked;
 const newWrite=ordered.save(ordered.prepare(newTravel),true);let flushed=false;const flush=ordered.flush().then(()=>{flushed=true});
 newTravel.current.bag.pallets=99;await Promise.resolve();assert.equal(flushed,false);release();await Promise.all([oldWrite,newWrite,flush]);
 assert.equal(active(await create(racing).load()).bag.pallets,2,'The latest queued checkpoint wins with its captured state');

 // Corrupt/missing dependencies fail closed; no automatic fallback to a fresh
 // camp. Only an explicitly confirmed new run may replace the unreadable save.
 for(const corrupt of ['invalid-json','missing-layout','wrong-generation','bad-reference','invalid-progress']){
  const bad=memory();for(const [key,value]of storage.values)bad.values.set(key,value);
  const manifest=JSON.parse(bad.values.get(m.RUN_SAVE_KEY));
  if(corrupt==='invalid-json')bad.values.set(m.RUN_SAVE_KEY,'{broken');
  if(corrupt==='missing-layout')bad.values.delete(m.NATIVE_LAYOUT_SAVE_KEYS[manifest.slot]);
  if(corrupt==='wrong-generation'){const bundle=JSON.parse(bad.values.get(m.NATIVE_LAYOUT_SAVE_KEYS[manifest.slot]));bundle.generation='wrong';bad.values.set(m.NATIVE_LAYOUT_SAVE_KEYS[manifest.slot],JSON.stringify(bundle))}
  if(corrupt==='bad-reference'){manifest.run.worlds[0][1].layout.nativeLayout=99;bad.values.set(m.RUN_SAVE_KEY,JSON.stringify(manifest))}
  if(corrupt==='invalid-progress'){manifest.run.worlds[0][1].progression.hqHp=-1;bad.values.set(m.RUN_SAVE_KEY,JSON.stringify(manifest))}
  const raw=bad.values.get(m.RUN_SAVE_KEY),reader=create(bad);await assert.rejects(reader.load());
  const replacement=reader.prepare(fresh());await reader.save(replacement);assert(reader.error);assert.equal(bad.values.get(m.RUN_SAVE_KEY),raw,corrupt+' is preserved');
  await reader.save(replacement,true);assert.equal(reader.error,'');assert(await create(bad).load());
 }

 const restartStorage=memory();restartStorage.values.set(m.RUN_SAVE_KEY,'{broken');
 const restartWriter=create(restartStorage),restartTravel=fresh();restartTravel.current.bag.pallets=45;
 restartStorage.hook=()=>{throw Error('temporarily unavailable')};
 await restartWriter.save(restartWriter.prepare(restartTravel),true);assert(restartWriter.error);assert.equal(restartStorage.values.get(m.RUN_SAVE_KEY),'{broken');
 restartStorage.hook=undefined;restartTravel.current.bag.pallets=46;
 await restartWriter.save(restartWriter.prepare(restartTravel));assert.equal(restartWriter.error,'');
 assert.equal(active(await create(restartStorage).load()).bag.pallets,46,'Confirmed replacement permission survives a transient first-write failure');

 // Camp and interior state, their independent layouts, and their return route
 // round-trip through the production validator unchanged.
 const interiorRaw=JSON.parse(legacy),interior=structuredClone(interiorRaw.worlds[0][1]);
 interior.layout=structuredClone(m.BUNKER_SCENE.layout??m.emptyLayout());Object.assign(interior.player,{x:936,y:649});
 interiorRaw.worlds.push([m.BUNKER_SCENE.id,interior]);interiorRaw.currentId=m.BUNKER_SCENE.id;
 interiorRaw.route=[{sceneId:m.CAMP_SCENE_ID,spawn:{...authored.layout.spawn,direction:'down'}}];
 const inside=m.decodeRun(JSON.stringify(interiorRaw)),interiorTravel=await fromSnapshot(inside),multiStorage=memory(),multi=create(multiStorage);
 const multiPrepared=multi.prepare(interiorTravel);assert.equal(multiPrepared.layouts.length,2);await multi.save(multiPrepared);
 equalLoaded(await create(multiStorage).load(),m.decodeRun(m.encodeRun(interiorTravel)));
 assert.equal(multi.prepare(interiorTravel).serializedLayouts,0);

 // A compact slot can be shared by two worlds, but decode produces separate
 // layout objects. Observing the first object must never hide an edit to the
 // second object, even when the unchanged content stays deduplicated.
 const sharedSnapshot=m.decodeRun(JSON.stringify(interiorRaw));sharedSnapshot.worlds[1][1].layout=sharedSnapshot.worlds[0][1].layout;
 const sharedTravel=await fromSnapshot(sharedSnapshot),sharedStorage=memory(),sharedWriter=create(sharedStorage);
 const sharedPrepared=sharedWriter.prepare(sharedTravel);assert.equal(sharedPrepared.layouts.length,1);await sharedWriter.save(sharedPrepared);
 const sharedReader=create(sharedStorage),sharedLoaded=await sharedReader.load();
 assert.notEqual(sharedLoaded.worlds[0][1].layout,sharedLoaded.worlds[1][1].layout);
 const sharedResumed=await fromSnapshot(sharedLoaded);
 const unchangedShared=sharedReader.prepare(sharedResumed);assert.equal(unchangedShared.layouts.length,1);assert.equal(unchangedShared.serializedLayouts,0);
 sharedStorage.writes.length=0;await sharedReader.save(unchangedShared);assert.deepEqual(sharedStorage.writes.map(w=>w.key),[m.RUN_SAVE_KEY]);
 const firstX=sharedLoaded.worlds[0][1].layout.items[0].x;sharedLoaded.worlds[1][1].layout.items[0].x+=17;
 const editedShared=sharedReader.prepare(sharedResumed);assert.equal(editedShared.layouts.length,2);assert.equal(editedShared.serializedLayouts,1);
 await sharedReader.save(editedShared);const finalShared=await create(sharedStorage).load();
 assert.equal(finalShared.worlds[0][1].layout.items[0].x,firstX);assert.equal(finalShared.worlds[1][1].layout.items[0].x,firstX+17);
 interiorTravel.phase='loading';assert.equal(multi.prepare(interiorTravel),null,'No checkpoint is captured mid-transition');

 console.log(JSON.stringify({passed:true,legacyCharacters:legacy.length,compactCharacters:prepared.text.length,layoutCharacters:prepared.layoutCharacters,compactReductionPercent:Math.round((1-prepared.text.length/legacy.length)*1000)/10,storageKeys:storage.values.size,checks:['legacy+compact continue','in-place edits','unchanged layout cache','immutable checkpoints','ordered new runs','slot/manifest failures','ambiguous write recovery','corruption preservation','confirmed restart retry','stored+hydrated size limits','shared-slot independent edits','camp+interior routes'],physicalIPhoneTested:false}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
