import {FISHING_ART} from './fishing-art';
import type {FishingCatch,FishingProgress} from './fishing-types';

const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const count=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
const bounded=(value:unknown,min:number,max:number):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;

function validPendingCatch(value:unknown):value is FishingCatch{
 if(!record(value))return false;
 return count(value.id)&&value.id>=1&&value.species==='perch'
  &&typeof value.name==='string'&&value.name.trim().length>0&&value.name.length<=80&&!/[\u0000-\u001f\u007f]/.test(value.name)
  &&bounded(value.kg,.1,5)&&typeof value.isRecord==='boolean'&&value.image===FISHING_ART.rawFish;
}

/** Saves keep ownership, decisions and the landed catch, never live cast input. */
export function validFishingProgress(value:unknown):value is FishingProgress|undefined{
 if(value===undefined)return true;
 if(!record(value)||value.version!==1)return false;
 if(!['claimed','autoHook','toggleReel'].every(key=>typeof value[key]==='boolean'))return false;
 if(!count(value.bait)||value.bait>10||!count(value.attempts)||!count(value.caught)||!count(value.kept)||!count(value.released))return false;
 if(!bounded(value.bestKg,0,5)||!bounded(value.baitReadyAt,0,Number.MAX_SAFE_INTEGER))return false;
 // A landed fish is undecided until KEEP or RELEASE. Failed casts can leave
 // attempts ahead of the counters, and only one result can await a decision.
 if(value.caught!==value.kept+value.released||value.caught>value.attempts)return false;
 if(value.pendingCatch!==undefined){
  if(!validPendingCatch(value.pendingCatch)||value.pendingCatch.id!==value.attempts||value.caught>=value.attempts)return false;
 }
 return true;
}
