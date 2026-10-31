import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'player-map-check-'));
const near=(actual,expected,message)=>assert(Math.abs(actual-expected)<1e-7,`${message}: ${actual} != ${expected}`);
try{
 await build({stdin:{contents:"export * from './src/player-map';export * from './src/player-map-labels';export * from './src/player-map-art';export * from './src/player-map-camp-wall';export * from './src/world-layout';export * from './src/factory-map';export * from './src/survival-engine';export * from './src/world-scenes';export * from './src/imported-art';export * from './src/authored-world';export * from './src/world-assets';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error'});
 const m=require(path.join(temp,'model.cjs')),saved=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));
 m.installImportedArt(saved.records);const layout=m.prepareAuthoredWorld(saved.layout),world=m.createWorld(layout),scene=m.playerMapScene(world);
 const scale=2400*Math.SQRT2/3600;
 near(scene.bounds.left,-7800*scale,'Outdoor west includes the original 600 px origin offset');
 near(scene.bounds.top,-6800*scale,'Outdoor north includes the original 600 px origin offset');
 near(scene.bounds.width,20000*scale,'Full outdoor width');near(scene.bounds.height,20000*scale,'Full outdoor height');
 const full=m.playerMapView(scene.bounds,2048,2048),base=scene.images[0];
 const samples=[[-7200,-6200],[0,0],[600,600],[2422.3919283440346,2268.9620145056724],[12800,13800]];
 for(const [x,y] of samples){const p=m.projectMapPoint({x:(x-600)*scale,y:(y-600)*scale},full);near(p.x,32+(x+7200)/20000*(2048-64),'Source/world/map X registration with fit inset');near(p.y,32+(y+6200)/20000*(2048-64),'Source/world/map Y registration with fit inset');}
 for(const [direction,degrees] of Object.entries({up:0,'up-right':45,right:90,'down-right':135,down:180,'down-left':225,left:270,'up-left':315})){
  assert.equal(m.playerMapHeading(direction),degrees);
  assert.equal(m.facing(Math.sin(degrees*Math.PI/180),-Math.cos(degrees*Math.PI/180)),direction,'Map heading follows the same direction as player movement');
 }
 for(const [width,height] of [[390,650],[844,320],[800,800]])for(const zoom of [1,2.5,12])for(const point of [{x:base.x,y:base.y},world.player,{x:base.x+base.width,y:base.y+base.height}]){
  const view=m.playerMapView(scene.bounds,width,height,zoom,point),screen=m.projectMapPoint(point,view),back=m.unprojectMapPoint(screen,view);
  near(back.x,point.x,'Projection round-trip x');near(back.y,point.y,'Projection round-trip y');
  assert(screen.x>=-1e-7&&screen.y>=-1e-7&&screen.x<=width+1e-7&&screen.y<=height+1e-7,'Focusing an edge position never loses its marker');
  near(view.width*view.scale,width,'Aspect-correct view width');near(view.height*view.scale,height,'Aspect-correct view height');
 }
 // The marker occupies screen pixels, so a world-unit collision margin (19)
 // alone is insufficient when the player stands at a far world boundary.
 for(const [width,height] of [[390,650],[844,320]])for(const zoom of [1,2.5,12])for(const edgeOffset of [0,19])for(const x of [scene.bounds.left+edgeOffset,scene.bounds.right-edgeOffset])for(const y of [scene.bounds.top+edgeOffset,scene.bounds.bottom-edgeOffset]){
  const point={x,y},view=m.playerMapView(scene.bounds,width,height,zoom,point),screen=m.projectMapPoint(point,view);
  assert(screen.x>=32-1e-7&&screen.x<=width-32+1e-7,'Find me retains the complete arrow at east/west edges');
  assert(screen.y>=32-1e-7&&screen.y<=height-32+1e-7,'Find me retains the complete arrow at north/south edges');
  const terrainOrigin=m.projectMapPoint({x:base.x,y:base.y},view);
  near(screen.x-terrainOrigin.x,(x-base.x)*view.scale,'Edge inset preserves art/player x alignment');
  near(screen.y-terrainOrigin.y,(y-base.y)*view.scale,'Edge inset preserves art/player y alignment');
 }
 const interior={...world,scene:m.BUNKER_SCENE,layout:m.emptyLayout(),player:{...world.player,x:936,y:649,direction:'down-left'}};
 const bunker=m.playerMapScene(interior);assert.equal(bunker.id,'bunker');assert.equal(bunker.images[0].url,m.BUNKER_SCENE.terrain.url);assert.equal(bunker.bounds.width,1254);assert.equal(bunker.bounds.left,0);
 const inside=m.projectMapPoint(interior.player,m.playerMapView(bunker.bounds,627,627));near(inside.x,32+936*(627-64)/1254,'Bunker player local x');near(inside.y,32+649*(627-64)/1254,'Bunker player local y');assert.notEqual(bunker.images[0].url,base.url);
 const custom={id:'custom-map-test',url:'/api/asset-files/custom-map-test',name:'Test',mime:'image/png',width:4800,height:4800,bytes:1};
 for(const border of [0,600]){
  const customWorld={...world,layout:{...layout,terrainImage:custom,terrainBorder:border}},map=m.playerMapScene(customWorld),im=map.images[0];
  assert.equal(im.url,custom.url);near(map.bounds.width,m.MAP_WIDTH,'Custom image does not rescale world');
  const imageScale=m.MAP_WIDTH/(4800-border*2);near(im.x,-border*imageScale,'Custom border origin');near(im.width,4800*imageScale,'Custom image full extent');
  near(im.x+border/4800*im.width,0,'Custom inner playable origin remains world zero');
  near(im.x+(4800-border)/4800*im.width,m.MAP_WIDTH,'Custom inner playable far edge');
 }
 const before=JSON.stringify(layout),features=m.playerMapFeatures(layout);assert.equal(m.playerMapFeatures(layout),features,'Static geometry cached by actual layout identity');
 assert(features.paths.length>0&&features.paths.length<=10,'Engraved shapes remain bounded batches rather than thousands of render nodes');
 assert(features.landmarks.some(p=>p.kind==='camp'));assert(features.landmarks.some(p=>p.kind==='well'));assert(features.landmarks.some(p=>p.kind==='bunker'));
 const well=layout.items.find(p=>p.role==='well'),moved={...layout,items:layout.items.map(p=>p===well?{...p,x:p.x+147,y:p.y-92}:p)};
 const oldPin=features.landmarks.find(p=>p.id===well.id),newPin=m.playerMapFeatures(moved).landmarks.find(p=>p.id===well.id);near(newPin.x-oldPin.x,147,'Pin follows edited live well x');near(newPin.y-oldPin.y,-92,'Pin follows edited live well y');assert.equal(JSON.stringify(layout),before,'Map generation does not mutate the game');
 // Structures are atlas illustrations, independent of solid/collision shapes.
 assert(!features.paths.some(p=>['walls','buildings','objects','engraving'].includes(p.id)),'No collision hulls or rectangular structure fallback on the map');
 const art=features.illustrations,wellArt=art.find(p=>p.id===well.id),movedArt=m.playerMapFeatures(moved).illustrations.find(p=>p.id===well.id);
 assert(wellArt&&movedArt,'Well has its own round-basin illustration');
 near(movedArt.x-wellArt.x,147,'Illustration follows edited well x');near(movedArt.y-wellArt.y,-92,'Illustration follows edited well y');
 const withoutCollision={...layout,items:layout.items.map(p=>({...p,solid:false,collision:undefined}))};
 const wallTiles=art.filter(p=>p.kind==='palisade');
 assert.equal(wallTiles.length,0,'Camp uses simple posts instead of old detailed wall tiles');
 assert.equal(features.paths.filter(p=>p.id.startsWith('camp-palisade')).length,2,'Circle is two cached drawing batches');
 assert.equal(m.CAMP_MAP_ROADS.length,6,'All six real camp exit routes are retained');
 const c=m.CAMP_MAP_WALL;
 for(const p of m.CAMP_MAP_STAKES){near(Math.hypot(p.x-c.x,p.y-c.y),c.radius,'Every stake follows the same circle');assert(m.campMapRoadClearance(p)>c.height+24,'Roads have clearance for full upright stakes');}
 const allowed=Array.from({length:c.posts},(_,i)=>{const a=i*Math.PI*2/c.posts;return m.campMapRoadClearance({x:c.x+Math.cos(a)*c.radius,y:c.y+Math.sin(a)*c.radius})>c.height+24});
 assert.equal(allowed.filter((v,i)=>!v&&allowed[(i+c.posts-1)%c.posts]).length,6,'Exactly six openings follow road crossings');
 assert(!m.playerMapFeatures(m.emptyLayout()).paths.some(p=>p.id.startsWith('camp-palisade')),'Empty/interior maps do not acquire camp walls');
 assert(!m.playerMapFeatures({...layout,terrainImage:custom}).paths.some(p=>p.id.startsWith('camp-palisade')),'Unrelated custom terrain does not acquire the circle');
 assert.equal(m.playerMapFeatures(withoutCollision).illustrations.length,art.length,'Map art does not depend on collision bodies');
 for(const kind of ['headquarters','well','workshop','medical-tent','warehouse','bunker','camp'])assert(art.some(p=>p.kind===kind),'Dedicated illustration for '+kind);
 const chest=layout.items.find(p=>p.assetId==='art_hq_storage_chest');
 assert(!features.landmarks.some(p=>p.id===chest.id),'Indoor storage does not put a label across the headquarters roof');
 const outdoorChest={...layout,items:layout.items.map(p=>p===chest?{...p,x:p.x-1600}:p)};
 assert(m.playerMapFeatures(outdoorChest).illustrations.some(p=>p.id===chest.id&&p.kind==='storage'),'An outdoor storage chest still gets its own illustration');
 const hearth=layout.items.find(p=>p.role==='hearth'),fireArt=art.find(p=>p.id===hearth.id);
 assert(fireArt&&fireArt.kind==='camp','Camp gets the approved fire illustration, not a tent icon');
 near(fireArt.x,hearth.x,'Campfire remains anchored to gameplay hearth x');near(fireArt.y,hearth.y,'Campfire remains anchored to gameplay hearth y');
 assert(features.landmarks.some(p=>p.label==='Workshop')&&features.landmarks.some(p=>p.label==='Treatment'),'Short map captions match the approved design');
 assert(fs.statSync('public'+m.PLAYER_MAP_PORTRAIT_URL).size<30000,'Portrait badge remains a small reusable texture');
 // Captions have a single anchor and constant screen-space type, never a collision-driven alternative.
 assert.equal(m.MAP_LABEL_FONT_SIZE,13);
 for(const [width,height] of [[390,844],[844,390],[320,568],[1024,768]])for(const zoom of [4,12,28]){
  const view=m.playerMapView(scene.bounds,width,height,zoom,world.player,40),pin=m.projectMapPoint(world.player,view),labels=m.playerMapLabels(features,view,width,height,zoom,pin,true);
  const shifted={...view,x:view.x+10,y:view.y+5},moved=m.playerMapLabels(features,shifted,width,height,zoom,{x:0,y:0},true);
  for(const label of labels){const a=label.box;if(!a)continue;
   assert(a.left>=8&&a.top>=8&&a.left+a.width<=width-8&&a.top+a.height<=height-8,'Captions are clipped, never slid against screen edges');
   assert.equal(a.height,15);assert.equal(a.width,label.mark.label.length*7+8,'Text size does not scale with the map');
   const b=moved.find(other=>other.mark.id===label.mark.id)?.box;if(b){near(b.left-a.left,-10*view.scale,'Caption follows its fixed world anchor horizontally');near(b.top-a.top,-5*view.scale,'Caption follows its fixed world anchor vertically')}
   const otherPlayer=m.playerMapLabels(features,view,width,height,zoom,{x:a.left,y:a.top},true).find(other=>other.mark.id===label.mark.id);assert.deepEqual(otherPlayer.box,a,'Portrait movement never relocates labels');
  }
 }
 const camp=features.landmarks.find(m=>m.kind==='camp');
 for(const span of [120,260,280,300,600]){
  const scale=span/(m.CAMP_MAP_WALL.radius*2),width=1200,height=1000,view={x:camp.x-width/scale/2,y:camp.y-height/scale/2,width:width/scale,height:height/scale,scale};
  const labels=m.playerMapLabels(features,view,width,height,999,{x:0,y:0},true);
  if(span<=260)assert(labels.every(l=>l.mark.kind==='camp'),'Only CAMP remains at wide zoom');
  else {assert.equal(labels.length,features.landmarks.length,'All building names share one detail threshold');assert(labels.filter(l=>l.mark.kind!=='camp').every(l=>l.opacity===(span>=300?1:.5)))}
  const fire=features.illustrations.find(a=>a.kind==='camp');assert(fire.width*scale*m.mapArtDisplayFactor(fire,scale)>=28-1e-7,'Camp overview symbol stays readable');
 }
 const atlas=JSON.parse(fs.readFileSync('src/player-map-art.json','utf8'));
 for(const sprite of Object.values(atlas.sprites))assert(sprite.x>=0&&sprite.y>=0&&sprite.x+sprite.width<=atlas.width&&sprite.y+sprite.height<=atlas.height,'Every source rectangle lies within the shared texture');
 assert(fs.statSync('public/maps/camp-atlas-v2.webp').size<350000,'Camp illustrations stay under 350 KB');
 assert.equal(base.url,'/maps/world-illustrated.webp','Outdoor view uses the illustrated atlas');
 assert(fs.existsSync('public'+base.url),'Illustrated atlas is packaged with the app');
 const metadata=JSON.parse(fs.readFileSync('public/maps/world-illustrated.json','utf8'));for(const key of ['x','y','width','height'])near(base[key],metadata.worldBounds[key],'Illustrated image matches shared registration '+key);
 assert.equal(metadata.geography.riverSections,26);assert.equal(metadata.geography.sideFeatures,4);assert.equal(metadata.geography.bridges,4);assert(metadata.bytes>10000&&metadata.bytes<4e6,'Map remains one lightweight overview asset');
 console.log(JSON.stringify({result:'pass',checks:['real negative world bounds','camp/source pixel registration','eight movement headings','portrait/landscape/zoom/pan projection round trips','32px boundary marker inset at fit/default/max zoom','edge art/player alignment','interior local map','custom terrain borders','live moved landmark','immutable batched geometry','baked geographic registration','dedicated movable camp art','circular wall with six road openings','approved illustrated campfire','small portrait texture','fixed captions across four viewports and three zoom levels, shared detail fade and readable camp overview','single bounded illustration atlas'],placements:layout.items.length,geometryPaths:features.paths.length,landmarks:features.landmarks.map(p=>p.label)}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
