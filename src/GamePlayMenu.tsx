import SpawnMenu,{type PlaySpawnControls} from './SpawnMenu';
import React,{useEffect,useId,useRef,useState} from 'react';
import {ArrowLeft,Maximize2,Minimize2,Pause,Play,RotateCcw} from 'lucide-react';
import {GamePerformancePanel,PerformanceMenuOptions,type GameDiagnostics} from './GamePerformance';

type Props={paused:boolean;fullscreen:boolean;hideButton?:boolean;defeated?:boolean;cause?:string;survival?:boolean;saveNotice?:string;saveBlocked?:boolean;onSandbox?:()=>void;onContinue?:()=>void;diagnostics?:GameDiagnostics;spawns?:PlaySpawnControls;onPause:()=>void;onResume:()=>void;onRestart:()=>void;onExit:()=>void;onExpand:()=>void};
const tap=(perform:()=>void)=>({onPointerDown:(e:React.PointerEvent<HTMLButtonElement>)=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();perform()},onClick:(e:React.MouseEvent<HTMLButtonElement>)=>{e.stopPropagation();if(e.detail===0)perform()}});

export function EditorOnly({playing,children}:{playing:boolean;children:React.ReactNode}){return playing?null:<>{children}</>}

/** The play surface exposes game actions only; editor tools stay unmounted. */
export default function GamePlayMenu({paused,fullscreen,hideButton=false,defeated=false,cause,survival=false,saveNotice,saveBlocked=false,onSandbox,onContinue,diagnostics,spawns,onPause,onResume,onRestart,onExit,onExpand}:Props){
 const dialog=useRef<HTMLDialogElement>(null),title=useId(),[performanceOpen,setPerformanceOpen]=useState(false),[spawnOpen,setSpawnOpen]=useState(false),[confirmNew,setConfirmNew]=useState(false);
 useEffect(()=>{if(!paused){setPerformanceOpen(false);setSpawnOpen(false);setConfirmNew(false)}},[paused]);
 useEffect(()=>{const el=dialog.current;if(!el)return;if(paused&&!el.open)el.showModal();else if(!paused&&el.open)el.close();return()=>{if(el.open)el.close()}},[paused]);
 return <>
  {!hideButton&&<button type="button" className="game-pause-button" aria-label="Pause game" title="Pause game (Esc)" onClick={onPause}><Pause size={21}/></button>}
  <dialog ref={dialog} className={`game-pause-menu${performanceOpen||spawnOpen?' performance-open':''}`} aria-labelledby={performanceOpen||spawnOpen?undefined:title} aria-label={performanceOpen?'Performance':spawnOpen?'Spawn':undefined} onKeyDown={e=>e.stopPropagation()} onKeyUp={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();if(performanceOpen)setPerformanceOpen(false);else if(spawnOpen)setSpawnOpen(false);else if(!defeated)onResume()}}>
   {paused&&spawnOpen&&spawns?<SpawnMenu controls={spawns} onBack={()=>setSpawnOpen(false)}/>:paused&&performanceOpen&&diagnostics?<GamePerformancePanel {...diagnostics} defeated={defeated} onBack={()=>setPerformanceOpen(false)}/>:<section>
    <small>HUMANS REMAIN · {survival?'SURVIVAL':'SANDBOX'}</small><h1 id={title}>{confirmNew?'Start a new run?':defeated?'Run ended':'Paused'}</h1>
    {confirmNew?<><p>This replaces your saved Survival run on this device.</p><button type="button" className="game-resume" {...tap(()=>{setConfirmNew(false);onRestart()})}>Start new Survival run</button><button type="button" {...tap(()=>setConfirmNew(false))}>Keep current run</button></>:<>
    {defeated&&<p>{cause||'Your health reached zero.'}</p>}
    {saveNotice&&<p role="status">{saveNotice}</p>}
    {!saveNotice&&survival&&<p>Progress saves on this device.</p>}
    {!defeated&&!saveBlocked&&<button type="button" className="game-resume" autoFocus {...tap(onResume)}><Play size={19}/>Resume game</button>}
    {!survival&&onContinue&&<button type="button" {...tap(onContinue)}>Continue Survival</button>}
    {paused&&diagnostics&&<PerformanceMenuOptions recorder={diagnostics.recorder} onOpen={()=>setPerformanceOpen(true)} onSpawn={!defeated&&spawns?()=>setSpawnOpen(true):undefined}/>}
    <button type="button" autoFocus={defeated} {...tap(()=>setConfirmNew(true))}><RotateCcw size={18}/>New Survival run</button>
    {survival&&onSandbox&&<button type="button" {...tap(onSandbox)}>Open testing sandbox</button>}
    <button type="button" {...tap(onExpand)}>{fullscreen?<Minimize2 size={18}/>:<Maximize2 size={18}/>}<span>{fullscreen?'Exit full screen':'Full screen'}</span></button>
    <button type="button" className="game-return" {...tap(onExit)}><ArrowLeft size={18}/>Return to Build</button>
    </>}
   </section>}
  </dialog>
 </>;
}
