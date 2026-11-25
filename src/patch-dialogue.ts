import {patchRouteSite} from './patch-placement';
import type {World} from './survival-engine';
import {patchStatus} from './patch-quest';

export type PatchTopicId='supplies'|'identity'|'reclamation'|'damage'|'drive'|'camp'|'watch'|'bed';
type Topic={id:PatchTopicId;label:string};
type Followup={question:string;reply:string};

const identity:Topic={id:'identity',label:'What did you do before?'};
const receiver:Topic={id:'reclamation',label:'What happened to your receiver?'};
const damage:Topic={id:'damage',label:'Can I get you moving?'};
const drive:Topic={id:'drive',label:'How does the leg feel?'};
const camp:Topic={id:'camp',label:'How are we doing?'};
const watch:Topic={id:'watch',label:'Can you keep watch?'};

/** Only show questions a survivor could ask at this point in their meeting. */
export function patchDialogueTopics(world:World):readonly Topic[]{
 const state=world.patchQuest;
 if(!state?.discovered)return [];
 const supplies:Topic={id:'supplies',label:state.noteRead?'I found your note.':state.suppliesDelivered?'You prepared our camp?':'Were you out here alone?'};
 if(state.suppliesDelivered)return [camp,watch,supplies,receiver,identity];
 const topics=[state.servoInstalled?drive:damage,supplies,receiver,identity];
 if(!state.recruited&&patchRouteSite(world.layout,'shelter'))topics.push({id:'bed',label:'Who is the bedroll for?'});
 return topics;
}

export function patchDialogueReply(world:World,id:PatchTopicId):string|undefined{
 if(!patchDialogueTopics(world).some(topic=>topic.id===id))return;
 const state=world.patchQuest!;
 switch(id){
  case 'bed':return 'Anyone cold. The roof drips on this side. I moved my things here and left the dry side for them.';
  case 'supplies':
   if(state.suppliesDelivered)return 'I used to open that chest just to see if a tool was missing. An empty space meant someone had made it.';
   if(state.noteRead)return 'The paper stayed dry? Good. I put it under the lid three times. The wind kept finding it.';
   return 'Yes. There is a shelter across the lake. I left tools there for whoever came next.';
  case 'identity':return state.suppliesDelivered
   ?'Evacuation support, P-04. That is the name on the plate. When you call me Patch, I know it is you.'
   :'Evacuation support. I carried water and pulled the rescue sled. In smoke, people could find me by the lamp.';
  case 'reclamation':return 'At the industrial gate I had an injured passenger on my sled. The order came through. Leave them. I cut my receiver wire and pulled them through the gate.';
  case 'damage':
   if(state.servoClaimed)return 'That is the drive. Three pins under my knee. If you hold it straight, I can shut the cover.';
   if(state.haulerInspected)return 'A W-6 on the load plate? That is ours. Take the strain off the brake drum. The drive slides out the other side.';
   if(state.dispatchRead)return 'A cable-hauler. Of course. They fitted our rescue winches to those machines when the sled teams ran short. The three-pin socket is the same.';
   if(state.diagnosed)return 'See the three pins? W-6. The same drive pulled my rescue sled. We sent the spares away. The signal post at the west end of the southern bridge kept the dispatch book.';
   return 'My left knee slips under load. I cannot see the plate from this angle. Would you lift the cover for me?';
  case 'drive':return state.recruited
   ?'There is a little click on the left. That is all right. I can hear your footsteps between mine.'
   :'Load test passed. I thought I would have to watch you walk away from here.';
  case 'watch':return 'Ask me to follow. If I see a machine, I will call its bearing. And if you look hurt or need food or water, I will say so. Someone should look out for you.';
  case 'camp':
   if(world.player.hp<50)return 'You are hurt. May I stay close? You did that for me.';
   if(world.phase==='night')return 'After dark I used to count the lights and wonder who was beside them. Tonight I know one of their names.';
   return world.camp.hearth.fuel>0
    ?'I asked someone to light that fire. I never expected to get warm beside it.'
    :'My note said to light a fire if you stayed. I think we can call this a place to stay.';
 }
}

/** A second, optional exchange is local to this conversation, including on restored saves. */
export function patchDialogueFollowup(world:World,id:PatchTopicId):Followup|undefined{
 if(!patchDialogueTopics(world).some(topic=>topic.id===id))return;
 if(id==='reclamation')return {question:'Do you want me to reconnect it?',reply:'No, thank you. They could send that order again. I would like to keep choosing.'};
 if(id==='supplies')return world.patchQuest!.suppliesDelivered
  ?{question:'There’s room for you here, too.',reply:'I allowed for one more person when I counted the spaces. I never counted myself.'}
  :{question:'Why leave supplies for strangers?',reply:'Someone coming through that door would be tired. I knew that much about them.'};
 if(id==='camp')return {question:'Do you miss running rescues?',reply:'I still keep count when we leave. I still count when we get back.'};
}

export function patchOpeningLine(world:World):string{
 const status=patchStatus(world),state=world.patchQuest;
 if(!status||!state)return '';
 if(!state.discovered)return status.line;
 if(!state.servoInstalled){
  if(state.servoClaimed)return 'Human detected. Correct part detected, too. May I borrow your hands?';
  if(state.haulerInspected)return 'The plate matches. Did you find the brake drum on the far side?';
  if(state.dispatchRead)return 'They put it in a hauler? Then it has kept working all this time, too.';
  if(state.diagnosed)return 'The signal post is north of here, at the bridge. I can keep the light on.';
  return state.noteRead?'Human detected. You saw the flashes. Did you find the tools?':'Human detected. Oh. You came towards the light.';
 }
 if(!state.recruited)return 'Supplies… still required? I can carry them now.';
 if(!state.suppliesDelivered)return 'I know this path from the other direction. You lead this time.';
 if(state.command==='follow')return 'Two sets of tracks. I used to make this trip alone.';
 if(state.command==='camp')return 'I know the way back. Three flashes if you need to find me.';
 return status.line==='Shelter occupied.'
  ?'Shelter occupied. I have waited a long time to say that.'
  :'Holding here. My lamp stays on.';
}
