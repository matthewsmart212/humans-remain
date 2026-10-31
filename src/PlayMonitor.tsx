import React,{useEffect,useState,type RefObject} from 'react';
import {Activity,Swords,X} from 'lucide-react';
import type {World} from './survival-engine';
import {readPlayMonitor,type RenderFrameMeter} from './studio-monitoring';
import CombatPanel from './CombatPanel';
import {clearCombatEnemies,restoreCombatHealth} from './studio-combat';
import type {EnemyKind} from './enemy-types';

export type PlayToolTab='monitor'|'combat';
type Props={world:RefObject<World>;canvas:RefObject<HTMLCanvasElement|null>;meter:RefObject<RenderFrameMeter>;suspended:boolean;tab:PlayToolTab;onTab:(tab:PlayToolTab)=>void;onClose:()=>void;onSpawn:(kind:EnemyKind,count:number)=>Promise<string>};
const directions:Record<World['player']['direction'],string>={up:'North',down:'South',left:'West',right:'East','up-left':'North west','up-right':'North east','down-left':'South west','down-right':'South east'};
const decimal=(value:number|null)=>value===null?'—':value.toFixed(1);
export default function PlayMonitor({world,canvas,meter,suspended,tab,onTab,onClose,onSpawn}:Props){
 const snapshot=()=>readPlayMonitor(world.current,canvas.current,meter.current.read(performance.now()));
 const [stats,setStats]=useState(snapshot);
 useEffect(()=>{
  const refresh=()=>setStats(readPlayMonitor(world.current,canvas.current,meter.current.read(performance.now())));
  refresh();const timer=window.setInterval(refresh,500);return()=>window.clearInterval(timer);
 },[world,canvas,meter,suspended]);
 const elapsed=Math.floor(stats.seconds),clock=`${Math.floor(elapsed/60).toString().padStart(2,'0')}:${(elapsed%60).toString().padStart(2,'0')}`;
 return <aside id="studio-play-monitor" className="studio-play-monitor" aria-label="Live game monitor">
  <header><Activity size={17}/><h2>{tab==='combat'?'Combat':'Game monitor'}</h2><button aria-label="Close game monitor" onClick={onClose}><X size={17}/></button></header>
  <div className="studio-play-tab-row"><div className="studio-play-tabs" role="tablist" aria-label="Play tools" onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const next=e.key==='Home'?'monitor':e.key==='End'?'combat':tab==='monitor'?'combat':'monitor';onTab(next);e.currentTarget.querySelector<HTMLButtonElement>(`#studio-${next}-tab`)?.focus()}}><button role="tab" id="studio-monitor-tab" tabIndex={tab==='monitor'?0:-1} aria-selected={tab==='monitor'} aria-controls="studio-monitor-panel" onClick={()=>onTab('monitor')}><Activity size={15}/>Monitor</button><button role="tab" id="studio-combat-tab" tabIndex={tab==='combat'?0:-1} aria-selected={tab==='combat'} aria-controls="studio-combat-panel" onClick={()=>onTab('combat')}><Swords size={15}/>Combat</button></div><button className="studio-dock-close studio-mobile-monitor-close" aria-label="Collapse play tools" onClick={onClose}><X size={18}/></button></div>
  {tab==='combat'?<CombatPanel stats={stats} suspended={suspended} onSpawn={async(kind,count)=>{const result=await onSpawn(kind,count);setStats(snapshot());return result}} onClear={()=>{clearCombatEnemies(world.current);setStats(snapshot())}} onHeal={()=>{restoreCombatHealth(world.current);setStats(snapshot())}}/>:<div className="studio-monitor-body" role="tabpanel" id="studio-monitor-panel" aria-labelledby="studio-monitor-tab">
   <section className="studio-monitor-performance" aria-label="Render performance">
    <div className="studio-monitor-state" data-suspended={suspended}><i/>{suspended?'Paused':'Live'}</div>
    <div className="studio-fps"><strong>{decimal(stats.fps)}</strong><span>FPS</span></div>
    <dl className="studio-monitor-timings"><div><dt>Frame time</dt><dd>{decimal(stats.frameMs)} <small>ms</small></dd></div><div title="Time spent submitting each frame on the CPU; excludes asynchronous GPU execution."><dt>Draw · CPU</dt><dd>{decimal(stats.drawMs)} <small>ms</small></dd></div></dl>
   </section>
   <section><h3>Session</h3><dl><div><dt>Location</dt><dd>{stats.location}</dd></div><div><dt>Lighting</dt><dd>{stats.lighting}</dd></div><div><dt>Elapsed</dt><dd>{clock}</dd></div><div><dt>Objects</dt><dd>{stats.objects}</dd></div><div><dt>Ground drops</dt><dd>{stats.drops}</dd></div><div><dt>Creatures</dt><dd>{stats.creatures}</dd></div><div><dt>Active effects</dt><dd>{stats.effects}</dd></div></dl></section>
   <section><h3>Player</h3><dl><div><dt>Health</dt><dd>{Math.round(stats.health)}%</dd></div><div><dt>Stamina</dt><dd>{Math.round(stats.stamina)}%</dd></div><div><dt>Food</dt><dd>{Math.round(stats.food)}%</dd></div><div><dt>Water</dt><dd>{Math.round(stats.water)}%</dd></div><div><dt>Position</dt><dd>{stats.x}, {stats.y}</dd></div><div><dt>Facing</dt><dd>{directions[stats.direction]}</dd></div><div><dt>Movement</dt><dd>{stats.action}</dd></div><div><dt>Equipped</dt><dd>{stats.equipped}</dd></div></dl></section>
   <section><h3>Supplies</h3><dl><div><dt>Raw chicken</dt><dd>{stats.raw}</dd></div><div><dt>Cooked chicken</dt><dd>{stats.cooked}</dd></div><div><dt>Wood / logs</dt><dd>{stats.logs}</dd></div></dl></section>
   <section><h3>Game view</h3><dl><div><dt>Viewport</dt><dd>{stats.viewport}</dd></div><div><dt>Render buffer</dt><dd>{stats.buffer}</dd></div><div><dt>Renderer</dt><dd>{stats.renderer}</dd></div></dl></section>
   <p className="studio-monitor-note">Live readings update twice a second. Restart gives you 3 raw chicken to test cooking. Play progress resets when you stop.</p>
  </div>}
 </aside>;
}
