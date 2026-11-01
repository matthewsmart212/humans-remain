import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {renderFieldKitProof} from './render-field-kit-proof.mjs';
const require=createRequire(import.meta.url),sharp=require('sharp'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'field-kit-'));
const effects=[];
globalThis.__kitReact={memo:component=>component,createElement:(type,props,...children)=>({type,props:{...props,children}}),useRef:value=>({current:value}),useState:value=>[typeof value==='function'?value():value,()=>{}],useEffect:fn=>effects.push(fn),useMemo:fn=>fn(),useCallback:fn=>fn};
globalThis.__kitAppStateListeners=new Map();
const nodes=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
const flat=style=>typeof style==='function'?flat(style({pressed:false})):Array.isArray(style)?Object.assign({},...style.map(flat)):style||{};
const close=(actual,expected,message)=>assert(Math.abs(actual-expected)<1e-8,`${message}: ${actual} != ${expected}`);
// Retain real component hook state across explicit renders, and run effects
// after assigning host refs. This tests handlers/lifecycles, not a second stick.
function mount(Component,initialProps,assignRefs=()=>{}){
 const slots=[];let cursor=0,pending=[],props=initialProps,tree;
 const same=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const slot=make=>{const i=cursor++;return slots[i]??(slots[i]=make())};
 const hooks={
  useRef:value=>slot(()=>({current:value})),
  useState:value=>{const s=slot(()=>({value:typeof value==='function'?value():value}));return[s.value,next=>{s.value=typeof next==='function'?next(s.value):next}]},
  useMemo:(fn,deps)=>{const s=slot(()=>({}));if(!same(s.deps,deps)){s.value=fn();s.deps=deps}return s.value},
  useCallback:(fn,deps)=>hooks.useMemo(()=>fn,deps),
  useEffect:(fn,deps)=>{const s=slot(()=>({}));if(!same(s.deps,deps)){s.deps=deps;pending.push(()=>{s.cleanup?.();s.cleanup=fn()})}},
 };
 return{
  render(next=props){props=next;cursor=0;pending=[];const previous={...globalThis.__kitReact};Object.assign(globalThis.__kitReact,hooks);try{tree=Component(props)}finally{Object.assign(globalThis.__kitReact,previous)}assignRefs(tree);for(const effect of pending)effect();return tree},
  unmount(){for(const s of slots)s.cleanup?.()},
 };
}
try{
 const aliases={'@shopify/react-native-skia':"export const Canvas='canvas',Group='group',Path='path',Rect='rect',LinearGradient='linear-gradient',RadialGradient='radial-gradient';",react:'module.exports=globalThis.__kitReact;',
  'react/jsx-runtime':"export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment='fragment';",
  'react-native':"export const View='view',Text='text',Image='image',ImageBackground='image-background',Platform={OS:'ios',select:o=>o.ios??o.default},BackHandler={addEventListener:()=>({remove(){}})},Pressable='pressable',ScrollView='scroll';export const useWindowDimensions=()=>({width:390,height:760});export const Easing={linear:x=>x};export const Animated={View:'view',add:(a,b)=>(a?.v??a??0)+(b?.v??b??0),Image:'image',Value:class {constructor(v){this.v=v}setValue(v){this.v=v}interpolate(){return '0deg'}}};export const AccessibilityInfo={isReduceMotionEnabled:async()=>true,addEventListener:()=>({remove(){}})};export const AppState={currentState:'active',addEventListener:(event,listener)=>{const all=globalThis.__kitAppStateListeners,list=all.get(event)||new Set();all.set(event,list);list.add(listener);return{remove:()=>list.delete(listener)}}};export const StyleSheet={create:x=>x,absoluteFill:{position:'absolute',left:0,right:0,top:0,bottom:0}};",
  'react-native-reanimated':"export default {View:'animated-view',Image:'animated-image'};export const useSharedValue=value=>globalThis.__kitReact.useRef({value}).current,useAnimatedStyle=fn=>fn(),cancelAnimation=()=>{},Easing={linear:x=>x},withTiming=value=>value;",
  'react-native-gesture-handler':"export const GestureDetector='gesture-detector',GestureStateManager={deactivate(){}},useManualGesture=options=>options;",
  'expo-font':'export const useFonts=()=>[true];'};
 await build({stdin:{contents:"export * from './src/field-kit';export * from './src/studio-play';export * from './src/world-layout';export * from './src/layout-views';export * from './src/imported-art';export * from './src/chest-animation';export {stationFront} from './src/camp-stations';export {createWorld,STEP,hitAnimal,damagePlayer} from './src/survival-engine';export {NativePinchSurface} from './native/NativePinchSurface';export {FieldKitMovement as NativeMovement,FieldKitVitals as NativeVitals,KitButton as NativeButton,default as NativeHUD} from './native/FieldKitHUD';export {FieldKitVitals as WebVitals,KitButton as WebButton} from './src/FieldKitHUD';export {EditorJoystick} from './src/WorldEditorControls';export {default as PlayMovement} from './src/FieldKitMovement';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs'),loader:{'.css':'empty'},plugins:[{name:'platform-only-stubs',setup(b){b.onResolve({filter:/^(react(?:\/jsx-runtime)?|react-native|react-native-reanimated|react-native-gesture-handler|expo-font|@shopify\/react-native-skia)$/},a=>({path:a.path,namespace:'test-platform'}));b.onLoad({filter:/.*/,namespace:'test-platform'},a=>({contents:aliases[a.path],loader:'js'}));b.onLoad({filter:/\.(png|webp|jpg|jpeg|ttf)$/},a=>({contents:`module.exports=${JSON.stringify(a.path)}`,loader:'js'}));}}]});
 const m=require(path.join(temp,'test.cjs')),saved=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
 m.installImportedArt(saved.records);
 // These controller scenarios explicitly exercise a carried axe. New-game
 // empty inventory is covered separately by check-wooden-axe.
 const make=()=>{const w=m.createCampPlaySession(saved.layout);w.gear.bag.axe=1;w.gear.chest.axe=0;w.player.equipped='axe';return w},w=make(),controller=new m.FieldKitController();
 w.loot=[];w.enemies=[];w.player.x=-5000;w.player.y=-5000;
 let s=controller.sample(w);assert.equal(s.action.label,'CUT');assert.equal(s.combat,false);
 const cut=s.action;assert(controller.press(w,cut));assert(controller.holdingAttack);assert(!controller.press(w,cut),'One action per finger down');
 controller.release('repair');assert(controller.holdingAttack,'Releasing a rejected repair contact cannot release the primary attack');
 assert(!controller.pressRepair(w,cut),'A primary action cannot be submitted through the repair channel');
 const chest=m.layoutViews(w.layout).chests[0];assert(chest,'Current world has a usable chest');
 const approach=m.placementPoint(chest,chest.x,chest.y+22*chest.scale);[w.player.x,w.player.y]=approach;
 assert.equal(controller.sample(w).action.label,'CUT','Held action never turns into Open');assert(!m.chestIsOpen(w,chest.id));controller.release();
 s=controller.sample(w);assert.equal(s.action.label,'STORAGE');const open=s.action;assert(controller.press(w,open));assert(m.chestIsOpen(w,chest.id));assert.equal(controller.sample(w).action.label,'STORAGE','Pressed label stays stable');controller.release();
 s=controller.sample(w);assert.equal(w.stationPanel,'storage');w.stationPanel=undefined;assert(!controller.press(w,open),'Stale chest state is rejected');
 const clone=make();[clone.player.x,clone.player.y]=approach;assert(!controller.press(clone,open),'An old scene/session callback never modifies its old world');
 controller.sample(w);w.enemies.push({id:987,x:w.player.x+120,y:w.player.y,hp:100,maxHp:100,attackAt:0,path:[],repathAt:0,flashUntil:0});
 s=controller.sample(w);assert.equal(s.action.label,'ATTACK');assert(s.combat);assert(s.healthCombat,'Enemy combat reveals the compact health meter');assert(!controller.press(w,open),'Fighting takes priority over nearby chests');assert(m.chestIsOpen(w,chest.id));assert.equal(w.stationPanel,undefined);
 w.enemies=[];w.tick+=60;assert(controller.sample(w).combat,'Dodge remains briefly available after a threat leaves');w.tick+=121;assert(!controller.sample(w).combat,'Combat controls hide after the grace period');
 controller.reset();w.chestMotions={};w.player.x=-5000;w.player.y=-5000;const before=controller.sample(w);assert(m.sameFieldKit(before,controller.sample(w)),'Unchanged data avoids a React update');w.player.hp=73;w.player.stamina=41;const after=controller.sample(w);assert.equal(after.health,73);assert.equal(after.stamina,41);assert(!m.sameFieldKit(before,after));
 // Actual hunting hits reveal vitals without forcing the fighting action state.
 const hunt=make(),hunting=new m.FieldKitController();hunt.enemies=[];hunt.loot=[];hunt.player.x=-5000;hunt.player.y=-5000;
 const passive=hunting.sample(hunt);assert(!passive.healthCombat);assert(hunting.press(hunt,passive.action));hunting.release();assert(!hunting.sample(hunt).healthCombat,'A harmless empty swing does not leave a combat health meter');
 const bird=hunt.animals.find(a=>a.chicken);m.hitAnimal(hunt,bird,16);
 const engaged=hunting.sample(hunt);assert(engaged.healthCombat);assert(!engaged.combat,'Hunting feedback does not create fighting controls for passive prey');assert.equal(engaged.action.label,'CUT');assert(!m.sameFieldKit(passive,engaged),'Changing only combat health visibility must refresh the HUD');
 hunt.tick+=60;m.hitAnimal(hunt,bird,16);hunting.sample(hunt);hunt.animals=[];
 hunt.loot=[{id:502,x:hunt.player.x,y:hunt.player.y,kind:'rawMeat',amount:1}];
 assert.equal(hunting.sample(hunt).action.label,'COLLECT','Hunting health meter cannot hide contextual loot collection');
 hunt.tick+=180;assert(hunting.sample(hunt).healthCombat,'Health stays visible briefly even after the corpse leaves the world');
 hunt.tick+=40;assert(!hunting.sample(hunt).healthCombat,'Combat health collapses after its grace period');
 m.damagePlayer(hunt,12);assert(hunting.sample(hunt).healthCombat,'Receiving a hit also reveals live health');
 assert(!hunting.sample(make()).healthCombat,'A new run cannot inherit the previous run combat health deadline');
 w.player.downedUntil=999;assert(controller.sample(w).action.disabled);assert(!controller.press(w,controller.sample(w).action));w.player.downedUntil=0;
 // Each camp action is executed against the same actual simulation as gameplay.
 for(const id of ['well','hearth']){Object.assign(w.player,m.stationFront(w.camp,id));w.loot=[];controller.reset();const action=controller.sample(w).action;assert.equal(action.label,id==='well'?'DRINK':'FIRE');if(!action.disabled)assert(controller.press(w,action));controller.release()}
 w.stationPanel=undefined;w.loot=[{id:501,x:w.player.x,y:w.player.y,kind:'pallets',appearance:'logs',amount:1}];controller.reset();const collect=controller.sample(w).action;assert.equal(collect.label,'COLLECT');assert(controller.press(w,collect));controller.release();assert(!w.loot.find(l=>l.id===501));
 // Real pointer handlers: secondary touch can act while the stick retains its finger.
 const input={current:{x:0,y:0}},stick=m.EditorJoystick({input,onStart:()=>{}}),captures=[];
 const pointer=(id,x=78,y=48)=>({pointerId:id,button:0,clientX:x,clientY:y,preventDefault(){},stopPropagation(){},currentTarget:{setPointerCapture:id=>captures.push(id),getBoundingClientRect:()=>({left:0,top:0,width:96,height:96})}});
 stick.props.onPointerDown(pointer(1));assert(input.current.x>.9);let toggles=0,releases=0;
 const button=m.WebButton({icon:'sprint',label:'SPRINT',onDown:()=>toggles++,onUp:()=>releases++});button.props.onPointerDown(pointer(2));assert.equal(toggles,1);assert(input.current.x>.9);button.props.onPointerUp(pointer(2));assert.equal(releases,1);button.props.onClick({detail:1,stopPropagation(){}});assert.equal(toggles,1,'Synthetic click cannot double-toggle');button.props.onClick({detail:0,stopPropagation(){}});assert.equal(toggles,2,'Keyboard/assistive activation works');stick.props.onPointerCancel();assert.deepEqual(input.current,{x:0,y:0});
 // Gameplay movement shows dots while held. Each touch chooses its own origin;
 // CSS admission and HUD overlap are checked in browser QA, not this host stub.
 const originals=new Map(['window','document','ResizeObserver'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const win=Object.assign(new EventTarget(),{visualViewport:new EventTarget()}),doc=Object.assign(new EventTarget(),{hidden:false}),observers=new Set();
 Object.assign(globalThis,{window:win,document:doc,ResizeObserver:class{constructor(callback){this.callback=callback;observers.add(this)}observe(){}disconnect(){observers.delete(this)}}});
 const screen={width:390,height:844},offset={x:17,y:23};
 const regionRect={left:offset.x,top:offset.y,width:screen.width*.4,height:screen.height},heldPointers=new Set();
 const host={getBoundingClientRect:()=>({...regionRect}),setPointerCapture:id=>heldPointers.add(id),hasPointerCapture:id=>heldPointers.has(id),releasePointerCapture:id=>heldPointers.delete(id)};
 const playInput={current:{x:0,y:0}};let starts=0,web,webPinching=false;
 const play=mount(m.PlayMovement,{input:playInput,onStart:()=>starts++,isPinching:()=>webPinching},tree=>{tree.props.ref.current=host});
 const webEvent=(id,x=90,y=400)=>({...pointer(id,x+offset.x,y+offset.y),currentTarget:host});
 const stopped=()=>assert.deepEqual(playInput.current,{x:0,y:0});
 const webActive=active=>{web=play.render();assert.equal(web.props['data-active'],active);assert.equal(nodes(web).some(n=>n.type==='svg'),active,'Trail appears only during the owning movement touch')};
 const startWebDrag=(id=21)=>{web.props.onPointerDown(webEvent(id));stopped();web.props.onPointerMove(webEvent(id,108,376));assert.deepEqual(playInput.current,{x:.6,y:-.8})};
 try{
  web=play.render();webActive(false);
  web.props.onPointerDown({...webEvent(10),button:2});stopped();assert.equal(starts,0,'A secondary mouse button cannot start movement');
  for(const [x,y]of [[25,140],[140,430],[80,760]]){
   web.props.onPointerDown(webEvent(11,x,y));stopped();webActive(true);
   web.props.onPointerMove(webEvent(11,x+3,y+3));stopped();
   web.props.onPointerMove(webEvent(11,x+12,y));assert.deepEqual(playInput.current,{x:.4,y:0},'A short drag gives proportional movement from this touch origin');
   web.props.onPointerMove(webEvent(11,x+18,y-24));assert.deepEqual(playInput.current,{x:.6,y:-.8},'The same drag moves the same way at every screen height');
   web.props.onPointerMove(webEvent(11,x-60,y+80));assert.deepEqual(playInput.current,{x:-.6,y:.8},'A long drag stays at full movement strength');webActive(true);
   web.props.onPointerMove(webEvent(11,x,y));stopped();
   web.props.onPointerMove(webEvent(11,x,y-15));assert.deepEqual(playInput.current,{x:0,y:-.5},'Dragging upward moves forward relative to the new touch origin');
   web.props.onPointerUp(webEvent(11));stopped();webActive(false);assert.equal(heldPointers.size,0);
  }
  assert.equal(starts,3,'Each new touch chooses one fresh movement origin');
  startWebDrag();const direction={...playInput.current};webActive(true);
  web.props.onPointerDown(webEvent(22,30,760));assert.equal(starts,4,'A second finger cannot replace the active movement touch');
  for(const name of ['onPointerMove','onPointerUp','onPointerCancel','onLostPointerCapture']){web.props[name](webEvent(22,30,760));assert.deepEqual(playInput.current,direction,`Unrelated ${name} does not interrupt movement`)}
  let attackHeld=false;const attack=m.WebButton({icon:'attack',label:'ATTACK',onDown:()=>{attackHeld=true},onUp:()=>{attackHeld=false}});
  attack.props.onPointerDown(pointer(41));assert(attackHeld);assert.deepEqual(playInput.current,direction);attack.props.onPointerUp(pointer(41));assert(!attackHeld);assert.deepEqual(playInput.current,direction,'Releasing an action keeps movement active');
  web.props.onPointerMove(webEvent(21,220,450));assert(playInput.current.x>0&&playInput.current.y>0,'A captured movement finger can cross the 40% boundary');close(Math.hypot(playInput.current.x,playInput.current.y),1,'Cross-boundary movement stays normalized');
  for(const name of ['onPointerCancel','onLostPointerCapture','onPointerUp']){
   web.props[name](webEvent(21));stopped();assert.equal(heldPointers.size,0);webActive(false);
   web.props.onPointerMove(webEvent(21));web.props.onPointerMove(webEvent(22,60,300));stopped();startWebDrag();
  }
  webPinching=true;web.props.onPointerMove(webEvent(21,180,400));stopped();webActive(false);
  web.props.onPointerUp(webEvent(21));web.props.onPointerDown(webEvent(22));web.props.onPointerMove(webEvent(22,160,400));stopped();
  webPinching=false;startWebDrag();
  const interrupt=(target,name)=>{assert.notDeepEqual(playInput.current,{x:0,y:0});target.dispatchEvent(new Event(name));stopped();webActive(false);assert.equal(heldPointers.size,0);startWebDrag()};
  interrupt(win,'resize');interrupt(win,'blur');interrupt(win.visualViewport,'resize');interrupt(win.visualViewport,'scroll');
  doc.hidden=true;interrupt(doc,'visibilitychange');doc.hidden=false;
  regionRect.height-=10;for(const observer of observers)observer.callback();stopped();webActive(false);
  startWebDrag(31);play.unmount();stopped();assert.equal(heldPointers.size,0);assert.equal(observers.size,0,'Unmount removes the region observer');
  playInput.current={x:.25,y:.5};win.dispatchEvent(new Event('resize'));assert.deepEqual(playInput.current,{x:.25,y:.5},'Unmount removes global gesture listeners');
 }finally{play.unmount();for(const [key,descriptor]of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}}

 // Native shares touch-origin semantics and follows the owning touch ID even
 // when the right-hand action finger appears first in native event arrays.
 let nativePinching=false;
 const nativeInput={current:{x:0,y:0}},nativeProps={input:nativeInput,...screen,isPinching:()=>nativePinching},nativeMount=mount(m.NativeMovement,nativeProps);
 const touch=(identifier,x,y)=>({identifier,pageX:x+offset.x,pageY:y+offset.y,locationX:x,locationY:y});
 const event=(touches,changedTouches=touches)=>({nativeEvent:{...changedTouches[0],touches,changedTouches}});
 let native=nativeMount.render();
 const nativeStopped=()=>assert.deepEqual(nativeInput.current,{x:0,y:0});
 const nativeInvisible=(expected=true)=>{native=nativeMount.render();assert.equal(nodes(native).some(n=>n.props?.trail?.value!==undefined&&n.props.trail.value!==null),expected,'Native dots follow the owning touch');assert(!nodes(native).some(n=>n.type==='image'),'Movement feedback uses dots rather than joystick artwork')};
 // A native registration wraps only the allowed movement surface; the same
 // raw touch handlers remain on its non-collapsable host View.
 const registration={enabled:{value:true},gesture:{},registerSurface(){},unregisterSurface(){}};
 const registeredMount=mount(m.NativeMovement,{...nativeProps,nativePinch:registration});
 const registered=registeredMount.render();assert.equal(registered.type,m.NativePinchSurface);assert.equal(registered.props.registration,registration);
 const registeredSurface=registered.props.children;assert.equal(registeredSurface.props.collapsable,false);assert.equal(typeof registeredSurface.props.onTouchMove,'function');
 assert.equal(m.NativePinchSurface({children:registeredSurface}),registeredSurface,'Compatibility callers retain the original native View');registeredMount.unmount();
 const left=touch('left',90,400),right=touch('right',330,730),moved=touch('left',108,376);
 const startNativeDrag=()=>{native.props.onTouchStart(event([left]));nativeStopped();native.props.onTouchMove(event([moved]));assert.deepEqual(nativeInput.current,{x:.6,y:-.8})};
 try{
  assert.equal(flat(native.props.style).width,screen.width*.4);assert.equal(flat(native.props.style).height,screen.height,'Native movement area spans full screen height');nativeInvisible(false);
  for(const [x,y]of [[25,140],[140,430],[80,760]]){
   const t=touch('left',x,y);native.props.onTouchStart(event([t]));nativeStopped();nativeInvisible();
   native.props.onTouchMove(event([touch('left',x+3,y+3)]));nativeStopped();
   native.props.onTouchMove(event([touch('left',x+12,y)]));assert.deepEqual(nativeInput.current,{x:.4,y:0},'Native short drags give proportional movement');
   native.props.onTouchMove(event([touch('left',x+18,y-24)]));assert.deepEqual(nativeInput.current,{x:.6,y:-.8},'Native direction comes from the current touch origin at every screen height');
   native.props.onTouchMove(event([touch('left',x-60,y+80)]));assert.deepEqual(nativeInput.current,{x:-.6,y:.8},'Native long drags stay at full movement strength');nativeInvisible();
   native.props.onTouchMove(event([t]));nativeStopped();
   native.props.onTouchMove(event([touch('left',x,y-15)]));assert.deepEqual(nativeInput.current,{x:0,y:-.5});
   native.props.onTouchEnd(event([],[t]));nativeStopped();native=nativeMount.render();assert.equal(nodes(native).filter(n=>n.props?.trail).length,25,'Native trail retains its bounded dot views');assert(nodes(native).filter(n=>n.props?.trail).every(n=>n.props.trail.value===null),'Retained native trail is invisible on release');
  }
  for(const [x,y]of [[screen.width*.4,300],[-1,300],[50,-1],[50,screen.height+1]]){
   const beyond=touch('outside',x,y);native.props.onTouchStart(event([beyond]));native.props.onTouchMove(event([touch('outside',x+30,y+30)]));nativeStopped();
  }
  startNativeDrag();const direction={...nativeInput.current};
  native.props.onTouchStart(event([right,moved],[right]));native.props.onTouchMove(event([right,moved],[right]));assert.deepEqual(nativeInput.current,direction,'Another finger cannot change the movement origin');
  const run=m.NativeButton({icon:'sprint',ariaLabel:'Toggle sprint',onDown:()=>toggles++});run.props.onPressIn();assert.equal(toggles,3);assert.deepEqual(nativeInput.current,direction);
  let attacking=false;const action=m.NativeButton({kind:'primary',ariaLabel:'Attack',onDown:()=>{attacking=true},onUp:()=>{attacking=false}});action.props.onPressIn();assert(attacking);assert.deepEqual(nativeInput.current,direction);action.props.onPressOut();assert(!attacking);assert.deepEqual(nativeInput.current,direction,'Native action release does not release movement');
  native.props.onTouchEnd(event([moved],[right]));native.props.onTouchCancel(event([moved],[right]));assert.deepEqual(nativeInput.current,direction,'Ending or cancelling the action finger retains movement');
  const dragged=touch('left',220,450);native.props.onTouchMove(event([right,dragged],[dragged]));assert(nativeInput.current.x>0&&nativeInput.current.y>0,'Native movement continues outside the left 40%');close(Math.hypot(nativeInput.current.x,nativeInput.current.y),1,'Native cross-boundary movement stays normalized');nativeInvisible();
  native.props.onTouchEnd(event([right],[dragged]));nativeStopped();native.props.onTouchMove(event([right]));nativeStopped();
  startNativeDrag();nativePinching=true;native.props.onTouchMove(event([moved,right]));nativeStopped();
  native.props.onTouchEnd(event([right],[moved]));native.props.onTouchStart(event([right]));native.props.onTouchMove(event([touch('right',360,730)]));nativeStopped();
  native.props.onTouchEnd(event([],[right]));nativePinching=false;
  startNativeDrag();native.props.onTouchCancel(event([],[moved]));nativeStopped();
  startNativeDrag();native.props.onTouchMove(event([right]));nativeStopped();
  for(const [name,value]of [['change','background'],['blur',undefined]]){
   startNativeDrag();for(const listener of globalThis.__kitAppStateListeners.get(name)||[])listener(value);nativeStopped();
  }
  startNativeDrag();native=nativeMount.render({...nativeProps,height:screen.height-40});nativeStopped();
  native=nativeMount.render(nativeProps);startNativeDrag();native=nativeMount.render({...nativeProps,width:screen.width+40});nativeStopped();
  native=nativeMount.render(nativeProps);startNativeDrag();nativeMount.unmount();nativeStopped();
  assert([...globalThis.__kitAppStateListeners.values()].every(list=>list.size===0),'Native unmount removes lifecycle subscriptions');
 }finally{nativeMount.unmount()}
 if(process.argv.includes('--movement-only')){console.log('PASS: web/native movement, 40% admission, live dots, owning finger, pinch interruption and lifecycle cleanup.')}else{
 const primaryStyle=flat(m.NativeButton({kind:'primary',ariaLabel:'Action',onDown:()=>{}}).props.style),sprintStyle=flat(m.NativeButton({icon:'sprint',ariaLabel:'Sprint',onDown:()=>{}}).props.style);
 assert.equal(primaryStyle.width,46);assert.equal(primaryStyle.height,46);assert.equal(primaryStyle.width,sprintStyle.width);assert.equal(primaryStyle.height,sprintStyle.height,'Action and Walk/Sprint have equal native dimensions');
 // Exercise both platform toggles with state retained across renders.
 const originalState=globalThis.__kitReact.useState;
 for(const platform of ['web','native']){
  let expanded=false,changes=0;
  globalThis.__kitReact.useState=initial=>[expanded,value=>{expanded=typeof value==='function'?value(expanded):value;changes++}];
  const draw=(stats=after)=>platform==='web'?[m.WebVitals({stats}).props.children].flat().find(n=>n?.type==='button'):m.NativeVitals({stats,width:278,combatWidth:678});
  let vitals=draw();assert.equal(vitals.props[platform==='web'?'aria-expanded':'accessibilityState']?.expanded??vitals.props['aria-expanded'],false);
  const nodes=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
  assert.equal(nodes(vitals).filter(n=>String(n.props?.src||n.props?.source||'').endsWith('/vitals.png')).length,platform==='web'?6:2,'Compact status preserves the original portrait and painted panel artwork');
  const skins=nodes(vitals).filter(n=>String(n.props?.src||n.props?.source||'').endsWith('/vitals.png'));
  assert.equal(skins[0].props.style.height,skins[1].props.style.height,'Badge halves have identical vertical image scale');
  assert.equal(skins[0].props.style.top,skins[1].props.style.top,'Badge halves have identical vertical image offset');
  const clips=nodes(vitals).filter(n=>n.props?.style?.overflow==='hidden');
  const portrait=clips.find(n=>n.props.style.left===0);
  assert.equal(portrait.props.style.width,40,'Compact portrait is 40px wide');
  assert.equal(portrait.props.style.height,40,'Compact portrait is 40px high');
  assert.equal(m.fieldKitBadge.size.height,40,'Compact status matches the visible 40px artwork');
  if(platform==='native')assert(m.fieldKitBadge.size.height+vitals.props.hitSlop*2>=44,'The slim card retains a 44px touch target');
  if(platform==='native'){
   assert.equal(nodes(vitals).filter(n=>n.props?.style?.flexDirection==='row'&&n.props.style.height===24&&!n.props.style.width).length,1,'All four vitals share one row');
   assert.equal(nodes(vitals).filter(n=>[n.props?.style].flat().some(style=>style?.width===44&&style.height===24)).length,4,'Four inline icon-and-percentage cells');
  }
  assert.equal(clips[0].props.style.top,portrait.props.style.top,'Badge clips share one baseline');
  assert.equal(clips[0].props.style.height,portrait.props.style.height,'Badge clips share one height');
  if(platform==='native')assert(Math.abs(-skins[0].props.style.left/skins[0].props.style.width-clips[1].props.style.width/skins[1].props.style.width)<1e-12,'Badge halves meet at exactly the same source-artwork coordinate');
  const flat=style=>Array.isArray(style)?Object.assign({},...style.map(flat)):style||{};
  const fighting=draw({...after,healthCombat:true}),meter=nodes(fighting).find(n=>n.props?.['aria-label']==='Combat health'||n.props?.accessibilityLabel==='Combat health');
  assert(meter,'Collapsed combat card exposes a live health progressbar on both platforms');
  assert.equal(meter.props['aria-valuenow']??meter.props.accessibilityValue?.now,73);
  assert.equal(flat([meter.props.children].flat()[0].props.style).width,'73%','Compact meter fill tracks actual live health');
  const lower=draw({...after,healthCombat:true,health:27}),lowerMeter=nodes(lower).find(n=>n.props?.['aria-label']==='Combat health'||n.props?.accessibilityLabel==='Combat health');
  assert.equal(lowerMeter.props['aria-valuenow']??lowerMeter.props.accessibilityValue?.now,27);
  assert.equal(flat([lowerMeter.props.children].flat()[0].props.style).width,'27%');
  assert.equal(flat(platform==='web'?fighting.props.children.props.style:fighting.props.style).height,40,'Combat adds width without increasing the compact card height');
  if(platform==='native')assert.equal(fighting.props.style.width,678,'Native combat card uses the safe width up to the pause button');
  const combatPortrait=nodes(fighting).find(n=>n.props?.style?.overflow==='hidden'&&n.props.style.left===0);
  assert.equal(combatPortrait.props.style.width,40);assert.equal(combatPortrait.props.style.height,40,'Combat retains the square avatar');
  if(platform==='web'){
   vitals.props.onPointerDown(pointer(4));assert(expanded);vitals.props.onClick({detail:1,stopPropagation(){}});assert.equal(changes,1,'Pointer click does not toggle twice');
   vitals=draw();assert.equal(vitals.props['aria-expanded'],true);assert.equal(JSON.stringify(vitals),JSON.stringify(draw({...after,healthCombat:true})),'Opening the larger card is unchanged during combat');let stopped=false;vitals.props.onKeyDown({key:' ',stopPropagation(){stopped=true}});assert(stopped,'Status keyboard activation cannot reach game action');
   vitals.props.onClick({detail:0,currentTarget:{disabled:false},stopPropagation(){}});
  }else{vitals.props.onPress();assert(expanded);vitals=draw();assert.equal(vitals.props.accessibilityState.expanded,true);assert.equal(JSON.stringify(vitals),JSON.stringify(draw({...after,healthCombat:true})),'Opening the larger card is unchanged during combat');vitals.props.onPress()}
  assert.equal(expanded,false,'Second activation collapses status');assert.equal(changes,2);
 }
 globalThis.__kitReact.useState=originalState;
 // Check actual target geometry at narrow phone, notched phone, landscape and tablet sizes.
 const layouts=[];for(const [width,height,safe]of [[320,568,{top:20,right:0,bottom:0,left:0}],[390,844,{top:47,right:0,bottom:34,left:0}],[667,375,{top:0,right:0,bottom:0,left:0}],[740,360,{top:0,right:44,bottom:21,left:44}],[844,390,{top:0,right:47,bottom:21,left:47}],[1024,768,{top:24,right:0,bottom:20,left:0}]]){
  const l=m.fieldKitLayout(width,height,safe),root={x:width-l.right-150,y:height-l.controlsBottom-150};assert.equal(l.primary,46);assert.equal(l.primary,l.secondary);
  const circles=[{name:'action',x:root.x+118,y:root.y+118,r:l.primary/2},{name:'sprint',x:root.x+118,y:root.y+37,r:l.secondary/2},{name:'dodge',x:root.x+55,y:root.y+57,r:l.secondary/2}];
  for(const c of circles){assert(c.x>=width/2,'All actions stay in the right half');assert(c.x+c.r<=width-safe.right);assert(c.y+c.r<=height-safe.bottom);assert(c.y-c.r>=safe.top);assert(c.r*2>=44)}
  for(let i=0;i<circles.length;i++)for(let j=i+1;j<circles.length;j++){const a=circles[i],b=circles[j];assert(Math.hypot(a.x-b.x,a.y-b.y)-a.r-b.r>=10,'No overlapping adjacent touch targets')}
  assert(l.left+l.vitals+12<=width-l.right-44,'Vitals leave space for menu buttons');layouts.push({width,height,...l});
  assert.equal(l.left+l.combatVitals+12,width-l.right-44,'Combat vitals end twelve pixels before the pause button');
  assert(l.left+m.fieldKitBadge.size.width+12<=width-l.right-44,'Compact badge also leaves space for menu buttons');
  const bar={left:(width-l.quickbar)/2,top:height-l.bottom-l.quickbarHeight,right:(width+l.quickbar)/2,bottom:height-l.bottom};
  assert(bar.left>=safe.left+8&&bar.right<=width-safe.right-8,'Quick bar fits between safe edges');
  for(const c of circles){const dx=Math.max(bar.left-c.x,0,c.x-bar.right),dy=Math.max(bar.top-c.y,0,c.y-bar.bottom);assert(Math.hypot(dx,dy)>=c.r+8,'Quick bar leaves a gap around controls')}
 }
 const reportArt=JSON.parse(fs.readFileSync('docs/qa/field-kit-v1/artwork.json'));for(const f of reportArt.files){const {data,info}=await sharp(`public/survival/ui-field-kit-v1/${f.name}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(data[3],0,'Transparent corners');if(f.name==='ring')assert.equal(data[(Math.floor(info.height/2)*info.width+Math.floor(info.width/2))*4+3],0,'Ring centre stays transparent')}
 assert(reportArt.decodedBytes<2*1024*1024,'Whole UI texture set stays below2MiB');
 const base=await sharp('public/survival/ui-field-kit-v1/joystick-base.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const alphaAt=(x,y)=>base.data[(y*base.info.width+x)*4+3];assert(alphaAt(192,192)<64,'Joystick centre stays mostly transparent over the world');assert(alphaAt(192,12)>220,'Joystick bronze outer rim stays opaque and legible');
 const proofs=process.argv.includes('--no-proof')?[]:await renderFieldKitProof(m,make);
 const report={passed:true,layouts,decodedUIBytes:reportArt.decodedBytes,softwareLayoutProofs:proofs,proofMethod:'Production native component tree and styles painted by a small Canvas2D layout adapter over the production Skia world; not a native or browser screenshot.',checks:['compact default status and reversible expansion on both platforms','combat-only compact health meter and live red fill','hunting keeps contextual collection and survives corpse removal','combat health deadline expires and resets for a new run','expanded card unchanged during combat','same compact height and avatar; safe gap before Pause','status keyboard event isolation','live health/stamina','contextual cut/open/close/cook/drink/collect/attack','captured action and exact target validation','old scene callback rejected','combat priority and grace period','downed state','pointer capture and cancellation','no synthetic double activation','keyboard and assistive activation','independent native touch identifiers','initial touch stays still and chooses a fresh origin at every screen height','relative drag direction, proportional speed, dead zone and bounded strength','invisible movement surfaces without joystick, thumb or trail','owner-only end/cancel/lost-capture; no second-finger promotion','viewport/visibility/background/unmount gesture cleanup','matching 46px action and sprint dimensions','right-hand arc, safe areas, 44px minimum and gaps','transparent generated art and small texture budget'],inputProof:'Actual exported component handlers, retained hooks and mocked host geometry. Web CSS hit-testing, HUD overlap and browser pointer dispatch require browser QA.',physicalDeviceTested:false};
 if(!proofs.length)report.proofMethod='Not rendered (--no-proof); component and input assertions only.';
 if(!process.argv.includes('--no-report'))fs.writeFileSync('docs/qa/field-kit-v1/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
}finally{fs.rmSync(temp,{recursive:true,force:true});delete globalThis.__kitReact;delete globalThis.__kitAppStateListeners}
