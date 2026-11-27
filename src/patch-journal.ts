import type {PatchQuestState} from './patch-quest';
import type {World} from './survival-engine';

export const PATCH_QUEST_TITLE='A Light Left On';
export type PatchStage='letter'|'diagnose'|'dispatch'|'salvage'|'repair'|'invite'|'escort'|'home';
type Entry={id:string;title:string;text:string};
export type PatchJournal={title:string;stage:PatchStage;objective:string;entries:readonly Entry[];complete:boolean};

export function patchStage(q:PatchQuestState):PatchStage{
 if(q.suppliesDelivered)return 'home';
 if(q.recruited)return 'escort';
 if(q.servoInstalled)return 'invite';
 if(q.servoClaimed)return 'repair';
 if(q.dispatchRead)return 'salvage';
 if(q.diagnosed)return 'dispatch';
 if(q.discovered)return 'diagnose';
 return 'letter';
}

export function patchJournalStage(world:World):PatchStage|undefined{
 const q=world.patchQuest;
 return q&&(q.noteRead||q.discovered||q.servoClaimed)?patchStage(q):undefined;
}

export function patchObjective(q:PatchQuestState):string{
 switch(patchStage(q)){
  case 'letter':return 'Cross Stillwater’s southern bridge. Follow the west bank south to the shelter with the flashing lamp.';
  case 'diagnose':return 'Talk to P-04 at the shelter and take his field scanner.';
  case 'dispatch':
   if(!q.scannerLoaned)return 'Take the field scanner from P-04 at the shelter.';
   if(!q.footprintsFound)return 'Face the prints beside P-04 and tap SCAN.';
   if(q.footprintsFound===3)return 'Take the spare W-6 at the foot of the orange signal mast.';
   return 'Walk along the west bank toward the signal mast. Tap SCAN ahead to follow P-04’s footprints.';
  case 'salvage':return q.haulerInspected?'Go around the cable-hauler to its brake housing. Free the W-6 drive.':q.scannerLoaned?'Follow sled runners and crawler cleats up the logging road. Check the hauler’s load plate west of the northern bridge.':'Follow the logging road toward the northwest iron mine. Find the cable works west of the northern bridge and check the hauler’s load plate.';
  case 'repair':return q.discovered?'Bring the W-6 back to P-04 at the shelter. Talk to him, then hold REPAIR to fit it.':'Find P-04 at the lakeside rescue shelter. You have a drive that might fit.';
  case 'invite':return 'Speak to P-04 and invite him back to camp.';
  case 'escort':return 'Walk P-04 back to the chest where he left your tools.';
  case 'home':return q.nameIntroduced===false?'Talk to P-04 beside the camp chest.':'Patch is part of the camp.';
 }
}

/** Entries are evidence that this survivor actually uncovered. An older run
 * that already has the servo never acquires a transfer slip it did not read. */
export function patchJournal(world:World):PatchJournal|undefined{
 const q=world.patchQuest;
 if(!q||(!q.noteRead&&!q.discovered&&!q.servoClaimed))return;
 const entries:Entry[]=[];
 if(q.noteRead)entries.push({id:'note',title:'The folded letter',text:'Someone packed tools for whoever reached this camp. P-04 signed the note and drew the old chain hoist beside his shelter on the back.'});
 if(q.discovered)entries.push({id:'shelter',title:'The light in the shelter',text:'The three flashes came from a rescue unit with one knee folded underneath him. His own things were out in the wet. The folded blanket on the stretcher was dry.'});
 if(q.diagnosed)entries.push({id:'drive',title:'A spare for his knee',text:q.dispatchRead?'The W-6 drive slips when P-04 puts weight on his knee. The signal post kept a record of the last spare.':'P-04 needs a W-6 for his left knee. He left a spare at the signal mast before his leg gave out.'});
 if(q.scannerLoaned)entries.push({id:'scanner',title:'His field scanner',text:'A deep right tread, a dragged left toe. P-04 lent me his scanner to find the same marks in soft ground. I can use the journal compass to pick up the trail again.'});
 if(q.footprintsFound===3)entries.push({id:'prints',title:'The end of his trail',text:'His left foot scraped the mud all the way back from the orange signal mast. The spare is at its base.'});
 if(q.dispatchRead)entries.push({id:'dispatch',title:'Last dispatch',text:'“Transfer 14. Last W-6 fitted to the cable-hauler, west of the logging bridge. Leave installed for the next lift.” In the margin, in pencil, “Last lift was the evacuation sled.”'});
 if(q.haulerInspected)entries.push({id:'plate',title:'The hauler’s load plate',text:'A W-6 stamp and three pinholes, just like his. The plate shows a second service hatch behind the brake drum on the opposite side of the hauler.'});
 if(q.servoClaimed)entries.push({id:'recovered',title:'A drive to carry back',text:q.haulerInspected?'The drive came free when I took the strain off the brake. A loop of rescue-sled rope was still caught in the drum.':'I have a replacement drive servo for P-04.'});
 if(q.servoInstalled)entries.push({id:'repair',title:'Back on his feet',text:'The replacement held. He tested the bad leg once, then stood up on his own.'});
 if(q.recruited)entries.push({id:'invitation',title:'The way home',text:'P-04 knows where the tools came from. This is his first walk back with someone beside him.'});
 if(q.suppliesDelivered)entries.push({id:'home',title:'Shelter occupied',text:`${q.nameIntroduced===false?'He':'Patch'} set his parcel inside the same chest. He listened to my footsteps for a moment before he put the lid down. This time, someone brought the rescuer home.`});
 return {title:PATCH_QUEST_TITLE,stage:patchStage(q),objective:patchObjective(q),entries,complete:q.suppliesDelivered&&q.nameIntroduced!==false};
}
