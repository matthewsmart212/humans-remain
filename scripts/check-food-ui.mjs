import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'food-ui-'));
let state=[],cursor=0;
globalThis.__foodUIReact={
 createElement:(type,props,...children)=>({type,props:{...props,children}}),
 useId:()=> 'food-ui-id',useRef:value=>({current:value}),useEffect:()=>{},
 useState:value=>{const i=cursor++;if(!(i in state))state[i]=typeof value==='function'?value():value;return[state[i],next=>{state[i]=typeof next==='function'?next(state[i]):next}]},
};
const aliases={
 react:'module.exports=globalThis.__foodUIReact;',
 'react/jsx-runtime':"export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment='fragment';",
 'react-native':`export const View='view',Text='text',Image='image',Pressable='pressable',ScrollView='scroll';
  export const AccessibilityInfo={isReduceMotionEnabled:async()=>true,addEventListener:()=>({remove(){}})};
  export const Animated={View:'animated-view',Value:class{constructor(value){this.value=value}},timing:()=>({start(){},stop(){}})};
  export const StyleSheet={create:x=>x,absoluteFill:{position:'absolute',left:0,right:0,top:0,bottom:0}};`,
};
const expand=n=>n==null||typeof n==='boolean'?null:Array.isArray(n)?n.flat(9).map(expand).filter(n=>n!==null):typeof n!=='object'?n:typeof n.type==='function'?expand(n.type(n.props)):{...n,props:{...n.props,children:expand(n.props?.children)}};
const all=n=>n==null?[]:Array.isArray(n)?n.flatMap(all):typeof n!=='object'?[]:[n,...all(n.props?.children)];
const text=n=>n==null?'':Array.isArray(n)?n.map(text).join(''):typeof n==='object'?text(n.props?.children):String(n);
const normalized=n=>text(n).replace(/\s+/g,'');
const children=n=>Array.isArray(n.props?.children)?n.props.children.flat(9):[n.props?.children];
const buttons=n=>all(n).filter(n=>n.type==='button'||n.type==='pressable');
const label=n=>n.props['aria-label']??n.props.accessibilityLabel??'';
const press=n=>{assert(n&&!n.props.disabled,'Expected enabled control');if(n.props.onPress)n.props.onPress();else n.props.onClick({detail:0,nativeEvent:{},stopPropagation(){}})};
function render(Component,props){cursor=0;return expand(Component(props))}

try{
 await build({stdin:{contents:`
  export {InventoryDetail as WebDetail} from './src/InventoryUI';
  export {InventoryDetail as NativeDetail,s as NativeInventoryStyles} from './native/InventoryUI';
  export {default as WebQuick} from './src/QuickBar';
  export {default as NativeQuick} from './native/QuickBar';
  export {default as WebFire} from './src/CampfirePanel';
  export {default as NativeFire} from './native/CampfirePanel';
  export * from './src/backpack';export * from './src/quick-items';
  export * from './src/field-kit';export * from './src/survival-engine';
  export * from './src/food-provisions';export * from './src/expedition-inventory';
  export {stationFront} from './src/camp-stations';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'ui.cjs'),loader:{'.css':'empty'},plugins:[{name:'food-ui-platform-stubs',setup(b){
   b.onResolve({filter:/^(react(?:\/jsx-runtime)?|react-native)$/},a=>({path:a.path,namespace:'food-ui-platform'}));
   b.onLoad({filter:/.*/,namespace:'food-ui-platform'},a=>({contents:aliases[a.path],loader:'js'}));
   b.onLoad({filter:/\.(png|webp|ttf)$/},a=>({contents:`module.exports=${JSON.stringify(a.path)}`,loader:'js'}));
  }}]});
 const m=require(path.join(temp,'ui.cjs'));
 const make=()=>{const w=m.createWorld();w.loot=[];w.animals=[];w.enemies=[];for(const id of Object.keys(w.gear.bag))w.gear.bag[id]=0;Object.assign(w.player,{x:1500,y:1500,hp:40,stamina:20});w.hunger=20;w.thirst=20;return w};
 const sample=w=>new m.FieldKitController().sample(w);
 const expected={berries:['+6food'],apple:['+14food','+6water'],beans:['+32food'],energyBar:['+18food','+30stamina'],huntersMeal:['+65food','+20healthover20s']};
 const reports=[];
 for(const platform of ['web','native']){
  const Detail=m[platform==='web'?'WebDetail':'NativeDetail'],Quick=m[platform==='web'?'WebQuick':'NativeQuick'],Fire=m[platform==='web'?'WebFire':'NativeFire'];
  for(const id of m.PROVISION_IDS){
   state=[];const w=make();m.setItemCount(w,id,2);const item=m.backpackItems(sample(w)).find(i=>i.id===id);assert(item,`${id} appears in backpack data`);
   const tree=render(Detail,{item,wide:true}),benefits=all(tree).find(n=>platform==='web'?n.props.className==='supply-benefits':n.props.style===m.NativeInventoryStyles.benefits);
   assert(benefits,`${platform} ${id} has benefit display`);
   const values=children(benefits).filter(n=>n&&typeof n==='object'&&(n.type==='span'||n.type==='view')).map(normalized);
   assert.deepEqual(values,expected[id],`${platform} ${id} shows only its advertised benefits`);
   assert(!text(tree).includes('undefined'));assert(!values.some(v=>/^\+0(?:\D|$)/.test(v)));
  }
  const recovering=make();recovering.hunger=100;recovering.player.hp=88;recovering.survival={lastStaminaUse:0,healthRecoveryAt:999,exhausted:false,mealRecovery:{remaining:12,rate:1}};m.setItemCount(recovering,'huntersMeal',2);
  const coveredSnapshot=sample(recovering),coveredMeal=m.backpackItems(coveredSnapshot).find(i=>i.id==='huntersMeal');
  assert.equal(coveredSnapshot.mealRecoveryRemaining,12);assert(coveredMeal.useDisabled,'A full hunger bar and 12 pending HP covering 88 HP must disable another meal');
  assert(!m.canConsumeProvision(recovering,'huntersMeal'),'Displayed no-waste state agrees with actual consumption guard');
  recovering.survival.mealRecovery.remaining=10;
  const uncoveredSnapshot=sample(recovering);assert(!m.sameFieldKit(coveredSnapshot,uncoveredSnapshot),'Changed pending recovery refreshes the inventory');
  assert(!m.backpackItems(uncoveredSnapshot).find(i=>i.id==='huntersMeal').useDisabled,'A meal becomes usable when pending recovery no longer covers missing HP');
  assert(m.canConsumeProvision(recovering,'huntersMeal'));
  state=[];const quickWorld=make();for(const [id,count] of Object.entries({berries:2,apple:1,beans:0,energyBar:3,huntersMeal:1}))m.setItemCount(quickWorld,id,count);
  assert(m.selectQuickItem(quickWorld,'apple'));let chosen;
  const quickProps=()=>({...sample(quickWorld),disabled:false,onSelect:id=>{chosen=id;assert(m.selectQuickItem(quickWorld,id))}});
  let tree=render(Quick,quickProps());assert(buttons(tree).some(b=>label(b).startsWith('Apple, 1')),'Selected item and its count are visible while collapsed');
  press(buttons(tree).find(b=>label(b)==='Open item selector'));tree=render(Quick,quickProps());
  for(const [name,count] of [['Berries',2],['Apple',1],['Energy bar',3],['Hunter’s meal',1]])assert(buttons(tree).some(b=>label(b).startsWith(`${name}, ${count}`)),`${platform} selector includes owned ${name}`);
  assert(!buttons(tree).some(b=>label(b).startsWith('Beans')),'Unowned provisions have no placeholder slot');
  press(buttons(tree).find(b=>label(b).startsWith('Energy bar, 3')));assert.equal(chosen,'energyBar');assert.equal(quickWorld.player.equipped,'energyBar');tree=render(Quick,quickProps());
  assert(buttons(tree).some(b=>label(b).startsWith('Energy bar, 3')));assert(!buttons(tree).some(b=>label(b).startsWith('Apple')),'Selecting a provision closes the selector');
  const before=sample(quickWorld);m.setItemCount(quickWorld,'energyBar',2);assert(!m.sameFieldKit(before,sample(quickWorld)),'A changed provision count refreshes the HUD');
  tree=render(Quick,quickProps());assert(buttons(tree).some(b=>label(b).startsWith('Energy bar, 2')));
  m.setItemCount(quickWorld,'energyBar',0);tree=render(Quick,quickProps());assert(buttons(tree).some(b=>label(b).startsWith('Fists')));assert(!buttons(tree).some(b=>label(b).startsWith('Energy bar')),'Last-use fallback does not retain an empty food slot');

  state=[];const fireWorld=make();Object.assign(fireWorld.player,m.stationFront(fireWorld.camp,'hearth'));m.setItemCount(fireWorld,'cookedVenison',2);m.setItemCount(fireWorld,'berries',4);let changed=0;
  const fireProps={world:fireWorld,width:844,height:390,safe:{top:0,right:0,bottom:0,left:0},onClose(){},onChange(){changed++}};
  const prepare=n=>buttons(n).find(b=>label(b).startsWith('Prepare Hunter’s meal.'));
  tree=render(Fire,fireProps);let button=prepare(tree);assert(button&&!button.props.disabled);assert(label(button).includes('1 cooked meat + 2 berries'));assert(label(button).includes('20 health over 20 seconds'));
  press(button);assert.equal(changed,1);assert.equal(m.itemCount(fireWorld,'cookedVenison'),1);assert.equal(m.itemCount(fireWorld,'berries'),2);assert.equal(m.itemCount(fireWorld,'huntersMeal'),1);
  tree=render(Fire,fireProps);button=prepare(tree);assert(normalized(button).includes('×1'),'Craftable count updates after preparing a meal');press(button);assert.equal(m.itemCount(fireWorld,'huntersMeal'),2);
  tree=render(Fire,fireProps);assert(prepare(tree).props.disabled,'Preparation disables after the remaining ingredients are used');assert.equal(m.itemCount(fireWorld,'berries'),0);assert.equal(m.itemCount(fireWorld,'cookedVenison'),0);
  reports.push(`${platform}: five food benefit displays and pending-recovery no-waste state; owned quick slots and exact counts; selection and last-stack fallback; working campfire preparation and state refresh`);
 }
 console.log(JSON.stringify({passed:true,checks:reports,browserTested:false,physicalDeviceTested:false},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true});delete globalThis.__foodUIReact}
