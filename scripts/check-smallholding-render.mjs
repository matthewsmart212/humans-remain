// Focused visual QA through the same placement renderer and Skia adapter used
// on web and iOS. Disposable fixtures never change the authored game world.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {build} from 'esbuild';

const require=createRequire(import.meta.url);
const temp=mkdtempSync(join(tmpdir(),'smallholding-render-'));
const output=resolve(process.argv[2]||'.qa/smallholding-fences');
mkdirSync(output,{recursive:true});
const images={},decoded=new Map(),screenshots=[],skipped=[];
let adapter,font;
try{
 const modules=['world-assets','world-layout','imported-art','authored-world','smallholding-placement',
  'smallholding-yard','smallholding-cottage','studio-play','survival-engine','placed-world-renderer',
  'skia-adapter','world-ground','outdoor-terrain'];
 const file=join(temp,'game.cjs');
 await build({stdin:{contents:modules.map(name=>`export * from './src/${name}';`).join('\n')+
  "\nexport {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';",resolveDir:process.cwd()},
  outfile:file,bundle:true,format:'cjs',platform:'node'});
 const m=require(file);
 const init=require('canvaskit-wasm');
 const kit=await init({locateFile:name=>join(dirname(require.resolve('canvaskit-wasm')),name)});
 const skia=m.JsiSkApi(kit);
 adapter=m.createSkiaAdapter(skia);
 font=skia.Font(undefined,20);
 const snapshot=JSON.parse(readFileSync('native/assets/world-snapshot.json','utf8'));
 const atlas=JSON.parse(readFileSync('src/smallholding-yard-art.json','utf8'));
 m.installImportedArt(snapshot.records);
 const layout=m.prepareAuthoredWorld(snapshot.layout);
 const cottage=layout.items.find(p=>p.id===m.SOUTHEAST_SMALLHOLDING);
 assert(cottage,'The bundled world contains the smallholding');
 const site=layout.items.filter(p=>p.id.includes('smallholding'));
 const sources={...m.requiredImages(site.map(p=>p.assetId)),...m.WORLD_GROUND_MATERIAL_SOURCES,
  hunterDown:'/survival/hunter-v1/down.webp'};
 for(const [key,url] of Object.entries(sources)){
  if(decoded.has(url)){images[key]=decoded.get(url);continue}
  const local=join(process.cwd(),'public',url);
  let bytes;
  try{bytes=readFileSync(local)}catch{skipped.push(url);continue}
  if(bytes.subarray(0,42).toString().startsWith('version https://git-lfs.github.com/')){skipped.push(url);continue}
  const data=skia.Data.fromBytes(bytes),image=skia.Image.MakeImageFromEncoded(data);
  data.dispose();assert(image,'Decode '+url);decoded.set(url,image);images[key]=image;
 }
 for(const url of [m.YARD_IMAGE,m.COTTAGE_EXTERIOR,m.COTTAGE_INTERIOR,sources.hunterDown,
  ...Object.values(m.WORLD_GROUND_MATERIAL_SOURCES)])assert(decoded.has(url),'Required visual QA artwork is available: '+url);
 // Each outdoor tile uses the real ground material and production shader.
 for(const tile of m.OUTDOOR_TILES)images[tile.key]=images.worldGroundWarm;
 const unavailable=new Set(site.filter(p=>Object.values(m.requiredImages([p.assetId])).some(url=>!decoded.has(url))).map(p=>p.id));
 const fixture={...layout,items:site.filter(p=>!unavailable.has(p.id))};
 function worldFor(scene,player){
  const w=m.createCampPlaySession(scene,undefined,'sandbox');
  Object.assign(w.player,{...player,direction:'down',equipped:null,hurtUntil:0});
  Object.assign(w,{survivorRole:'hunter',animals:[],enemies:[],loot:[],effects:[],weather:undefined,
   stationPanel:undefined,torchOn:false,noticeUntil:0});
  return w;
 }
 function render(name,scene,{width=1400,height=900,player,focus,zoom=1}={}){
  const yard=scene.items.find(p=>p.id==='smallholding-yard');
  const center=focus||m.placementArtPoint(yard,.5,.52);
  const w=worldFor(scene,player||m.placementArtPoint(yard,.30,.60));
  const view={x:center.x,y:center.y,zoom,follow:false,playing:true,grid:false,collision:false,
   selected:null,ghost:null,placingSpawn:false};
  const surface=skia.Surface.Make(width,height);
  assert(surface,'Create software Skia surface');
  const ctx=new adapter.SkiaContext(surface.getCanvas(),width,height,font);
  m.drawWorldEditor(ctx,{},images,w,view);
  surface.flush();const image=surface.makeImageSnapshot();
  const path=join(output,name+'.png');writeFileSync(path,image.encodeToBytes());screenshots.push(path);
  console.log('Rendered '+name);
  image.dispose();ctx.dispose();surface.dispose();
  return w;
 }
 const railId=index=>index===0?'smallholding-fence-gate':'smallholding-yard-rail-'+index;
 const close=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<1e-5;
 function alignmentErrors(scene){
  const yard=scene.items.find(p=>p.id==='smallholding-yard'),errors=[];
  const onGround=(u,v)=>m.placementArtPoint(yard,u/atlas.ground[2],v/atlas.ground[3]);
  for(const [index,panel] of atlas.panels.entries()){
   const rail=scene.items.find(p=>p.id===railId(index));
   if(!rail){errors.push('Missing '+railId(index));continue}
   // Match the sprite's four rendered corners to the same painted rectangle
   // in the ground image. Position-only tests miss nearby offsets and scale.
   for(const [u,v] of [[0,0],[1,0],[0,1],[1,1]]){
    const expected=onGround(panel.offset[0]+u*panel.crop[2],panel.offset[1]+v*panel.crop[3]);
    const actual=m.placementArtPoint(rail,u,v);
    if(!close(actual,expected))errors.push(rail.id+' artwork corner '+u+','+v);
   }
   const bodies=m.placementBodies(rail),body=bodies[0];
   if(bodies.length!==1||body.shape!=='segment'){errors.push(rail.id+' collision segment');continue}
   const [a,b]=panel.feet.map(([u,v])=>onGround(u,v));
   if(!close({x:body.x,y:body.y},a)||!close({x:body.ex,y:body.ey},b))errors.push(rail.id+' painted post feet');
  }
  return errors;
 }
 render('default',fixture);
 const defaultErrors=alignmentErrors(fixture);
 const corrections=[];
 for(const [name,patch] of [['offset',{x:cottage.x+120,y:cottage.y+30}],['scaled',{scale:1.15}]]){
  const before={...fixture,items:fixture.items.map(p=>p.id==='smallholding-yard'?{...p,...patch}:p)};
  render(name+'-before',before);
  const priorErrors=alignmentErrors(before);
  assert(priorErrors.length>0,'The '+name+' fixture exposes the visual alignment bug');
  const after=m.placeSoutheastSmallholding(before);
  render(name+'-after',after);
  corrections.push({name,before:priorErrors.length,after:alignmentErrors(after)});
 }
 const transformed=[];
 const groundFrame=m.placementFrame(fixture.items.find(p=>p.id==='smallholding-yard'));
 const resizedFrame={...groundFrame,width:groundFrame.width*1.12,height:groundFrame.height*.86,anchor:[.53,.48]};
 for(const [name,patch] of [['rotated',{rotation:17}],['mirrored',{flipX:true}],
  ['flipped-both',{flipX:true,flipY:true}],['rotated-mirrored',{rotation:29,flipX:true}],
  ['resized-frame',{frame:resizedFrame}],['resized-mirrored',{frame:resizedFrame,rotation:19,flipX:true,flipY:true}]]){
  const before={...fixture,items:fixture.items.map(p=>p.id==='smallholding-yard'?{...p,...patch}:p)};
  const after=m.placeSoutheastSmallholding(before);
  const front=after.items.find(p=>p.id===railId(15)),body=m.placementBodies(front)[0];
  const middle={x:(body.x+body.ex)/2,y:(body.y+body.ey)/2},depth=[];
  for(const offset of [-36,36]){
   const player={x:middle.x,y:middle.y+offset},w=worldFor(after,player);
   const [draw]=m.placedDrawables({},images,{...w,layout:{...after,items:[front]}},true);
   const order=m.compareWorldDrawables(draw,{y:player.y});
   assert(offset<0?order>0:order<0,name+' preserves rail/player depth on both sides');
   depth.push(order);
  }
  transformed.push({name,errors:alignmentErrors(after),depth});
  assert.equal(m.placeSoutheastSmallholding(after),after,name+' fence synchronization is idempotent');
 }
 // Real depth sorting must place the rail over a survivor just behind it and
 // place the survivor over that rail when their feet are in front of it.
 const front=fixture.items.find(p=>p.id===railId(15));
 const body=m.placementBodies(front)[0],middle={x:(body.x+body.ex)/2,y:(body.y+body.ey)/2};
 const depth=[];
 for(const [name,offset] of [['behind',-36],['in-front',36]]){
  const player={x:middle.x,y:middle.y+offset};
  const w=render('survivor-'+name,fixture,{player,focus:{x:middle.x,y:middle.y-65},zoom:2.4,width:844,height:560});
  const [railDraw]=m.placedDrawables({},images,{...w,layout:{...fixture,items:[front]}},true);
  assert(railDraw,'The foreground fence is rendered');
  const order=m.compareWorldDrawables(railDraw,{y:player.y});
  assert(name==='behind'?order>0:order<0,'Correct fence/player depth with survivor '+name);
  depth.push({name,order});
 }
 const report={renderer:'Production drawWorldEditor + Skia adapter on CanvasKit software surface',
  screenshots,defaultAlignmentErrors:defaultErrors,corrections,transformed,depth,omittedOptionalArtwork:skipped,
  limitations:'Focused smallholding scenery; no physical iPhone or frame-rate measurement.'};
 writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log('Rendered '+screenshots.length+' production views in '+output);
 assert.deepEqual(defaultErrors,[],'Default rails align with the painted ground');
 for(const result of corrections)assert.deepEqual(result.after,[],result.name+' repair aligns every fence sprite and collider with the actual ground');
 for(const result of transformed)assert.deepEqual(result.errors,[],result.name+' ground keeps all fence artwork and collision aligned');
 console.log('PASS: 18 fence overlays and collision endpoints align with default, moved, scaled, rotated and mirrored ground; survivor front/behind depth is correct.');
}finally{
 for(const image of decoded.values())image.dispose();
 font?.dispose();adapter?.disposeLighting();rmSync(temp,{recursive:true,force:true});
}
