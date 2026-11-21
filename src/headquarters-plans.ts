import type {World} from './survival-engine';
import {campAccessLevel} from './camp-levels';

export const HQ_BLUEPRINT_IDS=['metalworking','reinforced-camp'] as const;
export type HQBlueprintId=typeof HQ_BLUEPRINT_IDS[number];
/** Old saves retain every working facility. New plans are stored with the run. */
export function learnedBlueprints(w:World):HQBlueprintId[]{
 const p=w.progression;if(!p)return [...HQ_BLUEPRINT_IDS];
 // Standard recipes are knowledge granted by the camp level. Browsing never
 // mutates the run, and old explicitly learned plans remain compatible.
 const level=campAccessLevel(w);
 return HQ_BLUEPRINT_IDS.filter(id=>level>=(id==='metalworking'?3:2)||p.blueprints?.includes(id));
}
export const blueprintLearned=(w:World,id:HQBlueprintId)=>learnedBlueprints(w).includes(id);
export const blueprintFound=(w:World,id:HQBlueprintId)=>blueprintLearned(w,id);
export function validBlueprintSave(value:unknown):boolean{return value===undefined||Array.isArray(value)&&value.length<=HQ_BLUEPRINT_IDS.length&&new Set(value).size===value.length&&value.every(id=>HQ_BLUEPRINT_IDS.includes(id as HQBlueprintId))}
