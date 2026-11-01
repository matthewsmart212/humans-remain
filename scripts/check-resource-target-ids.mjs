import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'resource-target-ids-'));
try{
 await build({stdin:{contents:`export {nearbyResourceOutlines} from './src/resource-outlines';export {setFieldKitTarget} from './src/field-kit-target';export {createWorld} from './src/survival-engine';export {emptyLayout,newPlacement} from './src/world-layout';export {FORAGE_ART} from './src/forage-art';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temp,'model.cjs'));
 const plant={...m.newPlacement(m.FORAGE_ART[0].id,1500,1520),id:'bush'};
 const world=m.createWorld({...m.emptyLayout(),items:[plant],spawn:{x:1500,y:1600}});
 world.enemies=[];world.animals=[];world.loot=[];world.breakables=[];
 const view={x:1000,y:1000,width:1200,height:1000,scale:.7};
 const outline=()=>m.nearbyResourceOutlines(world,view).find(c=>c.id==='forage:bush');
 assert(outline(),'Fixture includes a visible nearby resource');
 for(const id of [42,0,undefined,null,{},'pickup:42']){
  m.setFieldKitTarget(world,{id,x:1500,y:1520,label:'Legacy pickup'});
  assert.equal(outline().selected,false,'Unrelated or malformed target IDs must not crash or select a plant');
 }
 m.setFieldKitTarget(world,{id:'forage:bush',x:1500,y:1520,label:'Bush'});
 assert(outline().selected,'Namespaced string selection still works');
 m.setFieldKitTarget(world,{id:42,forageId:'bush',x:1500,y:1520,label:'Bush'});
 assert(outline().selected,'Explicit resource identity remains authoritative with a numeric target ID');
 const drop={id:42,x:1500,y:1570,kind:'scrap',amount:1,salvageVariant:0};world.loot=[drop];
 m.setFieldKitTarget(world,{...drop,pickupId:42,label:'Metal scrap'});
 assert(m.nearbyResourceOutlines(world,view).find(c=>c.id==='pickup:42')?.selected,'Numeric pickup identity still selects its own outline');
 assert.equal(outline().selected,false,'Selected pickup does not select nearby foliage');
 console.log('PASS: numeric, absent and malformed presentation IDs are safe; string placement and numeric pickup selections are preserved.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
