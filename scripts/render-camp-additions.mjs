// Review new ground beds and optional furniture against the actual saved HQ.
// All staging placements exist only in this local proof, never in a saved world.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require('@napi-rs/canvas');
const [artworkPath,layoutPath,outputDir]=process.argv.slice(2);if(!outputDir)throw Error('Usage: render-camp-additions.mjs artwork.json layout.json output-dir');
fs.mkdirSync(outputDir,{recursive:true});const temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-additions-'));
try{
 await build({stdin:{contents:`export * from './src/world-assets';export * from './src/world-layout';export * from './src/world-tiers';export * from './src/imported-art';export * from './src/terrain-renderer';export * from './src/placed-world-renderer';export * from './src/survival-engine';export * from './src/survivor-art';export * from './src/worker-renderer';export * from './src/chest-animation';export * from './src/headquarters-dressing';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:path.join(temp,'scene.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'scene.mjs'))),records=JSON.parse(fs.readFileSync(artworkPath)).records,layout=JSON.parse(fs.readFileSync(layoutPath)).draft;
 m.installImportedArt(records);const hq=layout.items.find(p=>p.assetId==='base_shelter_t1'),hearth=layout.items.find(p=>p.role==='hearth'),hb=m.placementBounds(hq);
 const furnitureIds=['art_hq_storage_chest','art_hq_supply_boxes','art_camp_planning_board'].filter(id=>m.ASSET_BY_ID.has(id));
 const ids=[...new Set([...layout.items.map(p=>p.assetId),...furnitureIds,...[...m.ASSET_BY_ID.keys()].filter(id=>id.startsWith('art_hq_')),'base_hearth_t1','base_hearth_t2','base_hearth_t3'])];
 const images={homeGround:await loadImage('artwork-archive/painted-terrain-hd-original/full-4800.webp')};
 const sources={...m.requiredImages(ids),...Object.fromEntries(Object.values(m.SURVIVOR_ART).map(a=>[a.idle.sheet,m.SURVIVOR_IMAGE_SOURCES[a.idle.sheet]]))};
 for(const [key,url]of Object.entries(sources)){let local='public'+url;
  if(url.startsWith('/api/asset-files/')){local=path.resolve('../wall-ground-qa',path.basename(url)+'.image');if(!fs.existsSync(local))throw Error('Missing cached artwork '+url)}
  images[key]=await loadImage(local);
 }
 function render(scene,width,height,view,ground,people=[],opened=false){const canvas=createCanvas(width,height),ctx=canvas.getContext('2d'),w=m.createWorld(scene);w.player.x=-9999;w.player.y=-9999;w.tick=0;if(opened){for(const p of scene.items)if(m.ASSET_BY_ID.get(p.assetId)?.openFrames)m.toggleChest(w,p.id);w.tick=24;}
  ctx.fillStyle='#071316';ctx.fillRect(0,0,width,height);const scale=Math.min(width/view.width,height/view.height);ctx.translate((width-view.width*scale)/2,(height-view.height*scale)/2);ctx.scale(scale,scale);ctx.translate(-view.x,-view.y);
  m.drawHomeTerrain(ctx,images,scene.terrainImage,scene.terrainBorder);m.drawPlacedGround(ctx,images,{...scene,items:scene.items.filter(p=>ground||!m.ASSET_BY_ID.get(p.assetId)?.ground?.image.includes('/camp-ground-v1/'))});
  const draws=m.placedDrawables(ctx,images,w,true);
  for(const [x,y,facing]of people){const actor=m.createWorld(scene);Object.assign(actor.player,{x,y,direction:facing,equipped:undefined});draws.push({y,draw:()=>m.drawWorker(ctx,images,actor)});}
  draws.sort(m.compareWorldDrawables).forEach(d=>d.draw());return canvas;
 }
 const hqView={x:hb.x-70,y:hb.y+hb.height*.42,width:hb.width+140,height:hb.height*.66};
 const comparison=createCanvas(1500,850),c=comparison.getContext('2d');c.fillStyle='#183330';c.fillRect(0,0,1500,850);
 for(const [column,ground]of [false,true].entries()){
  c.drawImage(render(layout,750,440,hqView,ground),column*750,30);
  c.fillStyle='#ffdf9e';c.font='22px sans-serif';c.fillText(ground?'Subtle ground added':'Before',column*750+20,26);
  for(const tier of [1,2,3]){const scene=m.changePlacementTier(layout,hearth.id,tier),b=m.placementBounds(scene.items.find(p=>p.id===hearth.id)),view={x:b.x-28,y:b.y-8,width:b.width+56,height:b.height+64};c.drawImage(render(scene,250,330,view,ground),column*750+(tier-1)*250,495);}
 }
 fs.writeFileSync(path.join(outputDir,'ground-comparison.png'),comparison.toBuffer('image/png'));
 if(furnitureIds.length===3){
  const point=(x,y)=>m.placementPoint(hq,hb.x+x/1536*hb.width,hb.y+y/1024*hb.height);
  const staging=[['art_hq_storage_chest',480,620],['art_camp_planning_board',950,650]].map(([id,x,y])=>m.newPlacement(id,...point(x,y)));
  const bareScene={...layout,items:[{...hq,roof:'hidden'},...staging]},scene=process.argv.includes('--support')?m.addApprovedHeadquartersProps(bareScene):bareScene,people=[[640,630,'down-right'],[760,720,'up'],[940,790,'left'],[600,760,'up-right']].map(([x,y,d])=>[...point(x,y),d]);
  for(const [x,y]of people)assert(!m.layoutBlocked(scene,x,y,19),'Each character has clear standing space');
  for(let i=0;i<people.length;i++)for(let j=i+1;j<people.length;j++)assert(Math.hypot(people[i][0]-people[j][0],people[i][1]-people[j][1])>76,'Space for four independent characters');
  // Trace a 60-unit-wide approach from the doorway to each usable furniture front.
  const routes=[[[735,882],[735,735],[900,730]],[[735,882],[680,740],[500,675]]];
  for(const route of routes)for(let i=1;i<route.length;i++){const a=point(...route[i-1]),b=point(...route[i]);for(let t=0;t<=1;t+=.02)assert(!m.layoutBlocked(scene,a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,30),'Furniture approach stays clear');}
  const view={x:hb.x-35,y:hb.y-20,width:hb.width+70,height:hb.height+55};
  fs.writeFileSync(path.join(outputDir,'headquarters-four-players.png'),render(scene,1536,1060,view,true,people).toBuffer('image/png'));
  fs.writeFileSync(path.join(outputDir,'headquarters-chest-open.png'),render(scene,1536,1060,view,true,people,true).toBuffer('image/png'));
  fs.writeFileSync(path.join(outputDir,'staging.json'),JSON.stringify({scene,people},null,2));
 }
 console.log('Rendered ground comparison'+(furnitureIds.length===3?' and four-player furniture spacing':'')+' in '+outputDir);
}finally{fs.rmSync(temp,{recursive:true,force:true})}
