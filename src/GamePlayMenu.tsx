import SpawnMenu,{type PlaySpawnControls} from './SpawnMenu';
import React,{useEffect,useId,useRef,useState} from 'react';
import {ArrowLeft,Maximize2,Minimize2,Pause,Play,RotateCcw,Users,Hammer} from 'lucide-react';
import {SURVIVOR_ROLES,type SurvivorRoleId} from './survivor-roles';
import {GamePerformancePanel,PerformanceMenuOptions,type GameDiagnostics} from './GamePerformance';

type Props={paused:boolean;fullscreen:boolean;hideButton?:boolean;defeated?:boolean;cause?:string;survival?:boolean;saveNotice?:string;saveBlocked?:boolean;onSandbox?:()=>void;onContinue?:()=>void;diagnostics?:GameDiagnostics;spawns?:PlaySpawnControls;onPause:()=>void;onResume:()=>void;onRestart:()=>void;onExit:()=>void;onExpand:()=>void;characterRole?:SurvivorRoleId;onChangeCharacter?:(role:SurvivorRoleId)=>Promise<void>;creativeMode?:boolean;onToggleCreative?:()=>void};
const tap=(perform:()=>void)=>({onPointerDown:(e:React.PointerEvent<HTMLButtonElement>)=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();perform()},onClick:(e:React.MouseEvent<HTMLButtonElement>)=>{e.stopPropagation();if(e.detail===0)perform()}});

export function EditorOnly({playing,children}:{playing:boolean;children:React.ReactNode}){return playing?null:<>{children}</>}

/** The play surface exposes game actions only; editor tools stay unmounted. */
export default function GamePlayMenu({paused,fullscreen,hideButton=false,defeated=false,cause,survival=false,saveNotice,saveBlocked=false,onSandbox,onContinue,diagnostics,spawns,onPause,onResume,onRestart,onExit,onExpand,characterRole='survivor',onChangeCharacter,creativeMode=false,onToggleCreative}:Props){
 const dialog=useRef<HTMLDialogElement>(null),title=useId(),[performanceOpen,setPerformanceOpen]=useState(false),[spawnOpen,setSpawnOpen]=useState(false),[confirmNew,setConfirmNew]=useState(false),[characterOpen,setCharacterOpen]=useState(false),[changingCharacter,setChangingCharacter]=useState(false),[characterError,setCharacterError]=useState('');
 useEffect(()=>{if(!paused){setPerformanceOpen(false);setSpawnOpen(false);setConfirmNew(false);setCharacterOpen(false);setCharacterError('')}},[paused]);
 useEffect(()=>{const el=dialog.current;if(!el)return;if(paused&&!el.open)el.showModal();else if(!paused&&el.open)el.close();return()=>{if(el.open)el.close()}},[paused]);
 const changeCharacter=async(next:SurvivorRoleId)=>{
  if(!onChangeCharacter||changingCharacter||next===characterRole)return;
  setChangingCharacter(true);setCharacterError('');
  try{await onChangeCharacter(next)}catch(e){setCharacterError(e instanceof Error?e.message:'Unable to load character artwork. Please retry.')}
  finally{setChangingCharacter(false)}
 };
 return <>
  {!hideButton&&<button type="button" className="game-pause-button" aria-label="Pause game" title="Pause game (Esc)" onClick={onPause}><Pause size={21}/></button>}
  <dialog ref={dialog} className={`game-pause-menu${performanceOpen||spawnOpen||characterOpen?' performance-open':''}`} aria-labelledby={performanceOpen||spawnOpen||characterOpen?undefined:title} aria-label={performanceOpen?'Performance':spawnOpen?'Spawn':characterOpen?'Choose character':undefined} onKeyDown={e=>e.stopPropagation()} onKeyUp={e=>e.stopPropagation()} onCancel={e=>{e.preventDefault();if(performanceOpen)setPerformanceOpen(false);else if(spawnOpen)setSpawnOpen(false);else if(characterOpen)setCharacterOpen(false);else if(!defeated)onResume()}}>
   {paused&&spawnOpen&&spawns?<SpawnMenu controls={spawns} onBack={()=>setSpawnOpen(false)}/>:paused&&performanceOpen&&diagnostics?<GamePerformancePanel {...diagnostics} defeated={defeated} onBack={()=>setPerformanceOpen(false)}/>:paused&&characterOpen&&onChangeCharacter?<section className="game-character-panel">
    <small>SETTINGS · SURVIVOR</small><h1>Change character</h1>
    <p>Switch your character without resetting the current run, equipment or camp.</p>
    <div className="game-character-grid" role="group" aria-label="Available characters">
     {SURVIVOR_ROLES.map(role=><button type="button" key={role.id} disabled={changingCharacter} aria-pressed={characterRole===role.id} {...tap(()=>void changeCharacter(role.id))}>
      <span className="game-character-symbol">{role.glyph}</span><span><strong>{role.label}</strong><small>{role.subtitle}</small></span><span aria-hidden="true">{characterRole===role.id?'✓':''}</span>
     </button>)}
    </div>
    {characterError&&<p role="alert">{characterError}</p>}
    {changingCharacter&&<p role="status">Loading character artwork…</p>}
    <p className="game-character-note">Hunter uses his walking sprites while running. Medic temporarily uses Survivor artwork.</p>
    <button type="button" disabled={changingCharacter} {...tap(()=>setCharacterOpen(false))}><ArrowLeft size={18}/>Back to game settings</button>
   </section>:<section>
    <small>HUMANS REMAIN · {survival?'SURVIVAL':'SANDBOX'}</small><h1 id={title}>{confirmNew?'Start a new run?':defeated?'Run ended':'Paused'}</h1>
    {confirmNew?<><p>This starts a fresh run. Your permanently placed world assets stay unchanged.</p><button type="button" className="game-resume" {...tap(()=>{setConfirmNew(false);onRestart()})}>Start new Survival run</button><button type="button" {...tap(()=>setConfirmNew(false))}>Keep current run</button></>:<>
    {defeated&&<p>{cause||'Your health reached zero.'}</p>}
    {saveNotice&&<p role="status">{saveNotice}</p>}
    {!saveNotice&&survival&&<p>Each Play begins a fresh survival run.</p>}
    {!defeated&&!saveBlocked&&<button type="button" className="game-resume" autoFocus {...tap(onResume)}><Play size={19}/>Resume game</button>}
    {!survival&&onContinue&&<button type="button" {...tap(onContinue)}>Start fresh Survival run</button>}
    {paused&&onChangeCharacter&&!defeated&&<button type="button" {...tap(()=>{setCharacterError('');setCharacterOpen(true)})}><Users size={18}/>Change character · {SURVIVOR_ROLES.find(r=>r.id===characterRole)?.label}</button>}
    {paused&&survival&&onToggleCreative&&!defeated&&<><button type="button" aria-pressed={creativeMode} {...tap(onToggleCreative)}><Hammer size={18}/>Creative Mode · {creativeMode?'ON':'OFF'}</button>{creativeMode&&<p className="game-creative-note">Unlimited building supplies · instant repairs and upgrades. Turn it off to restore your original quantities.</p>}</>}
     {paused&&diagnostics&&<PerformanceMenuOptions recorder={diagnostics.recorder} onOpen={()=>setPerformanceOpen(true)} onSpawn={!defeated&&spawns?()=>setSpawnOpen(true):undefined}/>}
    <button type="button" autoFocus={defeated} {...tap(()=>setConfirmNew(true))}><RotateCcw size={18}/>New Survival run</button>
    {survival&&onSandbox&&<button type="button" {...tap(onSandbox)}>Open testing sandbox</button>}
    <button type="button" {...tap(onExpand)}>{fullscreen?<Minimize2 size={18}/>:<Maximize2 size={18}/>}<span>{fullscreen?'Exit full screen':'Full screen'}</span></button>
    <button type="button" className="game-return" {...tap(onExit)}><ArrowLeft size={18}/>Starting screen</button>
    </>}
   </section>}
  </dialog>
 </>;
}
