import type {FishingHud,FishingEventType} from './fishing-types';

/** Shared language keeps web, VoiceOver and the native phone HUD in step. */
export function fishingStageLabel(h:FishingHud){
 if(h.phase==='reeling')return h.species==='drone'?'HEAVY SALVAGE':h.fightBehavior==='warning'?'PULL COMING':h.fightBehavior==='surge'?'STRONG PULL':h.fightBehavior==='tiring'?'FISH TIRING':'FISH ON';
 return({ready:'LAKE FISHING',aiming:'AIM YOUR CAST',casting:'CASTING',waiting:'WATCH THE FLOAT',nibble:'NIBBLE · WAIT',bite:'BITE!',landing:'BRINGING IT IN',caught:'YOUR CATCH',escaped:'CATCH LOST'} as const)[h.phase];
}
export function fishingTensionLabel(h:Pick<FishingHud,'tension'>){return h.tension>=.78?'TOO TIGHT':h.tension<.18?'SLACK':'STEADY'}
export function fishingProgressLabel(h:Pick<FishingHud,'progress'>){return h.progress>=.8?'ALMOST ASHORE':'TO SHORE'}

export type FishingCue=FishingEventType|'warning'|'reel';
export type FishingFeedbackSnapshot=Pick<FishingHud,'event'|'phase'|'holding'|'fightBehavior'>;

/** One event per transition; muted/paused events are consumed, never replayed.
 * Simulation time is used so a pause cannot queue a surprise bite on resume. */
export class FishingFeedbackTracker{
 private owner?:object;private seen=0;private behavior?:string;private active=false;private reelAt=-Infinity;
 update(owner:object,hud:FishingFeedbackSnapshot|undefined,time:number,active:boolean):FishingCue[]{
  if(this.owner!==owner){this.owner=owner;this.seen=0;this.behavior=undefined;this.active=false;this.reelAt=time}
  const event=hud?.event,fresh=!!event&&event.id!==this.seen;
  if(event)this.seen=event.id;
  const warning=hud?.fightBehavior==='warning'&&this.behavior!=='warning';this.behavior=hud?.fightBehavior;
  const wasActive=this.active;this.active=active;
  if(!active||!hud){this.reelAt=time;return[]}
  if(!wasActive){this.reelAt=time;return[]}
  const cues:FishingCue[]=[];
  if(fresh&&event&&time-event.at>=-.02&&time-event.at<.35)cues.push(event.type);
  if(warning&&!cues.includes('surge'))cues.push('warning');
  if(hud.phase==='reeling'&&hud.holding&&time-this.reelAt>=.23){if(!cues.length)cues.push('reel');this.reelAt=time}
  else if(hud.phase!=='reeling'||!hud.holding)this.reelAt=time;
  return cues;
 }
 reset(){this.owner=undefined;this.seen=0;this.behavior=undefined;this.active=false;this.reelAt=-Infinity}
}
