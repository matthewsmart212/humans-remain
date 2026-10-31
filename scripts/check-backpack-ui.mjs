import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'backpack-ui-'));
let state=[],cursor=0;
globalThis.__bagReact={createElement:(type,props,...children)=>({type,props:{...props,children}}),useRef:value=>({current:value}),useEffect:()=>{},useLayoutEffect:()=>{},useId:()=> 'test-selector',useState:value=>{const i=cursor++;if(!(i in state))state[i]=typeof value==='function'?value():value;return[state[i],next=>state[i]=next]}};
globalThis.__bagViewport={width:390,height:700};
const aliases={react:'module.exports=globalThis.__bagReact;', 'react/jsx-runtime':"export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment='fragment';",'react-native':"export const View='view',Text='text',Image='image',Pressable='pressable',ScrollView='scroll';export const AccessibilityInfo={};export const Animated={View:'view',Value:class{constructor(v){this.value=v}}};export const useWindowDimensions=()=>globalThis.__bagViewport;export const StyleSheet={create:x=>x,absoluteFill:{position:'absolute',left:0,right:0,top:0,bottom:0}};"};
const expand=n=>n==null||typeof n==='boolean'?null:Array.isArray(n)?n.flat(9).map(expand).filter(Boolean):typeof n!=='object'?n:typeof n.type==='function'?expand(n.type(n.props)):{...n,props:{...n.props,children:expand(n.props?.children)}};
function all(n){return n==null?[]:Array.isArray(n)?n.flatMap(all):typeof n!=='object'?[]:[n,...all(n.props?.children)]}
function text(n){return n==null?'':Array.isArray(n)?n.map(text).join(''):typeof n==='object'?text(n.props?.children):String(n)}
try{
 await build({stdin:{contents:"export {default as WebBag} from './src/FieldKitBag';export {default as NativeBag} from './native/FieldKitBag';export {default as WebQuick} from './src/QuickBar';export {default as NativeQuick} from './native/QuickBar';export * from './src/backpack';export * from './src/field-kit';export * from './src/survival-engine';export * from './src/food-items';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'ui.cjs'),loader:{'.css':'empty'},plugins:[{name:'platform-stubs',setup(b){b.onResolve({filter:/^(react(?:\/jsx-runtime)?|react-native)$/},a=>({path:a.path,namespace:'test-platform'}));b.onLoad({filter:/.*/,namespace:'test-platform'},a=>({contents:aliases[a.path],loader:'js'}));b.onLoad({filter:/\.(png|webp|ttf)$/},a=>({contents:`module.exports=${JSON.stringify(a.path)}`,loader:'js'}));}}]});
 const m=require(path.join(temp,'ui.cjs')),world=m.createWorld();world.loot=[];world.enemies=[];world.animals=[];world.player.x=1500;world.player.y=1500;world.bag={rawMeat:1,rawRabbit:0,rawVenison:0,pallets:0,scrap:0,fuel:0};world.cooked=0;for(const id of Object.keys(world.gear.bag))world.gear.bag[id]=0;
 const sample=()=>new m.FieldKitController().sample(world),buttons=n=>all(n).filter(n=>n.type==='button'||n.type==='pressable'),findButton=(n,label)=>buttons(n).find(n=>text(n)===label||n.props['aria-label']===label||n.props.accessibilityLabel===label);
 const reports=[];
 for(const platform of ['web','native']){
  state=[];world.bag.rawMeat=1;world.cooked=0;world.player.hp=50;world.hunger=30;world.tick=0;world.kit=undefined;
  const draw=()=>{cursor=0;return expand(m[platform==='web'?'WebBag':'NativeBag']({open:true,stats:sample(),width:390,safe:{top:0,bottom:0,left:0,right:0},onClose:()=>{},onUse:id=>m.useBackpackItem(world,id),onDrop:(id,q)=>m.dropBackpackItem(world,id,q)}))};
  let tree=draw();assert(findButton(tree,'Raw chicken, 1'));assert(!text(tree).includes('Field canteen'));assert(!text(tree).includes('Cooked rabbit'));assert(text(tree).includes('AFTER COOKING'));assert(text(tree).includes('+35'));assert(text(tree).includes('+8'));
  const drop=findButton(tree,'Drop');assert(drop);(drop.props.onClick??drop.props.onPress)();tree=draw();assert(!findButton(tree,'Raw chicken, 1'),'Dropping final raw stack removes its tile');assert(text(tree).includes('Your pack is empty'),'Empty pack remains usable after the last item is dropped');
  world.cooked=1;state[0]='meal';tree=draw();assert(text(tree).includes('READY TO EAT'));const eat=findButton(tree,'Eat');assert(eat&&!eat.props.disabled);(eat.props.onClick??eat.props.onPress)();assert.equal(world.player.hp,58);assert.equal(world.hunger,65);tree=draw();assert(!text(tree).includes('Cooked chicken'),'Eating final meal removes its tile');
  const Quick=m[platform==='web'?'WebQuick':'NativeQuick'];state=[];cursor=0;const quick=expand(Quick({selected:'axe',cooked:0,cookedRabbit:0,cookedVenison:0,disabled:false,onSelect:()=>{}}));assert.equal(buttons(quick).length,2,'Fists and the selector toggle remain in an empty pack');assert(!text(quick).includes('Canteen'));assert(!text(quick).includes('Chicken'));
  state=[];cursor=0;const fedQuick=expand(Quick({selected:'meal',cooked:2,cookedRabbit:0,cookedVenison:0,disabled:false,onSelect:()=>{}}));assert.equal(buttons(fedQuick).length,2);assert(text(fedQuick).includes('Chicken'));
  reports.push(`${platform}: owned items only; final drop/eat selection fallback; exact meal benefits; dynamic quick bar`);
 }
 for(const [id,expectedFood,expectedHealth] of [['rabbitMeal',25,6],['venisonMeal',50,12]]){const s={...sample(),cookedRabbit:1,cookedVenison:1},item=m.backpackItems(s).find(i=>i.id===id);assert.equal(item.food,expectedFood);assert.equal(item.health,expectedHealth)}
 const report={passed:true,checks:reports,browserTested:false,physicalDeviceTested:false};fs.mkdirSync('docs/qa/backpack-v2',{recursive:true});fs.writeFileSync('docs/qa/backpack-v2/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true});delete globalThis.__bagReact;delete globalThis.__bagViewport}
