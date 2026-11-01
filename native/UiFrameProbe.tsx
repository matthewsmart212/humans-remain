import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {useFrameCallback,useSharedValue} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import type {GamePerformanceRecorder} from '../src/performance-recording';

type CadenceState={token:number;pending:boolean;intervals:number;windowMs:number;worstFrameMs:number;over33ms:number;over50ms:number;over100ms:number};
type CadenceBatch=Omit<CadenceState,'pending'>;
const WINDOW_MS=500;

/** A fixed-size UI-runtime accumulator. No frame array or per-frame RN calls. */
export function createUiCadenceState(token:number):CadenceState{
 'worklet';
 return {token,pending:false,intervals:0,windowMs:0,worstFrameMs:0,over33ms:0,over50ms:0,over100ms:0};
}
export function collectUiCadence(state:CadenceState,interval:number|null):CadenceBatch|null{
 'worklet';
 // Reanimated supplies null on the first callback after each activation.
 if(interval===null||!Number.isFinite(interval)||interval<=0)return null;
 state.intervals++;state.windowMs+=interval;state.worstFrameMs=Math.max(state.worstFrameMs,interval);
 if(interval>1000/30)state.over33ms++;if(interval>50)state.over50ms++;if(interval>100)state.over100ms++;
 // Keep aggregating while RN is busy: at most one bridge message can be queued.
 if(state.windowMs<WINDOW_MS||state.pending)return null;
 const batch={token:state.token,intervals:state.intervals,windowMs:state.windowMs,worstFrameMs:state.worstFrameMs,over33ms:state.over33ms,over50ms:state.over50ms,over100ms:state.over100ms};
 state.pending=true;state.intervals=state.windowMs=state.worstFrameMs=state.over33ms=state.over50ms=state.over100ms=0;
 return batch;
}

/** Opt-in UI callback cadence, distinct from JS game-loop and GPU/display FPS.
 * Mount once, with active=true only during gameplay. Neither the callback nor
 * a timer runs while recording is off, paused, or the app is backgrounded.
 * Completed ~500ms batches use wall-clock alignment; never assume the UI frame
 * timestamp shares performance.now()'s epoch with the React Native runtime.
 */
export function NativeUiFrameProbe({recorder,active}:{recorder:GamePerformanceRecorder;active:boolean}){
 const [,refresh]=useState(0),[foreground,setForeground]=useState(AppState.currentState==='active');
 const activeRef=useRef(active),foregroundRef=useRef(foreground);activeRef.current=active;
 const activation=useRef({token:0,session:0,active:false});
 const accumulator=useSharedValue(createUiCadenceState(0));
 const accept=useCallback((batch:CadenceBatch,endEpochMs:number,uiTimestamp:number)=>{
  // A stale in-flight batch must neither enter another recording nor release
  // the newer recording's back-pressure gate.
  const token=batch.token;
  accumulator.modify(state=>{'worklet';if(state.token===token)state.pending=false;return state},false);
  const current=activation.current;
  if(current.token!==token||!current.active||!activeRef.current||!foregroundRef.current||!recorder.recording||current.session!==recorder.session)return;
  const receivedAt=performance.now();
  // The loop changes recorder activity synchronously, before React commits a
  // pause overlay. Do not accept a queued UI sample in that small interval.
  if(recorder.read(receivedAt).activity!=='playing')return;
  const rawDelay=Date.now()-endEpochMs;
  // Wall-clock adjustment or an implausible delay invalidates alignment. The
  // counters remain useful, but the trace then states it is receipt-aligned.
  const aligned=rawDelay>=0&&rawDelay<=15*60*1000,deliveryDelayMs=aligned?rawDelay:0;
  recorder.trace(receivedAt-deliveryDelayMs,'native-ui-cadence',0,{
   intervals:batch.intervals,windowMs:batch.windowMs,meanFrameMs:batch.windowMs/batch.intervals,worstFrameMs:batch.worstFrameMs,
   over33ms:batch.over33ms,over50ms:batch.over50ms,over100ms:batch.over100ms,uiTimestamp,deliveryDelayMs,
   clockAlignment:aligned?'approximate-wall-clock':'receipt-only',measurement:'UI callback cadence; not GPU/display FPS',
  },current.session);
 },[recorder,accumulator]);
 const onFrame=useCallback((frame:{timeSincePreviousFrame:number|null;timestamp:number})=>{
  'worklet';
  accumulator.modify(state=>{
   'worklet';
   const batch=collectUiCadence(state,frame.timeSincePreviousFrame);
   if(batch)scheduleOnRN(accept,batch,Date.now(),frame.timestamp);
   return state;
  },false);
 },[accumulator,accept]);
 const callback=useFrameCallback(onFrame,false);
 useEffect(()=>recorder.subscribe(()=>refresh(n=>n+1)),[recorder]);
 useEffect(()=>{
  const subscription=AppState.addEventListener('change',state=>{foregroundRef.current=state==='active';setForeground(foregroundRef.current)});
  return()=>subscription.remove();
 },[]);
 const recording=recorder.recording,session=recorder.session;
 useEffect(()=>{
  const enabled=recording&&active&&foreground;
  const token=++activation.current.token;activation.current.session=session;activation.current.active=enabled;
  accumulator.value=createUiCadenceState(token);callback.setActive(enabled);
  return()=>{activation.current.active=false;activation.current.token++;callback.setActive(false)};
 },[recording,session,active,foreground,accumulator,callback]);
 return null;
}
