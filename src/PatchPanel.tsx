import React from 'react';
import type {World} from './survival-engine';
import StationMenu from './StationMenu';
import {LOOT_CHEST_ID,lootChestInMenuRange} from './loot-chest';
import {PATCH_NOTE_TEXT,patchStatus,recruitPatch,commandPatch} from './patch-quest';
import './patch-panel.css';

type Props={world:World;onClose:()=>void;onChange:()=>void};
const noteParagraphs=PATCH_NOTE_TEXT.split('\n\n');

function NoteEmblem(){
 return <svg className="patch-note-emblem" viewBox="0 0 32 38" fill="none" aria-hidden="true">
  <path d="M5 2h16l7 7v26H5z" fill="#e8ddc2" stroke="#ad9667" strokeWidth="1.5"/>
  <path d="M21 2v8h7" fill="#f7eed9" stroke="#ad9667" strokeWidth="1.2"/>
  <path d="M10 15h12M10 20h12M10 25h8" stroke="#514b3a" strokeWidth="1.5" strokeLinecap="round"/>
 </svg>;
}

/** Reading the paper never removes it from the starter supplies. */
export function PatchNotePanel({world,onClose,onChange}:Props){
 const back=()=>{
  if(lootChestInMenuRange(world,LOOT_CHEST_ID)){
   world.lootChestId=LOOT_CHEST_ID;
   world.stationPanel='rare-cache';
   onChange();
  }else onClose();
 };
 return <StationMenu compact world={world} title="A folded note" label="A folded note from P-04" emblem={<NoteEmblem/>} closeLabel="Back to supplies" onClose={back} className="patch-note-menu"
  footerAction={<button type="button" className="patch-note-return" onClick={back}><span aria-hidden="true">←</span> Back to supplies</button>}>
  <article className="patch-note-paper" tabIndex={0} aria-label="P-04's note">
   <div className="patch-note-provenance"><span>Left with the supplies</span><span className="patch-note-rule" aria-hidden="true"/></div>
   {noteParagraphs.slice(0,-1).map((paragraph,index)=><p className={index===0?'patch-note-salutation':index===1?'patch-note-promise':undefined} key={index}>{paragraph}</p>)}
   <div className="patch-note-signature"><span className="patch-note-signature-mark" aria-hidden="true"><i/><i/><i/></span><span>{noteParagraphs.at(-1)}</span></div>
  </article>
 </StationMenu>;
}

/** Short conversation choices leave the repair itself in the game world. */
export default function PatchPanel({world,onClose,onChange}:Props){
 const status=patchStatus(world);
 if(!status)return null;
 const invite=()=>{if(recruitPatch(world)){onClose();onChange()}};
 const command=(value:'follow'|'stay'|'camp')=>{if(commandPatch(world,value)){onClose();onChange()}};
 const current=world.patchQuest?.command;
 const condition=status.canCommand?(current==='follow'?'Following you':current==='camp'?'Returning to camp':'Waiting here'):world.patchQuest?.recruited?'Heading home':status.canRecruit?'Drive restored':'Rescue unit · P-04';
 return <StationMenu compact fitContent world={world} title={status.title} subtitle={condition} label={`${status.title} companion`} image="/survival/patch-v1/portrait.webp" onClose={onClose} className="patch-menu">
  <div className="patch-conversation">
   <span className="patch-signal" aria-hidden="true"><i/><i/><i/></span>
   <p className="patch-line">{status.line}</p>
   {!!status.objective&&!status.canCommand&&<p className="patch-objective">{status.objective}</p>}
  </div>
  <div className="patch-choices" data-commands={status.canCommand}>
   {status.canRecruit?<button type="button" className="supply-primary" onClick={invite}>Come with us</button>:status.canCommand?<>
    <button type="button" className="supply-primary" aria-pressed={current==='follow'} onClick={()=>command('follow')}>Follow me</button>
    <button type="button" aria-pressed={current==='stay'} onClick={()=>command('stay')}>Stay here</button>
    <button type="button" aria-pressed={current==='camp'} onClick={()=>command('camp')}>Return to camp</button>
   </>:<button type="button" onClick={onClose}>{status.canRepair?'Ready to repair':world.patchQuest?.recruited?'Let’s get you home':'I’ll look for it'}</button>}
  </div>
 </StationMenu>;
}
