import {fishingSoundEnabled,setFishingSoundEnabled} from './fishing-audio';
import {stationCSSColors} from './station-css-colors';
import SpawnMenu,{type PlaySpawnControls} from './SpawnMenu';
import React,{useEffect,useId,useRef,useState} from 'react';
import {ArrowLeft,Maximize2,Minimize2,Pause,Play,RotateCcw,Users,Plus} from 'lucide-react';
import {SURVIVOR_ROLES,type SurvivorRoleId} from './survivor-roles';
import {GamePerformancePanel,PerformanceMenuOptions,type GameDiagnostics} from './GamePerformance';

type Props={paused:boolean;fullscreen:boolean;hideButton?:boolean;defeated?:boolean;cause?:string;survival?:boolean;saveNotice?:string;saveBlocked?:boolean;onSandbox?:()=>void;onContinue?:()=>void;diagnostics?:GameDiagnostics;spawns?:PlaySpawnControls;onPause:()=>void;onResume:()=>void;onRestart:()=>void;onExit:()=>void;onExpand:()=>void;characterRole?:SurvivorRoleId;onChangeCharacter?:(role:SurvivorRoleId)=>Promise<void>;creativeMode?:boolean;onToggleCreative?:()=>void;fullZoom?:boolean;onToggleFullZoom?:()=>void;fishingAssists?:{autoHook:boolean;toggleReel:boolean};onFishingAssist?:(values:{autoHook?:boolean;toggleReel?:boolean})=>void};
export function EditorOnly({playing,children}:{playing:boolean;children:React.ReactNode}){return playing?null:<>{children}</>}

/** The play surface exposes game actions only; editor tools stay unmounted. */
export default function GamePlayMenu({paused,fullscreen,hideButton=false,defeated=false,cause,survival=false,saveNotice,saveBlocked=false,onSandbox,onContinue,diagnostics,spawns,onPause,onResume,onRestart,onExit,onExpand,characterRole='survivor',onChangeCharacter,creativeMode=false,onToggleCreative,fullZoom=false,onToggleFullZoom,fishingAssists,onFishingAssist}:Props){
 const dialog=useRef<HTMLDialogElement>(null),title=useId();
 const [page,setPage]=useState<'pause'|'character'|'performance'|'spawn'|'restart'>('pause');
 const [changingCharacter,setChangingCharacter]=useState(false),[characterError,setCharacterError]=useState('');
 const [,refreshFishing]=useState(0);
 const [fishingSound,setFishingSound]=useState(fishingSoundEnabled);
 const returnTarget=useRef<HTMLButtonElement|null>(null);
 const openPage=(next:typeof page,trigger?:HTMLButtonElement)=>{
  returnTarget.current=trigger??(document.activeElement instanceof HTMLButtonElement?document.activeElement:null);
  setPage(next);
 };
 const back=()=>setPage('pause');
 useEffect(()=>{if(!paused){setPage('pause');setCharacterError('');returnTarget.current=null}},[paused]);
 useEffect(()=>{
  const el=dialog.current;
  if(!el||!paused)return;
  el.showModal();
  return()=>el.close();
 },[paused]);
 useEffect(()=>{
  if(!paused)return;
  if(page==='pause'&&returnTarget.current){
   returnTarget.current.focus();
   returnTarget.current=null;
  }else if(page!=='pause'){
   dialog.current?.querySelector<HTMLElement>('[data-page-heading]')?.focus();
   dialog.current?.scrollTo(0,0);
  }
 },[paused,page]);
 const changeCharacter=async(next:SurvivorRoleId)=>{
  if(!onChangeCharacter||changingCharacter||next===characterRole)return;
  setChangingCharacter(true);setCharacterError('');
  try{await onChangeCharacter(next)}catch(e){setCharacterError(e instanceof Error?e.message:'Unable to load character artwork. Please retry.')}
  finally{setChangingCharacter(false)}
 };
 return <>
  {!hideButton&&<button type="button" className="game-pause-button" aria-label="Pause game" title="Pause game (Esc)" onClick={onPause}><Pause size={21}/></button>}
  <dialog ref={dialog} style={stationCSSColors} className={`game-pause-menu${['performance','spawn','character'].includes(page)?' performance-open':''}`} aria-labelledby={page==='pause'?title:undefined} aria-label={page==='performance'?'Performance':page==='spawn'?'Spawn':page==='character'?'Change character':page==='restart'?'Start a new run?':undefined}
   onKeyDown={e=>e.stopPropagation()} onKeyUp={e=>e.stopPropagation()}
   onCancel={e=>{e.preventDefault();if(page!=='pause')back();else if(!defeated&&!saveBlocked)onResume()}}>
   {paused&&<section className="game-pause-main" hidden={page!=='pause'}>
    <header><small>{survival?'Survival':'Sandbox'}</small><h1 id={title}>{defeated?'Run ended':'Paused'}</h1></header>
    {defeated&&<p>{cause||'Your health reached zero.'}</p>}
    {saveNotice&&<p role="status">{saveNotice}</p>}
    {!defeated&&!saveBlocked&&<button type="button" className="game-resume" autoFocus onClick={onResume}><Play size={19}/>Resume game</button>}
    {!survival&&onContinue&&<button type="button" onClick={onContinue}><Play size={18}/>Start fresh Survival run</button>}
    <details className="pause-disclosure"><summary>Game settings</summary><div>
     {onChangeCharacter&&!defeated&&<button type="button" onClick={e=>{setCharacterError('');openPage('character',e.currentTarget)}}><Users size={18}/>Change character <b className="pause-value">{SURVIVOR_ROLES.find(r=>r.id===characterRole)?.label}</b></button>}
     {onToggleFullZoom&&!defeated&&<><button type="button" aria-pressed={fullZoom} onClick={onToggleFullZoom}><Maximize2 size={18}/>Full zoom <b className="pause-value">{fullZoom?'On':'Off'}</b></button>{fullZoom&&<p>Pinch out further in the world view. Use the map button to open the map.</p>}</>}
     {fishingAssists&&onFishingAssist&&!defeated&&<><p>Fishing</p><button type="button" role="switch" aria-checked={fishingSound} onClick={()=>{const next=!fishingSound;setFishingSound(next);setFishingSoundEnabled(next)}}>Fishing sounds<b className="pause-value">{fishingSound?'On':'Off'}</b></button>{([{key:'autoHook',label:'Auto hook',description:'Hook fishing bites automatically'},{key:'toggleReel',label:'Tap to reel',description:'Tap once to reel and again to ease off'}] as const).map(option=><button key={option.key} type="button" role="switch" aria-checked={fishingAssists[option.key]} aria-label={option.description} onClick={()=>{onFishingAssist({[option.key]:!fishingAssists[option.key]});refreshFishing(value=>value+1)}}>{option.label}<b className="pause-value">{fishingAssists[option.key]?'On':'Off'}</b></button>)}</>}
     <button type="button" onClick={onExpand}>{fullscreen?<Minimize2 size={18}/>:<Maximize2 size={18}/>}<span>{fullscreen?'Exit full screen':'Full screen'}</span></button>
    </div></details>
    {(diagnostics||survival&&(onSandbox||onToggleCreative&&!defeated))&&<details className="pause-disclosure"><summary>Play tools</summary><div>
     {survival&&onToggleCreative&&!defeated&&<><button type="button" aria-pressed={creativeMode} onClick={onToggleCreative}><Plus size={18}/>Creative mode <b className="pause-value">{creativeMode?'On':'Off'}</b></button>{creativeMode&&<p>Building supplies are unlimited. Repairs and upgrades are instant. Turn off to restore your quantities.</p>}</>}
     {diagnostics&&<PerformanceMenuOptions recorder={diagnostics.recorder} onOpen={trigger=>openPage('performance',trigger)} onSpawn={!defeated&&spawns?trigger=>openPage('spawn',trigger):undefined}/>}
     {survival&&onSandbox&&<button type="button" onClick={onSandbox}>Open testing sandbox</button>}
    </div></details>}
    <button type="button" className={defeated?'game-resume':undefined} autoFocus={defeated} onClick={e=>openPage('restart',e.currentTarget)}><RotateCcw size={18}/>{defeated?'Restart game':'New Survival run'}</button>
    <button type="button" className="game-return" onClick={onExit}><ArrowLeft size={18}/>Starting screen</button>
   </section>}
   {paused&&page==='spawn'&&spawns&&<SpawnMenu controls={spawns} onBack={back}/>}
   {paused&&page==='performance'&&diagnostics&&<GamePerformancePanel {...diagnostics} defeated={defeated} onBack={back}/>}
   {paused&&page==='character'&&onChangeCharacter&&<section className="game-character-panel">
    <header><small>Game settings</small><h1 data-page-heading tabIndex={-1}>Change character</h1></header>
    <p>Your equipment, camp and progress carry over.</p>
    <div className="game-character-grid" role="group" aria-label="Available characters">
     {SURVIVOR_ROLES.map(role=><button type="button" key={role.id} disabled={changingCharacter} aria-pressed={characterRole===role.id} onClick={()=>void changeCharacter(role.id)}>
      <span className="game-character-symbol" aria-hidden="true">{role.glyph}</span><span><strong>{role.label}</strong><small>{role.subtitle}</small></span><span aria-hidden="true">{characterRole===role.id?'✓':''}</span>
     </button>)}
    </div>
    {characterError&&<p role="alert">{characterError}</p>}
    {changingCharacter&&<p role="status">Loading character artwork…</p>}
    <p className="game-character-note">Medic temporarily uses Survivor artwork.</p>
    <button type="button" className="game-return" disabled={changingCharacter} onClick={back}><ArrowLeft size={18}/>Back to game settings</button>
   </section>}
   {paused&&page==='restart'&&<section>
    <header><small>Survival</small><h1 data-page-heading tabIndex={-1}>Start a new run?</h1></header>
    <p>This replaces your current run. Your placed world assets carry over.</p>
    <button type="button" className="game-resume" onClick={back}><ArrowLeft size={18}/>Keep current run</button>
    <button type="button" onClick={()=>{back();onRestart()}}><RotateCcw size={18}/>Start new Survival run</button>
   </section>}
  </dialog>
 </>;
}
