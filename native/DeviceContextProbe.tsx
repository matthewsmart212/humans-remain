import {useEffect,useMemo,useRef} from 'react';
import {AppState,Platform} from 'react-native';
import {requireOptionalNativeModule} from 'expo';
import type {GamePerformanceRecorder} from '../src/performance-recording';
import {NativeDeviceContextSampler,type NativeDeviceContextModule} from './device-context';

// Expo Go does not include app-local modules. Missing diagnostics must never
// prevent launch or imply that a zero memory/GPU measurement was obtained.
function optionalModule(){
 if(Platform.OS!=='ios')return null;
 try{return requireOptionalNativeModule<NativeDeviceContextModule>('GameDiagnostics')}catch{return null}
}
const nativeModule=optionalModule();

export function NativeDeviceContextProbe({recorder,active}:{recorder:GamePerformanceRecorder;active:boolean}){
 const activeRef=useRef(active),foreground=useRef(AppState.currentState==='active');activeRef.current=active;
 const sampler=useMemo(()=>new NativeDeviceContextSampler(recorder,nativeModule,Platform.OS),[recorder]);
 useEffect(()=>recorder.subscribe(()=>sampler.configure(activeRef.current&&foreground.current)),[recorder,sampler]);
 useEffect(()=>{
  const subscription=AppState.addEventListener('change',state=>{foreground.current=state==='active';sampler.configure(activeRef.current&&foreground.current)});
  return()=>subscription.remove();
 },[sampler]);
 useEffect(()=>{sampler.configure(active&&foreground.current)},[active,sampler]);
 useEffect(()=>()=>sampler.stop(),[sampler]);
 return null;
}
