import React from 'react';
import type {World} from './survival-engine';
import StationMenu from './StationMenu';
import {LOOT_CHEST_ID,lootChestInMenuRange} from './loot-chest';
import {PATCH_NOTE_TEXT,patchStatus,recruitPatch,commandPatch} from './patch-quest';
import './patch-panel.css';

type Props={world:World;onClose:()=>void;onChange:()=>void};

/** Reading the paper never removes it from the starter supplies. */
export function PatchNotePanel({world,onClose,onChange}:Props){
 const back=()=>{
  if(lootChestInMenuRange(world,LOOT_CHEST_ID)){
   world.lootChestId=LOOT_CHEST_ID;
   world.stationPanel='rare-cache';
   onChange();
  }else onClose();
 };
 return <StationMenu compact world={world} title="A folded note" label="A folded note from P-04" closeLabel="Back to supplies" onClose={back} className="patch-note-menu"
  footerAction={<button type="button" onClick={back}>Back to supplies</button>}>
  <article className="patch-note-paper" tabIndex={0} aria-label="P-04's note">
   {PATCH_NOTE_TEXT.split('\n\n').map((paragraph,index)=><p key={index}>{paragraph}</p>)}
  </article>
 </StationMenu>;
}

/** Short conversation choices leave the repair itself in the game world. */
export default function PatchPanel({world,onClose,onChange}:Props){
 const status=patchStatus(world);
 if(!status)return null;
 const invite=()=>{if(recruitPatch(world)){onClose();onChange()}};
 const command=(value:'follow'|'stay'|'camp')=>{if(commandPatch(world,value)){onClose();onChange()}};
 return <StationMenu compact fitContent world={world} title={status.title} label={`${status.title} companion`} image="/survival/patch-v1/portrait.webp" onClose={onClose} className="patch-menu">
  <div className="patch-conversation">
   <span className="patch-signal" aria-hidden="true"><i/><i/><i/></span>
   <p className="patch-line">{status.line}</p>
   {!!status.objective&&!status.canCommand&&<p className="patch-objective">{status.objective}</p>}
  </div>
  <div className="patch-choices">
   {status.canRecruit?<button type="button" className="supply-primary" onClick={invite}>Come with us</button>:status.canCommand?<>
    <button type="button" className="supply-primary" onClick={()=>command('follow')}>Follow me</button>
    <button type="button" onClick={()=>command('stay')}>Stay here</button>
    <button type="button" onClick={()=>command('camp')}>Return to camp</button>
   </>:<button type="button" onClick={onClose}>{status.canRepair?'Ready to repair':world.patchQuest?.recruited?'Let’s get you home':'I’ll look for it'}</button>}
  </div>
 </StationMenu>;
}
