// Review the live saved camp with the shared Skia renderer and downloaded uploads.
// Capture read-only fixtures; never write them over the owner's current layout.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),sharp=require('sharp'),init=require('canvaskit-wasm'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'puddle-skia-')),qa=process.env.CAMP_QA_ROOT||'docs/qa/camp-perimeter-v3',out=qa+'/'+(process.argv[2]||'before');
fs.mkdirSync(out,{recursive:true});
try{
 await build({stdin:{contents:`export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';export * from './src/skia-adapter';export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/studio-play';export * from './src/placed-world-renderer';export * from './src/editor-image-sources';export * from './src/puddle-renderer';export * from './src/camp-puddles';export * from './src/world-bounds';export * from './src/camp-perimeter';export * from './src/camp-gates';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'render.mjs')});
 const kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});globalThis.CanvasKit=kit;
 const m=await import(pathToFileURL(path.join(temp,'render.mjs'))),skia=m.JsiSkApi(kit),{SkiaContext,disposeLighting}=m.createSkiaAdapter(skia);
 m.installImportedArt(JSON.parse(fs.readFileSync(qa+'/artwork-before.json')).records);
 const layout=(process.argv[2]==='after'?m.addApprovedCampPerimeter(JSON.parse(fs.readFileSync(qa+'/layout-before.json')).draft):JSON.parse(fs.readFileSync(qa+'/layout-before.json')).draft),imgs={},missing=new Set();
 for(const [key,url] of Object.entries({...m.EDITOR_IMAGE_SOURCES,...m.editorTerrainDetail(layout.terrainImage),...m.requiredImages(layout.items.map(p=>p.assetId),layout.terrainImage)})){
  const file=url.startsWith('/api/asset-files/')?path.join(process.argv[3]||'/workspace/scratch/23bb648437fc/camp-art-downloads',url.split('/').pop()):'public'+url;if(!fs.existsSync(file)){missing.add(url);continue}const data=skia.Data.fromBytes(fs.readFileSync(file));imgs[key]=skia.Image.MakeImageFromEncoded(data);data.dispose();assert(imgs[key],url);
 }
 const unavailable=new Set(layout.items.filter(p=>Object.values(m.requiredImages([p.assetId])).some(url=>missing.has(url))).map(p=>p.id)),safe={...layout,items:layout.items.filter(p=>!unavailable.has(p.id))};let w=m.createCampPlaySession(safe);
 const fontData=skia.Data.fromBytes(fs.readFileSync('public/fonts/barlow-condensed-black.ttf')),face=skia.Typeface.MakeFreeTypeFaceFromData(fontData),font=skia.Font(face,20);fontData.dispose();
 const render=(width,height,x,y,zoom,follow=false)=>{const view={x,y,zoom,follow,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true},surface=skia.Surface.Make(width,height),ctx=new SkiaContext(surface.getCanvas(),width,height,font);m.drawWorldEditor(ctx,{},imgs,w,view);if(process.argv[2]==='survey'){const cam=m.editorCamera(width,height,w,view);ctx.strokeStyle='#dceeff77';ctx.lineWidth=1;ctx.font="900 15px 'Barlow Condensed'";ctx.fillStyle='#ffffff';for(let n=0;n<=3400;n+=200){const xx=(n-cam.x)*cam.scale,yy=(n-cam.y)*cam.scale;ctx.beginPath();ctx.moveTo(xx,0);ctx.lineTo(xx,height);ctx.moveTo(0,yy);ctx.lineTo(width,yy);ctx.stroke();for(let j=100;j<1500;j+=300){ctx.fillText('X'+n,xx+3,j);ctx.fillText('Y'+n,j,yy-4)}}}surface.flush();const shot=surface.makeImageSnapshot(),buffer=shot.encodeToBytes();shot.dispose();ctx.dispose();surface.dispose();return buffer};
 const still=async(name,...args)=>sharp(render(...args)).webp({quality:95}).toFile(out+'/'+name);
 await still('camp-overview.webp',1500,1500,1697,1697,.19);
 if(process.argv[2]==='survey')process.exit(0);
 for(const [name,x,y] of [['wall-west',380,1560],['wall-north',2150,-60],['wall-east',3270,1450]]){Object.assign(w.player,{x:x-100,y:y+15});await still(name+'.webp',1000,900,x,y-60,1.0)}
 const fire=layout.items.find(p=>p.role==='hearth');await still('fire-clearing.webp',1100,800,fire.x,fire.y+60,1.3);
 await still('south-walkway.webp',1000,1100,1740,2850,1.4);

 for(const p of layout.items.filter(p=>m.ASSET_BY_ID.get(p.assetId)?.gate)){const a=m.ASSET_BY_ID.get(p.assetId),q=m.gateLocal(p,a,0),x=(q.a.x+q.b.x)/2,y=(q.a.y+q.b.y)/2;await still(p.assetId+'-closed.webp',1000,800,x,y,1.35);(w.gateMotions??={})[p.id]={amount:1,target:1};await still(p.assetId+'-open.webp',1000,800,x,y,1.35);delete w.gateMotions[p.id];}const report=[];
 const exterior=w.layout;
 const hq=layout.items.find(p=>p.assetId==='base_shelter_t1');
 if(hq){w.layout={...exterior,items:exterior.items.map(p=>p.id===hq.id?{...p,roof:'hidden'}:p)};Object.assign(w.player,{x:hq.x,y:hq.y-330});await still('headquarters-interior.webp',1200,900,hq.x,hq.y-280,1.2);w.layout=exterior;}
 const bounds=m.worldBounds(w);for(const [name,x,y] of [['west',bounds.left+200,1697],['east',bounds.right-200,1697],['north',1697,bounds.top+200],['south',1697,bounds.bottom-200]]){Object.assign(w.player,{x,y});await still('outer-'+name+'.webp',844,620,x,y,.85,true)}
 for(const p of layout.items.filter(p=>!m.ASSET_BY_ID.get(p.assetId)?.foliage&&!m.ASSET_BY_ID.get(p.assetId)?.puddle)){
  const a=m.ASSET_BY_ID.get(p.assetId),b=m.placementBounds(p);report.push({id:p.id,assetId:p.assetId,name:a.name,image:a.image,x:p.x,y:p.y,width:b.width,height:b.height,ground:a.ground||null});
  if(a.id.startsWith('misc_d9795')||a.perimeter)continue;
  w.layout=p.assetId.startsWith('art_hq_')||p.assetId==='art_camp_planning_board'?{...exterior,items:exterior.items.map(q=>q.id===hq?.id?{...q,roof:'hidden'}:q)}:exterior;
  await still(p.assetId+'.webp',900,750,b.x+b.width/2,b.y+b.height/2,Math.min(2.2,1000/Math.max(b.width,b.height)));
 }
 fs.writeFileSync(out+'/layout.json',JSON.stringify(layout,null,2));fs.writeFileSync(out+'/asset-audit.json',JSON.stringify(report,null,2));
 Object.values(imgs).forEach(im=>im.dispose());font.dispose();face.dispose();disposeLighting();
 fs.writeFileSync(out+'/render-report.json',JSON.stringify({images:Object.keys(imgs).length,remotePlacementsOmitted:[...unavailable],limit:'Actual shared software Skia renderer; no physical iPhone QA'},null,2));console.log('Rendered all '+report.length+' props/walls; '+unavailable.size+' omissions.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
