// Exercise the exported production web/native handlers, including cancellation.
// Host platform APIs are stubbed; no second implementation of the fishing loop.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'fishing-controls-'));
const nodes=value=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(nodes):[value,...nodes(value.props?.children)];
globalThis.__fishReact={memo:component=>component,createElement:(type,props,...children)=>({type,props:{...props,children}}),useRef:value=>({current:value}),useState:value=>[typeof value==='function'?value():value,()=>{}],useEffect:()=>{},useMemo:fn=>fn(),useCallback:fn=>fn};
globalThis.__fishAppState=new Map();
function mount(Component,initial){
 const slots=[];let cursor=0,pending=[],props=initial;
 const same=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((value,i)=>Object.is(value,b[i]));
 const slot=make=>slots[cursor]??(slots[cursor]=make());
 const hooks={
  useRef(value){const result=slot(()=>({current:value}));cursor++;return result},
  useState(value){const state=slot(()=>({value:typeof value==='function'?value():value}));cursor++;return[state.value,next=>{state.value=typeof next==='function'?next(state.value):next}]},
  useEffect(fn,deps){const state=slot(()=>({}));cursor++;if(!same(state.deps,deps)){state.deps=deps;pending.push(()=>{state.cleanup?.();state.cleanup=fn()})}},
  useMemo(fn,deps){const state=slot(()=>({}));cursor++;if(!same(state.deps,deps)){state.value=fn();state.deps=deps}return state.value},
  useCallback(fn,deps){return hooks.useMemo(()=>fn,deps)},
 };
 return{render(next=props){props=next;cursor=0;pending=[];Object.assign(globalThis.__fishReact,hooks);const tree=Component(props);for(const effect of pending)effect();return tree},unmount(){for(const state of slots)state.cleanup?.()}};
}
const aliases={
 react:'module.exports=globalThis.__fishReact;',
 'react/jsx-runtime':"export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment='fragment';",
 'react-native':"export const View='view',Text='text',Image='image',ImageBackground='image-background',Pressable='pressable',ScrollView='scroll',Platform={OS:'ios',select:o=>o.ios??o.default},BackHandler={addEventListener:()=>({remove(){}})};export const useWindowDimensions=()=>({width:390,height:844});export const Easing={linear:x=>x};export const Animated={View:'view',Image:'image',add:(a,b)=>a+b,Value:class {constructor(v){this.v=v}setValue(v){this.v=v}interpolate(){return '0deg'}}};export const AccessibilityInfo={isReduceMotionEnabled:async()=>true,addEventListener:()=>({remove(){}})};export const AppState={currentState:'active',addEventListener:(event,listener)=>{const map=globalThis.__fishAppState,list=map.get(event)||new Set();map.set(event,list);list.add(listener);return{remove:()=>list.delete(listener)}}};export const StyleSheet={create:x=>x,absoluteFill:{position:'absolute',left:0,right:0,top:0,bottom:0}};",
 'react-native-reanimated':"export default {View:'animated-view',Image:'animated-image'};export const useSharedValue=value=>globalThis.__fishReact.useRef({value}).current,useAnimatedStyle=fn=>fn(),cancelAnimation=()=>{},Easing={linear:x=>x},withTiming=value=>value;",
 'react-native-gesture-handler':"export const GestureDetector='gesture-detector',GestureStateManager={deactivate(){}},useManualGesture=options=>options;",
 'expo-font':'export const useFonts=()=>[true];',
 '@shopify/react-native-skia':"export const Canvas='canvas',Group='group',Path='path',Rect='rect',LinearGradient='linear-gradient',RadialGradient='radial-gradient';",
};
try{
 const file=path.join(temp,'controls.cjs');
 await build({stdin:{contents:"export {KitButton as WebButton} from './src/FieldKitHUD';export {default as NativeButtons} from './native/HexActions';export {default as WebFishing} from './src/FishingHUD';export {default as NativeFishing} from './native/FishingHUD';export {ACTION_HEX} from './src/action-hex';export {FieldKitController} from './src/field-kit';export {createCampPlaySession} from './src/studio-play';export {installImportedArt} from './src/imported-art';export {fishingPiers,fishingPierGeometry,fishingPierDeckContains} from './src/fishing-site-geometry';export * from './src/fishing';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:file,loader:{'.css':'empty'},logLevel:'error',plugins:[{name:'host-stubs',setup(b){b.onResolve({filter:/^(react(?:\/jsx-runtime)?|react-native|react-native-reanimated|react-native-gesture-handler|expo-font|@shopify\/react-native-skia)$/},a=>({path:a.path,namespace:'host'}));b.onLoad({filter:/.*/,namespace:'host'},a=>({contents:aliases[a.path],loader:'js'}));b.onResolve({filter:/\.(png|webp|jpg|jpeg|ttf)$/},a=>({path:path.resolve(a.resolveDir,a.path),namespace:'art'}));b.onLoad({filter:/.*/,namespace:'art'},a=>({contents:`module.exports=${JSON.stringify(a.path)}`,loader:'js'}))}}]});
 const m=require(file);
 const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));m.installImportedArt(snapshot.records);
 const world=m.createCampPlaySession(snapshot.layout);world.enemies=[];world.animals=[];world.loot=[];world.gear.bag.fishingRod=1;world.player.equipped='fishingRod';
 Object.assign(m.fishingProgress(world),{claimed:true,bait:10});
 const controller=new m.FieldKitController(),pier=m.fishingPiers(world.layout)[0];assert(pier,'The authored world contains the lake pier');
 const bounds=m.fishingPierGeometry(pier).deckBounds;let ready;
 for(let y=bounds.y+15;y<bounds.y+bounds.height&&!ready;y+=12)for(let x=bounds.x+15;x<bounds.x+bounds.width&&!ready;x+=12){
  if(!m.fishingPierDeckContains(pier,x,y,19))continue;Object.assign(world.player,{x,y});const sample=controller.sample(world);if(sample.action.fishing&&!sample.action.disabled)ready=sample;
 }
 assert(ready,'A supported pier edge offers the real CAST action');
 assert(controller.press(world,ready.action));assert(controller.holdingFishing);assert(!controller.holdingAttack);assert.equal(world.fishingSession.phase,'aiming');
 assert(!controller.press(world,ready.action),'A held cast cannot restart');controller.release('repair');assert.equal(world.fishingSession.phase,'aiming','An unrelated repair release cannot cast');
 controller.release('primary',true);assert.equal(world.fishingSession,undefined);assert.equal(world.fishing.attempts,0,'Canceled charge is not a cast');
 assert(controller.press(world,controller.sample(world).action));controller.release('primary');assert.equal(world.fishingSession.phase,'casting');assert.equal(world.fishing.attempts,1);
 controller.release('primary');assert.equal(world.fishing.attempts,1,'Repeated release does not produce another cast');
 for(let i=0;i<600&&world.fishingSession?.phase!=='bite';i++){world.tick++;m.stepFishing(world,1/60)}
 assert.equal(world.fishingSession?.phase,'bite');assert.equal(controller.sample(world).action.label,'HOOK');
 assert(controller.press(world,controller.sample(world).action));controller.release('primary');assert.equal(world.fishingSession.phase,'reeling');assert.equal(world.fishingSession.holding,false);
 assert(controller.press(world,controller.sample(world).action));assert.equal(world.fishingSession.holding,true);controller.release('primary',true);assert.equal(world.fishingSession.holding,false,'Canceled reel releases pressure');
 controller.cancel();assert.equal(world.fishingSession,undefined,'Opening a modal stops the active attempt');
 world.fishing.pendingCatch={id:301,species:'perch',name:'Stillwater perch',kg:.71,isRecord:true,image:'/survival/fishing-gameplay-v1/raw-perch.webp'};
 controller.cancel();world.player.equipped='fists';assert.equal(controller.sample(world).fishing.catch.id,301,'Modal cleanup and unequipping preserve an unresolved catch');
 const pointer=id=>({pointerId:id,button:0,preventDefault(){},stopPropagation(){},currentTarget:{setPointerCapture(){}}});
 const key=(value,repeat=false)=>({key:value,repeat,preventDefault(){},stopPropagation(){}});
 const click=detail=>({detail,stopPropagation(){}});
 let presses=0,releases=0,cancels=0;
 const buttonProps={label:'CAST',onDown:()=>presses++,onUp:()=>releases++,onCancel:()=>cancels++};
 const web=mount(m.WebButton,buttonProps);let button=web.render();
 button.props.onPointerDown(pointer(1));button.props.onPointerDown(pointer(2));
 assert.equal(presses,1,'A second contact cannot restart a cast');
 button.props.onPointerCancel(pointer(2));button.props.onLostPointerCapture(pointer(2));button.props.onPointerUp(pointer(2));
 assert.deepEqual([releases,cancels],[0,0],'Only the owning pointer can end its cast');
 button.props.onPointerUp(pointer(1));button.props.onLostPointerCapture(pointer(1));button.props.onClick(click(1));button.props.onClick({...click(0),nativeEvent:{pointerType:'touch'}});
 assert.deepEqual([presses,releases,cancels],[1,1,0],'Normal release casts once; click/capture cleanup cannot duplicate it');
 for(const terminate of ['onPointerCancel','onLostPointerCapture','onBlur']){
  button.props.onPointerDown(pointer(3));button.props[terminate](pointer(3));button.props.onPointerUp(pointer(3));
 }
 assert.deepEqual([presses,releases,cancels],[4,1,3],'Canceled, lost and blurred presses never become a normal cast release');
 button.props.onKeyDown(key(' '));button.props.onKeyDown(key(' ',true));button.props.onPointerDown(pointer(4));button.props.onKeyUp(key('Enter'));
 assert.equal(presses,5,'One held keyboard contact excludes repeat and pointer presses');assert.equal(releases,1);
 button.props.onKeyUp(key(' '));assert.equal(releases,2);
 button.props.onClick(click(0));assert.deepEqual([presses,releases],[6,3],'Assistive activation is one tap cast');
 button.props.onPointerDown(pointer(5));button=web.render({...buttonProps,disabled:true});assert.equal(cancels,4,'Disabling a held button cancels it');
 button.props.onPointerDown(pointer(6));assert.equal(presses,7);
 button=web.render(buttonProps);button.props.onPointerDown(pointer(7));web.unmount();assert.equal(cancels,5,'Unmount cancels rather than releases');

 let nativeDown=0,nativeUp=0,nativeCancel=0;
 const action={label:'REEL',disabled:false,onDown:()=>nativeDown++,onUp:()=>nativeUp++,onCancel:()=>nativeCancel++};
 const nativeProps={primary:action,sprint:{label:'STOP',disabled:false,onDown(){}}};
 const native=mount(m.NativeButtons,nativeProps);let hex=native.render();
 const cell=m.ACTION_HEX.cells.primary;
 const touch=(id,x=cell.left+cell.width/2,y=cell.top+cell.height/2)=>({identifier:id,locationX:x,locationY:y});
 const event=(...contacts)=>({nativeEvent:{changedTouches:contacts,touches:contacts}});
 hex.props.onTouchStart(event(touch(10)));hex.props.onTouchStart(event(touch(11)));assert.equal(nativeDown,1);
 hex.props.onTouchEnd(event(touch(11)));assert.equal(nativeUp,0);
 hex.props.onTouchEnd(event(touch(10)));hex.props.onTouchCancel();assert.deepEqual([nativeUp,nativeCancel],[1,0]);
 hex.props.onTouchStart(event(touch(12)));hex.props.onTouchMove(event(touch(12,-30,-30)));hex.props.onTouchEnd(event(touch(12)));assert.equal(nativeCancel,1,'Dragging off the native hex cancels');
 hex.props.onTouchStart(event(touch(13)));hex.props.onTouchCancel();assert.equal(nativeCancel,2);
 hex.props.onTouchStart(event(touch(14)));for(const listener of globalThis.__fishAppState.get('change'))listener('background');assert.equal(nativeCancel,3,'Backgrounding cancels the native hold');
 hex.props.onTouchStart(event(touch(15)));hex=native.render({...nativeProps,primary:{...action,disabled:true}});assert.equal(nativeCancel,4,'A disabled native action releases its own contact even when STOP remains enabled');
 hex=native.render(nativeProps);hex.props.onTouchStart(event(touch(16)));native.unmount();assert.equal(nativeCancel,5);assert.equal(nativeUp,1,'No canceled native contact can produce a normal release');

 const caught={phase:'caught',action:'CAUGHT',hint:'',bait:5,tension:0,charge:0,holding:false,active:true,disabled:true,canKeep:false,catch:{id:1,species:'perch',name:'Perch',kg:.71,isRecord:true,image:'/survival/fishing-gameplay-v1/raw-perch.webp'},assists:{autoHook:false,toggleReel:false},caught:1,bestKg:.71};
 for(const [Component,kind]of [[m.WebFishing,'web'],[m.NativeFishing,'native']]){
  const choices=[];const component=mount(Component,{hud:caught,onCatch:keep=>choices.push(keep),onAssist(){}}),tree=component.render();
  const buttons=nodes(tree).filter(n=>n.type===(kind==='web'?'button':'pressable'));
  assert.equal(buttons.length,2);assert.equal(buttons[0].props.disabled,true,'Full bag blocks only KEEP');assert.equal(buttons[1].props.disabled,false,'RELEASE remains usable with a full bag');
  buttons[1].props[kind==='web'?'onClick':'onPress']();assert.deepEqual(choices,[false]);
  if(kind==='web'){let stopped=false;tree.props.onKeyDown({key:'Escape',stopPropagation(){stopped=true}});assert.equal(stopped,false,'Escape reaches the game even when the catch panel has focus')}
  component.unmount();
 }
 console.log(JSON.stringify({passed:true,checks:['real authored-pier CAST→HOOK→REEL controller, canceled cast, canceled reel, modal cleanup and persistent catch','web owning pointer, one release and synthetic click suppression','cast cancellation on lost capture, blur, disabling and unmount','held keyboard ownership and repeat suppression','native owning touch and cancellation on move, cancel, background, disabling and unmount','native and web bag-full KEEP/RELEASE availability','Escape reaches the game from focused fishing panel'],physicalDeviceTested:false},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true});delete globalThis.__fishReact;delete globalThis.__fishAppState}
