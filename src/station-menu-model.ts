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
 const missing=recipe.ingredients.filter(m=>!m.enough);
 if(missing.length!==1)return 'Missing materials';
 const amount=missing[0].needed-missing[0].available,name=missing[0].name.toLowerCase();
 const singular:Record<string,string>={logs:'log','iron ingots':'iron ingot',ingots:'ingot'};
 return `Need ${amount} ${amount===1?(singular[name]??name):name}`;
}
