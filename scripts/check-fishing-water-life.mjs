// Focused checks for actual water-only fish routes, faster continuous motion,
// stable reduced-motion output and the real shared Skia anatomy painter.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'fishing-water-life-'));
const output=process.argv.find(a=>a.startsWith('--output='))?.slice(9)||'.qa/fishing-water-life';
try{
 const modules=['fishing-water-life','fishing-site-art','fishing-site-geometry','fishing-site-placement','river-collision','imported-art','skia-adapter'];
 const file=path.join(temp,'model.mjs');
 await build({stdin:{contents:modules.map(name=>`export * from './src/${name}';`).join('\n')+"\nexport {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:file,logLevel:'error'});
 const m=await import(pathToFileURL(file));
 const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));m.installImportedArt(snapshot.records);
 const layout=m.placeStillwaterFishingSite(snapshot.layout),pier=layout.items.find(p=>p.id===m.FISHING_PIER_PLACEMENT_ID);assert(pier);
 const fish=m.fishingFishSchool(pier);assert(fish.length>=4&&fish.length<=6,'The existing lake supports a small bounded school');
 assert.equal(m.fishingFishSchool(pier),fish,'Unchanged geometry reuses validated routes');
 assert(new Set(fish.map(f=>f.variant)).size>=2,'The school has distinct body forms');
 assert.equal(m.fishingFishSchool({...pier,id:'dry-fish-copy',x:1800,y:1800}).length,0,'Dry land creates no ambient fish');
 const speeds=[];let waterSamples=0,minRate=Infinity,maxRate=0;
 for(const f of fish){
  let distance=0,previous=m.fishingFishPosition(f,0);
  for(let i=1;i<=2400;i++){
   const t=i*.2,p=m.fishingFishPosition(f,t),step=Math.hypot(p.x-previous.x,p.y-previous.y);
   assert(m.riverWaterContains(p.x,p.y,Math.max(26,f.drawRadius)),'Full fish, fins and disturbance fit in real water');
   assert(Math.abs(p.x-f.x)<=f.rx+1e-8&&Math.abs(p.y-f.y)<=f.ry+1e-8,'Culling envelope contains the complete route');
   assert(step<22,'A cruising fish has no teleport or discontinuous dart');
   distance+=step;minRate=Math.min(minRate,p.speed);maxRate=Math.max(maxRate,p.speed);previous=p;waterSamples++;
  }
  const average=distance/480;assert(average>10&&average<60,'Fish make visible forward progress at a plausible cruise speed');speeds.push(Number(average.toFixed(2)));
 }
 assert(maxRate>minRate*2,'Short accelerations vary the cruising speed');
 assert.deepEqual(m.fishingFishPosition(fish[0],24.8),m.fishingFishPosition(fish[0],24.8),'Motion is a deterministic world-clock function');

 const init=require('canvaskit-wasm'),kit=await init({locateFile:name=>path.join(path.dirname(require.resolve('canvaskit-wasm')),name)});globalThis.CanvasKit=kit;
 const skia=m.JsiSkApi(kit),adapter=m.createSkiaAdapter(skia),font=skia.Font(undefined,14);
 fs.mkdirSync(output,{recursive:true});
 const bounds={left:Math.min(...fish.map(f=>f.x-f.rx-f.drawRadius))-18,top:Math.min(...fish.map(f=>f.y-f.ry-f.drawRadius))-18};
 bounds.width=Math.max(...fish.map(f=>f.x+f.rx+f.drawRadius))+18-bounds.left;
 bounds.height=Math.max(...fish.map(f=>f.y+f.ry+f.drawRadius))+18-bounds.top;
 const width=880,height=520,zoom=Math.min(width/bounds.width,height/bounds.height);
 const render=(time,reduced=false,anatomy=false)=>{
  const surface=skia.Surface.Make(width,height),ctx=new adapter.SkiaContext(surface.getCanvas(),width,height,font);
  ctx.fillStyle='#174a43';ctx.fillRect(0,0,width,height);
  if(anatomy){
   for(let variant=0;variant<3;variant++){
    const source=fish.find(f=>f.variant===variant)||fish[0],f={...source,variant,rippleOffset:source.period*.5-time};
    const p=m.fishingFishPosition(f,time);ctx.save();ctx.translate(165+variant*275,250);ctx.scale(4.2,4.2);ctx.rotate(-p.angle);ctx.translate(-p.x,-p.y);m.drawFishingFish(ctx,f,time,reduced);ctx.restore();
   }
  }else{
   ctx.translate((width-bounds.width*zoom)/2,(height-bounds.height*zoom)/2);ctx.scale(zoom,zoom);ctx.translate(-bounds.left,-bounds.top);
   for(const f of fish)m.drawFishingFish(ctx,f,time,reduced);
  }
  surface.flush();const shot=surface.makeImageSnapshot(),bytes=Buffer.from(shot.encodeToBytes());shot.dispose();ctx.dispose();surface.dispose();return bytes;
 };
 const start=render(0),moving=render(.75);assert(!start.equals(moving),'Fins, bodies and visible motion change between frames');
 assert(render(2,true).equals(render(14,true)),'Reduced motion freezes the entire school and suppresses disturbances');
 fs.writeFileSync(path.join(output,'school-0.png'),start);fs.writeFileSync(path.join(output,'school-moving.png'),moving);
 fs.writeFileSync(path.join(output,'fish-anatomy.png'),render(1.5,false,true));
 if(process.argv.includes('--motion'))for(let frame=0;frame<96;frame++)fs.writeFileSync(path.join(output,`motion-${String(frame).padStart(3,'0')}.png`),render(frame/16));
 font.dispose();adapter.disposeLighting();
 const report={result:'pass',fish:fish.length,forms:new Set(fish.map(f=>f.variant)).size,waterSamples,averageWorldUnitsPerSecond:speeds,slowestInstantaneousSpeed:Number(minRate.toFixed(2)),fastestInstantaneousSpeed:Number(maxRate.toFixed(2)),cachedWaterValidation:true,reducedMotion:true,physicalIPhoneTested:false};
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
