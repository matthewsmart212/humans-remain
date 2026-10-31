import type {Resource,World} from './survival-engine';
import type {MaterialCost} from './forge-recipes';
import {itemCount,storedCount,takeInventory,setStoredCount} from './expedition-inventory';

export const materialEntries=(cost:MaterialCost)=>Object.entries(cost) as [Resource,number][];
export const materialTotal=(w:World,kind:Resource)=>itemCount(w,kind)+storedCount(w,kind);
export const canPayMaterials=(w:World,cost:MaterialCost)=>materialEntries(cost).every(([kind,n])=>Number.isSafeInteger(n)&&n>0&&materialTotal(w,kind)>=n);
/** Validate the whole recipe before taking anything; pack supplies are used first. */
export function payMaterials(w:World,cost:MaterialCost){
 if(!canPayMaterials(w,cost))return false;
 for(const[kind,n]of materialEntries(cost)){const carried=Math.min(n,itemCount(w,kind));if(carried)takeInventory(w,kind,carried);if(n>carried)setStoredCount(w,kind,storedCount(w,kind)-(n-carried))}return true;
}
