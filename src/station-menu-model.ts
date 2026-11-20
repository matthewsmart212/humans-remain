import {PACK_CAPACITY, PACK_COMFORT} from './expedition-inventory';
import type {BagFilter, BagItem} from './backpack';
import type {smithyView} from './smithy-view';

export const CHEST_FILTERS:readonly BagFilter[]=['All','Gear','Food','Materials'];
export function filterChestItems(items:BagItem[],filter:BagFilter){return filter==='All'?items:items.filter(item=>item.category===filter)}
/** The same optional benefit copy is used by the web and native chest. */
export function chestItemEffects(item:BagItem){
 const effects:[string,number|undefined][]=[['food',item.food],['health',item.health],['water',item.water],['stamina',item.stamina],[`health over ${item.duration??20}s`,item.healthOverTime]];
 return effects.filter(([,amount])=>(amount??0)>0).map(([label,amount])=>`+${amount} ${label}`);
}
/** A blocked craft still explains the exact shortfall in the ingredient rows. */
export function smithyAction(recipe:NonNullable<ReturnType<typeof smithyView>>['recipes'][number]){
 if(recipe.canCraft)return `Craft ${recipe.name}`;
 if(recipe.status!=='Need materials')return recipe.status;
 const missing=recipe.ingredients.filter(material=>!material.enough).map(material=>{
  const amount=material.needed-material.available;
  const name=material.id==='pallets'?'log':material.name.toLowerCase();
  return `${amount} ${name}${amount===1?'':'s'}`;
 });
 return `Need ${missing.join(' and ')}`;
}

/** Outside the backpack, capacity only matters when running low on space. */
export function menuPackReadout(weight: number | undefined, loadLabel: string | undefined, backpack: boolean) {
 if (weight === undefined) return;
 const creative = loadLabel === 'Creative';
 const heavy = !creative && weight > PACK_COMFORT;
 if (!backpack && !heavy) return;
 const amount = creative ? `${weight.toFixed(1)} kg` : `${weight.toFixed(1)} / ${PACK_CAPACITY} kg`;
 const status = creative ? 'Creative' : weight >= PACK_CAPACITY ? 'Pack full' : heavy ? 'Heavy pack' : '';
 return {amount, status};
}
