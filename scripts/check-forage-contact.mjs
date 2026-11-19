import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';

const require=createRequire(import.meta.url);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'forage-contact-'));
const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
const sources=['world-assets','world-layout','authored-world','imported-art','studio-play','survival-engine','foraging','forage-art','forage-renderer','foliage-motion','resource-outlines','camp-vegetation','crop-art','skia-adapter'];
try{
 for(const install of ['node_modules','native/node_modules']){
  const sdk=path.resolve(install,'@shopify/react-native-skia');
  const test=path.join(temp,install.startsWith('native')?'native.cjs':'browser.cjs');
  await build({stdin:{contents:sources.map(s=>`export * from './src/${s}';`).join('\n')+`export {JsiSkApi} from '${sdk}/lib/module/skia/web/JsiSkia.js';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:test,logLevel:'error'});
  const m=require(test),forSdk=createRequire(path.join(sdk,'package.json'));
  const kit=await forSdk('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(forSdk.resolve('canvaskit-wasm')),f)});
  const skia=m.JsiSkApi(kit),adapter=m.createSkiaAdapter(skia),font=skia.Font(undefined,14);
  m.installImportedArt(snapshot.records);
  const layout=m.prepareAuthoredWorld(snapshot.layout),images={},cache=new Map();
  const forageIds=m.FORAGE_ART.map(a=>a.id);
  for(const [key,url] of Object.entries(m.requiredImages(forageIds))){
   if(!cache.has(url)){const data=skia.Data.fromBytes(fs.readFileSync('public'+url));cache.set(url,skia.Image.MakeImageFromEncoded(data));data.dispose()}
   images[key]=cache.get(url);assert(images[key],url);
  }
  // The wall checker uses painted bands and decodes no images in gameplay.
  // Verify those bands still contain every alpha pixel after an art replacement.
  if(install==='node_modules')for(const art of m.FORAGE_ART){
   const urls=[art.image];
   if(art.kind==='carrot'||art.kind==='potato')urls.push(m.cropPickedUrl(art.kind));
   for(const url of urls){
    const image=cache.get(url),width=image.width(),height=image.height(),pixels=image.readPixels();
    assert.deepEqual([width,height],art.size,url+' keeps its registered dimensions');
    for(let y=0;y<height;y++){
     let first=width,last=-1;
     for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]){first=Math.min(first,x);last=x}
     if(last<0)continue;
     assert(m.FORAGE_PAINT_BANDS[art.kind].some(([x0,y0,x1,y1])=>y>=y0&&y<y1&&first>=x0&&last<x1),url+' alpha outside registered clearance at row '+y);
    }
   }
  }
  function render(w,p,active=true,outline=false){
   const surface=skia.Surface.Make(192,192),ctx=new adapter.SkiaContext(surface.getCanvas(),192,192,font);
   const b=m.placementBounds(p);ctx.translate(96-b.x-b.width/2,96-b.y-b.height/2);
   if(outline){
    // Inspect the actual alpha source supplied to Skia's outline filter.
    ctx.drawSpriteOutline=draw=>draw();
    m.drawResourceOutlines(ctx,images,w,{x:b.x-96,y:b.y-96,width:b.width+192,height:b.height+192,scale:1},false,[]);
   }else{
    ctx.translate(p.x,p.y);ctx.rotate((p.rotation||0)*Math.PI/180);ctx.translate(-p.x,-p.y);
    ctx.translate(b.x+b.width/2,b.y+b.height/2);ctx.scale(p.flipX?-1:1,p.flipY?-1:1);ctx.translate(-b.x-b.width/2,-b.y-b.height/2);
    assert(m.drawForagePlant(ctx,images,w,p,active));
   }
   surface.flush();const image=surface.makeImageSnapshot();
   const bytes=Buffer.from(image.readPixels());image.dispose();ctx.dispose();surface.dispose();return bytes;
  }
  for(const a of m.FORAGE_ART.filter(a=>a.kind!=='apple')){
   const w=m.createCampPlaySession(layout);w.enemies=[];w.animals=[];
   const p=layout.items.find(p=>{
    if(p.assetId!==a.id)return false;
    const r=m.forageRoot(p);return [-60,-30,0,30,60].every(offset=>!m.worldBlocked(w,r.x,r.y+offset,19));
   });
   assert(p,'Unobstructed authored plant '+a.id);const root=m.forageRoot(p);
   Object.assign(w.player,{x:root.x,y:root.y-60});
   const idle=render(w,p);
   for(let i=0;i<14;i++)m.stepWorld(w,{x:0,y:1});
   assert(w.player.y>root.y,'Player crossed the root');
   const motion=w.foliageMotions[p.id];
   assert(Math.abs(motion.x)<1e-6&&motion.y>.1,'Only north/south spring motion at the crossing');
   assert(!render(w,p).equals(idle),'A north/south brush visibly deforms '+a.id);
   const probe=m.createCampPlaySession({...layout,items:[p]});
   probe.tick=w.tick;Object.assign(probe.player,{x:w.player.x,y:w.player.y});
   probe.foliageMotions={[p.id]:motion};
   assert(render(probe,p,true,true).equals(render(probe,p)),'The resource outline traces the same bent leaves');
   assert(render(w,p,false).equals(idle),'Distant static renderer preserves sprite registration');
   const reduced=w.weather.reducedMotion;w.weather.reducedMotion=true;
   assert(render(w,p).equals(idle),'Reduced motion preserves the original pixels');
   w.weather.reducedMotion=reduced;
   if(a.kind!=='berries'){
    assert(m.pickForage(w,p.id),'Nearby aligned root can be picked');
    assert.equal(m.forageRemaining(w,p),0);
    assert(render(w,p).equals(render(w,p,false)),'Harvested soil has no foliage motion');
   }
   const flipped={...p,flipY:true,rotation:90};
   const lone=m.createCampPlaySession({...layout,items:[flipped]});
   const [x,y]=m.placementPoint(flipped,flipped.x,flipped.y);
   Object.assign(lone.player,{x,y,moving:true,direction:'right'});
   for(let i=0;i<30;i++){lone.tick++;m.stepFoliage(lone,m.STEP)}
   assert(lone.foliageMotions?.[p.id]?.x>.1,'Mirrored and rotated plant reacts at its visible stem');
   assert(!render(lone,flipped).equals(render(lone,flipped,false)),'Transformed plant remains visibly responsive');
   lone.player.moving=false;
   for(let i=0;i<240;i++){lone.tick++;m.stepFoliage(lone,m.STEP)}
   assert.equal(lone.foliageMotions,undefined);
   assert(render(lone,flipped).equals(render(lone,flipped,false)),'Settled plant returns exactly to its registered pose');
  }
  for(const image of cache.values())image.dispose();
  font.dispose();adapter.disposeLighting();
 }
 console.log('PASS: actual north/south walk-through, rooted berry and wild crops, ripe/picked art, rotated and mirrored contact, static range, reduced motion and recovery with both installed Skia SDKs.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
