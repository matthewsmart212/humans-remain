import {CAMP_REPAIRS, buildingRestored, campBuildingPlacements} from './camp-restoration';
import {campAccessLevel} from './camp-levels';
import {committedFuel, KITCHEN_QUEUE} from './camp-kitchen';
import {furnaceRules} from './camp-furnace';
import {materialTotal} from './camp-materials';
import {FIRE_FOOD_ART, FIRE_SPECIES} from './campfire-view';
import {ITEM_RULES, itemCount, type InventoryKind} from './expedition-inventory';
import {FOOD_RECIPES} from './food-items';
import {canPackHuntersMeal, HUNTERS_MEAL_INGREDIENTS, PROVISIONS} from './food-provisions';
import {IRONWORKS_IMAGES, SMELT_RECIPES} from './ironworks-data';
import {gardenBeds, POTATO_GROW_SECONDS, POTATO_YIELD} from './potato-farming';
import type {World} from './survival-engine';

const stations = ['fire', 'garden', 'furnace'] as const;
export type RecipeStation = typeof stations[number];
export type RecipeIngredient = {name: string; art: string; have: number; need: number};
export type CampRecipe = {
 id: string; name: string; art: string; ingredients: RecipeIngredient[];
 status: string; ready: boolean; method: string; result: string;
};

export function campRecipes(w: World) {
 const sites = campBuildingPlacements(w.layout);
 const level = campAccessLevel(w);
 const carried = (kind: InventoryKind, art: string, need: number): RecipeIngredient => ({
  name: ITEM_RULES[kind].name, art, have: itemCount(w, kind), need
 });
 function stationLock(station: RecipeStation) {
  if (!sites.some(site => site.id === station)) return 'Site missing from camp';
  const repair = CAMP_REPAIRS[station];
  if (!w.creativeMode && level < repair.level) return 'Camp ' + repair.level + ' required';
  if (!buildingRestored(w, station)) return 'Repair the ' + repair.name.toLowerCase();
  if (station === 'furnace' && !buildingRestored(w, 'headquarters')) return 'Repair headquarters';
  return '';
 }
 const byStation: Record<RecipeStation, CampRecipe[]> = {fire: [], garden: [], furnace: []};
 function add(station: RecipeStation, recipe: Omit<CampRecipe,'ready'|'status'>, readyLabel: string, blocker = '') {
  const missing = recipe.ingredients.some(row => row.have < row.need);
  const status = stationLock(station) || blocker || (missing ? 'Gather ingredients' : '');
  byStation[station].push({...recipe, ready: !status, status: status || readyLabel});
 }

 const fullSpit = (w.fire.queue?.length ?? 0) >= KITCHEN_QUEUE;
 for (const species of FIRE_SPECIES) {
  const recipe = FOOD_RECIPES[species];
  const art = FIRE_FOOD_ART[species];
  add('fire', {
   id: recipe.cooked, name: ITEM_RULES[recipe.cooked].name, art: art.cooked,
   ingredients: [carried(recipe.raw, art.raw, 1)],
   method: recipe.seconds + ' sec over the fire', result: '+' + recipe.food + ' food  ·  +' + recipe.health + ' health'
  }, 'Ready to queue', fullSpit ? 'Spit full' : '');
 }
 const meal = HUNTERS_MEAL_INGREDIENTS;
 add('fire', {
  id: 'huntersMeal', name: PROVISIONS.huntersMeal.name, art: PROVISIONS.huntersMeal.image,
  ingredients: [carried('cookedVenison', FIRE_FOOD_ART.venison.cooked, meal.cookedVenison), carried('berries', PROVISIONS.berries.image, meal.berries)],
  method: 'Prepare by hand', result: '+' + PROVISIONS.huntersMeal.food + ' food  ·  +' + PROVISIONS.huntersMeal.healOverTime + ' health over ' + PROVISIONS.huntersMeal.duration + ' sec'
 }, 'Ready to prepare', canPackHuntersMeal(w) ? '' : 'Backpack full');

 const beds = gardenBeds(w);
 const freeBeds = beds.filter(bed => !bed).length;
 for (const crop of ['potato', 'carrot'] as const) {
  add('garden', {
   id: crop, name: PROVISIONS[crop].name, art: PROVISIONS[crop].image, ingredients: [carried(crop, PROVISIONS[crop].image, 1)],
   method: POTATO_GROW_SECONDS / 60 + ' min to harvest', result: 'Yields ' + POTATO_YIELD + (crop === 'potato' ? ' potatoes' : ' carrots')
  }, 'Ready to plant', freeBeds ? '' : 'All beds planted');
 }

 const furnaceSite = sites.find(site => site.id === 'furnace');
 const furnace = furnaceSite && w.ironworks?.stations[furnaceSite.placement.id];
 const furnaceFull = furnace && furnace.queue.length >= furnaceRules(furnace).queue;
 for (const [id, recipe] of Object.entries(SMELT_RECIPES)) {
  add('furnace', {
   id: 'smelt-' + id, name: recipe.name, art: IRONWORKS_IMAGES.ironIngot,
   ingredients: [{name: ITEM_RULES[recipe.input].name, art: id === 'ore' ? IRONWORKS_IMAGES.ironOre : '/survival/ui-backpack-v1/scrap.png',
    have: materialTotal(w, recipe.input), need: recipe.count}],
   method: Math.ceil(recipe.seconds / (furnace ? furnaceRules(furnace).rate : 1)) + ' sec in the furnace', result: 'Yields 1 iron ingot'
  }, 'Ready to queue', furnaceFull ? 'Queue full' : '');
 }

 const conditions = {
  fire: w.camp.hearth.fuel > 0 ? 'Fire lit' : committedFuel(w) > 0 ? 'Fire lighting' : 'Fire out · Add a log',
  garden: freeBeds + ' / ' + beds.length + ' beds free',
  furnace: furnace?.fuel ? 'Furnace lit' : 'Cold furnace · Add a log'
 };
 return stations.map(id => ({
  id, name: CAMP_REPAIRS[id].name, packOnly: id !== 'furnace', placed: sites.some(site => site.id === id),
  lock: stationLock(id), condition: conditions[id],
  recipes: byStation[id].sort((a, b) => Number(b.ready) - Number(a.ready))
 }));
}
