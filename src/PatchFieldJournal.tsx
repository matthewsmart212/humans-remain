import React,{useEffect,useId,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Compass,X} from 'lucide-react';
import type {World} from './survival-engine';
import {patchJournal,PATCH_QUEST_TITLE} from './patch-journal';
import {fieldNoteArt,fieldNoteDestination,fieldNotePage,fieldNoteTrackerCopy,markFieldNote} from './patch-field-notes';
import {currentWaypoint} from './waypoint';
import './patch-field-journal.css';

export function PatchFieldJournal({world,tracker,concealTab=false}:{world:World;tracker?:string;concealTab?:boolean}){
 const [open,setOpen]=useState(false),[selected,setSelected]=useState<string>(),[,refresh]=useState(0);
 const panel=useRef<HTMLElement>(null),trigger=useRef<HTMLButtonElement>(null),titleId=useId(),objectiveId=useId();
 const close=()=>{setOpen(false);setSelected(undefined);requestAnimationFrame(()=>trigger.current?.focus({preventScroll:true}))};
 useEffect(()=>{
  if(!open)return;
  panel.current?.focus({preventScroll:true});
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.stopImmediatePropagation();event.preventDefault();close()}};
  window.addEventListener('keydown',escape,true);
  return ()=>window.removeEventListener('keydown',escape,true);
 },[open]);
 const atlas=tracker===undefined,summary=atlas?undefined:fieldNoteTrackerCopy(world);
 const journal=open?patchJournal(world):undefined;
 const page=journal&&fieldNotePage(journal,selected);
 const lead=journal&&!journal.complete?fieldNoteDestination(world):undefined;
 const waypoint=currentWaypoint(world),marked=!!lead&&waypoint?.x===lead.x&&waypoint.y===lead.y;
 return <div className={'patch-field-notes'+(atlas?' in-atlas':'')} data-open={open} onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}>
  <button ref={trigger} type="button" className="field-notes-tab" aria-label="Field journal" aria-describedby={tracker?objectiveId:undefined} aria-expanded={open} hidden={open||concealTab} onClick={()=>setOpen(true)}>
   <span className="field-notes-bookmark" aria-hidden="true"><img src="/survival/patch-ui-v1/journal-book.png" alt=""/></span>
   <span className="field-notes-copy"><b>{atlas?'Field journal':PATCH_QUEST_TITLE}</b>
    {!atlas&&<span id={objectiveId} className="field-notes-lead">{summary?<><strong>{summary.action}</strong><span> · {summary.location}</span></>:tracker}</span>}
   </span>
   <ChevronRight className="field-notes-chevron" size={16} aria-hidden="true"/>
  </button>
  {open&&journal&&page?.entry&&<section ref={panel} tabIndex={-1} className="field-notes-book" aria-labelledby={titleId}
   onKeyDown={e=>e.stopPropagation()} onKeyUp={e=>e.stopPropagation()}>
   <header><div><small>Field journal</small><h2 id={titleId}>{journal.title}</h2></div>
    <button type="button" aria-label="Close field journal" onClick={close}><X size={18}/></button></header>
   <div className="field-notes-scroll" key={page.entry.id}>
    <div className="field-notes-objective"><i aria-hidden="true">◇</i><strong>{journal.objective}</strong></div>
    <div className="field-notes-entry"><figure><img src={fieldNoteArt(page.entry.id)} alt="" draggable={false}/></figure>
     <article><h3>{page.entry.title}</h3><p>{page.entry.text}</p></article></div>
   </div>
   <footer>
    <div className="field-notes-pages">
     <button type="button" disabled={!page.older} aria-label="Previous field note" onClick={()=>setSelected(page.older)}><ChevronLeft size={19}/></button>
     <span aria-live="polite">{page.index+1} / {journal.entries.length}</span>
     <button type="button" disabled={!page.newer} aria-label="Next field note" onClick={()=>setSelected(page.newer)}><ChevronRight size={19}/></button>
    </div>
    {lead&&<button className="field-notes-track" type="button" disabled={marked} onClick={()=>{if(markFieldNote(world))refresh(n=>n+1)}}><Compass size={15}/>{marked?'Lead marked':'Mark on compass'}</button>}
   </footer>
  </section>}
 </div>;
}
