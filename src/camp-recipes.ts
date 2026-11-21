import {CAMP_REPAIRS, buildingRestored, campBuildingPlacements} from './camp-restoration';
import {campAccessLevel} from './camp-levels';
import {committedFuel, KITCHEN_QUEUE} from './camp-kitchen';
import {furnaceRules} from './camp-furnace';
import {smithySupplyStatus} from './camp-smithy';
import {materialEntries, materialTotal} from './camp-materials';
import {FIRE_FOOD_ART, FIRE_SPECIES} from './campfire-view';
import {ITEM_RULES, itemCount, type InventoryKind} from './expedition-inventory';
import {FOOD_RECIPES} from './food-items';
import {canPackHuntersMeal, HUNTERS_MEAL_INGREDIENTS, PROVISIONS} from './food-provisions';
import {FORGE_RECIPES} from './forge-recipes';
import {IRONWORKS_IMAGES, SMELT_RECIPES} from './ironworks-data';
import {GEAR} from './player-gear';
import {gardenBeds, POTATO_GROW_SECONDS, POTATO_YIELD} from './potato-farming';
import {recipeUnlocked} from './run-progression';
import type {World} from './survival-engine';

const stations = ['fire', 'garden', 'furnace', 'workshop'] as const;
export type RecipeStation = typeof stations[number];
export type RecipeIngredient = {name: string; have: number; need: number};
export type CampRecipe = {
 id: string; name: string; art: string; planId: string; ingredients: RecipeIngredient[];
 status: string; ready: boolean; detail?: string;
};

export function campRecipes(w: World) {
 const sites = campBuildingPlacements(w.layout);
 const level = campAccessLevel(w);
 const carried = (kind: InventoryKind, need: number): RecipeIngredient => ({
  name: ITEM_RULES[kind].name, have: itemCount(w, kind), need
 });
 function stationLock(station: RecipeStation) {
  if (!sites.some(site => site.id === station)) return 'Site missing from camp';
  const repair = CAMP_REPAIRS[station];
  if (!w.creativeMode && level < repair.level) return 'Camp level ' + repair.level + ' required';
  if (!buildingRestored(w, station)) return 'Repair the ' + repair.name.toLowerCase();
  if ((station === 'workshop' || station === 'furnace') && !buildingRestored(w, 'headquarters')) return 'Repair headquarters';
  return '';
 }
 const byStation: Record<RecipeStation, CampRecipe[]> = {fire: [], garden: [], furnace: [], workshop: []};
 function add(station: RecipeStation, recipe: Omit<CampRecipe,'ready'|'status'>, readyLabel: string, blocker = '') {
  const missing = recipe.ingredients.some(row => row.have < row.need);
  const status = stationLock(station) || blocker || (missing ? 'Gather ingredients' : '');
  byStation[station].push({...recipe, ready: !status, status: status || readyLabel});
 }

 const fullSpit = (w.fire.queue?.length ?? 0) >= KITCHEN_QUEUE;
 for (const species of FIRE_SPECIES) {
  const recipe = FOOD_RECIPES[species];
  add('fire', {
   id: recipe.cooked, planId: 'cooking', name: ITEM_RULES[recipe.cooked].name, art: FIRE_FOOD_ART[species].cooked,
   ingredients: [carried(recipe.raw, 1)],
   detail: recipe.seconds + 's over the fire' + (committedFuel(w) ? '' : ' · Add a log for heat')
  }, 'Ready to queue', fullSpit ? 'Spit full' : '');
 }
 const meal = HUNTERS_MEAL_INGREDIENTS;
 add('fire', {
  id: 'huntersMeal', planId: 'cooking', name: PROVISIONS.huntersMeal.name, art: PROVISIONS.huntersMeal.image,
  ingredients: [carried('cookedVenison', meal.cookedVenison), carried('berries', meal.berries)]
 }, 'Ready to prepare', canPackHuntersMeal(w) ? '' : 'Backpack full');

 const fullBeds = !gardenBeds(w).some(bed => !bed);
 for (const crop of ['potato', 'carrot'] as const) {
  add('garden', {
   id: crop, planId: 'gardening-1', name: PROVISIONS[crop].name, art: PROVISIONS[crop].image, ingredients: [carried(crop, 1)],
   detail: 'Harvest ' + POTATO_YIELD + ' after ' + POTATO_GROW_SECONDS / 60 + ' min'
  }, 'Ready to plant', fullBeds ? 'All beds planted' : '');
 }

 const furnaceSite = sites.find(site => site.id === 'furnace');
 const furnace = furnaceSite && w.ironworks?.stations[furnaceSite.placement.id];
 const furnaceFull = furnace && furnace.queue.length >= furnaceRules(furnace).queue;
 for (const [id, recipe] of Object.entries(SMELT_RECIPES)) {
  add('furnace', {
   id: 'smelt-' + id, planId: 'metalworking', name: 'Iron ingot', art: IRONWORKS_IMAGES.ironIngot,
   ingredients: [{name: ITEM_RULES[recipe.input].name, have: materialTotal(w, recipe.input), need: recipe.count}],
   detail: recipe.name + (furnace?.fuel ? '' : ' · Add a log for heat')
  }, 'Ready to queue', furnaceFull ? 'Queue full' : '');
 }

 for (const recipe of FORGE_RECIPES) {
  const supply = smithySupplyStatus(w, recipe);
  const blocker = !recipeUnlocked(w, recipe.id) ? 'Restore the furnace' : supply === 'Ready to craft' ? '' : supply;
  add('workshop', {
   id: recipe.id, planId: 'equipment-' + recipe.id, name: recipe.name, art: GEAR[recipe.id].image,
   ingredients: materialEntries(recipe.cost).map(([kind, need]) => ({name: ITEM_RULES[kind].name, have: materialTotal(w, kind), need}))
  }, 'Ready to craft', blocker);
 }
 return stations.map(id => ({
  id, name: CAMP_REPAIRS[id].name, packOnly: id === 'fire' || id === 'garden',
  recipes: byStation[id].sort((a, b) => Number(b.ready) - Number(a.ready))
 }));
}
