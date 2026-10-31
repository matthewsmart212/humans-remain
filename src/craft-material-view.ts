import {IRONWORKS_MATERIALS} from './ironworks-data';
import {STONE_IMAGE} from './pickaxes';
import {ITEM_RULES,itemCount,storedCount} from './expedition-inventory';
import {materialEntries,materialTotal} from './camp-materials';
import type {MaterialCost} from './forge-recipes';
import type {World} from './survival-engine';

export const FORGE_MATERIAL_ART={...Object.fromEntries(Object.entries(IRONWORKS_MATERIALS).map(([id,m])=>[id,m.image])),stone:STONE_IMAGE,pallets:'/survival/ui-field-kit-v1/logs.png',scrap:'/survival/ui-backpack-v1/scrap.png'} as Record<string,string>;
export const recipeIngredients=(w:World,cost:MaterialCost)=>materialEntries(cost).map(([id,needed])=>({id,name:ITEM_RULES[id].name,image:FORGE_MATERIAL_ART[id],needed,available:materialTotal(w,id),bag:itemCount(w,id),camp:storedCount(w,id),enough:materialTotal(w,id)>=needed}));
