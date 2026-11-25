import {timeOf,type World} from './survival-engine';
import {patchQuestSite} from './patch-placement';
import type {PatchQuestState} from './patch-quest';

export const PATCH_SOUND_KEY='humans-remain-patch-sounds';
export type PatchCue='beacon'|'servo'|'home';

/** Observe the two irreversible story beats and the local distress transmitter.
 * Entering a loaded run or resuming after a pause never replays its milestones. */
export class PatchCueTracker{
 private owner?:PatchQuestState;
 private installed=false;
 private delivered=false;
 private pulse=-1;
 update(w:World,active:boolean):{cue:PatchCue;volume:number}|undefined{
  const q=w.patchQuest;
  if(!active||!q||w.scene||w.phase==='over'){this.owner=undefined;return}
  const t=timeOf(w),beat=Math.floor(t/.9+1e-7),same=this.owner===q;
  const arrived=same&&q.suppliesDelivered&&!this.delivered;
  const repaired=same&&q.servoInstalled&&!this.installed;
  const ping=same&&beat!==this.pulse&&beat%6<3;
  this.owner=q;this.installed=q.servoInstalled;this.delivered=q.suppliesDelivered;this.pulse=beat;
  if(arrived)return{cue:'home',volume:.85};
  if(repaired)return{cue:'servo',volume:.8};
  if(!ping||q.servoInstalled||w.stationPanel||w.patchRepair)return;
  const distance=Math.hypot(q.position.x-w.player.x,q.position.y-w.player.y);
  if(distance<480&&patchQuestSite(w.layout))return{cue:'beacon',volume:.55*(1-distance/480)};
 }
}
