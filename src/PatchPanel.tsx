import {PATCH_LETTER_POSTSCRIPT,patchLetterDirections} from './patch-letter';
import React,{useEffect,useRef} from 'react';
import type {World} from './survival-engine';
import StationMenu from './StationMenu';
import {LOOT_CHEST_ID,lootChestInMenuRange} from './loot-chest';
import {PATCH_NOTE_TEXT,PATCH_QUEST_TITLE,patchStatus,recruitPatch,commandPatch} from './patch-quest';
import {usePatchConversation} from './use-patch-conversation';
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
 const [reverse,setReverse]=React.useState(false);
 const caption=reverse?'Read letter':'Turn over';
 return <StationMenu compact presentation="letter" world={world} title={PATCH_QUEST_TITLE} label={`${PATCH_QUEST_TITLE}, a folded note from P-04`} emblem={<NoteEmblem/>} closeLabel="Back to supplies" onClose={onClose} className="patch-note-menu"
  footerAction={<div className="patch-note-actions">
   <button type="button" className="patch-note-turn" aria-label={reverse?'Read the front of the letter':'Turn over to see the station sketch'} onClick={()=>setReverse(value=>!value)}>{caption} <span aria-hidden="true">↶</span></button>
   <button type="button" className="patch-note-return" onClick={onClose}>Back to supplies</button>
  </div>}>
  <article key={String(reverse)} className="patch-note-paper" tabIndex={0} aria-label={reverse?'Station sketch':"P-04's note"}>
   <div className={reverse?"patch-note-sheet patch-note-sheet--sketch":"patch-note-sheet"}>
    <div className="patch-note-provenance"><span>{reverse?'Pencilled on the reverse':'Left with the supplies'}</span><span className="patch-note-rule" aria-hidden="true"/></div>
    {reverse?<div className="patch-note-sketch">
     <img src="/survival/patch-v4/station-sketch.webp" alt="A pencil sketch of a broken-roofed shed with a chain hoist."/>
     <div><h3>Maintenance station</h3><p>{patchLetterDirections(world)}</p></div>
    </div>:<>
     {noteParagraphs.slice(0,-1).map((paragraph,index)=><p className={index===0?'patch-note-salutation':index===1?'patch-note-promise':undefined} key={index}>{paragraph}</p>)}
     <div className="patch-note-signature"><span className="patch-note-signature-mark" aria-hidden="true"><i/><i/><i/></span><span>{noteParagraphs.at(-1)}</span></div>
     {world.patchQuest?.suppliesDelivered&&<p className="patch-note-postscript">{PATCH_LETTER_POSTSCRIPT}</p>}
    </>}
   </div>
  </article>
 </StationMenu>;
}

/** Short conversation choices leave the repair itself in the game world. */
export default function PatchPanel({world,onClose,onChange}:Props){
 const talk=usePatchConversation(world,onClose);
 const copy=useRef<HTMLDivElement>(null);
 useEffect(()=>{copy.current?.scrollTo({top:0})},[talk.page]);
 const status=patchStatus(world);
 if(!status)return null;
 const invite=()=>{if(recruitPatch(world)){onClose();onChange()}};
 const command=(value:'follow'|'stay'|'camp')=>{if(commandPatch(world,value)){onClose();onChange()}};
 const current=world.patchQuest?.command;
 const commands=<div className="patch-choices" data-commands={status.canCommand}>
   {status.canRecruit?<button type="button" className="supply-primary" onClick={invite}>Come with us</button>:status.canCommand?<>
    <button type="button" aria-pressed={current==='follow'} onClick={()=>command('follow')}>Follow me</button>
    <button type="button" aria-pressed={current==='stay'} onClick={()=>command('stay')}>Stay here</button>
    <button type="button" aria-pressed={current==='camp'} onClick={()=>command('camp')}>Return to camp</button>
   </>:<button type="button" onClick={onClose}>{status.canRepair?'Ready to repair':world.patchQuest?.recruited?'Let’s get you home':'I’ll look for it'}</button>}
  </div>;
 return <StationMenu compact presentation="conversation" world={world} title={status.title} subtitle={talk.condition} label={`${status.title} companion`} image="/survival/patch-v3/portrait.webp" closeLabel="End conversation" onClose={onClose} onBack={talk.back} className="patch-menu" footerAction={commands}>
  <div className="patch-dialogue-body">
   <figure className="patch-portrait" data-memory={talk.atGate}>
    {talk.atGate?<img src="/survival/patch-v4/gate-memory.webp" alt="P-04 pulling an injured evacuee through the industrial gate"/>:
     <img src="/survival/patch-v3/portrait.webp" alt="Patch, a battered rescue robot with a warm amber eye"/>}
    <figcaption>{talk.atGate?'The industrial gate':<><span>P-04</span><span className="patch-signal" aria-hidden="true"><i/><i/><i/></span></>}</figcaption>
   </figure>
   <div ref={copy} className="patch-dialogue-copy" tabIndex={0} aria-label="Conversation with Patch">
    <div className="patch-conversation" aria-live="polite" aria-atomic="true">
     {talk.question&&<p className="patch-player-question">{talk.question}</p>}
     <p className="patch-line">{talk.line}</p>
    </div>
    {talk.page.kind==='greeting'&&!!status.objective&&!status.canCommand&&<p className="patch-objective">{status.objective}</p>}
    {talk.topics.length>0&&<div className="patch-talk">
     {talk.showTopics?<>
      <div className="patch-topics" aria-label="Questions for Patch">
       {talk.topics.map(item=><button type="button" key={item.id} onClick={()=>talk.select(item.id)}>{item.label}<span aria-hidden="true">›</span></button>)}
      </div>
      <button type="button" className="patch-talk-back" onClick={talk.back}>Back to conversation</button>
     </>:<>
      {talk.next&&<button type="button" className="patch-next" onClick={talk.next.open}>{talk.next.label}<span aria-hidden="true">›</span></button>}
      <button type="button" className="patch-talk-toggle" onClick={talk.ask}>{talk.question?'Ask something else':'Ask Patch'}</button>
     </>}
    </div>}
   </div>
  </div>
 </StationMenu>;
}
