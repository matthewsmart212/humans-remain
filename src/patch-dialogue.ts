import {patchRouteSite} from './patch-placement';
import type {World} from './survival-engine';
import {patchSpeakerName,patchStatus} from './patch-quest';
import {LOOT_CHEST_ID,LOOT_CHEST_REWARDS} from './loot-chest';

export type PatchTopicId='supplies'|'identity'|'reclamation'|'damage'|'drive'|'camp'|'watch'|'bed';
type Topic={id:PatchTopicId;label:string};
type Followup={question:string;reply:string};

const identity:Topic={id:'identity',label:'What did you do before?'};
const receiver:Topic={id:'reclamation',label:'Who cut that wire?'};
const damage:Topic={id:'damage',label:'Can I get you moving?'};
const drive:Topic={id:'drive',label:'How does the leg feel?'};
const camp:Topic={id:'camp',label:'How are we doing?'};
const watch:Topic={id:'watch',label:'Can you keep watch?'};
const loadTestPassed='It takes my weight. Fancy some company on the walk back?';

/** Only show questions a survivor could ask at this point in their meeting. */
export function patchArrivalReply(world:World){
 const chest=world.lootChests?.[LOOT_CHEST_ID];
 // Other caches can contain the same gear. Only an actual transfer out of
 // the camp chest is evidence that the survivor used P-04's supplies.
 const taken=LOOT_CHEST_REWARDS.filter(item=>chest?.contents?.[item.kind]===0).length;
 if(taken)return {
  label:world.patchQuest?.noteRead?'Thanks for the tools.':taken===1?'I took a tool.':'I took the tools.',
  line:'I sharpened the axe. Figured that was one less job for whoever got there.',
 };
 if(world.patchQuest?.noteRead)return {label:'I found your note.',line:'I tucked it under the lid. Glad you found it before the rain did.'};
 if(chest?.menuShown)return {label:'I left the tools there.',line:'They’ll keep. They’re yours when you need them.'};
 return {label:'I followed your light.',line:'Then I’m glad I kept it on.'};
}

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
  case 'bed':return 'That’s for anyone I bring in off the bank. It’s the only spot the roof doesn’t drip on. I’m easier to towel off.';
  case 'supplies':
   if(state.suppliesDelivered)return 'I used to open that chest just to see if a tool was missing. An empty space meant someone had made it.';
   if(state.noteRead)return 'I tucked it under the lid. Glad you found it before the rain did.';
   return 'Yes. There is a shelter across the lake. I left tools there for whoever came next.';
  case 'identity':return patchSpeakerName(state)==='Patch'
   ?'I pulled people out of the evacuation zone. The crew knew me as P-04. I prefer Patch.'
   :'I drove a rescue sled. When the smoke got thick, people could still see this lamp.';
  case 'reclamation':return 'I had a casualty on my sled when the order came to leave them at the gate. I cut my receiver wire and took them through.';
  case 'damage':
   if(state.servoClaimed)return 'That is the drive. Three pins under my knee. If you hold it straight, I can shut the cover.';
   if(state.haulerInspected)return 'A W-6 on the load plate? That is ours. Take the strain off the brake drum. The drive slides out the other side.';
   if(state.dispatchRead)return 'A cable-hauler. Of course. They fitted our rescue winches to those machines when the sled teams ran short. The three-pin socket is the same.';
   return state.scannerLoaned?patchSearchReminder(state):'The drive in my knee is stripped. I left a spare by the signal mast. My scanner can read the tracks I made coming back.';

  case 'drive':return state.recruited
   ?'It clicks on hills. I can live with a click.'
   :loadTestPassed;
  case 'watch':return 'Take me along and I’ll call out any machines I spot. I’ll also tell you when you’re bleeding. People tend to miss that.';
  case 'camp':
   if(world.player.hp<50)return 'You’re hurt. Want me to stay with you?';
   if(world.phase==='night')return 'I can take first watch. You’ve got eyelids. Might as well use them.';
   return world.camp.hearth.fuel>0
    ?'Fire’s lit, tools are dry, and I walked here. Pretty good day.'
    :'Could use a fire. Wet tools I can fix. Wet socks are your department.';
 }
}

/** A second, optional exchange is local to this conversation, including on restored saves. */
export function patchDialogueFollowup(world:World,id:PatchTopicId):Followup|undefined{
 if(!patchDialogueTopics(world).some(topic=>topic.id===id))return;
 if(id==='reclamation')return {question:'Could I fix it?',reply:'No, thank you. If they ever give that order again, I’d rather miss the call.'};
 if(id==='supplies')return world.patchQuest!.suppliesDelivered
  ?{question:'There’s room for you here, too.',reply:'Thanks. I’ve made beds for half the valley. About time I claimed one.'}
  :{question:'Why leave supplies for strangers?',reply:'Ever try cutting firewood with cold hands and no axe? I could do something about the axe.'};
 if(id==='camp')return {question:'Do you miss running rescues?',reply:'I still count everyone on the way out. And again on the way home.'};
}

function patchSearchReminder(q:NonNullable<World['patchQuest']>){
 if(q.footprintsFound===3)return 'The drive’s at the foot of the orange mast. Bring it back and we’ll fit it.';
 if(q.footprintsFound)return 'Keep my scanner equipped and follow my prints along the west bank to the mast.';
 return 'Start by my left foot. Equip my scanner from your toolbar and the prints will light up blue. Keep it out while you walk.';
}

export function patchOpeningLine(world:World):string{
 const status=patchStatus(world),state=world.patchQuest;
 if(!status||!state)return '';
 if(!state.discovered)return status.line;
 if(!state.servoInstalled){
  if(state.servoClaimed)return 'That’s the one. I’ll hold the cover. Push the drive in until it clicks.';
  if(state.haulerInspected)return 'The plate matches. Did you find the brake drum on the far side?';
  if(state.dispatchRead)return 'The ledger says cable-hauler? Check its load plate for W-6.';
  if(state.scannerLoaned)return patchSearchReminder(state);
  const greeting=state.noteRead?'Found my note, then.':'Glad you spotted the lamp.';
  return greeting+' I’d stand up, but my left knee has other plans. I left a spare knee drive at the orange signal mast. It’s stamped W-6. Take my scanner. Follow my footprints to the mast and bring the drive back.';
 }
 if(!state.recruited)return loadTestPassed;
 if(!state.suppliesDelivered)return 'Let’s get these supplies into the chest by the campfire. I can carry them now.';
 if(state.command==='follow')return 'I’m with you. Which way are we heading?';
 if(state.command==='camp')return 'I’m heading back to camp. Meet you at the chest.';
 return status.line==='Shelter occupied.'
  ?'I used to check that chest for signs of people. It’s good to have someone to talk to.'
  :'I’ll wait here. Give me a shout when you’re ready.';
}
