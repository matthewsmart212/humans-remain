// Collision/navigation and the production shared painter, exercised through software Skia.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'fishing-site-behavior-'));
const output=process.argv[2]||'.qa/fishing-site-behavior';
try{
 const modules=['fishing-site-art','fishing-site-geometry','fishing-site-renderer','fishing-site-placement','river-collision','east-approach','world-layout','world-assets','survival-engine','imported-art','outdoor-terrain','play-interaction','skia-adapter'];
 const file=path.join(temp,'model.mjs');
 await build({stdin:{contents:modules.map(name=>`export * from './src/${name}';`).join('\n')+"\nexport {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:file,logLevel:'error'});
 const m=await import(pathToFileURL(file));
 const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));m.installImportedArt(snapshot.records);
 const layout=m.placeStillwaterFishingSite(snapshot.layout),pier=layout.items.find(p=>p.id===m.FISHING_PIER_PLACEMENT_ID);
 assert(pier,'A real pier must be placed on the existing lake before behavioral checks');
 assert(m.FISHING_PIER_DECK.length>=3&&m.FISHING_PIER_FOREGROUND.length,'Final deck and upright artwork geometry is required');
 const world=m.createWorld(layout);world.editorPreview=true;world.outdoorReady=new Set(m.OUTDOOR_TILES.map(t=>t.key));
 const g=m.fishingPierGeometry(pier),wet=[];
 for(let y=g.deckBounds.y+24;y<g.deckBounds.y+g.deckBounds.height-24;y+=12)for(let x=g.deckBounds.x+24;x<g.deckBounds.x+g.deckBounds.width-24;x+=12){
  if(m.fishingPierDeckContains(pier,x,y,24)&&m.riverWaterBlocked(x,y,19)&&!m.worldBlocked(world,x,y,19))wet.push({x,y});
 }
 assert(wet.length>8,'The water end has useful standing room, not only a thin collision sliver');
 const entry=m.fishingPierPoint(pier,...m.FISHING_PIER_ENTRY);
 assert(!m.worldBlocked(world,entry.x,entry.y,19),'The bank-end approach is clear');
 wet.sort((a,b)=>Math.hypot(b.x-entry.x,b.y-entry.y)-Math.hypot(a.x-entry.x,a.y-entry.y));
 const target=wet[0];
 assert(!m.riverWaterBlocked(target.x,target.y,19,layout),'The visible deck supports a body above water');
 const removed={...layout,items:layout.items.filter(p=>p!==pier)};
 assert(m.riverWaterBlocked(target.x,target.y,19,removed),'Deleting the pier restores water collision immediately');
 const moved={...layout,items:layout.items.map(p=>p===pier?{...p,x:p.x+1200}:p)};
 assert(m.riverWaterBlocked(target.x,target.y,19,moved),'Moving the pier cannot leave an invisible walking surface');
 assert(!m.fishingDeckSupports({...removed,items:[]},target.x,target.y,19));

 // The exact same world transform is used for artwork, deck support, and foreground feet.
 for(const transform of [{},{rotation:37,flipX:true},{rotation:121,flipY:true},{rotation:284,flipX:true,flipY:true,scale:.8},{frame:{sourceAssetId:m.FISHING_PIER_ID,width:720,height:460,anchor:[.72,.3]},rotation:47,flipX:true}]){
  const p={...pier,...transform};
  for(const [u,v]of [[.1,.2],[.5,.5],[.88,.84],...m.FISHING_PIER_DECK]){
   const actual=m.fishingPierPoint(p,u,v),reference=m.placementArtPoint(p,u,v);
   assert(Math.hypot(actual.x-reference.x,actual.y-reference.y)<1e-8,'Deck matches rotated/mirrored/framed source artwork');
  }
  for(let i=0;i<m.FISHING_PIER_FOREGROUND.length;i++){
   const point=m.placementArtPoint(p,...m.FISHING_PIER_FOREGROUND[i].foot),foot=m.fishingPierGeometry(p).foreground[i].foot;
   assert(Math.hypot(point.x-foot.x,point.y-foot.y)<1e-8);
  }
 }
 let wetEdges=0;
 for(let i=0;i<g.deck.length;i++){
  const a=g.deck[i],b=g.deck[(i+1)%g.deck.length],x=(a[0]+b[0])/2,y=(a[1]+b[1])/2;
  if(!m.riverWaterBlocked(x,y,19))continue;
  assert(!m.fishingPierDeckContains(pier,x,y,19),'A whole body cannot stand across the deck edge');
  assert(m.riverWaterBlocked(x,y,19,layout),'Deck sides remain blocked by water');wetEdges++;
 }
 assert(wetEdges>=3);
 for(const bridge of m.RIVER_BRIDGES)for(let i=0;i<=20;i++){
  const t=i/20,x=(bridge.from[0]+(bridge.to[0]-bridge.from[0])*t-600)*m.EAST_TERRAIN_SCALE,y=(bridge.from[1]+(bridge.to[1]-bridge.from[1])*t-600)*m.EAST_TERRAIN_SCALE;
  assert(!m.riverWaterBlocked(x,y,18*m.EAST_TERRAIN_SCALE,layout),bridge.id+' stays walkable');
 }
 const route=m.pathTo(entry,target,world,30000,21);
 assert(route.length,'Cached navigation can enter the pier from land');
 assert(Math.hypot(route.at(-1).x-target.x,route.at(-1).y-target.y)<80,'Navigation reaches the fishing deck');
 const walkRoute=(start,waypoints)=>{
  Object.assign(world.player,start);
  for(const waypoint of waypoints){
   assert(!m.worldBlocked(world,waypoint.x,waypoint.y,19));
   for(let tick=0;tick<180&&Math.hypot(world.player.x-waypoint.x,world.player.y-waypoint.y)>4;tick++){
    const dx=waypoint.x-world.player.x,dy=waypoint.y-world.player.y,d=Math.hypot(dx,dy);m.movePlayer(world,{x:dx/Math.max(d,8),y:dy/Math.max(d,8)});
    assert(!m.worldBlocked(world,world.player.x,world.player.y,19),'Actual movement never leaves the safe surface');
   }
   assert(Math.hypot(world.player.x-waypoint.x,world.player.y-waypoint.y)<=4,'Movement follows the same supported path as navigation: '+JSON.stringify({player:[world.player.x,world.player.y],waypoint,route:waypoints}));
  }
 };
 walkRoute(entry,route);
 const returnRoute=m.pathTo(world.player,entry,world,30000,21);assert(returnRoute.length,'The safe route also leads back to land');walkRoute(world.player,returnRoute);
 const land={x:entry.x+225,y:entry.y-135};assert(!m.worldBlocked(world,land.x,land.y,21));
 const arrival=m.pathTo(land,target,world,30000,21),departure=m.pathTo(target,land,world,30000,21);
 assert(arrival.length&&departure.length,'The local pier route joins ordinary outdoor paths in both directions');
 walkRoute(land,arrival);walkRoute(target,departure);
 const action=m.playInteraction(world);assert(!/fishing|cast|reel/i.test((action?.key??'')+' '+(action?.label??'')),'An unequipped survivor away from the fishing site has no fishing action');

 const fish=m.fishingFishSchool(pier);assert(fish.length>=3,'Several subtle fish inhabit the actual lake');
 assert.equal(m.fishingFishSchool(pier),fish,'Unchanged scenery reuses its prevalidated school');
 for(const orbit of fish)for(let i=0;i<240;i++){
  const position=m.fishingFishPosition(orbit,i*2);
  assert(m.riverWaterContains(position.x,position.y,26),'The entire moving silhouette and ripple stay in real water');
 }
 assert.deepEqual(m.fishingFishPosition(fish[0],13.5),m.fishingFishPosition(fish[0],13.5));
 assert.notDeepEqual(m.fishingFishPosition(fish[0],13.5),m.fishingFishPosition(fish[0],14.5));
 assert.equal(m.fishingFishSchool({...pier,id:'dry-editor-copy',x:1800,y:1800}).length,0,'A pier moved onto dry land creates no fish');
 let offscreenDraws=0;
 const offscreenContext=new Proxy({},{get(){return()=>{offscreenDraws++}}});
 m.drawFishingSiteGround(offscreenContext,{['placed:'+m.FISHING_PIER_IMAGE]:{}},world,{x:50000,y:50000,width:800,height:400,scale:1});
 assert.equal(offscreenDraws,0,'Offscreen fish, ripples, and pier painting are culled');

 const init=require('canvaskit-wasm'),kit=await init({locateFile:name=>path.join(path.dirname(require.resolve('canvaskit-wasm')),name)});globalThis.CanvasKit=kit;
 const skia=m.JsiSkApi(kit),adapter=m.createSkiaAdapter(skia),font=skia.Font(undefined,14),imageData=skia.Data.fromBytes(fs.readFileSync('public'+m.FISHING_PIER_IMAGE));
 const image=skia.Image.MakeImageFromEncoded(imageData);imageData.dispose();assert(image);
 const imgs={['placed:'+m.FISHING_PIER_IMAGE]:image};fs.mkdirSync(output,{recursive:true});
 const bounds={x:g.worldBounds.x-290,y:g.worldBounds.y-180,width:g.worldBounds.width+580,height:g.worldBounds.height+360,scale:1};
 const render=(tick,reduced=false)=>{
  const width=Math.ceil(bounds.width),height=Math.ceil(bounds.height),surface=skia.Surface.Make(width,height),ctx=new adapter.SkiaContext(surface.getCanvas(),width,height,font);
  world.tick=tick;world.weather={...world.weather,reducedMotion:reduced};ctx.fillStyle='#255c56';ctx.fillRect(0,0,width,height);ctx.translate(-bounds.x,-bounds.y);
  m.drawFishingSiteGround(ctx,imgs,world,bounds);
  for(const drawable of m.fishingPierForegroundDrawables(ctx,image,pier).sort(m.compareWorldDrawables))drawable.draw();
  surface.flush();const shot=surface.makeImageSnapshot(),bytes=Buffer.from(shot.encodeToBytes());shot.dispose();ctx.dispose();surface.dispose();return bytes;
 };
 const first=render(0),later=render(180);assert(!first.equals(later),'World-clock fish create visible, gentle motion');
 assert(render(120,true).equals(render(720,true)),'Reduced motion holds fish still and suppresses ripples');
 fs.writeFileSync(path.join(output,'water-life-0.png'),first);fs.writeFileSync(path.join(output,'water-life-3s.png'),later);

 // Probe real clipped texture pixels with an actor behind/in front of the same upright.
 const source={data:image.readPixels(),width:image.width(),height:image.height()};assert(source.data,'Software Skia decodes source pixels');
 // The lake should conceal the ends of its supports without erasing the
 // walkable planks. Check the real shader against the approved source art.
 const waterSurface=skia.Surface.Make(source.width,source.height),waterContext=new adapter.SkiaContext(waterSurface.getCanvas(),source.width,source.height,font);
 waterContext.drawFishingPierSurface(image,[0,0,source.width,source.height],{x:0,y:0,width:source.width,height:source.height},[1,1]);
 waterSurface.flush();const wetShot=waterSurface.makeImageSnapshot(),wetPixels=wetShot.readPixels();assert(wetPixels);
 const pixel=(data,x,y)=>[...data.subarray((y*source.width+x)*4,(y*source.width+x)*4+4)];
 for(const [x,y]of [[200,530],[400,470],[680,530],[900,350],[1100,250]]){
  const dry=pixel(source.data,x,y),submerged=pixel(wetPixels,x,y);assert(dry[3]>245,'Reference planks are opaque');
  assert(dry.every((channel,i)=>Math.abs(channel-submerged[i])<=2),'Water treatment preserves the visible planks');
 }
 for(const [x,y]of [[97,738],[509,917],[914,709]]){
  assert(pixel(source.data,x,y)[3]>200,'Reference support has a solid lower end');
  assert(pixel(wetPixels,x,y)[3]<10,'Lower support disappears beneath the water instead of ending as a cutout');
 }
 const immersed=pixel(wetPixels,509,840);assert(immersed[3]>50&&immersed[3]<210,'The submerged transition remains softly transparent');
 wetShot.dispose();waterContext.dispose();waterSurface.dispose();
 const inside=(polygon,x,y)=>{let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [ax,ay]=polygon[j],[bx,by]=polygon[i];if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)yes=!yes}return yes};
 let sample;
 for(const part of m.FISHING_PIER_FOREGROUND){
  for(let v=.01;v<.99&&!sample;v+=.01)for(let u=.01;u<.99;u+=.01){
   if(!inside(part.outline,u,v)||m.FISHING_PIER_FOREGROUND.some(other=>other!==part&&inside(other.outline,u,v)))continue;
   const offset=(Math.floor(v*source.height)*source.width+Math.floor(u*source.width))*4;
   if(source.data[offset+3]>245){sample={part,u,v};break}
  }
  if(sample)break;
 }
 assert(sample,'An upright has opaque artwork to verify occlusion');
 for(const transform of [{},{rotation:37,flipX:true}]){
  const p={...pier,...transform},q=m.fishingPierPoint(p,sample.u,sample.v),foot=m.fishingPierPoint(p,...sample.part.foot),smallWorld={...world,layout:{...layout,items:[p]}};
  const probe=async front=>{
   const surface=skia.Surface.Make(120,120),ctx=new adapter.SkiaContext(surface.getCanvas(),120,120,font);ctx.fillStyle='#255c56';ctx.fillRect(0,0,120,120);ctx.translate(60-q.x,60-q.y);
   m.drawFishingSiteGround(ctx,imgs,smallWorld,{x:q.x-60,y:q.y-60,width:120,height:120,scale:1});
   const draws=m.fishingPierForegroundDrawables(ctx,image,p);draws.push({y:foot.y+(front?1:-1),layer:p.layer??0,draw:()=>{ctx.fillStyle='#ff0066';ctx.fillRect(q.x-5,q.y-5,10,10)}});
   for(const d of draws.sort(m.compareWorldDrawables))d.draw();surface.flush();const shot=surface.makeImageSnapshot(),raw=shot.readPixels();assert(raw);shot.dispose();ctx.dispose();surface.dispose();
   return [...raw.subarray((60*120+60)*4,(60*120+60)*4+3)];
  };
  assert.deepEqual(await probe(true),[255,0,102],'An actor in front remains above the upright');
  assert.notDeepEqual(await probe(false),[255,0,102],'The same upright covers an actor behind it');
 }
 image.dispose();font.dispose();adapter.disposeLighting();
 console.log(JSON.stringify({result:'pass',wetStandingSamples:wet.length,wetEdges,routeCells:route.length,returnRouteCells:returnRoute.length,fish:fish.length,checks:['full-body deck support','removal/move restores water','exact mirror/rotation/frame transforms','unchanged bridges','bounded pier routes join ordinary outdoor navigation','real movement to deck and back to land','no fishing action away from the site','water-only deterministic fish','offscreen culling','reduced motion','preserved planks and submerged support ends','software Skia painting and foreground occlusion'],physicalIPhoneTested:false,previewDirectory:output}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
