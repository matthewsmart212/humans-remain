import type {World} from './survival-engine';
import type {FoodSpecies} from './food-items';
import {FOOD_RECIPES} from './food-items';
import {campfireView} from './campfire-view';
import {queueFood,stepKitchen} from './camp-kitchen';

type CampfireView=ReturnType<typeof campfireView>;

/** Only raw food currently carried can become the selected fire input. */
export function campfireFoodSelection(view:CampfireView,selected:FoodSpecies|null,quantity:number){
 const food=view.food.find(item=>item.species===selected&&item.count>0)??null;
 const free=Math.max(0,view.queueMax-view.jobs.filter(Boolean).length);
 const limit=food?.canCook?Math.max(0,Math.min(Math.floor(food.count),free)):0;
 const requested=Number.isFinite(quantity)?Math.max(1,Math.floor(quantity)):1;
 const amount=limit?Math.min(requested,limit):0;
 const blocked=!food?'Select raw food':!free?'Fire full':!limit?'Food unavailable':'';
 return{food,limit,amount,blocked};
}

/** The cooking engine owns each payment, queue entry, access check and throw. */
export function queueCampfireFood(world:World,species:FoodSpecies,quantity:number){
 if(!Object.hasOwn(FOOD_RECIPES,species)||!Number.isFinite(quantity)||quantity<1)return 0;
 stepKitchen(world);
 const selection=campfireFoodSelection(campfireView(world),species,quantity);
 let queued=0;
 while(queued<selection.amount&&queueFood(world,species))queued++;
 return queued;
}
