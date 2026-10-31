import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'quick-selector-'));
let hooks=[],cursor=0,pending=[],dirty=false;
const reset=()=>{for(const h of hooks)h?.cleanup?.();hooks=[];cursor=0;pending=[]};
globalThis.__selectorReact={
 createElement:(type,props,...children)=>({type,props:{...props,children}}),
 useState(initial){const i=cursor++;hooks[i]??={value:typeof initial==='function'?initial():initial};const h=hooks[i];return[h.value,next=>{const value=typeof next==='function'?next(h.value):next;if(value!==h.value){h.value=value;dirty=true}}]},
 useRef(initial){const i=cursor++;hooks[i]??={current:initial};return hooks[i]},
 useId(){const i=cursor++;return `selector-${i}`},
 useEffect(effect,deps){const i=cursor++,old=hooks[i];if(!old||deps.some((value,index)=>value!==old.deps[index])){old?.cleanup?.();const h={deps};hooks[i]=h;pending.push(()=>h.cleanup=effect())}},
};
globalThis.document={addEventListener(){},removeEventListener(){}};
const aliases={
 react:'module.exports=globalThis.__selectorReact;',
 'react/jsx-runtime':"export const jsx=(type,props)=>({type,props});export const jsxs=jsx;",
 'react-native':"export const View='view',Text='text',Image='image',Pressable='pressable',ScrollView='scroll';export const StyleSheet={create:x=>x};export const AccessibilityInfo={isReduceMotionEnabled:()=>Promise.resolve(false),addEventListener:()=>({remove(){}})};export const Animated={View:'animated-view',Value:class{constructor(value){this.value=value}},timing:(value,options)=>({start(){value.value=options.toValue},stop(){}})};",
};
const nodes=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
const text=n=>n==null||typeof n==='boolean'?'':Array.isArray(n)?n.map(text).join(''):typeof n==='object'?text(n.props?.children):String(n);
try{
 await build({stdin:{contents:"export * from './src/quick-items';export * from './src/survival-engine';export * from './src/field-kit';export {default as WebQuickBar} from './src/QuickBar';export {default as NativeQuickBar} from './native/QuickBar';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs'),plugins:[{name:'test-platforms',setup(b){b.onResolve({filter:/^(react(?:\/jsx-runtime)?|react-native)$/},a=>({path:a.path,namespace:'platform'}));b.onLoad({filter:/.*/,namespace:'platform'},a=>({contents:aliases[a.path],loader:'js'}));b.onLoad({filter:/\.(png|webp|ttf)$/},a=>({contents:`module.exports=${JSON.stringify(a.path)}`,loader:'js'}));}}]});
 const m=require(path.join(temp,'test.cjs'));
 for(const platform of ['web','native']){
  reset();const world=m.createWorld();world.enemies=[];world.animals=[];world.loot=[];world.player.x=1500;world.player.y=1500;world.gear={bag:{axe:1,woodenAxe:0},chest:{axe:0,woodenAxe:0}};world.player.equipped='axe';world.cooked=3;world.cookedRabbit=2;world.cookedVenison=0;world.hunger=40;world.player.hp=70;
  let disabled=false,maxWidth=400,selections=0;const expandedEvents=[];
  const Component=m[platform==='web'?'WebQuickBar':'NativeQuickBar'];
  const draw=()=>{let tree;for(let pass=0;pass<6;pass++){dirty=false;cursor=0;tree=Component({selected:m.selectedQuickItem(world),cooked:world.cooked,cookedRabbit:world.cookedRabbit,cookedVenison:world.cookedVenison,axes:world.gear.bag,disabled,maxWidth,onExpandedChange:open=>expandedEvents.push(open),onSelect:id=>{assert(m.selectQuickItem(world,id));selections++}});const effects=pending;pending=[];effects.forEach(effect=>effect());if(!dirty)return tree}throw Error('Unstable selector state')};
  const buttons=tree=>nodes(tree).filter(n=>n.type===(platform==='web'?'button':'pressable'));
  const slots=tree=>buttons(tree).slice(0,-1),toggle=tree=>buttons(tree).at(-1);
  const press=(button,keyboard=false)=>{
   if(platform==='native')return button.props.onPress();
   if(keyboard)return button.props.onClick({detail:0,nativeEvent:{},stopPropagation(){}});
   const e={button:0,pointerId:7,clientX:10,clientY:10,currentTarget:{setPointerCapture(){}},stopPropagation(){},preventDefault(){}};
   button.props.onPointerDown(e);button.props.onPointerUp(e);button.props.onClick({detail:1,nativeEvent:{pointerType:'touch'},stopPropagation(){}});
  };
  let tree=draw();assert.equal(slots(tree).length,1);assert.equal(text(slots(tree)[0]),'Axe');assert.equal(m.QUICK_BAR_LAYOUT.height,72*1.2,'Quick selector matches the 20% larger main control');assert.equal(m.QUICK_BAR_LAYOUT.closedIconSize,34*1.2);assert.equal(m.quickBarWidth(1),120);assert.deepEqual(expandedEvents,[false],'HUD starts with captions available');
  press(toggle(tree));tree=draw();assert.deepEqual(slots(tree).map(n=>text(n)),['Fists','Axe','Chicken3','Rabbit2']);assert.deepEqual(expandedEvents,[false,true],'Opening informs the HUD once');draw();assert.deepEqual(expandedEvents,[false,true],'A fresh callback identity cannot cause repeated expansion notifications');
  if(platform==='web'){
   const food=slots(tree)[2],e={button:0,pointerId:8,clientX:10,clientY:10,currentTarget:{setPointerCapture(){}},stopPropagation(){},preventDefault(){}};
   food.props.onPointerDown(e);food.props.onPointerMove({...e,clientX:40});food.props.onPointerUp({...e,clientX:40});assert.equal(selections,0,'Swiping cannot equip food');
  }
  press(slots(tree)[2]);tree=draw();assert.equal(selections,1,'One physical tap must select exactly once');assert.equal(world.cooked,3,'Selecting food must not consume it');assert.equal(m.selectedQuickItem(world),'meal');assert.equal(slots(tree).length,1);assert.equal(text(slots(tree)[0]),'Chicken3');assert.equal(expandedEvents.at(-1),false,'Selecting an item restores the HUD captions');
  const controller=new m.FieldKitController();for(let i=0;i<3;i++){assert(controller.press(world,controller.sample(world).action));controller.release();world.tick+=480;tree=draw()}
  assert.equal(world.cooked,0);assert.equal(text(slots(tree)[0]),'Fists','Last meal returns the compact selector to fists');
  press(slots(tree)[0],true);tree=draw();assert.equal(slots(tree).length,3);assert(!slots(tree).some(n=>text(n).startsWith('Chicken')));
  press(slots(tree)[1],true);tree=draw();assert.equal(m.selectedQuickItem(world),'axe');assert.equal(slots(tree).length,1);
  press(toggle(tree));tree=draw();disabled=true;tree=draw();assert.equal(slots(tree).length,1);assert(buttons(tree).every(n=>n.props.disabled));assert.equal(expandedEvents.at(-1),false,'Disabling an open selector restores the captions');const before=selections;press(toggle(tree));press(slots(tree)[0]);assert.equal(selections,before);disabled=false;tree=draw();assert.equal(slots(tree).length,1,'Resuming starts closed');
  world.gear.bag.woodenAxe=1;world.cooked=2;world.cookedVenison=5;maxWidth=160;press(toggle(tree));tree=draw();assert.equal(slots(tree).length,6);if(platform==='native')assert.equal(tree.props.style.at(-1).width.value,160,'Narrow native row stays inside available width');
  Object.assign(world.gear.bag,{woodenSpear:1,metalSpear:1,woodenKnife:0,scrapKnife:0});tree=draw();
  assert(slots(tree).some(n=>text(n)==='Wood spear'));assert(slots(tree).some(n=>text(n)==='Metal spear'));assert(!slots(tree).some(n=>/knife/i.test(text(n))),'Stored knives stay out of the selector');
  press(slots(tree).find(n=>text(n)==='Metal spear'));tree=draw();assert.equal(m.selectedQuickItem(world),'metalSpear');assert.equal(text(slots(tree)[0]),'Metal spear');assert.equal(slots(tree).length,1);
  world.gear.bag.metalSpear=0;tree=draw();assert.equal(text(slots(tree)[0]),'Fists','Stashing the active spear returns to fists');
  Object.assign(world.gear.bag,{woodenSword:1,metalSword:1});press(toggle(tree));tree=draw();
  assert(slots(tree).some(n=>text(n)==='Wood sword'));assert(slots(tree).some(n=>text(n)==='Metal sword'));
  press(slots(tree).find(n=>text(n)==='Metal sword'));tree=draw();assert.equal(m.selectedQuickItem(world),'metalSword');assert.equal(text(slots(tree)[0]),'Metal sword');
  world.gear.bag.metalSword=0;tree=draw();assert.equal(text(slots(tree)[0]),'Fists','Stashing the active sword returns to fists');
  press(toggle(tree));tree=draw();assert.equal(expandedEvents.at(-1),true);reset();assert.equal(expandedEvents.at(-1),false,'Unmounting an open selector restores the captions');
  console.log(`${platform}: compact active item, four owned slots, tap/keyboard selection, no duplicate activation, food depletion, disabled state, six-item overflow, spear/sword selection and stored-knife filtering passed`);
 }
}finally{reset();fs.rmSync(temp,{recursive:true,force:true});delete globalThis.__selectorReact;delete globalThis.document}
