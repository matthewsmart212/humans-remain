// Local development fixture only. Not part of the production build or authentication flow.
import React,{useState} from 'react';
import{createRoot}from'react-dom/client';
import ArtworkImporter from '../src/ArtworkImporter';
import {EditorAccessNotice,type EditorAccessState} from '../src/EditorAccess';
import{ChecklistPreview}from'../src/ChecklistPreview';
import{entries}from'../src/catalogue-model';
import '../src/base-checklist.css';
function QA(){const[account,setAccount]=useState<EditorAccessState>('anonymous');const access={state:account,signInUrl:'/signin-with-chatgpt?return_to=%2F%23checklist',signOutUrl:'/signout-with-chatgpt?return_to=%2F%23checklist',refresh:()=>{}};const[id,setId]=useState('base_hearth_t1'),entry=entries.find(e=>e.id===id)!;return <main style={{maxWidth:1080,margin:'20px auto',padding:24,color:'#efe4c4',fontFamily:'sans-serif'}}><h1>Local asset editor check</h1><p>Development-only account states. This fixture does not sign in or bypass production authorization.</p><label>Test identity <select aria-label="Test identity" value={account} onChange={e=>setAccount(e.target.value as EditorAccessState)}>{['anonymous','owner','viewer'].map(s=><option key={s}>{s}</option>)}</select></label><EditorAccessNotice access={access}/><select aria-label="Test asset" value={id} onChange={e=>setId(e.target.value)}>{['base_hearth_t1','base_shelter_t1','base_water_store_t1'].map(id=><option key={id} value={id}>{entries.find(e=>e.id===id)!.name}</option>)}</select><div style={{display:'grid',gridTemplateColumns:'400px 1fr',gap:24}}><div className="al-large-preview"><ChecklistPreview key={id} entry={entry}/></div><section className="al-dialog" style={{position:'static',width:'100%',height:'auto',maxHeight:'none',padding:20,display:'block'}}><ArtworkImporter key={id} entry={entry} canEdit={account==='owner'} onSaved={()=>{}}/></section></div></main>}
createRoot(document.getElementById('root')!).render(<QA/>);
