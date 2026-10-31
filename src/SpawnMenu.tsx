import React,{useRef,useEffect,useState} from 'react';
import {ArrowLeft,Plus,Trash2,HeartPulse} from 'lucide-react';
import {SPAWNABLES,type SpawnKind} from './play-spawns';
export type PlaySpawnControls={onSpawn:(kind:SpawnKind,count:number)=>Promise<string>;onClear:()=>void;onHeal:()=>void};
export default function SpawnMenu({controls,onBack}:{controls:PlaySpawnControls;onBack:()=>void}){
 const [filter,setFilter]=useState<'All'|'Animals'|'Robots'>('All'),[kind,setKind]=useState<SpawnKind>('scrap-bomber'),[count,setCount]=useState(1),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const heading=useRef<HTMLHeadingElement>(null),selected=SPAWNABLES.find(s=>s.id===kind)!;
 useEffect(()=>{heading.current?.focus()},[]);
 const spawn=async()=>{if(busy)return;setBusy(true);setMessage('');try{setMessage(await controls.onSpawn(kind,count))}catch{setMessage('Artwork could not load. Please try again.')}finally{setBusy(false)}};
 return <div className="game-spawn-panel">
  <header><small>PLAY TOOLS</small><h1 ref={heading} tabIndex={-1}>Spawn</h1><p>Choose a creature to spawn on clear ground nearby.</p></header>
  <div className="game-spawn-filters" role="group" aria-label="Spawn categories">{(['All','Animals','Robots'] as const).map(group=><button type="button" key={group} aria-pressed={filter===group} onClick={()=>{setFilter(group);const options=SPAWNABLES.filter(s=>group==='All'||s.group===group);if(!options.some(s=>s.id===kind))setKind(options[0].id);setMessage('')}}>{group}</button>)}</div>
  <div className="game-spawn-grid" role="group" aria-label="Spawnable creatures">{SPAWNABLES.filter(s=>filter==='All'||s.group===filter).map(s=><button type="button" key={s.id} className="game-spawn-card" aria-pressed={kind===s.id} aria-label={`Select ${s.name}`} onClick={()=>{setKind(s.id);setMessage('')}}><img src={s.image} alt=""/><span><strong>{s.name}</strong><small>{s.note}</small></span></button>)}</div>
  <fieldset className="game-spawn-count"><legend>Quantity</legend>{[1,3,5].map(n=><button type="button" key={n} disabled={busy} aria-pressed={count===n} onClick={()=>setCount(n)}>{n}</button>)}</fieldset>
  <button type="button" className="game-resume" disabled={busy} onClick={()=>void spawn()}><Plus size={18}/>{busy?'Loading…':`Spawn ${count} · ${selected.name}`}</button>
  {!!message&&<p role="status">{message}</p>}
  <div className="game-spawn-utilities"><button type="button" disabled={busy} onClick={()=>{controls.onClear();setMessage('Spawned creatures cleared.')}}><Trash2 size={16}/>Clear spawned</button><button type="button" disabled={busy} onClick={()=>{controls.onHeal();setMessage('Health restored.')}}><HeartPulse size={16}/>Restore health</button></div>
  <button type="button" disabled={busy} onClick={onBack}><ArrowLeft size={18}/>Back to settings</button>
 </div>;
}
