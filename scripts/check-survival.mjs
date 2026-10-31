import fs from 'node:fs';import ts from 'typescript';import assert from 'node:assert/strict';
const sourceCache=new Map();
const compile=f=>f.endsWith('.json')?'export default '+fs.readFileSync(new URL('../src/'+f,import.meta.url),'utf8')+';':ts.transpileModule(fs.readFileSync(new URL('../src/'+f,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from (['"])(\.\/[^'"]+)\1/g,(_,q,p)=>'from '+JSON.stringify(sourceURL(p.slice(2)+(p.endsWith('.json')?'':'.ts'))));
function sourceURL(f){if(!sourceCache.has(f))sourceCache.set(f,'data:text/javascript;base64,'+Buffer.from(compile(f)).toString('base64'));return sourceCache.get(f)}
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');const mapurl=url(compile('factory-map.ts')),map=await import(mapurl);const e=await import(url(compile('survival-engine.ts').replace("'./factory-map'",JSON.stringify(mapurl))));
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
const tick=(w,n,input={x:0,y:0},attack=false)=>{for(let i=0;i<n;i++)e.stepWorld(w,input,attack)};
const {workerAnimation,workerStride}=await import(sourceURL('worker-animation.ts'));
const {WORKER_FRAMES,WORKER_BOOT_CUTS}=await import(sourceURL('worker-motion-art.ts'));
for(const direction of Object.keys(e.DIRECTION_ANGLES)){
 const frames=WORKER_FRAMES[direction];assert.deepEqual(Object.keys(frames),['idle','punch']);
 for(const f of Object.values(frames)){
  const png=fs.readFileSync(new URL('../public/survival/worker-motion-'+(f.sheet==='workerMotionA'?'a':'b')+'.png',import.meta.url));
  const [x,y,width,height]=f.crop;assert(x>=0&&y>=0&&x+width<=png.readUInt32BE(16)&&y+height<=png.readUInt32BE(20));
 }
 const [top,split,bottom]=WORKER_BOOT_CUTS[direction];assert(top<bottom&&bottom<frames.idle.crop[3]&&split<frames.idle.crop[2]);
}
// Every facing has a planted idle, opposite steps, and a direction-locked punch.
for(const [direction,angle] of Object.entries(e.DIRECTION_ANGLES)){
 const actor=e.createWorld();actor.player.direction=direction;
 assert.equal(workerAnimation(actor).pose,'idle');
 actor.player.moving=true;
 for(const walkDistance of [0,28,56,84]){
  actor.player.walkDistance=walkDistance;assert.equal(workerAnimation(actor).pose,'walk');
  const stride=workerStride(actor);assert.equal(stride.left+stride.right,0);
 }
 actor.player.moving=false;assert.equal(workerAnimation(actor).pose,'idle');
 actor.attackReady=.52;actor.attackAngle=angle;actor.tick=6;
 actor.player.direction=direction==='up'?'down':'up';
 assert.deepEqual(workerAnimation(actor),{direction,pose:'punch'});
 actor.tick=22;assert.equal(workerAnimation(actor).pose,'idle');
}
assert(Math.abs(map.MAP_WIDTH*map.MAP_HEIGHT-1800*2400*2)<.001,'home ground doubles while camera/sprites stay unchanged');
let w=e.createWorld();assert.equal(w.phaseLeft,90);assert.equal(w.loot.length,24);
// Every resource and entry must have a navigable route to/from the central base.
for(const point of [...map.LOOT_POINTS,...map.ENTRANCES]){assert(!e.worldBlocked(w,point.x,point.y),`clear spawn ${point.x},${point.y}`);assert(e.pathTo(w.player,point,w).length,`connected ${point.x},${point.y}`)}
function walk(w,x,y){for(let i=0;i<800&&Math.hypot(w.player.x-x,w.player.y-y)>10;i++){const dx=x-w.player.x,dy=y-w.player.y,d=Math.hypot(dx,dy);e.stepWorld(w,{x:dx/d,y:dy/d})}assert(Math.hypot(w.player.x-x,w.player.y-y)<12,`reachable ${x},${y}`)}
// Walk into the furnished fuel store and bunkhouse, then deposit at home.
const stations=await import(sourceURL('camp-stations.ts'));const storageFront=stations.stationFront(e.createWorld().camp,'storage');
const baseReturn={x:e.BASE.x,y:e.BASE.y+95};assert(!e.worldBlocked(w,baseReturn.x,baseReturn.y));
for(const goal of [map.LOOT_POINTS[6],map.LOOT_POINTS[3]]){w=e.createWorld();for(const point of e.pathTo(w.player,goal,w))walk(w,point.x,point.y);walk(w,goal.x,goal.y);assert.equal(w.loads,0,'walking must not pick up');assert(e.pickup(w));assert(w.loads>0);for(const point of e.pathTo(w.player,storageFront,w))walk(w,point.x,point.y);walk(w,storageFront.x,storageFront.y);assert(w.loads>0);assert(e.doAction(w,'deposit'));assert.equal(w.loads,0);assert(w.stock.scrap+w.stock.fuel+w.stock.pallets>0);}
// Walking into a real building wall cannot pass through.
w=e.createWorld();const hall=map.ROOMS[0];w.player.x=hall.x+hall.width-60;w.player.y=e.BASE.y;tick(w,100,{x:1,y:0});assert(w.player.x<hall.x+hall.width-15);assert(e.blocked(hall.x,hall.y+50));assert(!e.blocked(map.SHUTTER_POINT.x,map.SHUTTER_POINT.y));
// Building, fuel, carrying and deposit conservation.
w=e.createWorld();Object.assign(w.player,baseReturn);assert(!e.doAction(w,'upgrade'));w.stock.scrap=20;assert(e.doAction(w,'upgrade'));w.generator.hp=50;assert(e.doAction(w,'repair'));assert.equal(w.generator.hp,105);w.stock.pallets=4;assert(e.doAction(w,'barricade'));w.stock.fuel=25;assert(e.doAction(w,'fuel'));
w=e.createWorld();w.player={...w.player,x:900,y:1600};w.loot=Array.from({length:8},(_,i)=>({id:i,x:900,y:1600,kind:'scrap',amount:4}));tick(w,1);assert.equal(w.loads,0);for(let i=0;i<6;i++)assert(e.doAction(w,'pickup'));assert(!e.pickup(w));assert.equal(w.loot.length,2);assert.equal(w.loads,6);assert.equal(w.bag.scrap,24);Object.assign(w.player,baseReturn);tick(w,1);assert.equal(w.stock.scrap,0);assert(!e.doAction(w,'deposit'));Object.assign(w.player,storageFront);assert(e.doAction(w,'deposit'));assert.equal(w.stock.scrap,24);assert(!e.doAction(w,'deposit'));
// Breakable props are solid until destroyed, release one drop, and never double-pay.
w=e.createWorld();w.loot=[];const crate=w.breakables[0];Object.assign(w.player,{x:crate.x,y:crate.y+91});assert(e.worldBlocked(w,crate.x,crate.y));assert(e.attack(w));assert.equal(crate.hp,32);assert(!e.attack(w));tick(w,33);assert(e.attack(w));assert.equal(crate.hp,0);assert(!e.worldBlocked(w,crate.x,crate.y));assert.equal(w.loot.length,1);assert.equal(w.loot[0].amount,crate.amount);tick(w,33);e.attack(w);assert.equal(w.loot.length,1);walk(w,crate.x,crate.y);assert.equal(w.loads,0);assert(e.pickup(w));assert.equal(w.bag[crate.kind],crate.amount);assert(!e.pickup(w));
// Walls stop both melee and manual pickups; full bags leave resources available.
w=e.createWorld();const testWall=map.ROOMS[0];w.breakables=[{id:999,x:testWall.x+36,y:testWall.y+90,hp:64,maxHp:64,kind:'scrap',amount:4,flashUntil:0}];Object.assign(w.player,{x:testWall.x-36,y:testWall.y+90});e.attack(w);assert.equal(w.breakables[0].hp,64);w.loot=[{id:888,x:testWall.x+20,y:testWall.y+90,kind:'fuel',amount:20}];w.player.x=testWall.x-20;tick(w,1);assert(!e.pickup(w));assert.equal(w.loot.length,1);
// All three lockers have usable approach routes; searching once releases a real pickup.
for(const f of map.FURNITURE.filter(f=>f.search)){w=e.createWorld();const front={x:f.x,y:f.y+50};assert(!e.worldBlocked(w,front.x,front.y));for(const p of e.pathTo(w.player,front,w))walk(w,p.x,p.y);walk(w,front.x,front.y);const before=w.loot.length;assert(e.doAction(w,'search'));assert.equal(w.loot.length,before+1);assert(!e.doAction(w,'search'));assert.equal(w.searched.length,1);}
// Phase cycle, increasing round and local record.
w=e.createWorld();w.phaseLeft=.001;tick(w,1);assert.equal(w.phase,'night');const fuel=w.generator.fuel;tick(w,60);assert(w.generator.fuel<fuel);w.phaseLeft=.001;tick(w,1);assert.equal(w.round,2);assert.equal(w.survived,1);assert.equal(w.loot.length,24);assert(e.finishRun(w).newBest);assert.equal(e.readProgress().best,1);
// Starting tools, light power rules and bat damage/cooldown.
w=e.createWorld();assert.deepEqual(w.tools,{bat:true,hammer:true,torch:true});assert(w.torchOn);assert(e.doAction(w,'torch'));assert(!w.torchOn);assert(e.doAction(w,'torch'));for(const lamp of map.CAMP_LAMPS)assert(e.inCampLight(w,lamp));w.generator.fuel=0;assert(!e.inCampLight(w,map.CAMP_LAMPS[0]));w.generator.fuel=20;w.generator.hp=0;assert(!e.inCampLight(w,map.CAMP_LAMPS[0]));assert(w.torchOn,'personal torch survives blackout');w.tools.bat=false;assert(!e.attack(w));Object.assign(w.player,baseReturn);w.stock.scrap=20;w.tools.hammer=false;assert(!e.doAction(w,'repair'));
w=e.createWorld();w.enemies=[{id:90,x:w.player.x+20,y:w.player.y+10,hp:49,maxHp:49,attackAt:5,path:[],repathAt:0,flashUntil:0}];assert(e.attack(w));assert.equal(w.enemies[0].hp,17);assert(!e.attack(w));tick(w,33);assert(e.attack(w));assert.equal(w.kills,1);
w=e.createWorld();Object.assign(w.player,baseReturn);w.player.hp=0;w.player.downedUntil=14;assert(!e.pickup(w));tick(w,121);assert.equal(w.player.lifeline,0);assert.equal(w.revives,1);w.player.downedUntil=e.timeOf(w)+1;w.player.hp=0;tick(w,61);assert.equal(w.phase,'over');
// A complete live night: enemies route from multiple city entrances to the workshop.
w=e.createWorld();w.generator.fuel=90;e.beginNight(w);tick(w,3001,{x:0,y:0},true);assert.equal(w.survived,1);assert.equal(w.phase,'day');assert(w.kills>0||w.generator.hp<180);
const a=e.createWorld(),b=e.createWorld();e.beginNight(a);e.beginNight(b);for(let i=0;i<2000;i++){const input={x:Math.sin(i*.01),y:Math.cos(i*.02)};e.stepWorld(a,input,true);e.stepWorld(b,input,true)}assert.deepEqual(a,b);
const camera=await import(url(compile('world-camera.ts').replace("'./factory-map'",JSON.stringify(mapurl))));const portrait=camera.worldCamera(390,844,w.player),landscape=camera.worldCamera(844,390,w.player);assert(844/landscape.scale>390/portrait.scale);assert(landscape.scale<portrait.scale*1.3);
const {threatIndicators}=await import(url(compile('threat-indicators.ts')));const c={x:0,y:0,scale:1},p={x:422,y:195};assert.equal(threatIndicators(844,390,c,p,[{x:400,y:200}]).length,0);const arrows=threatIndicators(844,390,c,p,[{x:-100,y:190},{x:950,y:190},{x:980,y:195},{x:420,y:-100},{x:420,y:500}]);assert.equal(arrows.length,4);assert(arrows.some(a=>a.count===2));for(const a of arrows)assert(a.x>=18&&a.x<=826&&a.y>=68&&a.y<=372);
// Eight-way facing preserves normalized travel speed and the last idle facing.
for(const [x,y,dir] of [[1,0,'right'],[1,1,'down-right'],[0,1,'down'],[-1,1,'down-left'],[-1,0,'left'],[-1,-1,'up-left'],[0,-1,'up'],[1,-1,'up-right']]){w=e.createWorld();Object.assign(w.player,map.SPAWN_POINT);const start={...w.player};e.movePlayer(w,{x,y});assert.equal(w.player.direction,dir);assert(Math.abs(e.distance(w.player,start)-285/60)<.001);e.movePlayer(w,{x:0,y:0});assert.equal(w.player.direction,dir)}
// Well/fire and animal homes have clear, connected routes; animals remain bounded.
w=e.createWorld();for(const point of [e.WELL_FRONT,e.FIRE_FRONT,...map.ANIMAL_POINTS]){assert(!e.worldBlocked(w,point.x,point.y),`new clear spawn ${JSON.stringify(point)}`);assert(e.pathTo(w.player,point,w).length,'new connected route')}
const animalStart=w.animals.map(a=>({...a}));w.phaseLeft=1000;tick(w,600);assert(w.animals.some((a,i)=>e.distance(a,animalStart[i])>10));for(const a of w.animals)assert(!e.worldBlocked(w,a.x,a.y,12));
// Hunt -> ground meat -> explicit pickup -> retain at generator -> timed cooking -> collect -> eat.
w=e.createWorld();w.loot=[];w.breakables=[];const rabbit=w.animals[0];Object.assign(w.player,{x:rabbit.x,y:rabbit.y+75});assert(e.attack(w));assert.equal(rabbit.hp,16);w.tick+=33;assert(e.attack(w));assert(!w.animals.includes(rabbit));assert.equal(w.loot.length,1);assert.equal(w.loot[0].kind,'rawMeat');assert.equal(w.bag.rawMeat,0);assert(e.pickup(w));assert.equal(w.bag.rawMeat,1);assert.equal(w.loads,1);Object.assign(w.player,baseReturn);tick(w,1);assert.equal(w.bag.rawMeat,1);assert.equal(w.loads,1);assert(!e.doAction(w,'cook'),'must be near fire');Object.assign(w.player,e.FIRE_FRONT);assert(e.doAction(w,'cook'));assert.equal(w.bag.rawMeat,0);assert.equal(w.loads,0);assert(!e.doAction(w,'cook'),'cannot duplicate cooking');tick(w,361);assert(w.fire.ready);assert.equal(w.cooked,0);assert(e.doAction(w,'cook'));assert.equal(w.cooked,1);assert(!w.fire.ready);w.hunger=20;w.player.hp=60;assert(e.doAction(w,'eat'));assert.equal(w.hunger,70);assert.equal(w.player.hp,75);assert.equal(w.cooked,0);assert(!e.doAction(w,'eat'));
// Water needs approach but no electricity; exhaustion harms health and blocks passive healing.
w=e.createWorld();w.thirst=20;assert(!e.doAction(w,'drink'));Object.assign(w.player,e.WELL_FRONT);w.generator.hp=0;w.generator.fuel=0;assert(e.doAction(w,'drink'));assert.equal(w.thirst,100);assert(!e.doAction(w,'drink'));w.hunger=0;w.thirst=0;w.player.hp=50;Object.assign(w.player,baseReturn);w.generator.hp=180;w.generator.fuel=50;tick(w,61);assert(w.player.hp<50);assert.equal(w.hunger,0);assert.equal(w.thirst,0);w.player.downedUntil=e.timeOf(w)+14;assert(!e.doAction(w,'eat'));assert(!e.doAction(w,'drink'));
// Physical map audit: independent samples selected from visible solid scenery.
const scale=map.GROUND_SCALE;
for(const [x,y,label] of [[391,410,'hall west wall'],[681,450,'hall east wall'],[150,252,'bunk front wall'],[970,179,'fuel rear wall'],[365,81,'north ruins'],[1048,820,'east wall'],[30,503,'west gate rail'],[230,1160,'raised railway'],[326,421,'large boulder'],[194,984,'garden boulder']])assert(e.blocked(x*scale,y*scale),label);
// Walk across every open doorway, in both directions and for both actor radii.
w=e.createWorld();for(const room of map.ROOMS)for(const door of room.doors){const horizontal=door.side==='n'||door.side==='s',x=room.x+(horizontal?door.at:door.side==='e'?room.width:0),y=room.y+(!horizontal?door.at:door.side==='s'?room.height:0);for(const radius of [12,19])for(const sign of [-1,1]){const p={x:x+(horizontal?0:sign*35),y:y+(horizontal?sign*35:0)};assert(!e.worldBlocked(w,p.x,p.y,radius),room.name+' doorway approach');e.moveBody(w,p,horizontal?0:-sign*70,horizontal?-sign*70:0,radius);assert(Math.hypot(p.x-(x+(horizontal?0:-sign*35)),p.y-(y+(horizontal?-sign*35:0)))<1,room.name+' '+door.side+' traversable doorway')}}
// Fast displacement and diagonal pressure cannot tunnel through walls or fences.
w=e.createWorld();for(const radius of [12,19]){const p={x:map.ROOMS[0].x+90,y:map.ROOMS[0].y+150};e.moveBody(w,p,-400,60,radius);assert(p.x>=map.ROOMS[0].x+12+radius-1,'wall stops knockback');const q={x:200*scale,y:470*scale};e.moveBody(w,q,-600,0,radius);assert(q.x>78*scale,'fence stops fast crossing')}
// Shutter/barricade state changes immediately affect actors, line-of-sight and routes.
w=e.createWorld();assert(!e.worldBlocked(w,e.SHUTTER.x,e.SHUTTER.y));w.shutterUntil=12;assert(e.worldBlocked(w,e.SHUTTER.x,e.SHUTTER.y));assert(!e.lineClear({x:e.SHUTTER.x,y:e.SHUTTER.y-60},{x:e.SHUTTER.x,y:e.SHUTTER.y+60},w));assert(e.pathTo({x:e.SHUTTER.x,y:e.SHUTTER.y-100},map.SPAWN_POINT,w).length,'alternate route around sealed door');w.tick=721;assert(!e.worldBlocked(w,e.SHUTTER.x,e.SHUTTER.y));w.barrierHp=120;assert(e.worldBlocked(w,e.BARRICADE.x,e.BARRICADE.y));w.barrierHp=0;assert(!e.worldBlocked(w,e.BARRICADE.x,e.BARRICADE.y));
// Broad-phase indexing must agree with the authored shapes everywhere.
const collision=await import(sourceURL('camp-collision.ts'));for(let y=110;y<map.MAP_HEIGHT-110;y+=47)for(let x=110;x<map.MAP_WIDTH-110;x+=47)assert.equal(collision.staticBlocked(x,y,19),collision.STATIC_COLLIDERS.some(c=>collision.hitCollider(c,x,y,19)),'indexed collision matches geometry');
// Relocating a prefab moves its art, front-wall sorting and collision together.
const buildings=await import(sourceURL('camp-buildings.ts'));for(const b of buildings.BUILDINGS){const moved={...b,x:b.x+200,y:b.y+300},a=buildings.buildingArt(b),a2=buildings.buildingArt(moved),c=buildings.buildingColliders(b),c2=buildings.buildingColliders(moved);assert(Math.abs(a2.x-a.x-200)<.0001);assert(Math.abs(a2.y-a.y-300)<.0001);assert.equal(c2.length,c.length);for(let i=0;i<c.length;i++){assert(Math.abs(c2[i].x-c[i].x-200)<.0001);assert(Math.abs(c2[i].y-c[i].y-300)<.0001)}}
// Starter station bodies, approach sockets, manual storage and independent fire.
w=e.createWorld();
for(const id of stations.STATION_IDS){const body=stations.stationBody(w.camp,id),front=stations.stationFront(w.camp,id);assert(e.worldBlocked(w,body.x,body.y),id+' is solid');assert(!e.worldBlocked(w,front.x,front.y),id+' front is accessible');assert(e.pathTo(w.player,front,w).length,id+' has a route');}
Object.assign(w.player,stations.stationFront(w.camp,'hearth'));w.generator.hp=0;w.generator.fuel=0;w.camp.hearth.fuel=0;w.bag.rawMeat=1;w.loads=1;assert(!e.hearthLit(w));assert(!e.doAction(w,'cook'));assert(!e.doAction(w,'stoke'));w.stock.pallets=1;assert(e.doAction(w,'stoke'));assert.equal(w.stock.pallets,0);assert.equal(w.camp.hearth.fuel,120);assert(e.inCampLight(w,w.camp.hearth));assert(e.doAction(w,'cook'));tick(w,361);assert(w.fire.ready);assert(w.camp.hearth.fuel<114);assert(e.doAction(w,'cook'));assert.equal(w.cooked,1);
Object.assign(w.player,storageFront);w.bag={scrap:5,fuel:20,pallets:2,rawMeat:1};w.loads=4;assert(e.doAction(w,'deposit'));assert.equal(w.bag.rawMeat,1);assert.equal(w.loads,1);assert.equal(w.stock.scrap,5);assert.equal(w.stock.fuel,20);assert.equal(w.stock.pallets,2);assert(!e.doAction(w,'deposit'));
console.log('Survival checks passed: scenery collision, every doorway, no tunneling, dynamic defences, station bodies and approaches, manual storage, fuelled hearth, eight-way movement, hunting/cooking/water, combat and deterministic rounds.');
