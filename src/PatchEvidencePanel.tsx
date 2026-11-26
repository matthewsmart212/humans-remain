import React from 'react';
import type {World} from './survival-engine';
import {fieldNoteDestination,markFieldNote} from './patch-field-notes';
import {patchEvidence} from './patch-evidence';
import StationMenu from './StationMenu';
import './patch-panel.css';

export function PatchEvidencePanel({world,onClose}:{world:World;onClose:()=>void}){
 const clue=patchEvidence(world);
 const lead=fieldNoteDestination(world);
 return <StationMenu compact presentation="letter" className="patch-note-menu" world={world} title={clue.title}
  image={clue.art} closeLabel="Close inspection" onClose={onClose}
  footerAction={<div className="patch-note-actions">
   {lead&&<button className="patch-note-turn" onClick={()=>{markFieldNote(world);onClose()}}>Mark {lead.label.toLowerCase()}</button>}
   <button className="patch-note-return" onClick={onClose}>Back to the trail</button>
  </div>}>
  <article className="patch-note-paper" tabIndex={0}>
   <div className="patch-note-sheet patch-evidence-sheet">
    <div className="patch-note-provenance">{clue.provenance}</div>
    <div className="patch-note-sketch"><img src={clue.art} alt="" draggable={false}/>
     <div><p>{clue.text}</p><p className="patch-evidence-annotation"><small>{clue.annotationLabel}</small>{clue.annotation}</p></div>
    </div>
   </div>
  </article>
 </StationMenu>;
}
