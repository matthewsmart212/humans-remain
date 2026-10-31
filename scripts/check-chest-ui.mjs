import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const require=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'chest-ui-'));
let state=[],cursor=0,effects=[],effectCursor=0,pendingEffects=[],dirty=false;
const dispose=()=>{for(const effect of effects)effect?.cleanup?.();state=[];effects=[];pendingEffects=[]};
// Flush passive effects after a render so an externally depleted selected stack
// follows the same reset path as the actual web/native component.
const useEffect=(run,deps)=>{
 const index=effectCursor++,previous=effects[index];
 if(!previous||!deps||!previous.deps||deps.some((value,i)=>!Object.is(value,previous.deps[i])))pendingEffects.push(()=>{
  previous?.cleanup?.();effects[index]={deps,cleanup:run()};
 });
};
globalThis.__chestReact={
 createElement:(type,props,...children)=>({type,props:{...props,children}}),
 useRef:value=>({current:value}),useEffect,useLayoutEffect:()=>{},useId:()=> 'test-selector',
 useState:initial=>{
  const index=cursor++;if(!(index in state))state[index]=typeof initial==='function'?initial():initial;
  return[state[index],next=>{const value=typeof next==='function'?next(state[index]):next;if(!Object.is(value,state[index])){state[index]=value;dirty=true}}];
 },
};
const aliases={
 react:'module.exports=globalThis.__chestReact;',
 'react/jsx-runtime':"export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment='fragment';",
 'react-native':"export const View='view',Text='text',Image='image',Pressable='pressable',ScrollView='scroll';export const useWindowDimensions=()=>({width:844,height:390});export const StyleSheet={create:x=>x,absoluteFill:{position:'absolute',left:0,right:0,top:0,bottom:0}};",
};
const expand=node=>node==null||typeof node==='boolean'?null:Array.isArray(node)?node.flat(9).map(expand).filter(Boolean):typeof node!=='object'?node:typeof node.type==='function'?expand(node.type(node.props)):{...node,props:{...node.props,children:expand(node.props?.children)}};
const all=node=>node==null?[]:Array.isArray(node)?node.flatMap(all):typeof node!=='object'?[]:[node,...all(node.props?.children)];
const text=node=>node==null?'':Array.isArray(node)?node.map(text).join(''):typeof node==='object'?text(node.props?.children):String(node);
const isButton=node=>node.type==='button'||node.type==='pressable';
const label=node=>node.props['aria-label']??node.props.accessibilityLabel??text(node);
const button=(tree,name)=>all(tree).find(node=>isButton(node)&&(text(node)===name||label(node)===name));
const itemButton=(tree,name,count,side='chest')=>button(tree,`${name}, ${count} in ${side==='chest'?'chest':'backpack'}`);
// Mode buttons are also labelled Take/Store: only a numeric action may transfer.
const transferButton=(tree,packing)=>all(tree).find(node=>isButton(node)&&new RegExp(`^${packing?'Take':'Store'} \\d+ .+`).test(label(node)));
const invoke=node=>{assert(node,'Expected a control');(node.props.onClick??node.props.onPress)()};
const press=node=>{assert(node&&!node.props.disabled,'Expected an enabled control');invoke(node)};
const selectedQuantity=tree=>{
 const output=all(tree).find(node=>node.type==='output'&&label(node)==='Selected quantity'||/^Selected quantity \d+$/.test(label(node)));
 assert(output,'Selected quantity is accessible');return Number(text(output));
};
const assertNoSelection=(tree,packing)=>{
 const action=button(tree,`Select an item to ${packing?'take':'store'}`);
 assert(action?.props.disabled,'No item is selected and the transfer action is disabled');
 assert.equal(selectedQuantity(tree),0,'No transferable quantity without a selected item');
 assert(!transferButton(tree,packing),'The numeric transfer action cannot resolve to a mode button');
 for(const node of all(tree).filter(node=>isButton(node)&&/, \d+ in (chest|backpack)$/.test(label(node))))assert(!(node.props['aria-pressed']??node.props.accessibilityState?.selected),'No catalog tile is selected');
 assert(button(tree,'Decrease quantity').props.disabled);assert(button(tree,'Increase quantity').props.disabled);assert(button(tree,'Select maximum quantity').props.disabled);
 assert(!button(tree,'Close item information'),'Information is closed when selection clears');
};
const inventory=world=>JSON.stringify({bag:world.bag,stock:world.stock,gear:world.gear,cooked:world.cooked,cookedRabbit:world.cookedRabbit,cookedVenison:world.cookedVenison,kit:world.kit,equipped:world.player.equipped});

try{
 await build({stdin:{contents:"export {default as WebChest} from './src/ChestPanel';export {default as NativeChest} from './native/ChestPanel';export * from './src/chest-inventory';export * from './src/world-layout';export * from './src/survival-engine';export * from './src/player-gear';export * from './src/expedition-inventory';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'check.cjs'),loader:{'.css':'empty'},plugins:[{name:'platform-stubs',setup(builder){
  builder.onResolve({filter:/^(react(?:\/jsx-runtime)?|react-native)$/},args=>({path:args.path,namespace:'platform'}));
  builder.onLoad({filter:/.*/,namespace:'platform'},args=>({contents:aliases[args.path],loader:'js'}));
  builder.onLoad({filter:/\.(png|webp|ttf)$/},args=>({contents:`module.exports=${JSON.stringify(args.path)}`,loader:'js'}));
 }}]});
 const m=require(path.join(tmp,'check.cjs'));
 const make=(gearCount=1)=>{
  const chest={...m.newPlacement('art_hq_storage_chest',1600,1600),id:'chest'},world=m.createWorld({...m.emptyLayout(),spawn:{x:1600,y:1690},items:[chest]});
  world.stationPanel='storage';for(const id of Object.keys(m.GEAR)){world.gear.bag[id]=0;world.gear.chest[id]=gearCount}world.animals=[];world.enemies=[];world.loot=[];return world;
 };
 const mount=(platform,world)=>{
  dispose();let closed=false;
  const draw=()=>{
   let tree,renders=0;
   do{
    assert(renders++<10,'Passive effects settle');dirty=false;cursor=0;effectCursor=0;pendingEffects=[];
    tree=expand(m[platform==='web'?'WebChest':'NativeChest']({world,onClose:()=>closed=true,onChange:()=>{},width:844,height:390,safe:{top:0,left:0,right:0,bottom:0}}));
    for(const run of pendingEffects)run();
   }while(dirty);
   return tree;
  };
  return{draw,isClosed:()=>closed};
 };

 for(const platform of ['web','native']){
  // Every equipment item can make the complete chest -> bag -> chest trip.
  const world=make(),ui=mount(platform,world);let tree=ui.draw();
  assertNoSelection(tree,true);assert(text(tree).includes('0.0 / 24'));assert(!text(tree).includes('Raw chicken'));
  for(const spec of Object.values(m.GEAR)){
   const tile=itemButton(tree,spec.name,1);assert(tile,`${platform}: ${spec.name} is listed`);assert(text(tile).includes('×1'),'Single items display their quantity');
  }
  press(button(tree,'Materials'));tree=ui.draw();assert(text(tree).includes('No materials here'));assertNoSelection(tree,true);
  press(button(tree,'Show all items'));tree=ui.draw();
  for(const [id,spec] of Object.entries(m.GEAR)){
   const beforeSelection=inventory(world);press(itemButton(tree,spec.name,1));tree=ui.draw();assert.equal(inventory(world),beforeSelection,'Selection does not transfer');
   assert.equal(selectedQuantity(tree),1);assert(button(tree,'Increase quantity').props.disabled,'Single gear cannot be incremented');
   const item=m.chestItems(world,'chest').find(item=>item.id===id);assert(!text(tree).includes(item.description),'Item description is optional');
   if(id==='woodenAxe'){
    press(button(tree,`About ${spec.name}`));tree=ui.draw();assert(text(tree).includes(item.description));assert(text(tree).includes('Damage'));assert(text(tree).includes('20 / 24'));
    press(button(tree,'Close item information'));tree=ui.draw();assert(!text(tree).includes(item.description));assert.equal(selectedQuantity(tree),1);
   }
   const action=transferButton(tree,true);assert.equal(text(action),'Take ×1');press(action);tree=ui.draw();
   assert.equal(world.gear.bag[id],1);assert.equal(world.gear.chest[id],0);assert(!itemButton(tree,spec.name,1));assertNoSelection(tree,true);
   const after=inventory(world);invoke(action);tree=ui.draw();assert.equal(inventory(world),after,'A repeated stale last-unit action cannot take a neighbouring item');assertNoSelection(tree,true);
  }
  assert(text(tree).includes('Nothing stored yet'));press(button(tree,'Store supplies'));tree=ui.draw();assertNoSelection(tree,false);
  for(const [id,spec] of Object.entries(m.GEAR)){
   press(itemButton(tree,spec.name,1,'pack'));tree=ui.draw();world.player.equipped=id;press(transferButton(tree,false));tree=ui.draw();
   assert.equal(world.player.equipped,null,'Storing the equipped last item returns to fists');assert.equal(world.gear.bag[id],0);assert.equal(world.gear.chest[id],1);assertNoSelection(tree,false);
  }
  assert(text(tree).includes('Your pack is empty'));assert.equal(m.packWeight(world),0);

  // Selection and Max must not leak between modes, filters, or source items.
  m.setStoredCount(world,'pallets',30);m.setStoredCount(world,'scrap',8);
  press(button(tree,'Browse chest'));tree=ui.draw();press(button(tree,'Materials'));tree=ui.draw();
  press(itemButton(tree,'Logs',30));tree=ui.draw();press(button(tree,'Select maximum quantity'));tree=ui.draw();assert.equal(selectedQuantity(tree),19);
  press(button(tree,'Store from backpack'));tree=ui.draw();assertNoSelection(tree,false);
  press(button(tree,'Take from chest'));tree=ui.draw();assertNoSelection(tree,true);
  press(itemButton(tree,'Logs',30));tree=ui.draw();assert.equal(selectedQuantity(tree),1,'Changing direction clears the previous Max');
  press(button(tree,'Select maximum quantity'));tree=ui.draw();press(button(tree,'Gear'));tree=ui.draw();assertNoSelection(tree,true);
  press(button(tree,'Materials'));tree=ui.draw();assertNoSelection(tree,true);press(itemButton(tree,'Logs',30));tree=ui.draw();assert.equal(selectedQuantity(tree),1,'Changing category clears the previous Max');
  press(button(tree,'Select maximum quantity'));tree=ui.draw();press(itemButton(tree,'Metal scrap',8));tree=ui.draw();assert.equal(selectedQuantity(tree),1,'A different item starts at one');
  press(itemButton(tree,'Logs',30));tree=ui.draw();press(button(tree,'About Logs'));tree=ui.draw();assert(button(tree,'Close item information'));
  press(button(tree,'Gear'));tree=ui.draw();assertNoSelection(tree,true);press(button(tree,'Materials'));tree=ui.draw();

  // An external depletion is also reconciled; restoring that ID must not select it.
  press(itemButton(tree,'Logs',30));tree=ui.draw();press(button(tree,'Select maximum quantity'));tree=ui.draw();press(button(tree,'About Logs'));tree=ui.draw();
  m.setStoredCount(world,'pallets',0);tree=ui.draw();assertNoSelection(tree,true);assert(itemButton(tree,'Metal scrap',8));
  m.setStoredCount(world,'pallets',30);tree=ui.draw();assertNoSelection(tree,true);press(itemButton(tree,'Logs',30));tree=ui.draw();assert.equal(selectedQuantity(tree),1);

  // Exact amount and weight-bound Max still use the live inventory rules.
  press(button(tree,'Increase quantity'));tree=ui.draw();assert.equal(selectedQuantity(tree),2);press(transferButton(tree,true));tree=ui.draw();
  assert.equal(world.bag.pallets,2);assert.equal(world.stock.pallets,28);assert.equal(selectedQuantity(tree),1,'A completed partial transfer resets to one');
  press(button(tree,'Select maximum quantity'));tree=ui.draw();assert.equal(selectedQuantity(tree),17);press(transferButton(tree,true));tree=ui.draw();
  assert.equal(world.bag.pallets,19);assert.equal(world.stock.pallets,11);assert(m.packWeight(world)<=24);assert(transferButton(tree,true).props.disabled);assert.equal(text(transferButton(tree,true)),'Backpack full');
  press(button(tree,'Store from backpack'));tree=ui.draw();assertNoSelection(tree,false);press(itemButton(tree,'Logs',19,'pack'));tree=ui.draw();assert.equal(selectedQuantity(tree),1);
  press(button(tree,'Select maximum quantity'));tree=ui.draw();assert.equal(selectedQuantity(tree),19);press(transferButton(tree,false));tree=ui.draw();
  assert.equal(world.stock.pallets,30);assert.equal(world.bag.pallets,0);assertNoSelection(tree,false);
  press(button(tree,'Leave supply chest'));assert(ui.isClosed());

  // Food effects stay behind the information button, and transfer never eats food.
  const food=make(0);m.setStoredCount(food,'cookedMeat',3);m.setStoredCount(food,'rawMeat',2);
  const foodUI=mount(platform,food);tree=foodUI.draw();assertNoSelection(tree,true);press(button(tree,'Food'));tree=foodUI.draw();
  press(itemButton(tree,'Cooked chicken',3));tree=foodUI.draw();assert(!text(tree).includes('+35 food'));assert(!text(tree).includes('+8 health'));
  press(button(tree,'About Cooked chicken'));tree=foodUI.draw();assert(text(tree).includes('+35 food'));assert(text(tree).includes('+8 health'));assert(text(tree).includes('0.45 kg'));assert(text(tree).includes('1.35 kg'));assert(!text(tree).includes('After cooking'));
  press(button(tree,'Close item information'));tree=foodUI.draw();assert(!text(tree).includes('+35 food'));
  const hunger=food.hunger,health=food.player.hp;press(transferButton(tree,true));tree=foodUI.draw();
  assert.equal(food.cooked,1);assert.equal(m.storedCount(food,'cookedMeat'),2);assert.equal(food.hunger,hunger);assert.equal(food.player.hp,health);
  press(itemButton(tree,'Raw chicken',2));tree=foodUI.draw();press(button(tree,'About Raw chicken'));tree=foodUI.draw();assert(text(tree).includes('After cooking'));assert(text(tree).includes('+35 food'));assert(text(tree).includes('+8 health'));
  press(button(tree,'Store from backpack'));tree=foodUI.draw();assertNoSelection(tree,false);assert(!text(tree).includes('After cooking'));
  press(itemButton(tree,'Cooked chicken',1,'pack'));tree=foodUI.draw();assert(text(itemButton(tree,'Cooked chicken',1,'pack')).includes('×1'));press(transferButton(tree,false));tree=foodUI.draw();assert.equal(food.cooked,0);assert.equal(m.storedCount(food,'cookedMeat'),3);assertNoSelection(tree,false);

  // Capture a valid UI action, then move out of range before it is pressed.
  const ranged=make(0);m.setStoredCount(ranged,'pallets',3);const rangeUI=mount(platform,ranged);tree=rangeUI.draw();press(itemButton(tree,'Logs',3));tree=rangeUI.draw();const stale=transferButton(tree,true),beforeRange=inventory(ranged);
  ranged.player.x+=1000;press(stale);tree=rangeUI.draw();assert.equal(inventory(ranged),beforeRange,'A stale UI action cannot transfer out of range');assert(transferButton(tree,true).props.disabled);
  dispose();console.log(`PASS ${platform}: all 12 gear round trips, ×1 badges, optional gear/food details, mode/filter/item resets, external depletion, stale last-unit safety, exact quantities, capacity-bound Max, empty states and stale out-of-range actions.`);
 }

 // Existing model-level boundary checks complement the actual component actions.
 const world=make();m.setStoredCount(world,'pallets',30);
 assert.equal(m.chestTransferLimit(world,'logs','chest'),19);assert.equal(m.moveChestItem(world,'logs','chest','all'),19);assert.equal(world.bag.pallets,19);assert.equal(world.stock.pallets,11);
 assert.equal(m.moveChestItem(world,'logs','chest','all'),0);assert.equal(m.moveChestItem(world,'logs','pack','all'),19);assert.equal(world.stock.pallets,30);
 for(const invalid of [0,-1,.5,NaN,Infinity])assert.equal(m.moveChestItem(world,'logs','chest',invalid),0);
 assert.equal(world.stock.pallets,30);assert.equal(m.moveChestItem(world,'logs','chest',3),3);assert.equal(m.moveChestItem(world,'logs','pack',2),2);assert.equal(world.bag.pallets,1);
 m.setStoredCount(world,'cookedMeat',3);const meal=m.chestItems(world,'chest').find(item=>item.id==='meal');assert.equal(meal.food,35);assert.equal(meal.health,8);assert.equal(m.moveChestItem(world,'meal','chest',1),1);assert.equal(world.cooked,1);assert.equal(m.storedCount(world,'cookedMeat'),2);
 world.player.x+=1000;assert.equal(m.moveChestItem(world,'logs','chest',1),0);
 console.log('PASS model: numeric/all transfers, invalid quantities, food counters and out-of-range protection.');
}finally{
 dispose();delete globalThis.__chestReact;fs.rmSync(tmp,{recursive:true,force:true});
}
