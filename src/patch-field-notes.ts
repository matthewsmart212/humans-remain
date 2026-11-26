import {patchMapLead} from './patch-map';
import {placeWaypoint,WAYPOINT_ARRIVAL_RADIUS} from './waypoint';
import type {World} from './survival-engine';
import {patchJournalStage,type PatchJournal} from './patch-journal';

export const FIELD_NOTE_ART={
 note:'/survival/patch-v4/station-sketch.webp',shelter:'/survival/patch-v5/shelter.webp',
 drive:'/survival/patch-v5/drive-rubbing.webp',dispatch:'/survival/patch-v5/dispatch-slip.webp',
 hauler:'/survival/patch-v5/hauler.webp',portrait:'/survival/patch-v1/portrait.webp',
} as const;
export function fieldNoteArt(id:string){
 switch(id){
  case 'note':return FIELD_NOTE_ART.note;
  case 'dispatch':return FIELD_NOTE_ART.dispatch;
  case 'drive':return FIELD_NOTE_ART.drive;
  case 'plate':case 'recovered':return FIELD_NOTE_ART.hauler;
  case 'repair':case 'invitation':case 'home':return FIELD_NOTE_ART.portrait;
  default:return FIELD_NOTE_ART.shelter;
 }
}

const trackerCopy={
 letter:{action:'Find the amber flashes',location:'Beyond the lake'},
 diagnose:{action:'Inspect the drive',location:'Rescue shelter'},
 dispatch:{action:'Read the ledger',location:'Signal post'},
 salvage:{action:'Find the hauler',location:'Cable works'},
 brake:{action:'Free the drive',location:'Brake housing'},
 repair:{action:'Repair P-04',location:'Rescue shelter'},
 invite:{action:'Invite P-04 home',location:'Rescue shelter'},
 escort:{action:'Bring P-04 home',location:'Camp chest'},
} as const;

export function fieldNoteTrackerCopy(w:World){
 const stage=patchJournalStage(w);
 if(stage==='home'&&w.patchQuest?.nameIntroduced===false)return {action:'Speak with P-04',location:'Camp chest'};
 if(!stage||stage==='home')return;
 if(w.patchQuest?.scannerLoaned){
  if(stage==='dispatch')return {action:'Scan for his tread',location:'Signal post'};
  if(stage==='salvage'&&!w.patchQuest.haulerInspected)return {action:'Trace the sled marks',location:'Logging road'};
 }
 return trackerCopy[stage==='salvage'&&w.patchQuest?.haulerInspected?'brake':stage];
}

/** The stable summary also tells the HUD when its two-line tracker needs updating. */
export function fieldNoteTracker(w:World):string|undefined{
 const copy=fieldNoteTrackerCopy(w);
 return copy&&`${copy.action} · ${copy.location}`;
}

/** The compass is useful on the journey. It clears itself upon reaching the site. */
export function fieldNoteDestination(w:World){
 const lead=patchMapLead(w);
 if(!lead||Math.hypot(lead.x-w.player.x,lead.y-w.player.y)<=WAYPOINT_ARRIVAL_RADIUS)return;
 return lead;
}
export function markFieldNote(w:World){
 const lead=fieldNoteDestination(w);
 return !!lead&&placeWaypoint(w,lead);
}
export function fieldNotePage(journal:PatchJournal,selected:string|undefined){
 const entries=journal.entries;
 const found=selected===undefined?-1:entries.findIndex(entry=>entry.id===selected);
 const index=found<0?entries.length-1:found;
 return {entry:entries[index],index,older:entries[index-1]?.id,newer:entries[index+1]?.id};
}
