import {useState} from 'react';
import type {World} from './survival-engine';
import {patchConversationStatus,patchDialogueFollowup,patchDialogueReply,patchDialogueTopics,patchOpeningLine,type PatchTopicId} from './patch-dialogue';

type Page={kind:'greeting'|'topics'}|{kind:'answer'|'followup';topic:PatchTopicId};

/** The web reader and the native conversation use the same sequence of replies. */
export function usePatchConversation(world:World,onClose:()=>void){
 const [page,setPage]=useState<Page>({kind:'greeting'});
 const topics=patchDialogueTopics(world);
 const selected='topic' in page?topics.find(item=>item.id===page.topic):undefined;
 const followup=selected?patchDialogueFollowup(world,selected.id):undefined;
 const showTopics=page.kind==='topics'||('topic' in page&&!selected);
 const readingFollowup=page.kind==='followup'&&!!followup;
 const question=readingFollowup?followup.question:selected?.label;
 const line=readingFollowup?followup.reply:selected?patchDialogueReply(world,selected.id):
  showTopics?'Listening.':patchOpeningLine(world);
 const ask=()=>setPage({kind:'topics'});
 const select=(topic:PatchTopicId)=>setPage({kind:'answer',topic});
 const back=()=>{
  if(readingFollowup&&selected)select(selected.id);
  else if(selected)ask();
  else if(showTopics)setPage({kind:'greeting'});
  else onClose();
 };
 return {page,topics,showTopics,question,line,ask,select,back,condition:patchConversationStatus(world),atGate:selected?.id==='reclamation',
  next:selected&&followup&&!readingFollowup?{label:followup.question,open:()=>setPage({kind:'followup',topic:selected.id})}:undefined};
}
