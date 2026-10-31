import type {World} from './survival-engine';
import {setStoredCount,type InventoryKind} from './expedition-inventory';

/** Fresh rounds stock the shared headquarters chest; opening it never refills it. */
export const FOOD_CHEST_STOCK={
 berries:12,apple:6,beans:4,energyBar:4,
 rawMeat:4,cookedMeat:4,rawVenison:4,cookedVenison:4,huntersMeal:3,
} as const satisfies Partial<Record<InventoryKind,number>>;
export function stockFoodChest(w:World){
 for(const [kind,count] of Object.entries(FOOD_CHEST_STOCK))setStoredCount(w,kind as InventoryKind,count);
}
