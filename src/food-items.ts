import {isProvision,PROVISIONS} from './food-provisions-data';
import {FISHING_ART} from './fishing-art';
import type {World} from './survival-engine';
export type FoodSpecies='chicken'|'rabbit'|'venison'|'fish'|'carp'|'pike';
export const FOOD_RECIPES={
 chicken:{name:'Chicken',raw:'rawMeat',cooked:'cookedMeat',seconds:12,food:35,health:8},
 rabbit:{name:'Rabbit',raw:'rawRabbit',cooked:'cookedRabbit',seconds:8,food:25,health:6},
 venison:{name:'Meat',raw:'rawVenison',cooked:'cookedVenison',seconds:18,food:50,health:12},
 fish:{name:'Perch',raw:'rawFish',cooked:'cookedFish',seconds:12,food:30,health:6},
 carp:{name:'Carp',raw:'rawCarp',cooked:'cookedCarp',seconds:16,food:38,health:8},
 pike:{name:'Pike',raw:'rawPike',cooked:'cookedPike',seconds:18,food:44,health:10},
} as const;
export const FOOD_SPECIES=Object.keys(FOOD_RECIPES) as FoodSpecies[];
export type RawFoodKind=typeof FOOD_RECIPES[FoodSpecies]['raw'];
export type CookedFoodKind=typeof FOOD_RECIPES[FoodSpecies]['cooked'];
export const RABBIT_FOOD_IMAGES={rabbitRaw:'/survival/rabbit-food-v1/raw-rabbit.webp',rabbitCooked:'/survival/rabbit-food-v1/cooked-rabbit.webp'};
export const VENISON_FOOD_IMAGES={venisonRaw:'/survival/venison-food-v1/raw-venison.webp',venisonCooked:'/survival/venison-food-v1/cooked-venison.webp'};
export const FISH_FOOD_IMAGES={fishRaw:FISHING_ART.rawFish,fishCooked:FISHING_ART.cookedFish,carpRaw:FISHING_ART.rawCarp,carpCooked:FISHING_ART.cookedCarp,pikeRaw:FISHING_ART.rawPike,pikeCooked:FISHING_ART.cookedPike};
const imageKeys={chicken:['bonfireRaw','bonfireCooked'],rabbit:['rabbitRaw','rabbitCooked'],venison:['venisonRaw','venisonCooked'],fish:['fishRaw','fishCooked'],carp:['carpRaw','carpCooked'],pike:['pikeRaw','pikeCooked']} as const;
const foodKinds=new Map<string,{species:FoodSpecies;cooked:boolean}>();
for(const species of FOOD_SPECIES){foodKinds.set(FOOD_RECIPES[species].raw,{species,cooked:false});foodKinds.set(FOOD_RECIPES[species].cooked,{species,cooked:true})}
/** Shared cache keys keep held food, cooking and dropped portions on their own artwork. */
export const foodImageKey=(species:FoodSpecies,cooked=false)=>imageKeys[species][cooked?1:0];
export function foodImageKeyForKind(kind:string){
 const food=foodKinds.get(kind);return food?foodImageKey(food.species,food.cooked):undefined;
}
export const isCookedFood=(kind:string):kind is CookedFoodKind=>foodKinds.get(kind)?.cooked===true;
export const totalCooked=(w:World)=>w.cooked+(w.cookedRabbit||0)+(w.cookedVenison||0)+(w.cookedFish||0)+(w.cookedCarp||0)+(w.cookedPike||0);
export function nextRawFood(w:World):RawFoodKind|null{for(const species of FOOD_SPECIES){const kind=FOOD_RECIPES[species].raw;if(w.bag[kind]>0)return kind}return null}
export const foodName=(kind:string)=>{
 if(isProvision(kind))return PROVISIONS[kind].name;
 const food=foodKinds.get(kind);return food?`${food.cooked?'Cooked':'Raw'} ${FOOD_RECIPES[food.species].name.toLowerCase()}`:null;
};
export const heldMeal=(w:World)=>w.player.equipped==='carpMeal'?((w.cookedCarp||0)>0?'carp' as const:null):w.player.equipped==='pikeMeal'?((w.cookedPike||0)>0?'pike' as const:null):w.player.equipped==='fishMeal'?((w.cookedFish||0)>0?'fish' as const:null):w.player.equipped==='venisonMeal'?(w.cookedVenison>0?'venison' as const:null):w.player.equipped==='rabbitMeal'?(w.cookedRabbit>0?'rabbit' as const:null):w.player.equipped==='meal'&&w.cooked>0?'chicken' as const:null;
export const cookedCount=(w:World,species:FoodSpecies)=>species==='carp'?(w.cookedCarp||0):species==='pike'?(w.cookedPike||0):species==='fish'?(w.cookedFish||0):species==='venison'?(w.cookedVenison||0):species==='rabbit'?(w.cookedRabbit||0):w.cooked;
