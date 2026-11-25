import {PATCH_LETTER_POSTSCRIPT,patchLetterDirections} from './patch-letter';
import React,{useLayoutEffect,useRef} from 'react';
import type {World} from './survival-engine';
import StationMenu from './StationMenu';
import {LOOT_CHEST_ID,lootChestInMenuRange} from './loot-chest';
import {PATCH_NOTE_TEXT,PATCH_QUEST_TITLE} from './patch-quest';
import {patchChat,choosePatchChat,closePatchChat,type PatchChat} from './patch-chat';
import {patchJournalStage} from './patch-journal';
import {patchDialogueReply} from './patch-dialogue';
import {setPatchChatBounds} from './patch-chat-bounds';
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
 return <LetterReader world={world} onClose={back}/>;
}

function LetterReader({world,onClose}:Pick<Props,'world'|'onClose'>){
 const [side,setSide]=React.useState<'letter'|'sketch'|'memory'>('letter');
 const reverse=side!=='letter',memory=side==='memory';
 const caption=reverse?'Read letter':'Turn over';
 return <StationMenu compact presentation="letter" world={world} title={PATCH_QUEST_TITLE} label={`${PATCH_QUEST_TITLE}, a folded note from P-04`} emblem={<NoteEmblem/>} closeLabel="Back to supplies" onClose={onClose} className="patch-note-menu"
  footerAction={<div className="patch-note-actions">
   <button type="button" className="patch-note-turn" aria-label={reverse?'Read the front of the letter':'Turn over to see the station sketch'} onClick={()=>setSide(reverse?'letter':'sketch')}>{caption} <span aria-hidden="true">↶</span></button>
   {reverse&&world.patchQuest?.suppliesDelivered&&<button type="button" className="patch-note-turn" aria-pressed={memory} onClick={()=>setSide(memory?'sketch':'memory')}>{memory?'Station sketch':'Gate memory'}</button>}
   <button type="button" className="patch-note-return" onClick={onClose}>Back to supplies</button>
  </div>}>
  <article key={side} className="patch-note-paper" tabIndex={0} aria-label={memory?'Gate memory':reverse?'Station sketch':"P-04's note"}>
   <div className={reverse?"patch-note-sheet patch-note-sheet--sketch":"patch-note-sheet"}>
    <div className="patch-note-provenance"><span>{memory?'As remembered by P-04':reverse?'Pencilled on the reverse':'Left with the supplies'}</span><span className="patch-note-rule" aria-hidden="true"/></div>
    {memory?<div className="patch-note-sketch patch-note-memory">
     <img src="/survival/patch-v4/gate-memory.webp" alt="P-04 pulling an injured evacuee through the industrial gate"/>
     <div><h3>The industrial gate</h3><p>{patchDialogueReply(world,'reclamation')}</p></div>
    </div>:reverse?<div className="patch-note-sketch">
     <img src="/survival/patch-v4/station-sketch.webp" alt="A pencil sketch of a broken-roofed shed with a chain hoist."/>
     <div><h3>Lakeside rescue shelter</h3><p>{patchLetterDirections(world)}</p></div>
    </div>:<>
     {noteParagraphs.slice(0,-1).map((paragraph,index)=><p className={index===0?'patch-note-salutation':index===1?'patch-note-promise':undefined} key={index}>{paragraph}</p>)}
     <div className="patch-note-signature"><span className="patch-note-signature-mark" aria-hidden="true"><i/><i/><i/></span><span>{noteParagraphs.at(-1)}</span></div>
     {world.patchQuest?.suppliesDelivered&&<p className="patch-note-postscript">{PATCH_LETTER_POSTSCRIPT}</p>}
    </>}
   </div>
  </article>
 </StationMenu>;
}

type ChatProps={world:World;onChange:(save?:boolean)=>void};

export function PatchChatHUD({world,onChange}:ChatProps){
 const chat=patchChat(world);
 return chat?<PatchReplies world={world} chat={chat} onChange={onChange}/>:null;
}

function PatchReplies({world,chat,onChange}:ChatProps&{chat:PatchChat}){
 const tray=useRef<HTMLElement>(null),choices=useRef<HTMLDivElement>(null);
 const scrollMark=useRef<HTMLSpanElement>(null);
 const pressedChoice=useRef<EventTarget|null>(null);
 const focusNext=useRef(false);
 const showScrollPosition=()=>{
  const list=choices.current,mark=scrollMark.current;
  if(!list||!mark)return;
  const total=list.scrollHeight;
  mark.hidden=total<=list.clientHeight+1;
  if(!mark.hidden){
   mark.style.top=(100*list.scrollTop/total)+'%';
   mark.style.height=(100*list.clientHeight/total)+'%';
  }
 };
 useLayoutEffect(()=>{
  const el=tray.current,kit=el?.closest('.field-kit');
  if(!el||!kit)return;
  const measure=()=>{
   const rect=el.getBoundingClientRect(),frame=kit.getBoundingClientRect();
   showScrollPosition();
   const css=getComputedStyle(el);
   const inset=(edge:string)=>parseFloat(css.getPropertyValue('--patch-safe-'+edge))||0;
   setPatchChatBounds(world,{x:rect.left-frame.left,y:rect.top-frame.top,width:rect.width,height:rect.height},
    {top:inset('top'),right:inset('right'),bottom:inset('bottom'),left:inset('left')});
  };
  // Keep keyboard entry inside the response list. Movement keys still reach the world.
  el.focus({preventScroll:true});
  measure();
  const observer=new ResizeObserver(measure);
  observer.observe(kit);observer.observe(el);
  return ()=>{observer.disconnect();setPatchChatBounds(world,undefined)};
 },[world]);
 useLayoutEffect(()=>{
  const list=choices.current;
  if(list)list.scrollTop=0;
  showScrollPosition();
  if(focusNext.current){list?.querySelector('button')?.focus({preventScroll:true});focusNext.current=false}
 },[chat]);
 const choose=(id:string,event:React.MouseEvent<HTMLButtonElement>)=>{
  const stage=patchJournalStage(world),command=world.patchQuest?.command;
  focusNext.current=event.detail===0;
  if(choosePatchChat(world,id,chat))onChange(stage!==patchJournalStage(world)||command!==world.patchQuest?.command);
 };
 const end=()=>{if(closePatchChat(world))onChange()};
 const buttonKeys=(event:React.KeyboardEvent)=>{if(event.key==='Enter'||event.key===' ')event.stopPropagation()};
 return <section ref={tray} role="group" aria-label={`Replies to ${chat.speaker}`} tabIndex={-1} className="patch-chat-hud"
  onKeyDown={buttonKeys} onKeyUp={buttonKeys}
  onPointerDown={e=>{pressedChoice.current=(e.target as HTMLElement).closest('button');e.stopPropagation()}}
  onPointerCancel={()=>{pressedChoice.current=null}}
  onClickCapture={e=>{
   // Mobile browsers can retarget Inspect’s synthetic click after its release
   // swaps the action hex for the reply controls underneath the finger.
   if(e.detail>0&&pressedChoice.current!==(e.target as HTMLElement).closest('button')){
    e.preventDefault();e.stopPropagation();
   }
   pressedChoice.current=null;
  }}>
  <span className="patch-chat-transcript" role="status" aria-live="polite" aria-atomic="true">{chat.speaker} — {chat.line}</span>
  <div ref={choices} className="patch-chat-options" onScroll={showScrollPosition}>
   {chat.choices.map(choice=><button type="button" key={choice.id} data-choice={choice.id} aria-pressed={['follow','stay','camp'].includes(choice.id)?world.patchQuest?.command===choice.id:undefined} onClick={e=>choose(choice.id,e)}>{choice.label}</button>)}
  </div>
  <span className="patch-chat-scroll-track" aria-hidden="true"><span ref={scrollMark} hidden/></span>
  <button type="button" className="patch-chat-end" aria-label="End conversation" title="End conversation" onClick={end}><span aria-hidden="true">×</span></button>
 </section>;
}
