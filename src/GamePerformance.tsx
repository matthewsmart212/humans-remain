import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,Activity,Download,Square,Play,Plus} from 'lucide-react';
import {GamePerformanceRecorder,performanceDuration,performanceResultRows} from './performance-recording';
import {usePerformanceSnapshot} from './use-performance-snapshot';

export type GameDiagnostics={recorder:GamePerformanceRecorder;onStart:()=>void};
export function GamePerformanceOverlay({recorder}:{recorder:GamePerformanceRecorder}){
 const s=usePerformanceSnapshot(recorder);
 if(!s.overlay&&!s.recording)return null;
 return <div className="game-performance-overlay" aria-label="Game performance" role="status" aria-live="off">
  {s.overlay&&<><strong>{s.live?`${s.live.fps.toFixed(0)} FPS`:'FPS —'}</strong><span>{s.live?`${s.live.frameMs.toFixed(1)} ms · CPU render ${s.live.renderMs.toFixed(1)} ms`:'Waiting for active gameplay'}</span></>}
  {s.recording&&<b>● REC {performanceDuration(s.wallSeconds)}</b>}
 </div>;
}
export function PerformanceMenuOptions({recorder,onOpen,onSpawn}:{recorder:GamePerformanceRecorder;onOpen:()=>void;onSpawn?:()=>void}){
 const s=usePerformanceSnapshot(recorder);
 return <><button type="button" role="switch" aria-checked={s.overlay} onClick={()=>recorder.setOverlay(!s.overlay)}><Activity size={18}/>Show FPS &amp; frame time <b className="performance-toggle">{s.overlay?'ON':'OFF'}</b></button>
  <div className="game-menu-tools"><button type="button" onClick={onOpen}><Activity size={18}/>{s.recording?'Performance · recording':'Performance recording'}</button>{onSpawn&&<button type="button" onClick={onSpawn}><Plus size={18}/>Spawn</button>}</div></>;
}
export async function exportPerformanceLog(recorder:GamePerformanceRecorder){
 const json=recorder.exportJson(),file=new File([json],recorder.filename(),{type:'application/json'});
 if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Humans Remain performance log'});return}
 const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export function GamePerformancePanel({recorder,onStart,onBack,defeated=false}:GameDiagnostics&{onBack:()=>void;defeated?:boolean}){
 const s=usePerformanceSnapshot(recorder),summary=recorder.summary(),[message,setMessage]=useState(''),[exporting,setExporting]=useState(false),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus()},[]);
 const save=async()=>{setExporting(true);setMessage('');try{await exportPerformanceLog(recorder);setMessage('Log exported. Attach the JSON file when reporting a stutter.')}catch(e){if(!(e instanceof Error&&e.name==='AbortError'))setMessage('Export could not complete. Your log is still here — please try again.')}finally{setExporting(false)}};
 return <div className="performance-panel">
  <header><small>FIELD DIAGNOSTICS</small><h1 ref={heading} tabIndex={-1}>Performance</h1><p>Record a walk, reproduce a stutter, then pause and stop.</p></header>
  <div className="performance-layout"><div>
   <div className="performance-session"><b>{s.recording?'● RECORDING':s.hasLog?'RECORDING COMPLETE':'READY TO RECORD'}</b><strong>{performanceDuration(s.wallSeconds)}</strong><span>{s.frames.toLocaleString()} frames · {s.recording?'paused time excluded':'up to 15 minutes per log'}</span></div>
   {summary?<><dl className="performance-results">{performanceResultRows(summary).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="performance-note">{summary.stopReason} · Detailed stage timings and linked slow frames are in the exported log.</p></>:<p className="performance-note">Detailed capture: texture downloads, decoding, upload/draw/flush timings, delayed terrain chunks, GPU cache readings, position and weather. Slow frames include the preceding render call. Menus and background time are excluded from FPS.</p>}
  </div><div className="performance-actions">
   <button type="button" role="switch" aria-checked={s.overlay} onClick={()=>recorder.setOverlay(!s.overlay)}><Activity size={18}/>FPS overlay <b className="performance-toggle">{s.overlay?'ON':'OFF'}</b></button>
   {s.recording?<button type="button" className="performance-stop" onClick={()=>recorder.stop(performance.now())}><Square size={18}/>Stop recording</button>:<button type="button" className="game-resume" disabled={defeated||exporting} onClick={()=>{setMessage('');onStart()}}><Play size={18}/>{s.hasLog?'New recording & resume':'Start recording & resume'}</button>}
   {s.hasLog&&!s.recording&&<button type="button" disabled={exporting} onClick={()=>void save()}><Download size={18}/>{exporting?'Preparing log…':'Export log (.json)'}</button>}
   <button type="button" disabled={exporting} onClick={onBack}><ArrowLeft size={18}/>Back to pause menu</button>
   <p className="performance-note">Opt-in only. Timing buffers ≤ 6.9 MB plus capped event/context history; display refreshes twice a second. A new recording replaces the previous log. Export before closing the game.</p>
   <p className="performance-note">FPS measures the game loop. CPU render time is not GPU time. No screenshots or automatic uploads.</p>
   {!!message&&<p role="status" className="performance-note">{message}</p>}
  </div></div>
 </div>;
}
