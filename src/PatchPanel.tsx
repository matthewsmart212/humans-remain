import {PATCH_LETTER_POSTSCRIPT,patchLetterDirections} from './patch-letter';
import React,{useCallback,useLayoutEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {World} from './survival-engine';
import StationMenu from './StationMenu';
import {LOOT_CHEST_ID,lootChestInMenuRange} from './loot-chest';
import {PATCH_NOTE_TEXT,PATCH_QUEST_TITLE,patchSpeakerName} from './patch-quest';
import {patchSpeechSections} from './patch-speech-sections';
import {patchChat,choosePatchChat,closePatchChat,type PatchChat} from './patch-chat';
import {patchJournalStage} from './patch-journal';
import {patchDialogueReply} from './patch-dialogue';
import {PatchReplyStrip} from './PatchReplyStrip';
import {patchBarChoices,patchReplyStripLayout} from './patch-reply-strip-layout';
import {conversationBubbleMetrics,conversationBubbleTail,placeConversationBubble} from './patch-bubble-placement';
import type {MenuInsets} from './station-menu-layout';
import {patchChatActors,subscribePatchChatActors,setPatchChatBounds} from './patch-chat-bounds';
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
   {reverse&&patchSpeakerName(world.patchQuest)==='Patch'&&<button type="button" className="patch-note-turn" aria-pressed={memory} onClick={()=>setSide(memory?'sketch':'memory')}>{memory?'Station sketch':'Gate memory'}</button>}
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
     {patchSpeakerName(world.patchQuest)==='Patch'&&<p className="patch-note-postscript">{PATCH_LETTER_POSTSCRIPT}</p>}
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

type Frame={width:number;height:number;safe:MenuInsets};
const initialFrame:Frame={width:844,height:390,safe:{top:0,right:0,bottom:0,left:0}};

type SpeechSection={text:string;lines:number;singleLineWidth?:number};

/** Read the browser's actual word positions with the same width and font as the bubble. */
function measureSections(probe:HTMLElement,maxLines:number,font:number):SpeechSection[]{
 const node=probe.firstChild;
 if(!node||!node.textContent)return [];
 const text=node.textContent,range=document.createRange();
 const starts:number[]=[];
 let lastY=-Infinity;
 for(const word of text.matchAll(/\S+/g)){
  range.setStart(node,word.index!);
  range.setEnd(node,word.index!+word[0].length);
  const y=range.getBoundingClientRect().top;
  if(Math.abs(y-lastY)>1){starts.push(word.index!);lastY=y}
 }
 range.selectNodeContents(node);
 const singleLineWidth=starts.length===1?Math.ceil(range.getBoundingClientRect().width):undefined;
 const lines=starts.map((start,i)=>text.slice(start,starts[i+1]).trim());
 return patchSpeechSections(lines,maxLines,probe.clientWidth,font).map(section=>({
  text:section.text.replace(/\n/g,' '),lines:section.count,singleLineWidth,
 }));
}

function PatchReplies({world,chat,onChange}:ChatProps&{chat:PatchChat}){
 const tray=useRef<HTMLElement>(null),probe=useRef<HTMLSpanElement>(null);
 const [frame,setFrame]=useState(initialFrame);
 const {width,height,safe}=frame;
 const {bounds}=patchReplyStripLayout(width,height,safe);
 const metrics=conversationBubbleMetrics(width,height,safe,bounds.y);
 const {width:bubbleWidth,padX,font,lineHeight,maxLines}=metrics;
 const [measurement,setMeasurement]=useState<{chat:PatchChat;pages:SpeechSection[]}>();
 const [position,setPosition]=useState<{chat:PatchChat;index:number}>();
 const pages=measurement?.chat===chat?measurement.pages:[{text:chat.line,lines:1}];
 const index=position?.chat===chat?Math.min(position.index,pages.length-1):0;
 const moreHere=index+1<pages.length;

 useLayoutEffect(()=>{
  const el=tray.current;
  if(!el)return;
  const measure=()=>{
   const rect=el.getBoundingClientRect(),css=getComputedStyle(el);
   const inset=(edge:string)=>parseFloat(css.getPropertyValue('--patch-safe-'+edge))||0;
   setFrame({width:rect.width,height:rect.height,safe:{top:inset('top'),right:inset('right'),bottom:inset('bottom'),left:inset('left')}});
  };
  el.focus({preventScroll:true});measure();
  const observer=new ResizeObserver(measure);observer.observe(el);
  window.addEventListener('resize',measure);
  return ()=>{observer.disconnect();window.removeEventListener('resize',measure);setPatchChatBounds(world,undefined)};
 },[world]);
 useLayoutEffect(()=>{
  setPatchChatBounds(world,bounds,safe);
 },[world,bounds.x,bounds.y,bounds.width,bounds.height,safe]);
 useLayoutEffect(()=>{
  const el=probe.current;
  if(!el)return;
  const measure=()=>{
   const sections=measureSections(el,maxLines,font);
   if(sections.length)setMeasurement({chat,pages:sections});
  };
  measure();
  const observer=new ResizeObserver(measure);observer.observe(el);
  document.fonts?.addEventListener('loadingdone',measure);
  return ()=>{observer.disconnect();document.fonts?.removeEventListener('loadingdone',measure)};
 },[chat,bubbleWidth,font,lineHeight,padX,maxLines]);
 const choose=(id:string)=>{
  if(id==='more'&&moreHere){setPosition({chat,index:index+1});return}
  if(id==='back'&&index>0){setPosition({chat,index:index-1});return}
  const stage=patchJournalStage(world),command=world.patchQuest?.command;
  if(choosePatchChat(world,id,chat))onChange(stage!==patchJournalStage(world)||command!==world.patchQuest?.command);
 };
 const replies=patchBarChoices(chat,moreHere);
 const end=()=>{if(closePatchChat(world))onChange()};
 const buttonKeys=(e:React.KeyboardEvent)=>{if(e.key==='Enter'||e.key===' ')e.stopPropagation()};
 return <section ref={tray} className="patch-chat-hud" role="group" aria-label={'Conversation with '+chat.speaker} tabIndex={-1}
  onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onKeyDown={buttonKeys} onKeyUp={buttonKeys}
  style={{'--patch-font':font+'px','--patch-leading':lineHeight+'px'} as React.CSSProperties}>
  <span aria-hidden="true" ref={probe} className="patch-chat-line patch-chat-probe" style={{width:bubbleWidth-2*padX}}>{chat.line}</span>
  <WorldSpeech world={world} frame={frame} metrics={metrics} replyTop={bounds.y}
   speaker={chat.speaker} section={pages[index]}/>
  <PatchReplyStrip width={width} height={height} safe={safe} choices={replies} speaker={chat.speaker}
   choiceSetKey={[chat.view,chat.question,...replies.map(c=>c.id)].join('|')} command={world.patchQuest?.command} onChoose={choose} onClose={end}/>
 </section>;
}

type BubbleProps={world:World;frame:Frame;metrics:ReturnType<typeof conversationBubbleMetrics>;replyTop:number;
 speaker:string;section:SpeechSection};

function WorldSpeech({world,frame,metrics,replyTop,speaker,section}:BubbleProps){
 const subscribe=useCallback((notify:()=>void)=>subscribePatchChatActors(world,notify),[world]);
 const actors=useSyncExternalStore(subscribe,()=>patchChatActors(world),()=>undefined);
 const {width,height,safe}=frame;
 const {padX,padY,headerHeight,lineHeight}=metrics;
 const bubbleWidth=section.singleLineWidth?Math.min(metrics.width,Math.max(142,section.singleLineWidth+2*padX+1)):metrics.width;
 const bubbleHeight=2*padY+headerHeight+lineHeight*section.lines;
 const placement=actors&&placeConversationBubble(width,height,safe,replyTop,actors.patch,actors.survivor,bubbleWidth,bubbleHeight);
 const tail=placement&&conversationBubbleTail(placement);
 return <div className="patch-chat-bubble" style={{left:placement?.x,top:placement?.y,width:bubbleWidth,height:bubbleHeight,
  visibility:placement?'visible':'hidden',padding:padY+'px '+padX+'px'}}>
  <svg className="patch-chat-pointer" aria-hidden="true" width={bubbleWidth} height={bubbleHeight}>
   <image href="/survival/patch-ui-v1/speech-plate.webp" width={bubbleWidth} height={bubbleHeight} preserveAspectRatio="none"/>
   {tail&&<>
    <defs><linearGradient id="patch-copper" x2="1" y2=".6">
     <stop stopColor="#dfa66d"/><stop offset=".4" stopColor="#b77e4c"/><stop offset=".8" stopColor="#97673f"/><stop offset="1" stopColor="#d29a61"/>
    </linearGradient></defs>
    <path d={tail.fill} fill="#1a2823"/>
    <path d={tail.outline} stroke="#402d20" strokeWidth="2.3" strokeLinejoin="round" fill="none"/>
    <path d={tail.outline} stroke="url(#patch-copper)" strokeWidth="1.3" strokeLinejoin="round" fill="none"/>
   </>}
  </svg>
  <div className="patch-chat-transcript" role="status" aria-live="polite" aria-atomic="true">
   <div className="patch-chat-identity" style={{height:headerHeight}}>
    <strong className="patch-chat-name">{speaker}</strong>{speaker==='Patch'&&<small>P-04</small>}
   </div>
   <span className="patch-chat-line">{section.text}</span>
  </div>
 </div>;
}
