import {FISHING_ART} from './fishing-art';
import type {FishingSpecies} from './fishing-types';

/** Species personality drives the real fight as well as its readable cues. */
export const FISHING_SPECIES={
 perch:{name:'Stillwater perch',shortName:'Perch',image:FISHING_ART.rawFish,variant:0,reelSeconds:8.7,calmSeconds:2.6,runSeconds:.9,pull:.64},
 carp:{name:'Lake carp',shortName:'Carp',image:FISHING_ART.rawCarp,variant:1,reelSeconds:9.6,calmSeconds:2.8,runSeconds:1.4,pull:.54},
 pike:{name:'Reed pike',shortName:'Pike',image:FISHING_ART.rawPike,variant:2,reelSeconds:9.5,calmSeconds:2.3,runSeconds:.7,pull:.8},
 drone:{name:'Waterlogged scout drone',shortName:'Scout drone',image:FISHING_ART.scoutDrone,variant:3,reelSeconds:13.5,calmSeconds:3.1,runSeconds:1.35,pull:.50},
} as const;
export const fishingSpecies=(variant:number):FishingSpecies=>variant===3?'drone':variant===1?'carp':variant===2?'pike':'perch';
export function fishingHash(text:string){let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return n>>>0}
export const fishingRandom=(seed:number,index:number)=>((Math.imul(seed^Math.imul(index+1,1597334677),2246822519)>>>0)%10007)/10007;
