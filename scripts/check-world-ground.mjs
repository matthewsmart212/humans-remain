// Production movement, bounds, streaming and saved-camp preservation. No live writes.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'world-ground-check-'));
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-scenes';export * from './src/east-approach';export * from './src/outdoor-terrain';export * from './src/outdoor-streaming';export * from './src/world-bounds';export * from './src/world-layout';export * from './src/imported-art';export * from './src/studio-play';export * from './src/scene-travel';export * from './src/weather-model';export * from './src/world-master-plan';export {createWorld,worldBlocked,pathTo,STEP} from './src/survival-engine';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=createRequire(import.meta.url)(path.join(temp,'model.cjs')),saved=JSON.parse(fs.readFileSync('docs/qa/camp-moss-no-gates-v1/layout-after.json')),art=JSON.parse(fs.readFileSync('docs/qa/camp-moss-no-gates-v1/source-artwork.json'));m.installImportedArt(art.records);
 const s=m.EAST_TERRAIN_SCALE,p=(x,y)=>({x:(x-600)*s,y:(y-600)*s}),ready=new Set(m.OUTDOOR_TILES.map(t=>t.key));let steps=0;
 assert.deepEqual(m.OUTDOOR_SOURCE_BOUNDS,m.WORLD_PLAN_BOUNDS);assert.equal(m.OUTDOOR_TILES.length,256);
 const travelFor=world=>new m.SceneTravel(world,{ready:()=>true,prepare:async()=>{},pin:()=>{}});
 const walk=(world,travel,target)=>{for(let i=0;i<15000;i++){const dx=target.x-world.player.x,dy=target.y-world.player.y,n=Math.hypot(dx,dy);if(n<5)return;m.stepCampPlaySession(world,{x:dx/n,y:dy/n},false,false);travel.tick(m.STEP);steps++;assert.equal(travel.current,world);assert.equal(travel.opacity,0,'Outdoor crossing must not change scene')}assert.fail('Blocked journey: '+JSON.stringify({target,at:world.player}))};
 // Every tile is visited by physical walking in a serpentine tour, not teleporting.
 const empty=m.emptyLayout(),world=m.createCampPlaySession(empty),travel=travelFor(world);world.outdoorReady=ready;
 const player=world.player,bag=world.bag;world.bag.rawMeat=2;world.stock.scrap=19;
 m.setWorldWeather(world,{rain:true,fog:false,lightning:false},true);const weather=world.weather;world.nightAmount=1;world.phase='night';
 for(let row=0;row<16;row++)for(let c=0;c<16;c++){const col=row%2?15-c:c,t=m.OUTDOOR_SOURCE_TILES[row*16+col];walk(world,travel,p(t.x+t.width/2,t.y+t.height/2))}
 for(const d of m.WORLD_PLAN_DISTRICTS)walk(world,travel,p(...d.centre));walk(world,travel,empty.spawn);
 assert.equal(world.player,player);assert.equal(world.bag,bag);assert.equal(world.weather,weather);assert.equal(world.bag.rawMeat,2);assert.equal(world.stock.scrap,19);assert.equal(world.nightAmount,1);travel.dispose();
 // The owner's saved camp remains unchanged and has a traversable return trip.
 const before=JSON.stringify(saved.draft),camp=m.createCampPlaySession(saved.draft),campTravel=travelFor(camp);camp.outdoorReady=ready;
 // Follow the authored southwest opening rather than asking the creature's
 // coarse path grid to route through thin camp fences.
 const exit=[[2250,2850],[1780,3160],[1550,3460],[900,3830],[100,4530]].map(at=>p(...at));for(const at of exit)walk(camp,campTravel,at);
 for(const at of [[-500,5000],[-500,2000],[-500,-1500],[-4000,-1500],[-4000,5000],[-500,5000],[100,4530]])walk(camp,campTravel,p(...at));
 for(const at of [...exit].reverse())walk(camp,campTravel,at);walk(camp,campTravel,saved.draft.spawn);assert.equal(JSON.stringify(saved.draft),before);campTravel.dispose();
 // All grid contacts and district footprints lie in the installed union.
 let coverageSamples=0;
 for(let y=-6100;y<=13700;y+=200)for(let x=-7100;x<=12700;x+=200){const q=p(x,y);assert(m.campContains(undefined,q.x,q.y,19));coverageSamples++}
 for(const d of m.WORLD_PLAN_DISTRICTS)for(const at of [d.centre,...d.outline]){const q=p(...at);assert(m.campContains(undefined,q.x,q.y,19))}
 for(const at of [[-7210,0],[12810,0],[0,-6210],[0,13810]]){const q=p(...at);assert(m.worldBlocked(world,q.x,q.y,19),'Outer edge must block')}
 const point=p(-6500,-5500),tile=m.OUTDOOR_TILES.find(t=>point.x>t.x&&point.x<t.x+t.width&&point.y>t.y&&point.y<t.y+t.height);
 world.outdoorReady=new Set();assert(m.worldBlocked(world,point.x,point.y,19));world.outdoorReady.add(tile.key);assert(!m.worldBlocked(world,point.x,point.y,19));
 for(const t of m.OUTDOOR_TILES){if(t.westKey)assert.equal(m.terrainPaintRegion(t,()=>false).fadeLeft,0);if(t.northBlendKey)assert.equal(m.terrainPaintRegion(t,()=>false).fadeTop,0)}
 const custom={...saved.draft,terrainImage:{...saved.draft.terrainImage,id:'custom',url:'/api/asset-files/custom'}};assert(m.worldBlocked(m.createWorld(custom),point.x,point.y,19));
 let fail=true;const releases=[],stream=new m.OutdoorTerrainStream(async()=>{if(fail)throw Error('offline')},keys=>releases.push(...keys)),view=q=>({x:q.x-400,y:q.y-200,width:800,height:400});
 stream.update(view(point),point);await stream.settled();assert(stream.error);fail=false;stream.retry();await stream.settled();assert(!stream.error);assert(stream.ready.has(tile.key));
 const far=p(12000,13000);stream.update(view(far),far);await stream.settled();assert(!stream.ready.has(tile.key));assert(releases.includes(tile.key));stream.dispose();
 const result={result:'pass',terrainSquares:m.OUTDOOR_TILES.length,districtAreas:m.WORLD_PLAN_DISTRICTS.length,sourceBounds:m.OUTDOOR_SOURCE_BOUNDS,walkingSteps:steps,coverageSamples,campPlacements:saved.draft.items.length,checks:['physical walking through every square and all seven district centres','same world, player, inventory, weather and night state; no scene fades','saved-camp exit and return without changing draft','all district outlines covered','missing downloads and world edges block safely','retry, prefetch and distant image release','custom terrain bounds preserved'],limitations:'Saved camp fixture tested, not a new live database read; no physical iPhone test.'};fs.mkdirSync('docs/qa/world-ground-v1',{recursive:true});fs.writeFileSync('docs/qa/world-ground-v1/game-checks.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
