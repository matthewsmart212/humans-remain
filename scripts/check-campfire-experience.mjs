import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'campfire-experience-'));
let state=[],cursor=0,effects=[],effectCursor=0,pendingEffects=[],dirty=false;
const dispose=()=>{for(const effect of effects)effect?.cleanup?.();state=[];effects=[];pendingEffects=[]};
const useEffect=(run,deps)=>{const index=effectCursor++,previous=effects[index];if(!previous||!deps||!previous.deps||deps.some((value,i)=>!Object.is(value,previous.deps[i])))pendingEffects.push(()=>{previous?.cleanup?.();effects[index]={deps,cleanup:run()}})};
globalThis.__fireReact={createElement:(type,props,...children)=>({type,props:{...props,children}}),useRef:value=>({current:value}),useId:()=> 'fire-info',useCallback:fn=>fn,useMemo:fn=>fn(),useState:initial=>{const index=cursor++;if(!(index in state))state[index]=typeof initial==='function'?initial():initial;return[state[index],next=>{const value=typeof next==='function'?next(state[index]):next;if(!Object.is(value,state[index])){state[index]=value;dirty=true}}]},useEffect,useLayoutEffect:()=>{}};
const previousDocument=globalThis.document;
globalThis.document={activeElement:null,addEventListener:()=>{},removeEventListener:()=>{}};
try{
 const aliases={react:'module.exports=globalThis.__fireReact;', 'react/jsx-runtime':"export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment='fragment';",'react-native':"export const View='view',Text='text',Image='image',Pressable='pressable',ScrollView='scroll';export const useWindowDimensions=()=>({width:844,height:390});export const StyleSheet={create:x=>x,absoluteFill:{position:'absolute',left:0,right:0,top:0,bottom:0}};"};
 await build({stdin:{contents:`export * from './src/survival-engine';export * from './src/studio-play';export * from './src/camp-kitchen';export * from './src/campfire-view';export * from './src/campfire-menu';export * from './src/campfire-layout';export * from './src/expedition-inventory';export * from './src/tree-chopping';export * from './src/imported-art';export * from './src/placed-world-renderer';export {stationFront} from './src/camp-stations';export {default as WebPanel} from './src/CampfirePanel';export {default as NativePanel} from './native/CampfirePanel';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'game.cjs'),loader:{'.css':'empty'},plugins:[{name:'platform-only',setup(b){b.onResolve({filter:/^(react(?:\/jsx-runtime)?|react-native)$/},a=>({path:a.path,namespace:'platform'}));b.onLoad({filter:/.*/,namespace:'platform'},a=>({contents:aliases[a.path],loader:'js'}));b.onLoad({filter:/\.(png|webp)$/},a=>({contents:`module.exports=${JSON.stringify(a.path)}`,loader:'js'}))}}]});
 const m=require(path.join(temp,'game.cjs')),snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));m.installImportedArt(snapshot.records);
 const make=()=>{const w=m.createCampPlaySession(snapshot.layout);w.enemies=[];w.loot=[];w.bag.pallets=0;w.bag.rawMeat=0;w.stock.pallets=0;w.camp.hearth.fuel=0;return w};
 const advance=(w,seconds)=>{w.tick+=Math.round(seconds*60);m.stepKitchen(w)};
 const close=(a,b,label)=>assert(Math.abs(a-b)<1e-6,`${label}: ${a} / ${b}`);
 const atFire=w=>Object.assign(w.player,m.stationFront(w.camp,'hearth'));
 const w=make(),chicken=w.animals.find(a=>a.chicken);Object.assign(w.player,{x:chicken.x,y:chicken.y+35});m.hitAnimal(w,chicken,999);
 const meat=w.loot.find(l=>l.kind==='rawMeat');assert(meat,'Hunting produces actual raw chicken');advance(w,1);Object.assign(w.player,meat);assert(m.pickup(w));assert(w.bag.rawMeat>0);atFire(w);
 assert(!m.feedFire(w),'Cold camp cannot relight without wood');assert(m.queueFood(w,'chicken'));advance(w,30);close(w.fire.queue[0].remaining,12,'Meat on a cold spit stays raw');
 // Find a real authored tree with an accessible approach, then use the same
 // chopping and pickup functions as the axe and contextual COLLECT action.
 let tree;
 for(const p of snapshot.layout.items.filter(p=>m.TREE_ART.has(p.assetId))){for(let i=0;i<16;i++){const a=i*Math.PI/8,q={x:p.x+Math.cos(a)*130,y:p.y+Math.sin(a)*130};if(m.worldBlocked(w,q.x,q.y,18))continue;Object.assign(w.player,q);if(m.chopTree(w,a+Math.PI,170,.65,1,(from,to)=>m.lineClear(from,to,w))){tree=p;break}}if(tree)break}
 assert(tree,'Authored map has accessible chop targets');for(let i=0;i<10&&w.treeChops[tree.id].hp>0;i++)m.chopTree(w,Math.atan2(tree.y-w.player.y,tree.x-w.player.x),170,.65,32,(from,to)=>m.lineClear(from,to,w));
 const logs=w.loot.find(l=>l.sourceTreeId===tree.id);assert(logs&&logs.amount>=2,'Felling a tree drops collectible logs');advance(w,1);Object.assign(w.player,logs);assert(m.pickup(w));atFire(w);
 const owned=w.bag.pallets;assert(m.feedFire(w));assert.equal(w.bag.pallets,owned-1);assert.equal(w.fire.logs.length,1);close(w.camp.hearth.fuel,0,'Fire stays out during the throw');advance(w,.25);close(w.camp.hearth.fuel,0,'No premature ignition');close(w.fire.queue[0].remaining,12,'No cooking before the log lands');advance(w,.3);close(w.camp.hearth.fuel,90,'Log landing lights fire');assert.equal(w.fire.logs.length,0);
 advance(w,6);close(m.campfireView(w).jobs[0].progress,.5,'Roast appearance follows actual cook progress');advance(w,6);assert.deepEqual(w.fire.rack,['chicken']);assert.equal(w.fire.queue.length,0);assert.equal(m.collectFood(w,'chicken'),1);assert.equal(w.cooked,1);assert.equal(w.fire.taken[0].species,'chicken','Collection returns a visible meal to the player');assert.equal(m.collectFood(w,'chicken'),0,'No duplicate collection');
 w.hunger=20;w.player.hp=70;assert(m.eatMeal(w,'chicken'));assert.equal(w.hunger,55);assert.equal(w.player.hp,78);advance(w,90);assert.equal(w.camp.hearth.fuel,0,'Fire eventually dies');
 // Pending throws count toward capacity, and catch-up replays each landing.
 const burst=make();atFire(burst);burst.bag.pallets=10;for(let i=0;i<5;i++)assert(m.feedFire(burst));assert(!m.feedFire(burst));assert.equal(burst.bag.pallets,5);advance(burst,100);close(burst.camp.hearth.fuel,350.55,'Delayed update conserves five logs');
 const partial=make();atFire(partial);partial.fire.rack=['chicken','rabbit','chicken'];assert.equal(m.collectFood(partial,'chicken'),1);assert.deepEqual(partial.fire.rack,['rabbit','chicken']);m.addInventory(partial,'fuel',999);assert.equal(m.collectFood(partial),0);assert.deepEqual(partial.fire.rack,['rabbit','chicken']);
 const expand=node=>node==null||typeof node==='boolean'?null:Array.isArray(node)?node.flat(9).map(expand).filter(value=>value!==null):typeof node!=='object'?node:typeof node.type==='function'?expand(node.type(node.props)):{...node,props:{...node.props,children:expand(node.props?.children)}};
 const nodes=node=>node==null?[]:Array.isArray(node)?node.flatMap(nodes):typeof node!=='object'?[]:[node,...nodes(node.props?.children)];
 const text=node=>node==null?'':Array.isArray(node)?node.map(text).join(''):typeof node==='object'?text(node.props?.children):String(node);
 const label=node=>node.props?.['aria-label']??node.props?.accessibilityLabel??text(node);
 const isButton=node=>node.type==='button'||node.type==='pressable';
 const find=(tree,pattern)=>nodes(tree).find(node=>isButton(node)&&pattern.test(label(node)));
 const rawTile=(tree,name,count)=>find(tree,new RegExp(`^Select raw ${name}[,.] ${count} in backpack$`,'i'));
 const rawTiles=tree=>nodes(tree).filter(node=>isButton(node)&&/^Select raw .+[,.] \d+ in backpack$/i.test(label(node)));
 const action=(tree,name,amount)=>find(tree,new RegExp(`^Add ${amount} raw ${name} to (?:the )?fire(?:\\.|$)`,'i'));
 const invoke=node=>{assert(node,'Expected a control');(node.props.onClick??node.props.onPress)()};
 const press=node=>{assert(node&&!node.props.disabled,'Expected an enabled control');invoke(node)};
 const quantity=tree=>{const node=nodes(tree).find(node=>/^Selected (?:food )?quantity(?: \d+)?$/.test(label(node)));assert(node,'Quantity is accessible');return Number(text(node))};
 const unselected=tree=>{assert(rawTiles(tree).every(node=>!(node.props['aria-pressed']??node.props.accessibilityState?.selected)),'No different raw food becomes selected automatically');if(rawTiles(tree).length){assert(find(tree,/^Select raw food to add to (?:the )?fire$/)?.props.disabled);assert.equal(quantity(tree),0);assert(find(tree,/^Select maximum (?:quantity|food that fits on fire)$/)?.props.disabled)}};
 const mount=(platform,world)=>{
  dispose();const props={world,width:844,height:390,safe:{top:0,bottom:0,left:0,right:0},onChange:()=>{},onClose:()=>{world.stationPanel=undefined}};
  return()=>{let tree,renders=0;do{assert(renders++<10,'Effects settle');dirty=false;cursor=0;effectCursor=0;pendingEffects=[];tree=expand(m[platform+'Panel'](props));for(const run of pendingEffects)run()}while(dirty);return tree};
 };
 for(const platform of ['Web','Native']){
  const world=make();atFire(world);world.stationPanel='fire';world.bag.rawRabbit=0;world.bag.rawVenison=0;m.setItemCount(world,'berries',0);m.setItemCount(world,'cookedVenison',0);m.setStoredCount(world,'rawMeat',20);
  const draw=mount(platform,world);let tree=draw();
  assert.equal(rawTiles(tree).length,0,`${platform}: stored raw food is absent from the backpack inputs`);assert(text(tree).includes('No raw food in your backpack'));assert(!text(tree).includes('Hunter’s meal'),'There is no recipe catalogue in the empty main view');
  world.bag.pallets=2;m.setItemCount(world,'rawMeat',2);m.setItemCount(world,'rawRabbit',3);tree=draw();unselected(tree);
  assert.equal(rawTiles(tree).length,2);assert(rawTile(tree,'chicken',2));assert(rawTile(tree,'rabbit',3));assert(!rawTile(tree,'meat',0));assert(text(rawTile(tree,'chicken',2)).includes('×2'));
  const beforeSelection=JSON.stringify({bag:world.bag,queue:world.fire.queue});press(rawTile(tree,'chicken',2));tree=draw();assert.equal(JSON.stringify({bag:world.bag,queue:world.fire.queue}),beforeSelection,'Selecting raw food does not cook it');assert.equal(quantity(tree),1);assert(!/35 food/.test(text(tree)),'Food benefits stay out of the main view');
  press(find(tree,/^Increase (?:food )?quantity$/));tree=draw();assert.equal(quantity(tree),2);assert(find(tree,/^Increase (?:food )?quantity$/).props.disabled);
  press(find(tree,/^(?:About raw chicken|Raw chicken information)$/i));tree=draw();assert(/35 food/.test(text(tree)));assert(/8 health/.test(text(tree)));assert.equal(quantity(tree),2);
  press(find(tree,/^Close food information$/));tree=draw();assert(!/35 food/.test(text(tree)));assert.equal(quantity(tree),2);
  const staleAdd=action(tree,'chicken',2);press(staleAdd);tree=draw();assert.equal(world.bag.rawMeat,0);assert.equal(world.fire.queue.length,2);assert(!rawTile(tree,'chicken',2));unselected(tree);
  assert(/Waiting for wood|Needs wood/.test(text(tree)),'A cold queue explains that wood is needed');assert.equal(m.storedCount(world,'rawMeat'),20,'Adding food never silently uses camp stock');
  invoke(staleAdd);tree=draw();assert.equal(world.fire.queue.length,2);assert.equal(world.bag.rawRabbit,3,'A repeated last-unit action never adds another food');unselected(tree);
  press(find(tree,/^Add wood\./));tree=draw();assert.equal(world.bag.pallets,1);assert.equal(world.fire.logs.length,1);advance(world,12.55);tree=draw();
  const take=find(tree,/^Take 1 cooked chicken[,.] 1 ready$/i);press(take);tree=draw();assert.equal(world.cooked,1);assert.equal(world.fire.queue.length,1);invoke(take);assert.equal(world.cooked,1,'A stale collect action does not duplicate cooked food');
  press(rawTile(tree,'rabbit',3));tree=draw();press(find(tree,/^Select maximum (?:quantity|food that fits on fire)$/));tree=draw();assert.equal(quantity(tree),3);
  m.setItemCount(world,'rawRabbit',0);tree=draw();assert.equal(rawTiles(tree).length,0);assert(!find(tree,/^Add \d+ raw /),'The add action disappears when no raw food remains');
  m.setItemCount(world,'rawRabbit',3);tree=draw();unselected(tree);press(rawTile(tree,'rabbit',3));tree=draw();assert.equal(quantity(tree),1,'Restoring a depleted food does not restore the old Max');
  m.setItemCount(world,'rawRabbit',5);assert.equal(m.queueCampfireFood(world,'rabbit',99),3);tree=draw();assert.equal(quantity(tree),0);assert(action(tree,'rabbit',0).props.disabled);assert(find(tree,/^Increase (?:food )?quantity$/).props.disabled);assert(find(tree,/^Select maximum (?:quantity|food that fits on fire)$/).props.disabled);
  const returnChicken=find(tree,/^(?:Return raw chicken to backpack\.|Cancel raw chicken,)/i);press(returnChicken);tree=draw();assert.equal(world.bag.rawMeat,1);assert.equal(world.fire.queue.length,3);assert(rawTile(tree,'chicken',1));assert(text(rawTile(tree,'chicken',1)).includes('×1'),'Single raw foods retain their count');
  press(find(tree,/^Select maximum (?:quantity|food that fits on fire)$/));tree=draw();assert.equal(quantity(tree),1);press(action(tree,'rabbit',1));tree=draw();assert.equal(world.bag.rawRabbit,1);assert.equal(world.fire.queue.length,4);
  assert(!find(tree,/^Prepare (?:a )?meal(?: ›)?$/));m.setItemCount(world,'cookedVenison',1);m.setItemCount(world,'berries',2);tree=draw();
  press(find(tree,/^Prepare (?:a )?meal(?: ›)?$/));tree=draw();assert(text(tree).includes('1 cooked meat + 2 berries'),'Prepared meals retain their exact ingredient rule');
  const prepare=find(tree,/^Prepare Hunter’s meal$/)??find(tree,/^Prepare meal$/);press(prepare);tree=draw();assert.equal(m.itemCount(world,'cookedVenison'),0);assert.equal(m.itemCount(world,'berries'),0);assert.equal(m.itemCount(world,'huntersMeal'),1);assert(!find(tree,/^Close food information$/));assert(!find(tree,/^Prepare (?:a )?meal(?: ›)?$/),'The optional preparation action disappears without ingredients');
  press(find(tree,/^Leave campfire$/));assert.equal(world.stationPanel,undefined);dispose();
  console.log(`PASS ${platform}: owned raw food only, quantity badges, select-without-consuming, optional details, exact batch add, cold queue feedback, last-unit and external depletion resets, queue limits, real collection/cancellation and optional prepared meals.`);
 }
 // Camera/menu framing now has broader station, safe-area and paused-bag coverage
 // in check-station-menus.mjs. Cooking and real web/native handlers stay here.
 const states=make();atFire(states);assert.equal(m.campfireView(states).woodLabel,'CHOP A TREE');assert.equal(m.campfireView(states).food[0].actionLabel,'NONE IN PACK');states.bag.pallets=1;states.camp.hearth.fuel=480;assert.equal(m.campfireView(states).woodLabel,'FIRE FULL');states.bag.rawMeat=5;for(let i=0;i<4;i++)assert(m.queueFood(states,'chicken'));assert.equal(m.campfireView(states).food[0].actionLabel,'SPIT FULL');assert.equal(m.campfireView(states).grillHint,'3 waiting · tap to return');
 const report={passed:true,checks:['real chicken harvest → cold spit → authored tree chopped → log pickup → throw → ignition → roasting → ready meal → collection → eating','cold cooking retains progress','rapid refuelling reserves capacity','delayed updates conserve fuel','individual and partial meal collection','actual web and native inventory-first quantity, add, return and collect handlers','owned-food-only and empty-pack views, full-spit and full-fire states','optional item details and prepared meals','selection, last-unit, stale-action and external-depletion safety'],browserTested:false,physicalDeviceTested:false};fs.mkdirSync('docs/qa/campfire-v2',{recursive:true});fs.writeFileSync('docs/qa/campfire-v2/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{dispose();delete globalThis.__fireReact;if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;fs.rmSync(temp,{recursive:true,force:true})}
