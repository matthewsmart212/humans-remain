// Exercise the production movement, readiness and layout validation against the
// owner's saved camp. The saved fixture is never written back to the service.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'west-camp-check-'));
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-scenes';export * from './src/west-camp';export * from './src/east-approach';export * from './src/outdoor-terrain';export * from './src/outdoor-streaming';export * from './src/world-bounds';export * from './src/world-layout';export * from './src/imported-art';export * from './src/studio-play';export * from './src/scene-travel';export * from './src/weather-model';export {createWorld,worldBlocked,pathTo,STEP} from './src/survival-engine';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=createRequire(import.meta.url)(path.join(temp,'model.cjs')),saved=JSON.parse(fs.readFileSync(process.argv[2])),art=JSON.parse(fs.readFileSync(process.argv[3]));m.installImportedArt(art.records);
 const draft=saved.draft,before=JSON.stringify(draft),world=m.createCampPlaySession(draft),s=m.EAST_TERRAIN_SCALE,p=(x,y)=>({x:(x-600)*s,y:(y-600)*s});
 const travel=new m.SceneTravel(world,{ready:()=>true,prepare:async()=>{},pin:()=>{}}),player=world.player,bag=world.bag;
 world.player.hp=72;world.bag.rawMeat=2;world.stock.scrap=19;world.nightAmount=1;world.phase='night';m.setWorldWeather(world,{rain:true,fog:false,lightning:false},true);const weather=world.weather;
 world.outdoorReady=new Set(m.OUTDOOR_TILES.map(t=>t.key));
 let steps=0;
 const walk=target=>{for(let i=0;i<5000;i++){const dx=target.x-player.x,dy=target.y-player.y,n=Math.hypot(dx,dy);if(n<5)return;m.stepCampPlaySession(world,{x:dx/n,y:dy/n},false,false);travel.tick(m.STEP);steps++;assert.equal(travel.current,world);assert.equal(travel.opacity,0,'Outdoor crossing caused a fade')}assert.fail('Blocked walking to '+JSON.stringify({target,at:{x:player.x,y:player.y}}))};
 const approach=m.pathTo(player,p(100,4530),world,20000);assert(approach.length,'The saved camp spawn must reach its southwest exit');for(const at of approach)walk(at);
 const route=[[100,4530],[-122,4775],[-694,5040],[-1100,5300],[-1400,5480],[-1150,5700],[-800,5800],[-800,4700],[-800,3900],[-800,3150],[-800,3006],[-800,2700],[-1100,2770],[-1400,2830],[-1100,2200],[-900,1700],[-900,1598],[-900,900],[-900,420],[-400,450],[-400,1500],[-400,2700],[-694,2640]];
 for(const at of route)walk(p(...at));for(const at of [...route].reverse())walk(p(...at));for(const at of [...approach].reverse())walk(at);
 const westExit=m.pathTo(player,p(-450,2740),world,20000);assert(westExit.length,'The saved camp reaches the western exit');for(const at of westExit)walk(at);for(const at of [...westExit].reverse())walk(at);
 assert.equal(world.player,player);assert.equal(world.bag,bag);assert.equal(world.weather,weather);assert.equal(player.hp,72);assert.equal(world.bag.rawMeat,2);assert.equal(world.stock.scrap,19);assert.equal(world.nightAmount,1);assert.equal(JSON.stringify(draft),before);
 // Ground extends left of the original source origin, without moving camp.
 assert.deepEqual(m.OUTDOOR_SOURCE_BOUNDS,{x:-1528,y:0,width:11508,height:6206});
 const tiles=m.WEST_CAMP_TERRAIN_TILES.map(t=>m.OUTDOOR_TILES.find(o=>o.key===t.key));
 const points=[[700,5300],[-900,3800],[-900,5500],[-900,2300],[-900,900]].map(v=>p(...v));
 world.outdoorReady=new Set(m.OUTDOOR_TILES.filter(t=>!t.key.startsWith('outdoor:west-camp:')).map(t=>t.key));
 for(let i=0;i<tiles.length;i++){assert(m.worldBlocked(world,points[i].x,points[i].y,19),'Old ground unlocked an unavailable western texture');world.outdoorReady.add(tiles[i].key);assert(!m.worldBlocked(world,points[i].x,points[i].y,19),'Ready western ground remains blocked')}
 for(const tile of tiles){if(tile.eastBlendKey)assert.equal(m.terrainPaintRegion(tile,()=>false).fadeRight,0);if(tile.southBlendKey){assert.equal(m.terrainPaintRegion(tile,()=>false).fadeBottom,0);assert.equal(m.terrainPaintRegion(tile,()=>true).fadeBottom,36*s)}}
 for(const at of [[-1535,3000],[-700,100],[-8,182],[500,6250]]){const q=p(...at);assert(m.worldBlocked(world,q.x,q.y,19),'Unbuilt boundary opens at '+at)}
 const bad=p(-700,100);assert(m.validateLayout({...draft,spawn:bad}).errors.length,'Cannot save a spawn in the remaining northwest notch');
 const expanded={...draft,spawn:points[4],items:[...draft.items,...points.map(at=>m.newPlacement('base_well_t1',at.x,at.y+100))]};assert.deepEqual(m.validateLayout(JSON.parse(JSON.stringify(expanded))).errors,[]);assert.deepEqual(expanded.items.slice(0,draft.items.length),draft.items);
 const custom={...draft,terrainImage:{...draft.terrainImage,id:'custom',url:'/api/asset-files/custom'}};assert(m.worldBlocked(m.createWorld(custom),points[4].x,points[4].y,19));
 // Streaming works west of zero, retries failed downloads, and frees distant art.
 let fail=true;const released=[],stream=new m.OutdoorTerrainStream(async()=>{if(fail)throw Error('offline')},keys=>released.push(...keys)),view=at=>({...at,x:at.x-400,y:at.y-200,width:800,height:400});
 stream.update(view(points[4]),points[4]);await stream.settled();assert(stream.error);fail=false;stream.retry();await stream.settled();assert(!stream.error);assert(stream.ready.has(tiles[4].key));
 stream.update(view(points[2]),points[2]);await stream.settled();assert(stream.ready.has(tiles[2].key));assert(!stream.ready.has(tiles[4].key),'Distant upper ground should unload');assert(released.includes(tiles[4].key));
 stream.dispose();travel.dispose();const output={result:'pass',campRevision:saved.revision,campPlacements:draft.items.length,steps,terrainPieces:tiles.length,sourceBounds:m.OUTDOOR_SOURCE_BOUNDS,checks:['physical return journeys through southwest, west and road-free upper ground','same player, world, inventory, weather and night state; no outdoor transition','saved camp coordinates unchanged','negative-coordinate placements and spawn validate','missing terrain, outer edge and northwest notch block','prefetch, retry and distant texture disposal']};fs.mkdirSync('docs/qa/west-camp-v2',{recursive:true});fs.writeFileSync('docs/qa/west-camp-v2/game-checks.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
