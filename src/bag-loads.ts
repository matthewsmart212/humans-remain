import type {Resource,World} from './survival-engine';
import {addInventory,takeInventory,itemCount} from './expedition-inventory';
/** Stack quantities are fungible; splitting never changes their weight. */
export const addCarriedPickup=(w:World,kind:Resource,amount:number)=>addInventory(w,kind,amount);
export const carriedPortions=(w:World,kind:Resource,amount:number)=>Number.isInteger(amount)&&amount>0&&itemCount(w,kind)>=amount?[amount]:[];
export const removeCarried=(w:World,kind:Resource,amount:number)=>takeInventory(w,kind,amount);
