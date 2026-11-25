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

/** Keep the live tracker short enough to leave the playfield visible on a phone. */
export function fieldNoteTracker(w:World):string|undefined{
 switch(patchJournalStage(w)){
  case 'letter':return 'Look for amber flashes beyond the lake';
  case 'diagnose':return 'Examine P-04’s damaged drive';
  case 'dispatch':return 'Find the signal post at the southern bridge';
  case 'salvage':return w.patchQuest?.haulerInspected?'Release the drive at the brake housing':'Find the cable-hauler on the mine road';
  case 'repair':return 'Take the W-6 drive to P-04';
  case 'invite':return 'Invite P-04 back to camp';
  case 'escort':return 'Walk home with P-04';
 }
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
