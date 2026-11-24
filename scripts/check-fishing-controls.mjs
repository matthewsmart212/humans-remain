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
const words=value=>value==null||typeof value==='boolean'?'':Array.isArray(value)?value.map(words).join(' '):typeof value==='object'?words(value.props?.children):String(value);
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
 'expo-audio':'export const createAudioPlayer=()=>({volume:1,playing:false,seekTo:async()=>{},play(){},pause(){},remove(){}});',
 'expo-haptics':'export const ImpactFeedbackStyle={Light:1,Medium:2,Heavy:3},NotificationFeedbackType={Success:1};export const selectionAsync=async()=>{},impactAsync=async()=>{},notificationAsync=async()=>{};',
 '@react-native-async-storage/async-storage':'export default {getItem:async()=>null,setItem:async()=>{}};',
 '@shopify/react-native-skia':"export const Canvas='canvas',Group='group',Path='path',Rect='rect',LinearGradient='linear-gradient',RadialGradient='radial-gradient';",
};
const hostGlobals=new Map(['window','document','ResizeObserver'].map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
try{
 const file=path.join(temp,'controls.cjs');
 await build({stdin:{contents:"export {KitButton as WebButton} from './src/FieldKitHUD';export {default as WebMovement} from './src/FieldKitMovement';export {FieldKitMovement as NativeMovement} from './native/FieldKitHUD';export {default as NativeButtons} from './native/HexActions';export {default as WebFishing} from './src/FishingHUD';export {default as NativeFishing} from './native/FishingHUD';export {ACTION_HEX} from './src/action-hex';export {FieldKitController} from './src/field-kit';export {movePlayer} from './src/survival-engine';export {createCampPlaySession} from './src/studio-play';export {installImportedArt} from './src/imported-art';export {fishingPiers,fishingPierGeometry,fishingPierDeckContains} from './src/fishing-site-geometry';export * from './src/fishing';export * from './src/fishing-rewards';export {FISHING_SPECIES} from './src/fishing-catalog';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:file,loader:{'.css':'empty'},logLevel:'error',plugins:[{name:'host-stubs',setup(b){b.onResolve({filter:/^(react(?:\/jsx-runtime)?|react-native|react-native-reanimated|react-native-gesture-handler|expo-font|expo-audio|expo-haptics|@react-native-async-storage\/async-storage|@shopify\/react-native-skia)$/},a=>({path:a.path,namespace:'host'}));b.onLoad({filter:/.*/,namespace:'host'},a=>({contents:aliases[a.path],loader:'js'}));b.onResolve({filter:/\.(png|webp|jpg|jpeg|ttf|wav)$/},a=>({path:path.resolve(a.resolveDir,a.path),namespace:'art'}));b.onLoad({filter:/.*/,namespace:'art'},a=>({contents:`module.exports=${JSON.stringify(a.path)}`,loader:'js'}))}}]});
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
 const edge={x:world.player.x,y:world.player.y},advanceTo=phase=>{for(let i=0;i<600&&world.fishingSession?.phase!==phase;i++){world.tick++;m.stepFishing(world,1/60)}assert.equal(world.fishingSession?.phase,phase)};
 assert(controller.press(world,ready.action));assert(controller.holdingFishing);assert(!controller.holdingAttack);assert.equal(world.fishingSession.phase,'aiming');
 const initialAim={...world.fishingSession.target};
 m.movePlayer(world,{x:.05,y:0},true);assert.equal(world.fishingSession.aimManual,false,'Stick deadzone does not change the safe default cast');
 m.movePlayer(world,{x:1,y:0},true);assert.equal(world.fishingSession.aimManual,true);assert(world.fishingSession.target.x>initialAim.x,'Movement input adjusts the cast target');
 assert.deepEqual({x:world.player.x,y:world.player.y},edge,'WASD/left stick aims without walking off the pier');assert.equal(world.player.sprinting,false);
 assert(!controller.press(world,ready.action),'A held cast cannot restart');controller.release('repair');assert.equal(world.fishingSession.phase,'aiming','An unrelated repair release cannot cast');
 controller.release('primary',true);assert.equal(world.fishingSession,undefined);assert.equal(world.fishing.attempts,0,'Canceled charge is not a cast');assert.equal(world.fishing.bait,10);
 assert(controller.press(world,controller.sample(world).action));controller.release('primary');assert.equal(world.fishingSession.phase,'casting');assert.equal(world.fishing.attempts,1);
 controller.release('primary');assert.equal(world.fishing.attempts,1,'Repeated release does not produce another cast');
 advanceTo('waiting');assert.equal(controller.sample(world).action.label,'RETRIEVE');assert.equal(world.fishing.bait,10,'Casting does not spend bait');
 advanceTo('nibble');const nibbleHud=controller.sample(world).fishing;
 assert.equal(nibbleHud.command,'WAIT');assert.equal(controller.sample(world).action.label,'WAIT');assert.equal(controller.sample(world).action.disabled,true);
 assert.equal(controller.press(world,controller.sample(world).action),false,'Nibble input cannot hook early or retrieve the line');assert.equal(world.fishingSession.phase,'nibble');assert.equal(world.fishing.bait,10,'Nibbling does not spend bait');
 advanceTo('bite');const biteHud=controller.sample(world).fishing;assert.equal(controller.sample(world).action.label,'HOOK');assert.equal(world.fishing.bait,9,'Only the true bite spends one bait');
 assert(controller.press(world,controller.sample(world).action));controller.release('primary');assert.equal(world.fishingSession.phase,'reeling');assert.equal(world.fishingSession.holding,false);
 assert(controller.press(world,controller.sample(world).action));assert.equal(world.fishingSession.holding,true);controller.release('primary',true);assert.equal(world.fishingSession.holding,false,'Canceled reel releases pressure');
 const reelHud=controller.sample(world).fishing;
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

 // Drive the real two-contact inputs into the shared movement/controller path.
 // Canceling a movement finger must not release the action finger and cast.
 const eventTarget=()=>{const listeners=new Map();return{addEventListener(type,fn){const set=listeners.get(type)??new Set();set.add(fn);listeners.set(type,set)},removeEventListener(type,fn){listeners.get(type)?.delete(fn)},dispatch(type){for(const fn of listeners.get(type)??[])fn()}}};
 globalThis.window=eventTarget();globalThis.document={...eventTarget(),hidden:false};globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 delete world.fishing.pendingCatch;world.player.equipped='fishingRod';Object.assign(world.player,edge);
 const liveAction={label:'CAST',disabled:false,onDown:()=>controller.press(world,controller.sample(world).action),onUp:()=>controller.release('primary'),onCancel:()=>controller.release('primary',true)};
 const attempts=world.fishing.attempts,bait=world.fishing.bait;
 const aimInput={current:{x:0,y:0}},liveWeb=mount(m.WebButton,liveAction),castButton=liveWeb.render(),moveWeb=mount(m.WebMovement,{input:aimInput,onStart(){}}),webSurface=moveWeb.render();
 const captures=new Set(),moveTarget={getBoundingClientRect:()=>({left:0,top:0}),setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id)};
 const webMove=(id,x=50,y=70)=>({...pointer(id),clientX:x,clientY:y,currentTarget:moveTarget});
 castButton.props.onPointerDown(pointer(31));webSurface.props.onPointerDown(webMove(32));webSurface.props.onPointerMove(webMove(32,80));
 assert.deepEqual(aimInput.current,{x:1,y:0});m.movePlayer(world,aimInput.current);assert(world.fishingSession.aimOffset.x>0);assert.deepEqual({x:world.player.x,y:world.player.y},edge);
 webSurface.props.onPointerUp(webMove(33));assert.equal(aimInput.current.x,1,'Another finger cannot stop aim movement');
 webSurface.props.onPointerCancel(webMove(32));assert.deepEqual(aimInput.current,{x:0,y:0});assert.equal(world.fishingSession.phase,'aiming');
 castButton.props.onPointerCancel(pointer(31));assert.equal(world.fishingSession,undefined);assert.equal(world.fishing.attempts,attempts);assert.equal(world.fishing.bait,bait);
 for(const interruption of ['onLostPointerCapture','onBlur']){castButton.props.onPointerDown(pointer(34));castButton.props[interruption](pointer(34));castButton.props.onPointerUp(pointer(34));assert.equal(world.fishingSession,undefined)}
 for(const interruption of ['blur','resize','hidden']){webSurface.props.onPointerDown(webMove(35));webSurface.props.onPointerMove(webMove(35,80));if(interruption==='hidden'){document.hidden=true;document.dispatch('visibilitychange');document.hidden=false}else window.dispatch(interruption);assert.deepEqual(aimInput.current,{x:0,y:0},`${interruption} clears web aiming input`)}
 webSurface.props.onPointerDown(webMove(36));webSurface.props.onPointerMove(webMove(36,80));moveWeb.unmount();liveWeb.unmount();assert.deepEqual(aimInput.current,{x:0,y:0});

 const nativeInput={current:{x:0,y:0}},moveNative=mount(m.NativeMovement,{input:nativeInput,width:390,height:844}),nativeSurface=moveNative.render();
 const liveNative=mount(m.NativeButtons,{primary:liveAction,sprint:{label:'STOP',disabled:false,onDown:()=>controller.cancel()}}),castHex=liveNative.render();
 const movementTouch=(id,x=50,y=70)=>({identifier:id,locationX:x,locationY:y,pageX:x,pageY:y});
 const movementEvent=(contact,touches=[contact])=>({nativeEvent:{...contact,changedTouches:[contact],touches}});
 castHex.props.onTouchStart(event(touch(41)));nativeSurface.props.onTouchStart(movementEvent(movementTouch(42)));nativeSurface.props.onTouchMove(movementEvent(movementTouch(42,80)));
 assert.deepEqual(nativeInput.current,{x:1,y:0});m.movePlayer(world,nativeInput.current);assert(world.fishingSession.aimOffset.x>0);assert.deepEqual({x:world.player.x,y:world.player.y},edge);
 nativeSurface.props.onTouchEnd(movementEvent(movementTouch(43),[movementTouch(42,80)]));assert.equal(nativeInput.current.x,1,'Another native finger cannot stop aim movement');
 nativeSurface.props.onTouchCancel(movementEvent(movementTouch(42,80),[]));assert.deepEqual(nativeInput.current,{x:0,y:0});assert.equal(world.fishingSession.phase,'aiming');
 castHex.props.onTouchCancel();assert.equal(world.fishingSession,undefined);assert.equal(world.fishing.attempts,attempts);assert.equal(world.fishing.bait,bait);
 castHex.props.onTouchStart(event(touch(44)));nativeSurface.props.onTouchStart(movementEvent(movementTouch(45)));nativeSurface.props.onTouchMove(movementEvent(movementTouch(45,80)));
 for(const listener of globalThis.__fishAppState.get('change'))listener('background');
 assert.equal(world.fishingSession,undefined,'Background cancels the real native cast');assert.deepEqual(nativeInput.current,{x:0,y:0});
 nativeSurface.props.onTouchStart(movementEvent(movementTouch(46)));nativeSurface.props.onTouchMove(movementEvent(movementTouch(46,80)));for(const listener of globalThis.__fishAppState.get('blur'))listener();assert.deepEqual(nativeInput.current,{x:0,y:0},'Native focus loss clears aim');
 moveNative.unmount();liveNative.unmount();assert.equal(world.fishing.attempts,attempts);assert.equal(world.fishing.bait,bait,'Input interruptions never charge an attempt or bait');

 // A deliberate early retrieve remains distinct from an interrupted cast.
 assert(controller.press(world,controller.sample(world).action));controller.release('primary');advanceTo('waiting');assert.equal(controller.sample(world).action.label,'RETRIEVE');
 assert(controller.press(world,controller.sample(world).action));controller.release('primary');assert.equal(world.fishingSession,undefined);assert.equal(world.fishing.bait,bait,'Retrieving before the bite keeps the bait');

 const caught={phase:'caught',action:'CAUGHT',hint:'',command:'YOUR CATCH',detail:'',tone:'good',bait:5,tension:0,charge:0,progress:1,castValid:true,castHint:'',nibbleAmount:0,holding:false,active:true,disabled:true,canKeep:false,assists:{autoHook:false,toggleReel:false},caught:1,bestKg:.71};
 for(const [Component,kind]of [[m.WebFishing,'web'],[m.NativeFishing,'native']]){
  for(const species of ['perch','carp','pike','drone']){
   const catchState={id:1,species,name:m.FISHING_SPECIES[species].name,kg:species==='perch'?.71:3.1,portions:species==='perch'||species==='drone'?1:3,isRecord:species!=='drone',image:m.FISHING_SPECIES[species].image};
   const hud={...caught,catch:catchState,rewardLabel:m.fishingCatchRewardLabel(catchState),rewardWeight:m.fishingCatchRewardWeight(catchState)},choices=[];
   const component=mount(Component,{hud,onCatch:keep=>choices.push(keep)}),tree=component.render(),buttons=nodes(tree).filter(n=>n.type===(kind==='web'?'button':'pressable'));
   assert.equal(buttons.length,2);assert.equal(buttons[0].props.disabled,true,'Full bag blocks only keeping/salvaging');assert.equal(buttons[1].props.disabled,false,'Release/return remains usable with a full bag');
   assert.match(words(tree),new RegExp(hud.rewardLabel.replace(/[+]/g,'\\+')),'The catch panel names the actual complete reward');assert(words(tree).includes(hud.rewardWeight.toFixed(2)),'The catch panel displays the added pack weight');
   assert.equal(words(buttons[0]).trim(),species==='drone'?'SALVAGE':'KEEP');assert.equal(words(buttons[1]).trim(),species==='drone'?'RETURN':'RELEASE');
   buttons[1].props[kind==='web'?'onClick':'onPress']();assert.deepEqual(choices,[false]);
   if(kind==='web'){let stopped=false;tree.props.onKeyDown({key:'Escape',stopPropagation(){stopped=true}});assert.equal(stopped,false,'Escape reaches the game even when the catch panel has focus')}
   component.unmount();
  }
  for(const hud of [nibbleHud,biteHud,reelHud]){
   const component=mount(Component,{hud,onCatch(){}}),tree=component.render();assert(words(tree).includes(hud.command));assert(words(tree).includes(hud.detail),'The prompt explains the current action without relying on sound');
   assert.equal(nodes(tree).filter(n=>n.type===(kind==='web'?'button':'pressable')).length,0,'Active fishing does not add competing panel controls');
   if(hud.phase==='bite')assert(nodes(tree).some(n=>n.props?.[kind==='web'?'aria-live':'accessibilityLiveRegion']==='assertive'),'A real bite has an urgent accessible cue');
   if(hud.phase==='reeling')for(const label of ['Line tension','Catch brought to shore'])assert(nodes(tree).some(n=>n.props?.[kind==='web'?'aria-label':'accessibilityLabel']===label),'Fight and landing progress each have a named meter');
   component.unmount();
  }
 }
 console.log(JSON.stringify({passed:true,checks:['real authored-pier CAST→WAIT/nibble→HOOK→REEL with bait spent only at the true bite','WASD/left-stick aim with deadzone and a stationary survivor','web owning pointer, one release and synthetic click suppression','cast cancellation on lost capture, blur, disabling and unmount','held keyboard ownership and repeat suppression','native owning touch and cancellation on move, cancel, background, disabling and unmount','real web/native two-contact aiming and input interruptions without accidental casts','early retrieve keeps bait, modal cleanup and unresolved catch persistence','all fish and salvage rewards, pack weight and bag-full KEEP/RELEASE availability on both platforms','accessible nibble/bite/fight prompts and Escape propagation'],physicalDeviceTested:false},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true});delete globalThis.__fishReact;delete globalThis.__fishAppState;for(const[name,descriptor]of hostGlobals){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name]}}
