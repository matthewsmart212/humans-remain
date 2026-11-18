import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'warehouse-'));
try{
 await build({stdin:{contents:`export * from './src/warehouse';export * from './src/warehouse-renderer';export * from './src/warehouse-storage';export * from './src/scrap-salvage';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/imported-art';export * from './src/authored-world';export * from './src/expedition-inventory';export * from './src/play-interaction';export * from './src/station-access';export * from './src/skia-adapter';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs')});
 const m=require(path.join(temp,'test.cjs')),snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));m.installImportedArt(snapshot.records);const layout=m.prepareAuthoredWorld(snapshot.layout),w=m.createWorld(layout);w.editorPreview=true;for(const id of Object.keys(w.gear.bag))w.gear.bag[id]=0;
 const warehouse=m.warehouses(layout)[0];assert(warehouse,'Authored warehouse exists');const dock=m.warehouseDock(warehouse);console.log('Warehouse dock',dock);assert(!m.layoutBlocked(layout,dock.x,dock.y,19),'Warehouse approach must be reachable');Object.assign(w.player,dock);assert(m.nearbyWarehouse(w));const interaction=m.playInteraction(w);assert.equal(interaction.label,'Open warehouse');assert(interaction.perform());assert.equal(w.stationPanel,'warehouse');assert(m.atStation(w));
 w.bag.pallets=12;w.bag.scrap=25;const materials=()=>w.bag.pallets+w.bag.scrap+w.stock.pallets+w.stock.scrap,total=materials();
 assert.equal(m.transferWarehouse(w,'pallets',false,5),5);assert.equal(w.stock.pallets,5);assert.equal(w.stock.scrap,0);assert.equal(m.transferWarehouse(w,'scrap',false,'all'),25);assert.equal(materials(),total);assert.equal(m.transferWarehouse(w,'scrap',false,'all'),0);assert.equal(m.transferWarehouse(w,'pallets',false,-1),0);assert.equal(m.transferWarehouse(w,'pallets',false,NaN),0);
 assert.equal(m.transferWarehouse(w,'pallets',true,2),2);assert.equal(w.stock.pallets,3);assert.equal(materials(),total);w.stock.scrap=200;w.bag.pallets=19;w.bag.scrap=0;assert.equal(m.transferWarehouse(w,'scrap',true,'all'),1);assert(m.packWeight(w)<=24.0001);
 // Stone shares the same camp stock and obeys the same capacity and access rules.
 w.bag.pallets=0;w.bag.scrap=0;m.setItemCount(w,'stone',8);m.setStoredCount(w,'stone',3);
 assert.equal(m.transferWarehouse(w,'stone',false,4),4);assert.equal(m.itemCount(w,'stone'),4);assert.equal(m.storedCount(w,'stone'),7);
 assert.equal(m.transferWarehouse(w,'stone',true,2),2);assert.equal(m.itemCount(w,'stone')+m.storedCount(w,'stone'),11);
 for(const invalid of [0,-1,NaN,Infinity,.5])assert.equal(m.transferWarehouse(w,'stone',false,invalid),0);
 m.setItemCount(w,'stone',0);m.setStoredCount(w,'stone',100);const beforeWeight=m.packWeight(w),fits=m.canCarryCount(w,'stone',100);
 assert.equal(m.transferWarehouse(w,'stone',true,'all'),fits);assert(m.packWeight(w)<=m.PACK_CAPACITY+1e-7);assert.equal(m.storedCount(w,'stone'),100-fits);
 assert.equal(m.warehouseView(w,'stone',true,999).amount,m.warehouseLimit(w,'stone',true));
 m.setItemCount(w,'stone',0);m.setStoredCount(w,'stone',0);assert.equal(m.warehouseView(w,'stone',false,1).amount,0);
 w.player.x+=1000;assert.equal(m.transferWarehouse(w,'stone',true,1),0);Object.assign(w.player,dock);
 w.player.x+=1000;assert.equal(m.transferWarehouse(w,'scrap',false,'all'),0);assert(!m.atStation(w));Object.assign(w.player,dock);w.player.downedUntil=10;assert.equal(m.transferWarehouse(w,'scrap',true,1),0);w.player.downedUntil=0;
 for(const {id,fullAt} of m.WAREHOUSE_MATERIALS){
  const half=Math.ceil(fullAt/2);
  assert.deepEqual([0,1,half-1,half,fullAt-1,fullAt].map(n=>m.warehouseLevel(n,id)),[0,1,1,2,2,3],id);
 }
 const before=JSON.stringify(layout),start=performance.now(),count=m.seedScrapSalvage(w,12345),piles=w.loot.filter(l=>l.salvageVariant!==undefined);assert(count>=50&&count<=64,'Ironworks keeps scarce scrap piles at the approved density');assert.equal(m.seedScrapSalvage(w,12345),0);assert.equal(JSON.stringify(layout),before);assert.equal(new Set(piles.map(l=>l.id)).size,count);assert.equal(new Set(piles.map(l=>l.salvageVariant)).size,3);for(const l of piles)assert(!m.layoutBlocked(layout,l.x,l.y,30));
 const other=m.createWorld(layout);m.seedScrapSalvage(other,54321);assert.notEqual(piles[0].x,other.loot.find(l=>l.salvageVariant!==undefined).x);console.log('Scattered',count,'piles; generation ms',Math.round(performance.now()-start));
 const item=piles[0];Object.assign(w.player,{x:item.x,y:item.y});w.stationPanel=undefined;w.bag.pallets=0;w.bag.scrap=0;const n=item.amount;assert(m.doAction(w,'pickup'));assert.equal(w.bag.scrap,n);assert(!w.loot.includes(item),'Collected pile disappears');
 const kit=await require('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});globalThis.CanvasKit=kit;const skia=m.JsiSkApi(kit),{SkiaContext}=m.createSkiaAdapter(skia),font=skia.Font(undefined,14),imgs={};
 for(const [key,url] of Object.entries({...m.WAREHOUSE_IMAGES,...m.SCRAP_IMAGES})){const data=skia.Data.fromBytes(fs.readFileSync('public'+url));imgs[key]=skia.Image.MakeImageFromEncoded(data);data.dispose();assert(imgs[key],key)}
 const size=256,surface=skia.Surface.Make(4*size,16*size),ctx=new SkiaContext(surface.getCanvas(),4*size,16*size,font),b=m.placementBounds(warehouse);
 for(let wood=0;wood<4;wood++)for(let stone=0;stone<4;stone++)for(let scrap=0;scrap<4;scrap++){
  m.setStoredCount(w,'pallets',[0,1,10,20][wood]);
  m.setStoredCount(w,'stone',[0,1,15,30][stone]);
  m.setStoredCount(w,'scrap',[0,1,25,50][scrap]);
  ctx.save();ctx.translate(scrap*size,(wood*4+stone)*size);ctx.fillStyle='#454532';ctx.fillRect(0,0,size,size);
  ctx.scale(size/b.width,size/b.height);ctx.translate(-b.x,-b.y);
  assert(m.drawWarehouse(ctx,imgs,w,warehouse));ctx.restore();
 }
 surface.flush();const image=surface.makeImageSnapshot(),out=process.argv[2]||'.qa/warehouse';
 const pixels=image.readPixels(),width=image.width();
 for(const [index,key] of ['pallets','stone','scrap'].entries()){
  const corners=m.warehouseStockMask(key),xs=corners.map(p=>p[0]*size),ys=corners.map(p=>p[1]*size);
  const samples=[];
  for(let wood=0;wood<4;wood++)for(let stone=0;stone<4;stone++)for(let scrap=0;scrap<4;scrap++){
   const stage=[wood,stone,scrap][index],sample=[];
   for(let y=Math.ceil(Math.min(...ys))+1;y<Math.max(...ys)-1;y+=3){
    for(let x=Math.ceil(Math.min(...xs))+1;x<Math.max(...xs)-1;x+=3){
     const pixel=4*(((wood*4+stone)*size+y)*width+scrap*size+x);
     sample.push(pixels[pixel],pixels[pixel+1],pixels[pixel+2]);
    }
   }
   // Integer translations of the same Skia image can round a channel by one.
   if(samples[stage])assert(sample.every((v,i)=>Math.abs(v-samples[stage][i])<=1),key+' changes with another bay');
   else samples[stage]=sample;
  }
  for(let stage=1;stage<4;stage++)assert(samples[stage].some((v,i)=>Math.abs(v-samples[stage-1][i])>20),key+' fill levels must be visible');
 }
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'storage-states.png'),image.encodeToBytes());
 image.dispose();ctx.dispose();surface.dispose();font.dispose();Object.values(imgs).forEach(i=>i.dispose());
 console.log('PASS: reachable station, inventory transfers, independent stock levels, salvage collection and 64 rendered warehouse states.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
