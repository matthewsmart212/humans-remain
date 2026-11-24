import type {Direction,Vec} from './survival-engine';

export type FishingSpecies='perch'|'carp'|'pike'|'drone';
export type FishingFishSpecies=Exclude<FishingSpecies,'drone'>;
export type FishingPhase='ready'|'aiming'|'casting'|'waiting'|'nibble'|'bite'|'reeling'|'landing'|'caught'|'escaped';
export type FishingFightBehavior='calm'|'warning'|'surge'|'tiring'|'heavy';
export type FishingEventType='cast'|'splash'|'nibble'|'bite'|'hook'|'surge'|'land'|'keep'|'release'|'escape'|'signal';
export type FishingEvent={id:number;type:FishingEventType;at:number};
export type FishingCatch={
 id:number;species:FishingSpecies;name:string;kg:number;isRecord:boolean;image:string;portions?:number;
 /** Optional for old saves; lets a continued catch return to its actual lake. */
 water?:Vec;size?:number;variant?:number;pierId?:string;fishIndex?:number;
};
export type FishingProgress={
 version:1;bait:number;claimed:boolean;attempts:number;caught:number;kept:number;released:number;bestKg:number;
 baitReadyAt:number;autoHook:boolean;toggleReel:boolean;pendingCatch?:FishingCatch;
 bestBySpecies?:Partial<Record<FishingFishSpecies,number>>;salvagedAt?:number;
};
export type FishingVisualFish=Vec&{angle:number;size:number;variant:number;species?:FishingSpecies;kg?:number};
export type FishingFeedingSpot=Vec&{radius:number;species:FishingSpecies;active:boolean;kind?:'fish'|'salvage';pierId?:string;fishIndex?:number};
export type FishingAftermath={kind:'keep'|'release';age:number;duration:number;from:Vec;to:Vec;fish:FishingVisualFish;pierId?:string;fishIndex?:number};
export type FishingSession={
 phase:Exclude<FishingPhase,'ready'|'caught'>;started:number;castStarted:number;
 origin:Vec;target:Vec;landingPoint:Vec;direction:Direction;pierId:string;fishIndex:number;
 fishStart:FishingVisualFish;fish:FishingVisualFish;weight:number;species:FishingSpecies;
 charge:number;tension:number;holding:boolean;distance:number;initialDistance:number;
 overload:number;slack:number;surge:number;biteAt:number;lastHp:number;attempt:number;
 input:'cast'|'hook'|'reel'|'none';
 aimOffset:Vec;aimManual:boolean;castValid:boolean;castHint:string;nibbleAmount:number;
 fightBehavior:FishingFightBehavior;behaviorSince:number;behaviorUntil:number;fightStep:number;warning:number;
 productive:boolean;quietUntil?:number;lastNibble?:number;failureReason?:string;
};
export type FishingHud={
 phase:FishingPhase;action:'CAST'|'RETRIEVE'|'WAIT'|'HOOK'|'REEL'|'LANDING'|'CAUGHT';
 hint:string;command:string;detail:string;tone:'neutral'|'good'|'warn'|'danger';
 bait:number;tension:number;charge:number;holding:boolean;active:boolean;disabled:boolean;
 progress:number;fightBehavior?:FishingFightBehavior;castValid:boolean;castHint:string;nibbleAmount:number;species?:FishingSpecies;
 canKeep:boolean;catch?:FishingCatch;rewardLabel?:string;rewardWeight?:number;
 assists:{autoHook:boolean;toggleReel:boolean};caught:number;bestKg:number;event?:FishingEvent;
};
export type FishingRenderState={
 phase:FishingPhase|'equipped';age:number;phaseProgress:number;direction:Direction;
 target?:Vec;bobber?:Vec;fish?:FishingVisualFish;pierId?:string;fishIndex?:number;
 tension:number;holding:boolean;charge:number;lineVisible:boolean;bobberVisible:boolean;
 aimPreview?:Vec;aimValid?:boolean;aimReason?:string;nibbleAmount?:number;fightBehavior?:FishingFightBehavior;
 warning?:number;surge?:number;species?:FishingSpecies;progress?:number;
 aftermath?:FishingAftermath;feedingSpots?:FishingFeedingSpot[];event?:FishingEvent;
};
