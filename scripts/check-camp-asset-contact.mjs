import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const require=createRequire(import.meta.url);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-asset-contact-'));
try{
 const modules=['authored-world','imported-art','world-assets','world-layout','survival-engine',
  'studio-play','play-interaction','scene-travel','run-save','camp-repair-site','camp-restoration','placed-world-renderer','skia-adapter','warehouse'];
 const outfile=path.join(temp,'camp.cjs');
 await build({stdin:{contents:modules.map(name=>`export * from './src/${name}';`).join('\n')+
  "export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';",resolveDir:process.cwd()},
  bundle:true,platform:'node',format:'cjs',outfile,logLevel:'error'});
 const m=require(outfile);
 const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
 m.installImportedArt(snapshot.records);
 const world=m.createCampPlaySession(m.prepareAuthoredWorld(snapshot.layout),undefined,'survival');
 const camp=world.layout;
 const sites=new Map(m.campBuildingPlacements(camp).map(({placement,id})=>[id,placement]));

 // Exercise the normal navigation and interaction paths against every authored repair socket.
 for(const id of m.CAMP_BUILDING_IDS){
  const socket=m.campRepairSite(world,id);
  assert(socket,`Missing repair socket for ${id}`);
  const route=m.pathTo(camp.spawn,socket,world,12000,19);
  const end=route.at(-1);
  assert(end&&Math.hypot(end.x-socket.x,end.y-socket.y)<=m.ACTION_REACH,`Cannot approach ${id}`);
  Object.assign(world.player,end);
  assert(m.atCampRepairSite(world,id),`Cannot interact with ${id} from the approach`);
 }

 const checks=[
  {site:'headquarters',solid:[[.165,.40],[.25,.32],[.17,.51],[.35,.92],[.645,.92],[.205,.81],[.755,.81],[.5,.57],[.51,.44],[.82,.48]],walk:[.5,.70]},
  {site:'furnace',solid:[[.72,.74],[.81,.68]],walk:[.57,.985]},
  {site:'warehouse',solid:[[.11,.78],[.66,.89]],walk:[.38,.755]},
  {site:'treatment',solid:[[.51,.69],[.615,.813],[.175,.735],[.19,.66]],walk:[.40,.78]},
 ];
 for(const {site,solid,walk} of checks){
  const p=sites.get(site);
  for(const [u,v] of solid){
   const point=m.placementArtPoint(p,u,v);
   assert(m.worldBlocked(world,point.x,point.y),`${site} solid fixture at ${u},${v}`);
  }
  const start=m.placementArtPoint(p,walk[0],.99);
  const goal=m.placementArtPoint(p,...walk);
  Object.assign(world.player,start);
  m.moveBody(world,world.player,goal.x-start.x,goal.y-start.y);
  assert(Math.hypot(world.player.x-goal.x,world.player.y-goal.y)<.01,`${site} entrance to floor`);
 }

 // Approach the well from eight directions in the authored camp. Stop just
 // outside its solid base, then exercise both the HUD action and its handler.
 const well=sites.get('well'),centre=m.placementArtPoint(well,.43,.75);
 const oldProgress=world.progression;
 world.progression=undefined;
 for(let i=0;i<8;i++){
  const angle=i*Math.PI/4;
  let step=0;
  do{
   world.player.x=centre.x+Math.cos(angle)*step;
   world.player.y=centre.y+Math.sin(angle)*step++;
  }while(step<400&&m.worldBlocked(world,world.player.x,world.player.y));
  world.thirst=50;world.drinkReady=0;
  const action=m.playInteraction(world);
  assert.equal(action?.shortLabel,'DRINK','Well approach '+i);
  assert(action.perform());
 }
 Object.assign(world.player,m.placementArtPoint(sites.get('treatment'),.40,.80));
 world.player.hp=75;
 const treat=m.playInteraction(world);
 assert.equal(treat?.key,'treatment');
 assert(treat.perform());
 assert(world.survival.mealRecovery,'The treatment bed starts recovery');
 world.progression=oldProgress;

 // Open a save whose previous collision allowed the player on the barrel and
 // a return landing on the stair plinth. Both should recover to nearby ground.
 const barrel=m.placementArtPoint(sites.get('warehouse'),.11,.78);
 const plinth=m.placementArtPoint(sites.get('headquarters'),.35,.92);
 Object.assign(world.player,barrel);
 const resources={pin(){},prepare:async()=>{},ready:()=>true};
 const saved=JSON.parse(m.encodeRun(new m.SceneTravel(world,resources)));
 saved.route=[{sceneId:'camp',spawn:plinth}];
 const reopened=m.decodeRun(JSON.stringify(saved));
 const resumed=reopened.worlds.find(([id])=>id==='camp')[1];
 for(const [point,original] of [[resumed.player,barrel],[reopened.route[0].spawn,plinth]]){
  assert(!m.worldBlocked(resumed,point.x,point.y),'Saved landing recovered onto clear ground');
  assert(Math.hypot(point.x-original.x,point.y-original.y)<150,'Recovery stays by the same asset');
 }
 assert.deepEqual(resumed.stock,world.stock);
 assert.equal(resumed.player.hp,world.player.hp);

 const kit=await require('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});
 const skia=m.JsiSkApi(kit),adapter=m.createSkiaAdapter(skia);
 const size=400,surface=skia.Surface.Make(size,size),font=skia.Font(undefined,16);
 const images={};
 function load(url,key=m.assetImageKey(url)){
  if(images[key])return;
  const data=skia.Data.fromBytes(fs.readFileSync('public'+url));
  images[key]=skia.Image.MakeImageFromEncoded(data);
  data.dispose();
  assert(images[key],`Could not decode ${url}`);
 }
 try{
  for(const [key,url] of Object.entries(m.WAREHOUSE_IMAGES))load(url,key);
  // Compare pixels of a bright actor probe with the real art. The probe covers the
  // same vertical span in front and behind, so misplaced layers visibly overwrite it.
  function visible(site,u,v,sampleV){
   const p=sites.get(site),asset=m.ASSET_BY_ID.get(p.assetId);
   const b=m.placementBounds(p),point=m.placementArtPoint(p,u,v);
   Object.assign(world.player,point);
   world.layout={...camp,items:[p]};
   const ruin=m.campBuildingArt(world,p.assetId);
   for(const url of [asset.image,asset.roof,ruin?.image,ruin?.roof].filter(Boolean))load(url);
   const ctx=new adapter.SkiaContext(surface.getCanvas(),size,size,font);
   ctx.fillStyle='#222222';ctx.fillRect(0,0,size,size);
   ctx.save();ctx.scale(size/b.width,size/b.height);ctx.translate(-b.x,-b.y);
   const draws=m.placedDrawables(ctx,images,world);
   draws.push({y:point.y,draw:()=>{
    ctx.fillStyle='#00ff00';
    ctx.fillRect(point.x-6,point.y-b.height*.18,12,b.height*.18);
   }});
   draws.sort(m.compareWorldDrawables).forEach(draw=>draw.draw());
   ctx.restore();ctx.dispose();surface.flush();
   const frame=surface.makeImageSnapshot();
   const pixel=frame.readPixels(Math.floor(u*size),Math.floor(sampleV*size),{...frame.getImageInfo(),width:1,height:1});
   frame.dispose();
   return pixel[0]===0&&pixel[1]===255&&pixel[2]===0;
  }
  for(const repaired of [false,true]){
   world.progression.restoredBuildings=repaired?[...m.CAMP_BUILDING_IDS]:[];
   world.progression.campLevel=repaired?4:0;
   world.progression.furnaceRestored=repaired;
   const state=repaired?'repaired':'broken';
   world.layout=camp;
   const beam=m.placementArtPoint(sites.get('headquarters'),.675,.408);
   assert.equal(m.worldBlocked(world,beam.x,beam.y),!repaired,`${state} fallen beam`);
   const bay=m.placementArtPoint(sites.get('warehouse'),.415,.704);
   for(const pallets of [0,20,0]){
    world.stock.pallets=pallets;
    assert.equal(m.worldBlocked(world,bay.x,bay.y),repaired&&pallets===20,`${state} warehouse with ${pallets} logs`);
    if(repaired&&pallets===20){
     Object.assign(world.player,bay);
     m.moveBody(world,world.player,0,5);
     assert(!m.worldBlocked(world,world.player.x,world.player.y),'Walking clears a newly stocked bay');
     assert(Math.hypot(world.player.x-bay.x,world.player.y-bay.y)<100,'Survivor remains by warehouse');
    }
   }
   assert(visible('warehouse',.38,.755,.72),`${state} porch covers survivor`);
   assert(visible('warehouse',.11,.855,.745),`${state} barrel hides survivor standing in front`);
   assert(visible('treatment',.40,.78,.755),`${state} entrance rug covers survivor`);
   assert(visible('treatment',.62,.915,.80),`${state} crate hides survivor standing in front`);
   assert(visible('headquarters',.50,.85,.79),`${state} central steps cover survivor`);
   assert(!visible('headquarters',.51,.413,.398),`${state} chair back should cover survivor`);
   assert(!visible('warehouse',.50,.37,.32),`${state} warehouse roof should cover survivor behind it`);
   assert(!visible('treatment',.42,.43,.37),`${state} tent wall should cover survivor behind it`);
  }
 }finally{
  for(const image of Object.values(images))image.dispose();
  font.dispose();surface.dispose();adapter.disposeLighting();
 }
 console.log('PASS: nine repair approaches, HQ fixtures and stairs, warehouse barrel/cart and planks, treatment furniture and rug, and foreground/background pixels in both repair states.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
