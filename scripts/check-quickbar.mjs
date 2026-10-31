import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require('@napi-rs/canvas'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'quickbar-'));
globalThis.__quickReact={createElement:(type,props,...children)=>({type,props:{...props,children}})};
try{
 await build({stdin:{contents:"export * from './src/quick-items';export * from './src/field-kit';export * from './src/backpack';export * from './src/survival-engine';export * from './src/studio-play';export * from './src/imported-art';export * from './src/layout-views';export * from './src/world-layout';export * from './src/chest-animation';export * from './src/worker-renderer';export * from './src/survivor-art';export * from './src/bonfire-food-art';export {default as WebQuickBar} from './src/QuickBar';export {default as NativeQuickBar} from './native/QuickBar';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs'),plugins:[{name:'platform-stubs',setup(b){
  b.onResolve({filter:/^(react(?:\/jsx-runtime)?|react-native)$/},a=>({path:a.path,namespace:'test'}));
  b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path==='react'?'module.exports=globalThis.__quickReact;':a.path==='react/jsx-runtime'?"export const jsx=(type,props)=>({type,props});export const jsxs=jsx;":"export const View='view',Text='text',Image='image',Pressable='pressable';export const StyleSheet={create:x=>x};",loader:'js'}));
  b.onLoad({filter:/\.(png|webp)$/},a=>({contents:`module.exports=${JSON.stringify(a.path)}`,loader:'js'}));
 }}]});
 const m=require(path.join(temp,'test.cjs')),saved=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));m.installImportedArt(saved.records);
 const make=()=>{const w=m.createCampPlaySession(saved.layout);w.enemies=[];w.loot=[];return w},w=make(),controller=new m.FieldKitController();
 assert.equal(m.selectedQuickItem(w),'axe');assert(m.selectQuickItem(w,'fists'));assert.equal(w.player.equipped,null);assert.equal(controller.sample(w).selected,'fists');
 assert(!m.selectQuickItem(w,'meal'),'Empty food slot cannot equip');assert(m.selectQuickItem(w,'axe'));assert.equal(w.player.equipped,'axe');
 w.cooked=3;w.hunger=20;w.player.hp=60;
 const chest=m.layoutViews(w.layout).chests[0];[w.player.x,w.player.y]=m.placementPoint(chest,chest.x,chest.y+22*chest.scale);
 assert.equal(controller.sample(w).action.label,'STORAGE');assert(m.selectQuickItem(w,'meal'));
 let shown=controller.sample(w).action;assert.equal(shown.label,'STORAGE','Stations remain accessible while holding food');
 w.enemies.push({id:901,x:w.player.x+120,y:w.player.y,hp:100,maxHp:100,attackAt:0,path:[],repathAt:0,flashUntil:0});
 assert.equal(controller.sample(w).action.label,'EAT','Food remains the selected action during combat');assert(controller.sample(w).combat,'Dodge remains available');
 shown=controller.sample(w).action;assert(controller.press(w,shown));assert.equal(w.cooked,2);assert.equal(w.hunger,55);assert.equal(w.player.hp,68);assert(!m.chestIsOpen(w,chest.id));assert(!controller.holdingAttack);
 assert(!controller.press(w,shown),'Held action never repeats consumption');controller.release();assert(!controller.press(w,shown),'Stale meal quantity rejected');
 w.tick+=480;assert(controller.press(w,controller.sample(w).action));controller.release();assert.equal(w.cooked,1);assert.equal(w.player.hp,76);
 w.tick+=480;assert(controller.press(w,controller.sample(w).action));controller.release();assert.equal(w.cooked,0);assert.equal(w.player.equipped,null);assert.equal(m.selectedQuickItem(w),'fists');
 w.cooked=1;w.player.hp=100;w.hunger=100;w.tick+=480;assert(m.selectQuickItem(w,'meal'));shown=controller.sample(w).action;assert(shown.disabled,'Full health and food disables Eat');assert(!controller.press(w,shown));assert.equal(w.cooked,1);
 w.player.hp=95;assert(controller.press(w,controller.sample(w).action),'Meal can heal when food is full');controller.release();assert.equal(w.player.hp,100);
 w.cooked=2;assert(m.selectQuickItem(w,'meal'));w.attackQueuedUntil=10;assert(!m.requestAttack(w));assert.equal(w.attackQueuedUntil,undefined);assert(!m.attack(w));
 assert(m.selectQuickItem(w,'axe'));assert(m.requestAttack(w));assert(!m.selectQuickItem(w,'meal'),'Switching cannot cancel an in-progress axe swing');
 w.axeSwing=undefined;w.attackUntil=0;w.player.downedUntil=2;assert(!m.selectQuickItem(w,'fists'));w.player.downedUntil=0;w.phase='over';assert(!m.selectQuickItem(w,'fists'));w.phase='day';
 const dropping=make();dropping.cooked=2;assert(m.selectQuickItem(dropping,'meal'));const drop=m.dropBackpackItem(dropping,'meal','all');assert(drop.ok,drop.message);assert.equal(dropping.cooked,0);assert.equal(dropping.player.equipped,null);
 const bag=make();assert(m.selectQuickItem(bag,'fists'));assert(m.useBackpackItem(bag,'axe'));assert.equal(m.selectedQuickItem(bag),'axe');
 const other=make();other.cooked=1;other.hunger=20;assert(!controller.press(other,shown),'Old world callback cannot consume new world inventory');assert.equal(other.cooked,1);
 const nodes=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
 for(const platform of ['web','native']){
  let selected=[],stopped=0;const bar=m[platform==='web'?'WebQuickBar':'NativeQuickBar']({selected:'axe',cooked:2,disabled:false,onSelect:id=>selected.push(id)}),all=nodes(bar),slots=all.filter(n=>n.type===(platform==='web'?'button':'pressable'));
  assert.equal(slots.length,6);const food=slots[2];
  if(platform==='web'){
   food.props.onPointerDown({button:0,preventDefault(){},stopPropagation(){stopped++}});food.props.onClick({detail:1,stopPropagation(){}});assert.equal(selected.length,1,'Synthetic click cannot select twice');
   food.props.onClick({detail:0,stopPropagation(){}});assert.equal(selected.length,2,'Keyboard activation works');food.props.onKeyDown({key:' ',stopPropagation(){stopped++}});assert.equal(stopped,2);
   assert.equal(slots.filter(s=>s.props.disabled).length,3);assert.equal(slots[1].props['aria-pressed'],true);
  }else{food.props.onPressIn();food.props.onAccessibilityAction({nativeEvent:{actionName:'activate'}});assert.equal(selected.length,2);assert.equal(slots[1].props.accessibilityState.selected,true);assert.equal(all.filter(n=>String(n.props?.accessibilityLabel).startsWith('Empty quick slot')).length,0)}
  assert(selected.every(id=>id==='meal'));const empty=m[platform==='web'?'WebQuickBar':'NativeQuickBar']({selected:'fists',cooked:0,disabled:false,onSelect:()=>{throw Error('Unavailable meal selected')}});assert(nodes(empty).filter(n=>n.type===(platform==='web'?'button':'pressable'))[2].props.disabled);
 }
 // Draw the production character renderer, all directions and every carry frame.
 const redirects=JSON.parse(fs.readFileSync('server/lossless-artwork-redirects.json'));
 const imgs={};for(const [key,url]of Object.entries({...m.SURVIVOR_IMAGE_SOURCES,bonfireCooked:m.BONFIRE_FOOD_IMAGES.bonfireCooked})){let canonical=url;while(redirects[canonical])canonical=redirects[canonical];imgs[key]=await loadImage(path.resolve('public'+canonical))}
 const directions=['down','down-right','right','up-right','up','up-left','left','down-left'],canvas=createCanvas(8*150,9*160),ctx=canvas.getContext('2d');ctx.fillStyle='#ac8355';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.font='12px sans-serif';ctx.fillStyle='#fff0cf';
 const view=make();view.player.equipped='meal';view.cooked=1;view.tick=120;view.attackReady=0;
 let heldDraws=0;for(let row=0;row<9;row++)for(let col=0;col<8;col++){
  const p=view.player;p.direction=directions[col];p.moving=row>0;p.sprinting=row>4;p.runBlend=row>4?1:0;p.walkBlend=row>0?1:0;p.walkDistance=((row-1)%4)*28;p.x=col*150+75;p.y=row*160+140;
  const operations=[],record=new Proxy(ctx,{get(target,key){const value=target[key];return typeof value==='function'?(...args)=>{if(key==='drawImage')operations.push(args);return value.apply(target,args)}:value},set(target,key,value){target[key]=value;return true}});
  m.drawWorker(record,imgs,view);const food=operations.filter(args=>args[0]===imgs.bonfireCooked);assert.equal(food.length,1,'One held food draw per frame');assert(food[0].slice(1).every(Number.isFinite));heldDraws++;
  const foodIndex=operations.findIndex(args=>args[0]===imgs.bonfireCooked),bodyIndex=operations.findIndex(args=>args[0]!==imgs.bonfireCooked);assert(directions[col].startsWith('up')?foodIndex<bodyIndex:foodIndex>bodyIndex,'Held food respects character depth');
  ctx.fillStyle='#fff0cf';ctx.fillText(`${directions[col]} · ${row===0?'idle':row<5?'walk':'run'} ${row===0?'':(row-1)%4+1}`,col*150+8,row*160+17);
 }
 fs.mkdirSync('.qa/field-kit',{recursive:true});const proof='.qa/field-kit/held-meal-all-directions.png';fs.writeFileSync(proof,canvas.toBuffer('image/png'));
 const report={passed:true,quickItems:m.QUICK_ITEMS.map(i=>i.id),emptySlots:m.QUICK_EMPTY_SLOTS,heldFoodFrames:heldDraws,proof,checks:['inventory-backed selection','empty slots disabled','stations stay accessible and held food stays usable in combat','one meal per press and stale quantity rejection','last meal returns to fists','full needs do not waste food','healing at full food','no attacks while holding food','switching respects active attack and downed state','backpack actions update selection','old run callback rejected','web pointer and keyboard activation','native touch and assistive activation','food held in all eight directions and walk/run frames','front/back depth ordering'],physicalDeviceTested:false};
 fs.writeFileSync('docs/qa/field-kit-v1/quickbar.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true});delete globalThis.__quickReact}
