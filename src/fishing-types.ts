import type {Direction,Vec} from './survival-engine';

export type FishingPhase='ready'|'aiming'|'casting'|'waiting'|'bite'|'reeling'|'landing'|'caught'|'escaped';
export type FishingCatch={id:number;species:'perch';name:string;kg:number;isRecord:boolean;image:string};
export type FishingProgress={
 version:1;bait:number;claimed:boolean;attempts:number;caught:number;kept:number;released:number;bestKg:number;
 baitReadyAt:number;autoHook:boolean;toggleReel:boolean;pendingCatch?:FishingCatch;
};
export type FishingVisualFish=Vec&{angle:number;size:number;variant:number};
export type FishingSession={
 phase:Exclude<FishingPhase,'ready'|'caught'>;started:number;castStarted:number;
 origin:Vec;target:Vec;landingPoint:Vec;direction:Direction;pierId:string;fishIndex:number;
 fishStart:FishingVisualFish;fish:FishingVisualFish;weight:number;
 charge:number;tension:number;holding:boolean;distance:number;initialDistance:number;
 overload:number;slack:number;surge:number;biteAt:number;lastHp:number;attempt:number;
 input:'cast'|'hook'|'reel'|'none';
};
export type FishingHud={
 phase:FishingPhase;action:'CAST'|'RETRIEVE'|'HOOK'|'REEL'|'LANDING'|'CAUGHT';
 hint:string;bait:number;tension:number;charge:number;holding:boolean;active:boolean;disabled:boolean;
 canKeep:boolean;catch?:FishingCatch;assists:{autoHook:boolean;toggleReel:boolean};caught:number;bestKg:number;
};
export type FishingRenderState={
 phase:FishingPhase|'equipped';age:number;phaseProgress:number;direction:Direction;
 target?:Vec;bobber?:Vec;fish?:FishingVisualFish;pierId?:string;fishIndex?:number;
 tension:number;holding:boolean;charge:number;lineVisible:boolean;bobberVisible:boolean;
};
