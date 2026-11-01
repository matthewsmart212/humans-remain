import {useCallback,useEffect,useRef} from 'react';
import type {GestureResponderEvent} from 'react-native';
import {GestureStateManager,useManualGesture,type GestureTouchEvent,type ManualGesture} from 'react-native-gesture-handler';
import {cancelAnimation,Easing,useAnimatedReaction,useSharedValue,withTiming,type SharedValue} from 'react-native-reanimated';
import {scheduleOnRN,scheduleOnUI} from 'react-native-worklets';
import type {ZoomStore} from './play-zoom';
import {advanceNativePinch,nativePinchState,registerNativePinchSurface,unregisterNativePinchSurface,updateNativePinchTouches} from './native-pinch-model';

export type NativePinchRegistration={enabled:SharedValue<boolean>;gesture:ManualGesture;registerSurface:(id:string,x:number,y:number)=>void;unregisterSurface:(id:string)=>void};
type Options={enabled:()=>boolean;getZoom:()=>number;setZoom:(zoom:number)=>void;minimumZoom?:()=>number;onPinchStart?:()=>void;onGestureEnd?:(interrupted:boolean)=>void};
/** Native touch stream owns presentation. Only one RN camera report may be in
 * flight; lifecycle/end reports retain exact authority and invalidate stale
 * callbacks after pause, restart or a replacement animation. */
export function useNativePlayZoom(options:Options,store:ZoomStore){
 const mounted=useRef(true),optionsRef=useRef(options);optionsRef.current=options;
 const amount=useSharedValue(store.get()),minimum=useSharedValue(.7),enabled=useSharedValue(false),model=useSharedValue(nativePinchState()),uiPinching=useSharedValue(false),driven=useSharedValue(false),handler=useSharedValue(0);
 const bridge=useSharedValue({token:0,serial:0,pending:false,sent:NaN}),token=useRef(0),accepted=useRef(0),closed=useRef(-1),blocked=useRef(false);
 const report=useCallback((value:number,t:number,serial:number)=>{
  if(mounted.current&&t===token.current&&serial>=accepted.current&&serial>closed.current){accepted.current=serial;optionsRef.current.setZoom(value)}
  bridge.modify(b=>{'worklet';if(b.token===t&&b.serial===serial)b.pending=false;return b});
 },[bridge]);
 const begin=useCallback((t:number,serial:number)=>{if(!mounted.current||t!==token.current||serial<accepted.current)return;accepted.current=serial;blocked.current=true;optionsRef.current.onPinchStart?.()},[]);
 const finish=useCallback((value:number,t:number,serial:number,interrupted:boolean,gesture:boolean)=>{
  if(!mounted.current||t!==token.current||serial<accepted.current)return;accepted.current=serial;closed.current=serial;blocked.current=false;optionsRef.current.setZoom(value);if(gesture&&optionsRef.current.enabled())optionsRef.current.onGestureEnd?.(interrupted);
 },[]);
 useAnimatedReaction(()=>({value:amount.value,driven:driven.value,...bridge.value}),v=>{
  if(!v.driven||v.pending||v.value===v.sent)return;
  bridge.value={token:v.token,serial:v.serial,pending:true,sent:v.value};scheduleOnRN(report,v.value,v.token,v.serial);
 },[report]);
 const apply=useCallback(()=>{
  'worklet';
  const result=advanceNativePinch(model.value,amount.value,minimum.value);
  if(result.started){cancelAnimation(amount);const b=bridge.value;bridge.value={token:b.token,serial:b.serial+1,pending:false,sent:NaN};uiPinching.value=true;driven.value=true;if(handler.value)GestureStateManager.activate(handler.value);scheduleOnRN(begin,bridge.value.token,bridge.value.serial)}
  if(model.value.blocked)amount.value=result.zoom;
  if(result.ended){uiPinching.value=false;driven.value=false;scheduleOnRN(finish,amount.value,bridge.value.token,bridge.value.serial,false,true);if(handler.value&&!model.value.contacts.length)GestureStateManager.deactivate(handler.value)}
 },[amount,minimum,model,bridge,uiPinching,driven,handler,begin,finish]);
 const touch=useCallback((e:GestureTouchEvent,kind:'down'|'move'|'up')=>{
  'worklet';handler.value=e.handlerTag;if(!enabled.value)return;
  model.modify(s=>{updateNativePinchTouches(s,kind,e.allTouches,e.changedTouches);return s},false);apply();
  if(kind==='up'&&!model.value.contacts.length)GestureStateManager.deactivate(e.handlerTag);
 },[handler,enabled,model,apply]);
 const gesture=useManualGesture({enabled,cancelsTouchesInView:false,cancelsJSResponder:false,shouldCancelWhenOutside:false,
  onTouchesDown:e=>{'worklet';touch(e,'down')},onTouchesMove:e=>{'worklet';touch(e,'move')},onTouchesUp:e=>{'worklet';touch(e,'up')},
  onTouchesCancel:e=>{'worklet';const was=model.value.blocked;model.value=nativePinchState();uiPinching.value=false;driven.value=false;if(was)scheduleOnRN(finish,amount.value,bridge.value.token,bridge.value.serial,true,true);GestureStateManager.deactivate(e.handlerTag)},
 });
 const config=useRef({enabled:false,minimum:.7});
 const syncConfig=useCallback(()=>{const next=optionsRef.current.enabled(),min=optionsRef.current.minimumZoom?.()??.7;if(next!==config.current.enabled){config.current.enabled=next;enabled.value=next}if(min!==config.current.minimum){config.current.minimum=min;minimum.value=min}},[enabled,minimum]);
 useEffect(()=>store.bindPresentation(amount),[store,amount]);
 useEffect(syncConfig);
 // Native surface observers authorize touches without a JS round trip. A late
 // RN touchstart must never grant a future action-button finger at the same spot.
 const start=useCallback((_e:GestureResponderEvent)=>{},[]);
 const registerSurface=useCallback((id:string,x:number,y:number)=>{'worklet';if(!enabled.value)return;model.modify(s=>{registerNativePinchSurface(s,id,x,y);return s},false);apply()},[enabled,model,apply]);
 const unregisterSurface=useCallback((id:string)=>{'worklet';model.modify(s=>{unregisterNativePinchSurface(s,id);return s},false);apply()},[model,apply]);
 const cancel=useCallback(()=>{
  const had=blocked.current,t=++token.current;blocked.current=false;accepted.current=0;closed.current=-1;
  scheduleOnUI((next:number)=>{'worklet';cancelAnimation(amount);driven.value=false;uiPinching.value=false;model.value=nativePinchState();bridge.value={token:next,serial:0,pending:false,sent:NaN};if(handler.value)GestureStateManager.deactivate(handler.value)},t);
  if(had&&optionsRef.current.enabled())optionsRef.current.onGestureEnd?.(true);
 },[amount,driven,uiPinching,model,bridge,handler]);
 const animateTo=useCallback((target:number,duration=260)=>{
  syncConfig();const t=++token.current;blocked.current=false;accepted.current=0;closed.current=-1;
  scheduleOnUI((next:number,to:number,ms:number)=>{'worklet';cancelAnimation(amount);model.value=nativePinchState();uiPinching.value=false;if(handler.value)GestureStateManager.deactivate(handler.value);bridge.value={token:next,serial:1,pending:false,sent:NaN};driven.value=true;amount.value=withTiming(Math.max(minimum.value,Math.min(1,to)),{duration:ms,easing:Easing.out(Easing.cubic)},done=>{if(done){driven.value=false;scheduleOnRN(finish,amount.value,next,1,false,false)}})},t,target,duration);
 },[amount,bridge,driven,minimum,finish,model,uiPinching,handler,syncConfig]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;blocked.current=false;const next=++token.current;scheduleOnUI((t:number)=>{'worklet';cancelAnimation(amount);driven.value=false;uiPinching.value=false;model.value=nativePinchState();bridge.value={token:t,serial:0,pending:false,sent:NaN};if(handler.value)GestureStateManager.deactivate(handler.value)},next)}},[amount,driven,uiPinching,model,bridge,handler]);
 const stopAnimation=useCallback(()=>{scheduleOnUI(()=>{'worklet';cancelAnimation(amount)})},[amount]);
 const registration:NativePinchRegistration={enabled,gesture,registerSurface,unregisterSurface};
 return{gesture,registration,amount,uiPinching,start,cancel,animateTo,stopAnimation,syncConfig,blocksMovement:()=>blocked.current||!optionsRef.current.enabled()};
}
