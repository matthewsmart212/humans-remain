import {FISHING_SPECIES} from './fishing-catalog';
import type {FishingCatch,FishingProgress} from './fishing-types';

const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const count=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
const bounded=(value:unknown,min:number,max:number):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;

function validPendingCatch(value:unknown):value is FishingCatch{
 if(!record(value))return false;
 const species=typeof value.species==='string'&&Object.hasOwn(FISHING_SPECIES,value.species)?value.species as keyof typeof FISHING_SPECIES:null;
 if(!species)return false;
 const limit=species==='drone'?12:species==='pike'?8:species==='carp'?6:5;
 return count(value.id)&&value.id>=1
  &&typeof value.name==='string'&&value.name.trim().length>0&&value.name.length<=80&&!/[\u0000-\u001f\u007f]/.test(value.name)
  &&bounded(value.kg,.1,limit)&&typeof value.isRecord==='boolean'&&value.image===FISHING_SPECIES[species].image
  &&(value.portions===undefined||count(value.portions)&&value.portions>=1&&value.portions<=3&&(species!=='drone'||value.portions===1))
  &&(value.water===undefined||record(value.water)&&bounded(value.water.x,-30000,30000)&&bounded(value.water.y,-30000,30000))
  &&(value.size===undefined||bounded(value.size,.2,3))
  &&(value.variant===undefined||value.variant===FISHING_SPECIES[species].variant)
  &&(value.fishIndex===undefined||Number.isInteger(value.fishIndex)&&bounded(value.fishIndex,species==='drone'?-1:0,species==='drone'?-1:63))
  &&(value.pierId===undefined||typeof value.pierId==='string'&&value.pierId.length>0&&value.pierId.length<=200&&!/[\u0000-\u001f\u007f]/.test(value.pierId));
}

/** Saves keep ownership, decisions and the landed catch, never live cast input. */
export function validFishingProgress(value:unknown):value is FishingProgress|undefined{
 if(value===undefined)return true;
 if(!record(value)||value.version!==1)return false;
 if(!['claimed','autoHook','toggleReel'].every(key=>typeof value[key]==='boolean'))return false;
 if(!count(value.bait)||value.bait>10||!count(value.attempts)||!count(value.caught)||!count(value.kept)||!count(value.released))return false;
 if(!bounded(value.bestKg,0,8)||!bounded(value.baitReadyAt,0,Number.MAX_SAFE_INTEGER))return false;
 if(value.salvagedAt!==undefined&&!bounded(value.salvagedAt,0,Number.MAX_SAFE_INTEGER))return false;
 if(value.bestBySpecies!==undefined&&(!record(value.bestBySpecies)||Object.entries(value.bestBySpecies).some(([key,kg])=>!['perch','carp','pike'].includes(key)||!bounded(kg,0,8))))return false;
 // A landed fish is undecided until KEEP or RELEASE. Failed casts can leave
 // attempts ahead of the counters, and only one result can await a decision.
 if(value.caught!==value.kept+value.released||value.caught>value.attempts)return false;
 if(value.pendingCatch!==undefined){
  if(!validPendingCatch(value.pendingCatch)||value.pendingCatch.id!==value.attempts||value.caught>=value.attempts)return false;
 }
 return true;
}
