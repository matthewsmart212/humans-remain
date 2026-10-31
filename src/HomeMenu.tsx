import React,{useState} from 'react';
import {Play,Map,Images,Settings,Shirt,Users,Footprints} from 'lucide-react';
import './home-menu.css';
type Destination='game'|'editor'|'checklist'|'yard'|'locker'|'friends';
type Preferences={sound:boolean;music:boolean;haptics:boolean};
export default function HomeMenu({onNavigate,name,onName,prefs,onPrefs,best}:{onNavigate:(page:Destination)=>void;name:string;onName:(name:string)=>void;prefs:Preferences;onPrefs:(prefs:Preferences)=>void;best:number}){
 const [draftName,setDraftName]=useState(name);
 return <main className="home-hub"><div className="home-hub-inner">
  <header><h1>Home</h1><span>Best run · {best} {best===1?'night':'nights'}</span></header>
  <nav className="home-destinations" aria-label="Main navigation">
   <button className="home-play" onClick={()=>onNavigate('game')}><Play size={32}/><h2>Play game</h2><p>Start a survival run.</p></button>
   <button onClick={()=>onNavigate('editor')}><Map size={32}/><h2>World Builder</h2><p>Build and edit your world.</p></button>
   <button onClick={()=>onNavigate('checklist')}><Images size={32}/><h2>Asset Library</h2><p>Upload artwork and edit assets.</p></button>
  </nav>
  <nav className="home-secondary" aria-label="More screens"><button onClick={()=>onNavigate('yard')}><Footprints size={18}/>Art walk</button><button onClick={()=>onNavigate('locker')}><Shirt size={18}/>Locker</button><button onClick={()=>onNavigate('friends')}><Users size={18}/>Crew</button></nav>
  <details className="home-settings"><summary><Settings size={18}/>Settings</summary><div className="home-settings-body">
   <form onSubmit={e=>{e.preventDefault();if(draftName.trim())onName(draftName.trim())}}><label htmlFor="home-name">Player name</label><div><input id="home-name" value={draftName} maxLength={16} onChange={e=>setDraftName(e.target.value)} required/><button disabled={!draftName.trim()||draftName.trim()===name}>Save name</button></div></form>
   <div className="home-toggles">{([['sound','Sound effects'],['music','Music'],['haptics','Haptics']] as const).map(([key,title])=><label key={key}><input type="checkbox" checked={prefs[key]} onChange={e=>onPrefs({...prefs,[key]:e.target.checked})}/>{title}</label>)}</div>
  </div></details>
 </div></main>;
}
