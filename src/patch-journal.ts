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
  case 'letter':return 'Find the rescue shelter beyond Stillwater Lake. Watch for three amber flashes.';
  case 'diagnose':return 'Speak with P-04 at the shelter and inspect his damaged drive.';
  case 'dispatch':return 'Read the dispatch ledger at the signal post by the west end of the southern bridge. Look for W-6.';
  case 'salvage':return q.haulerInspected?'Go around the cable-hauler to its brake housing. Free the W-6 drive.':'Follow the logging road toward the northwest iron mine. Find the cable works west of the northern bridge and check the hauler’s load plate.';
  case 'repair':return q.discovered?'Return to P-04. Hold REPAIR beside him for six seconds.':'Find P-04 at the lakeside rescue shelter. You have a drive that might fit.';
  case 'invite':return 'Speak to P-04 and invite him back to camp.';
  case 'escort':return 'Walk P-04 back to the chest where he left your tools.';
  case 'home':return 'Patch is part of the camp.';
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
 if(q.diagnosed)entries.push({id:'drive',title:'Three pins, one broken tooth',text:'I lifted the cover while P-04 turned his knee. One tooth is missing from the W-6 drive. The shaft slips under load. The shelter kept rescue spares until its last transfer. The signal post should have a dispatch copy.'});
 if(q.dispatchRead)entries.push({id:'dispatch',title:'Last dispatch',text:'“Transfer 14. Last W-6 fitted to the cable-hauler, west of the logging bridge. Leave installed for the next lift.” In the margin, in pencil, “Last lift was the evacuation sled.”'});
 if(q.haulerInspected)entries.push({id:'plate',title:'The hauler’s load plate',text:'A W-6 stamp and three pinholes, just like his. The plate shows a second service hatch behind the brake drum on the opposite side of the hauler.'});
 if(q.servoClaimed)entries.push({id:'recovered',title:'A drive to carry back',text:q.haulerInspected?'The drive came free when I took the strain off the brake. A loop of rescue-sled rope was still caught in the drum.':'I have a replacement drive servo for P-04.'});
 if(q.servoInstalled)entries.push({id:'repair',title:'Back on his feet',text:'The replacement held. He tested the bad leg once, then asked if the camp still needed supplies.'});
 if(q.recruited)entries.push({id:'invitation',title:'The way home',text:'P-04 knows where the tools came from. This is his first walk back with someone beside him.'});
 if(q.suppliesDelivered)entries.push({id:'home',title:'Shelter occupied',text:'Patch set his parcel inside the same chest. He listened to my footsteps for a moment before he put the lid down. This time, someone brought the rescuer home.'});
 return {title:PATCH_QUEST_TITLE,stage:patchStage(q),objective:patchObjective(q),entries,complete:q.suppliesDelivered};
}
