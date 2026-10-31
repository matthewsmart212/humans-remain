import {useEffect,useState} from 'react';
import type {GamePerformanceRecorder} from './performance-recording';
/** No interval at all while diagnostics are off. UI is capped at two updates/sec. */
export function usePerformanceSnapshot(recorder:GamePerformanceRecorder){
 const [,refresh]=useState(0),enabled=recorder.enabled;
 useEffect(()=>recorder.subscribe(()=>refresh(n=>n+1)),[recorder]);
 useEffect(()=>{if(!enabled)return;const timer=setInterval(()=>refresh(n=>n+1),500);return()=>clearInterval(timer)},[recorder,enabled]);
 return recorder.read(performance.now());
}
