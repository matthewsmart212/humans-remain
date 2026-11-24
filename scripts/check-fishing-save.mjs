import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'fishing-save-'));
try{
 await build({stdin:{contents:[
  ...['run-save','fishing-save','fishing-art','fishing-catalog','scene-travel','studio-play','imported-art','world-scenes','expedition-inventory','player-gear'].map(id=>`export * from './src/${id}';`),
  "export * from './native/run-save-store';",
 ].join('\n'),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temporary,'model.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temporary,'model.cjs'));
 const authored=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));m.installImportedArt(authored.records);
 const travel=new m.SceneTravel(m.createCampPlaySession(authored.layout,undefined,'survival'),{pin(){},prepare:async()=>{},ready:()=>true});
 const world=travel.current;
 world.fishing={version:1,bait:4,claimed:true,attempts:3,caught:2,kept:1,released:1,bestKg:.95,baitReadyAt:350,autoHook:true,toggleReel:false,
  pendingCatch:{id:3,species:'perch',name:'Stillwater perch',kg:1.27,isRecord:true,image:m.FISHING_ART.rawFish}};
 world.gear.bag.fishingRod=1;m.setItemCount(world,'rawFish',2);m.setItemCount(world,'cookedFish',3);
 m.setStoredCount(world,'rawFish',4);m.setStoredCount(world,'cookedFish',2);
 for(const [raw,cooked]of [['rawCarp','cookedCarp'],['rawPike','cookedPike']]){
  m.setItemCount(world,raw,2);m.setItemCount(world,cooked,3);m.setStoredCount(world,raw,4);m.setStoredCount(world,cooked,2);
 }
 world.player.equipped='fishingRod';world.fishingSession={phase:'reeling',holding:true,input:'reel'};
 const encoded=m.encodeRun(travel),raw=JSON.parse(encoded),active=snapshot=>snapshot.worlds.find(([id])=>id===snapshot.currentId)[1];
 assert(encoded&&!encoded.includes('fishingSession'),'Live cast input is absent from the web checkpoint');
 const loaded=active(m.decodeRun(encoded));
 assert.deepEqual(loaded.fishing,world.fishing,'An undecided landed catch survives reload exactly');
 assert.equal(loaded.fishingSession,undefined);assert.equal(loaded.player.equipped,'fishingRod');assert.equal(loaded.gear.bag.fishingRod,1);
 assert.equal(m.itemCount(loaded,'rawFish'),2);assert.equal(m.itemCount(loaded,'cookedFish'),3);
 assert.equal(m.storedCount(loaded,'rawFish'),4);assert.equal(m.storedCount(loaded,'cookedFish'),2);
 for(const [raw,cooked]of [['rawCarp','cookedCarp'],['rawPike','cookedPike']]){
  assert.equal(m.itemCount(loaded,raw),2);assert.equal(m.itemCount(loaded,cooked),3);assert.equal(m.storedCount(loaded,raw),4);assert.equal(m.storedCount(loaded,cooked),2);
 }
 const supplied=structuredClone(raw);active(supplied).fishingSession={phase:'reeling',holding:true};
 assert.equal(active(m.decodeRun(JSON.stringify(supplied))).fishingSession,undefined,'Imported transient input is cleared too');

 // The native compact format uses the same omission and production validator.
 const values=new Map(),store=new m.NativeRunSaveStore({async getItem(key){return values.get(key)??null},async setItem(key,value){values.set(key,value)}});
 const prepared=store.prepare(travel);assert(prepared&&!prepared.text.includes('fishingSession'));
 await store.save(prepared);assert.equal(store.error,'');const native=active(await store.load());
 assert.deepEqual(native.fishing,world.fishing);assert.equal(native.fishingSession,undefined);
 assert.equal(native.gear.bag.fishingRod,1);assert.equal(m.itemCount(native,'cookedFish'),3);
 assert.equal(m.itemCount(native,'cookedCarp'),3);assert.equal(m.itemCount(native,'cookedPike'),3);

 // Every new species and its full reward survives both production formats.
 for(const [species,kg,portions,variant,index]of [['perch',1.4,2,0,0],['carp',4.2,3,1,1],['pike',5.6,3,2,3],['drone',5.9,1,3,-1]]){
  const catchState={id:3,species,name:m.FISHING_SPECIES[species].name,kg,portions,isRecord:species!=='drone',image:m.FISHING_SPECIES[species].image,
   water:{x:-1800,y:6700},size:1.3,variant,pierId:'saved-stillwater-pier',fishIndex:index};
  const updated=structuredClone(raw);active(updated).fishing.pendingCatch=catchState;active(updated).fishing.bestBySpecies={perch:.95,carp:2.4,pike:3.7};active(updated).fishing.salvagedAt=100;
  const roundTrip=active(m.decodeRun(JSON.stringify(updated)));assert.deepEqual(roundTrip.fishing.pendingCatch,catchState);
  const before=world.fishing;world.fishing=roundTrip.fishing;const preparation=store.prepare(travel);await store.save(preparation);
  assert.deepEqual(active(await store.load()).fishing,roundTrip.fishing);world.fishing=before;
 }

 const older=structuredClone(raw),old=active(older);
 delete old.fishing;delete old.cookedFish;delete old.bag.rawFish;delete old.stock.rawFish;delete old.kit.pantry.cookedFish;
 for(const [raw,cooked]of [['rawCarp','cookedCarp'],['rawPike','cookedPike']]){delete old[cooked];delete old.bag[raw];delete old.stock[raw];delete old.kit.pantry[cooked]}
 delete old.gear.bag.fishingRod;delete old.gear.chest.fishingRod;
 const legacy=active(m.decodeRun(JSON.stringify(older)));
 assert.equal(legacy.fishing,undefined);assert.equal(m.itemCount(legacy,'rawFish'),0);assert.equal(m.itemCount(legacy,'cookedFish'),0);
 assert.equal(m.storedCount(legacy,'cookedFish'),0);assert(!m.hasGear(legacy,'fishingRod'),'Continue does not regrant a tackle-box rod');
 for(const kind of ['rawCarp','cookedCarp','rawPike','cookedPike']){assert.equal(m.itemCount(legacy,kind),0);assert.equal(m.storedCount(legacy,kind),0)}
 const stored=structuredClone(raw);active(stored).gear.bag.fishingRod=0;active(stored).gear.chest.fishingRod=1;
 const storedLoaded=active(m.decodeRun(JSON.stringify(stored)));assert.equal(storedLoaded.gear.bag.fishingRod,0);assert.equal(storedLoaded.gear.chest.fishingRod,1);

 const corruptions=[
  p=>p.version=2,p=>p.bait=-1,p=>p.bait=11,p=>p.bait=.5,p=>p.attempts=Number.MAX_SAFE_INTEGER+1,
  p=>p.caught=4,p=>p.kept=2,p=>p.released=-1,p=>p.bestKg=8.1,p=>p.bestKg=-.1,
  p=>p.baitReadyAt=-1,p=>p.claimed=1,p=>p.autoHook='true',p=>p.toggleReel=null,
  p=>p.pendingCatch.id=0,p=>p.pendingCatch.id=2,p=>p.pendingCatch.species='salmon',
  p=>p.pendingCatch.name='',p=>p.pendingCatch.name='x'.repeat(81),p=>p.pendingCatch.name='perch\nspoof',
  p=>p.pendingCatch.kg=.09,p=>p.pendingCatch.kg=5.01,p=>p.pendingCatch.isRecord='yes',
  p=>p.pendingCatch.image='https://example.invalid/injected.webp',p=>p.pendingCatch=null,
  p=>p.pendingCatch.portions=0,p=>p.pendingCatch.portions=4,p=>p.pendingCatch.portions=1.5,
  p=>p.pendingCatch.water={x:'unknown',y:20},p=>p.pendingCatch.water={x:30001,y:20},p=>p.pendingCatch.size=0,
  p=>p.pendingCatch.variant=2,p=>p.pendingCatch.fishIndex=-2,p=>p.pendingCatch.pierId='pier\nspoof',
  p=>p.bestBySpecies={salmon:2},p=>p.bestBySpecies={pike:9},p=>p.salvagedAt=-1,
 ];
 for(const corrupt of corruptions){const bad=structuredClone(raw);corrupt(active(bad).fishing);assert.throws(()=>m.decodeRun(JSON.stringify(bad)),/fishing progress/)}
 for(const invalid of [null,[],true,'fish']){const bad=structuredClone(raw);active(bad).fishing=invalid;assert.throws(()=>m.decodeRun(JSON.stringify(bad)),/fishing progress/)}
 for(const key of ['cookedFish','cookedCarp','cookedPike'])for(const invalid of [-1,.5,null,'3']){const bad=structuredClone(raw);active(bad)[key]=invalid;assert.throws(()=>m.decodeRun(JSON.stringify(bad)),/fish inventory/)}
 const decided=structuredClone(raw),progress=active(decided).fishing;
 delete progress.pendingCatch;progress.caught=3;progress.kept=2;progress.bestKg=1.27;
 assert.deepEqual(active(m.decodeRun(JSON.stringify(decided))).fishing,progress,'A resolved catch keeps its recorded decision without inventing a pending reward');

 // Literal native requires stay in sync with every painted fishing icon.
 const bundle=fs.readFileSync('native/bundled-art.ts','utf8');
 for(const url of Object.values(m.FISHING_ART)){
  assert(bundle.includes(JSON.stringify(url)),`${url} is bundled for offline rendering`);
  const bytes=fs.readFileSync('public'+url);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
 const generator=fs.readFileSync('scripts/native-assets.ts','utf8');
 assert(generator.includes('Object.entries(FISHING_ART)'),'Native regeneration collects and protects every fishing icon');
 console.log('PASS: web/native fishing save round trips for all fish and drone salvage, exact pending rewards and release positions, species records, transient cast reset, old-world defaults, stored rod ownership, strict progress/catch validation, all fish counters, and every real offline artwork asset.');
}finally{fs.rmSync(temporary,{recursive:true,force:true})}
