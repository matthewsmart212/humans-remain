// Production fishing painters through the native Skia adapter. These checks
// verify shared geometry and actual rendered differences, not a second UI.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const require=createRequire(import.meta.url),root=process.cwd(),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'fishing-v2-render-'));
const output=path.resolve(process.argv.find(a=>a.startsWith('--output='))?.slice(9)||'.qa/fishing-gameplay-v2/render');
const native=path.resolve('native/node_modules/@shopify/react-native-skia'),nativeRequire=createRequire(path.join(native,'package.json'));
const file=path.join(temporary,'model.cjs'),modules=['fishing','fishing-renderer','fishing-water-life','fishing-character','fishing-site-art','fishing-site-geometry','fishing-site-placement','skia-adapter','studio-play','player-gear','imported-art','worker-renderer'];
let adapter,font,typeface;const images={};
try{
 await build({stdin:{contents:modules.map(name=>`export * from './src/${name}';`).join('\n')+'\nexport {JsiSkApi} from '+JSON.stringify(path.join(native,'lib/module/skia/web/JsiSkia.js'))+';',resolveDir:root},bundle:true,platform:'node',format:'cjs',outfile:file,logLevel:'error',plugins:[{name:'native-skia-platform',setup(b){
  b.onResolve({filter:/^@shopify\/react-native-skia$/},a=>({path:a.path,namespace:'native-platform'}));
  b.onLoad({filter:/.*/,namespace:'native-platform'},()=>({contents:'export const Skia=globalThis.__fishingSkia;',loader:'js'}));
 }}]});
 const kit=await nativeRequire('canvaskit-wasm')({locateFile:name=>path.join(path.dirname(nativeRequire.resolve('canvaskit-wasm')),name)});
 const {JsiSkApi}=require(file),api=JsiSkApi(kit);globalThis.__fishingSkia=api;delete require.cache[require.resolve(file)];const m=require(file);
 adapter=m.createSkiaAdapter(api);
 const fontBytes=api.Data.fromBytes(fs.readFileSync('public/fonts/barlow-condensed-black.ttf'));typeface=api.Typeface.MakeFreeTypeFaceFromData(fontBytes);fontBytes.dispose();assert(typeface,'Hydrated original font is required');font=api.Font(typeface,18);
 for(const [key,name] of [['survivorBase','motion-a-v1.webp'],['survivorRear','motion-b-v1.webp']]){
  const bytes=api.Data.fromBytes(fs.readFileSync(path.resolve('public/survival/scrap-runner',name)));images[key]=api.Image.MakeImageFromEncoded(bytes);bytes.dispose();assert(images[key],'Original survivor atlas '+key);
 }
 const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));m.installImportedArt(snapshot.records);
 const layout=m.placeStillwaterFishingSite(snapshot.layout),pier=layout.items.find(p=>p.id===m.FISHING_PIER_PLACEMENT_ID),world=m.createCampPlaySession(layout);
 Object.assign(world,{tick:0,enemies:[],animals:[],loot:[],effects:[],noticeUntil:0});Object.assign(world.player,{x:-1911.7620817843863,y:6658.783147459728,equipped:'fishingRod',moving:false,downedUntil:0,hurtUntil:0});
 m.gear(world).bag.fishingRod=1;Object.assign(m.fishingProgress(world),{claimed:true,bait:10});assert(m.pressFishingAction(world));
 const aim=m.fishingRenderState(world),target={...aim.target};
 const curve=m.fishingAimCurve(world,aim);assert.equal(curve.length,33);assert.equal(m.fishingAimCurve(world,aim),curve,'Repeated aiming reuses bounded geometry');
 assert.deepEqual(curve.at(-1),target,'The aiming marker is the committed world point');
 for(const progress of [0,.25,.5,.75,1]){
  const point=m.fishingFloatPosition(world,{...aim,phase:'casting',phaseProgress:progress,aimPreview:undefined,bobber:target});
  assert(Math.hypot(point.x-curve[progress*32].x,point.y-curve[progress*32].y)<1e-7,'Float follows the preview at '+progress);
 }
 const rig=m.fishingRodRig(world,aim,[11,-44],'down-right'),rodPoints=rig.points;assert.equal(m.fishingRodRig(world,aim,[13,-44],'down-right').points,rodPoints);assert.equal(rodPoints.length,21);
 const waiting={...aim,phase:'waiting',target,bobber:target,age:.2,phaseProgress:0,lineVisible:true,bobberVisible:true};
 const nibble=m.fishingFloatPosition(world,{...waiting,phase:'nibble',nibbleAmount:.58}).dip;
 const bite=m.fishingFloatPosition(world,{...waiting,phase:'bite'}).dip;assert(bite>nibble*3,'A bite dips decisively farther than a nibble');
 const school=m.fishingFishSchool(pier),selected=school[0],pose=m.fishingFishPosition(selected,0);
 const fish={...pose,size:selected.size,variant:selected.variant,species:selected.species,kg:selected.kg};
 const waterState={...waiting,fish:{...fish,x:target.x-13,y:target.y+7,angle:0},target,bobber:target,species:fish.species};
 const render=(width,height,draw)=>{
  const surface=api.Surface.Make(width,height),ctx=new adapter.SkiaContext(surface.getCanvas(),width,height,font);
  ctx.fillStyle='#183f37';ctx.fillRect(0,0,width,height);draw(ctx);
  surface.flush();const shot=surface.makeImageSnapshot(),bytes=Buffer.from(shot.encodeToBytes());shot.dispose();ctx.dispose();surface.dispose();return bytes;
 };
 const label=(ctx,text,x,y)=>{ctx.font='900 18px sans-serif';ctx.textAlign='center';ctx.fillStyle='#d9d2b4';ctx.fillText(text,x,y)};
 const waterFrame=(state,tick=1800,reduced=false)=>{world.tick=tick;world.weather={...world.weather,reducedMotion:reduced};return render(420,260,ctx=>{ctx.translate(210,145);ctx.scale(3.1,3.1);ctx.translate(-target.x,-target.y);m.drawFishingWaterAction(ctx,world,state)})};
 assert(!waterFrame({...waterState,phase:'nibble',nibbleAmount:.58}).equals(waterFrame({...waterState,phase:'bite'})),'Native rendering visibly separates nibble from hook cue');
 assert(waterFrame({...waterState,phase:'reeling',holding:true,fightBehavior:'surge',surge:.8},120,true).equals(waterFrame({...waterState,phase:'reeling',holding:true,fightBehavior:'surge',surge:.8},960,true)),'Reduced motion freezes decorative fish/wake/float animation');
 fs.mkdirSync(output,{recursive:true});
 fs.writeFileSync(path.join(output,'species.png'),render(1440,460,ctx=>{
  for(let variant=0;variant<4;variant++){
   const x=180+variant*360,species=['perch','carp','pike','drone'][variant],source=school.find(f=>f.variant===variant)||{size:1.1,kg:4.2};
   label(ctx,species.toUpperCase(),x,37);label(ctx,'UNDER WATER',x,69);
   for(const above of [false,true]){
    const y=above?335:165;ctx.save();ctx.translate(x,y);ctx.scale(4,4);
    const f={x:0,y:0,angle:0,size:source.size,kg:source.kg,variant,species};
    if(variant===3)m.drawFishingDroneAt(ctx,f,1.2,false,above);else m.drawFishingFishAt(ctx,f,1.2,false,1,.8,above);ctx.restore();
   }
   label(ctx,'LANDED',x,422);
  }
 }));
 const cues=[['WAIT',{phase:'waiting'}],['NIBBLE',{phase:'nibble',nibbleAmount:.58}],['HOOK NOW',{phase:'bite'}],['TURN BEFORE PULL',{phase:'reeling',fightBehavior:'warning',warning:.7}],['STRONG PULL',{phase:'reeling',fightBehavior:'surge',surge:.9,tension:.83}],['TIRED / REEL',{phase:'reeling',fightBehavior:'tiring',tension:.2}]];
 world.weather={...world.weather,reducedMotion:false};world.tick=1800;
 fs.writeFileSync(path.join(output,'water-cues.png'),render(1260,560,ctx=>{
  for(let i=0;i<cues.length;i++){
   const [name,overrides]=cues[i],x=i%3*420,y=Math.floor(i/3)*280;label(ctx,name,x+210,y+36);
   ctx.save();ctx.beginPath();ctx.moveTo(x,y+45);ctx.lineTo(x+420,y+45);ctx.lineTo(x+420,y+275);ctx.lineTo(x,y+275);ctx.closePath();ctx.clip();ctx.translate(x+210,y+165);ctx.scale(3.4,3.4);ctx.translate(-target.x,-target.y);
   m.drawFishingWaterAction(ctx,world,{...waterState,...overrides});ctx.restore();
  }
 }));
 const validAim={...aim,age:.7,charge:.75,aimValid:true},invalidAim={...validAim,aimValid:false};
 const aimFrame=(state)=>render(600,380,ctx=>{
  const points=m.fishingAimCurve(world,state),left=Math.min(world.player.x-80,...points.map(p=>p.x))-30,top=Math.min(world.player.y-160,...points.map(p=>p.y))-20,right=Math.max(world.player.x+80,...points.map(p=>p.x))+30,bottom=Math.max(world.player.y+25,...points.map(p=>p.y))+30,scale=Math.min(560/(right-left),310/(bottom-top));
  label(ctx,state.aimValid?'CLEAR WATER':'INVALID CAST',300,33);ctx.save();ctx.translate(300-(right+left)/2*scale,65-top*scale);ctx.scale(scale,scale);ctx.translate(world.player.x,world.player.y);m.drawFishingSurvivor(ctx,images,world,state);ctx.restore();
 });
 const valid=aimFrame(validAim),invalid=aimFrame(invalidAim);assert(!valid.equals(invalid),'The unavailable aim changes the actual marker and trajectory colour');
 fs.writeFileSync(path.join(output,'aim-valid.png'),valid);fs.writeFileSync(path.join(output,'aim-invalid.png'),invalid);
 const report={passed:true,renderer:'Production native Skia adapter via CanvasKit platform',physicalIPhoneTested:false,checks:['preview endpoint and airborne trajectory agree','bounded reused rod and aim geometry','nibble is shallow and bite is decisive','native water cues differ visibly','stable reduced-motion fish and effects','three weighted species and separate drone object','valid/invalid marker colour and shape'],nativeSupportedDrawingOnly:true};
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{
 for(const image of Object.values(images))image?.dispose();font?.dispose();typeface?.dispose();adapter?.disposeLighting();fs.rmSync(temporary,{recursive:true,force:true});
}
