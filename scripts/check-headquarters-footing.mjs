import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const require=createRequire(import.meta.url);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hq-footing-'));
const output=process.argv[2];
if(output)fs.mkdirSync(output,{recursive:true});
try{
 const modules=['imported-art','authored-world','world-assets','world-layout','headquarters-south-art','headquarters-south-placement','placed-world-renderer','studio-play','run-progression','skia-adapter'];
 await build({stdin:{contents:"export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';"+modules.map(id=>`export * from './src/${id}';`).join(''),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'world.cjs')});
 const m=require(path.join(tmp,'world.cjs'));
 const init=require('canvaskit-wasm');
 const kit=await init({locateFile:file=>path.join(path.dirname(require.resolve('canvaskit-wasm')),file)});
 globalThis.CanvasKit=kit;
 const skia=m.JsiSkApi(kit),adapter=m.createSkiaAdapter(skia);
 const fontData=skia.Data.fromBytes(fs.readFileSync('public/fonts/barlow-condensed-black.ttf'));
 const face=skia.Typeface.MakeFreeTypeFaceFromData(fontData),font=skia.Font(face,20);fontData.dispose();
 const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
 m.installImportedArt(snapshot.records);
 const layout=m.prepareAuthoredWorld(snapshot.layout);
 const hq=layout.items.find(p=>p.id===m.HEADQUARTERS_PLACEMENT_ID),bounds=m.placementBounds(hq);
 const world=m.createCampPlaySession(layout);
 m.startExpedition(world);
 world.layout={...layout,items:[hq]};
 const images={};
 for(const url of [m.HQ_SOUTH_ROOF,m.HQ_SOUTH_INTERIOR,m.HQ_SOUTH_RUIN,m.HQ_SOUTH_RUIN_INTERIOR]){
  const encoded=skia.Data.fromBytes(fs.readFileSync('public'+url));
  images[m.assetImageKey(url)]=skia.Image.MakeImageFromEncoded(encoded);
  encoded.dispose();
 }

 // Rectangles are source pixels on the permanently painted foreground.
 const parts={sacks:[330,729,117,25],shelter:[1170,704,138,32],rope:[1049,707,5,15],
  leftPlinth:[536,716,57,19],rightPlinth:[947,716,58,19],outerLeft:[171,700,41,21],outerRight:[1325,703,39,20],
  wall:[328,562,113,118],roof:[515,135,177,117]};
 const positions={closed:1.24,early:1.144,mid:1.115,late:1.086,open:.91};
 for(const state of ['repaired','broken']){
  world.progression.restoredBuildings=state==='repaired'?['headquarters']:[];
  world.progression.campLevel=state==='repaired'?1:0;
  const phases={};
  for(const [phase,v] of Object.entries(positions)){
   const surface=skia.Surface.Make(1536,1024),ctx=new adapter.SkiaContext(surface.getCanvas(),1536,1024,font);
   Object.assign(world.player,{x:bounds.x+bounds.width*.5,y:bounds.y+bounds.height*v});
   ctx.scale(1536/bounds.width,1024/bounds.height);ctx.translate(-bounds.x,-bounds.y);
   m.placedDrawables(ctx,images,world).sort(m.compareWorldDrawables).forEach(d=>d.draw());
   surface.flush();
   const frame=surface.makeImageSnapshot(),info=frame.getImageInfo();
   phases[phase]=Object.fromEntries(Object.entries(parts).map(([name,[x,y,width,height]])=>[name,Buffer.from(frame.readPixels(x,y,{...info,width,height}))]));
   if(output)fs.writeFileSync(path.join(output,`${state}-${phase}.png`),frame.encodeToBytes());
   frame.dispose();ctx.dispose();surface.dispose();
  }
  for(const [phase,samples] of Object.entries(phases)){
   for(const name of ['sacks','shelter','rope','leftPlinth','rightPlinth','outerLeft','outerRight']){
    assert(samples[name].some(v=>v>0),`${state} ${name} is visible`);
    assert(samples[name].equals(phases.open[name]),`${state} ${name} stays fixed at ${phase}`);
   }
  }
  assert(!phases.open.wall.equals(phases.closed.wall)&&!phases.open.roof.equals(phases.closed.roof),'Both assemblies really reveal the room');
  assert(phases.mid.wall.equals(phases.closed.wall)&&phases.mid.roof.equals(phases.open.roof),'The midpoint shows a solid front wall and open roof');
 }
 for(const image of Object.values(images))image.dispose();
 font.dispose();face.dispose();adapter.disposeLighting();
 console.log('PASS: seven foreground regions remain pixel-identical across five reveal positions in both HQ states; the roof and front wall resolve separately.');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
