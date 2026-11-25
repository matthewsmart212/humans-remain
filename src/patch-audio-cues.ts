import {patchChat} from './patch-chat';
import {timeOf,type World} from './survival-engine';
import {patchRescueSite} from './patch-placement';
import type {PatchQuestState} from './patch-quest';

export const PATCH_SOUND_KEY='humans-remain-patch-sounds';
export const PATCH_CUES=['beacon','ledger','brake','servo','home'] as const;
export type PatchCue=typeof PATCH_CUES[number];

/** Observe field discoveries, the homecoming and the local distress transmitter.
 * Entering a loaded run or resuming after a pause never replays its milestones. */
export class PatchCueTracker{
 private owner?:PatchQuestState;
 private dispatchRead=false;
 private servoClaimed=false;
 private installed=false;
 private delivered=false;
 private pulse=-1;
 update(w:World,active:boolean):{cue:PatchCue;volume:number}|undefined{
  const q=w.patchQuest;
  if(!active||!q||w.scene||w.phase==='over'){this.owner=undefined;return}
  const t=timeOf(w),beat=Math.floor(t/.9+1e-7),same=this.owner===q;
  const arrived=same&&q.suppliesDelivered&&!this.delivered;
  const repaired=same&&q.servoInstalled&&!this.installed;
  const released=same&&q.haulerInspected&&q.servoClaimed&&!this.servoClaimed;
  const opened=same&&q.dispatchRead&&!this.dispatchRead;
  const ping=same&&beat!==this.pulse&&beat%6<3;
  this.dispatchRead=!!q.dispatchRead;this.servoClaimed=q.servoClaimed;
  this.owner=q;this.installed=q.servoInstalled;this.delivered=q.suppliesDelivered;this.pulse=beat;
  if(arrived)return{cue:'home',volume:.85};
  if(repaired)return{cue:'servo',volume:.8};
  if(released)return{cue:'brake',volume:.72};
  if(opened)return{cue:'ledger',volume:.62};
  if(!ping||q.servoInstalled||w.stationPanel||w.patchRepair||patchChat(w))return;
  const distance=Math.hypot(q.position.x-w.player.x,q.position.y-w.player.y);
  if(distance<480&&patchRescueSite(w.layout))return{cue:'beacon',volume:.55*(1-distance/480)};
 }
}
