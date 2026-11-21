import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';

const modules = ['camp-recipes', 'forge-recipes', 'studio-play', 'imported-art', 'authored-world', 'expedition-inventory'];
const bundle = await build({
 stdin: {contents: modules.map(id => `export * from './src/${id}';`).join('\n'), resolveDir: process.cwd()},
 platform: 'node', bundle: true, format: 'esm', write: false
});
const game = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const snapshot = JSON.parse(fs.readFileSync('native/assets/world-snapshot.json', 'utf8'));
game.installImportedArt(snapshot.records);
const w = game.createCampPlaySession(game.prepareAuthoredWorld(snapshot.layout), undefined, 'survival');
const groups = () => game.campRecipes(w);
const recipes = () => groups().flatMap(station => station.recipes);
const recipe = id => recipes().find(row => row.id === id);

assert.equal(recipes().length, game.FORGE_RECIPES.length + 8);
assert(recipes().every(row => !row.ready));
assert.match(recipe('woodenAxe').status, /level 3/);

w.progression.restoredBuildings.push('headquarters', 'well', 'fire');
w.progression.campLevel = 1;
game.setStoredCount(w, 'rawRabbit', 1);
assert.equal(recipe('cookedRabbit').ready, false, 'Raw ingredients must be carried');
game.setItemCount(w, 'rawRabbit', 1);
assert.equal(recipe('cookedRabbit').ready, true);
w.fire.queue = Array.from({length: 4}, (_, id) => ({id, species: 'rabbit', remaining: 8}));
assert.match(recipe('cookedRabbit').status, /Spit full/);
game.setItemCount(w, 'cookedRabbit', 1);
game.setItemCount(w, 'berries', 2);
assert.equal(recipe('huntersMeal').ready, false, 'Hunter’s meal needs cooked wild meat');
game.setItemCount(w, 'cookedVenison', 1);
assert.equal(recipe('huntersMeal').ready, true, 'Preparing a meal uses no spit slot');

w.progression.campLevel = 2;
assert.match(recipe('potato').status, /Repair/);
w.progression.restoredBuildings.push('garden', 'warehouse');
game.setItemCount(w, 'potato', 1);
assert.equal(recipe('potato').ready, true);
assert.equal(recipe('carrot').ready, false);
w.potatoPatch.beds.fill({kind: 'potato', plantedAt: 0});
assert.match(recipe('potato').status, /All beds planted/);

w.progression.campLevel = 3;
w.progression.restoredBuildings.push('workshop');
game.setStoredCount(w, 'pallets', 4);
game.setStoredCount(w, 'ironIngot', 2);
assert.equal(recipe('woodenAxe').ready, true, 'Workshop can use stores');
assert.match(recipe('metalPickaxe').status, /furnace/);
assert.equal(recipe('smelt-ore').ready, false);
w.progression.restoredBuildings.push('furnace');
w.progression.furnaceRestored = true;
game.setItemCount(w, 'ironOre', 1);
game.setStoredCount(w, 'ironOre', 1);
assert.deepEqual(recipe('smelt-ore').ingredients, [{name: 'Iron ore', have: 2, need: 2}]);
assert.equal(recipe('smelt-ore').ready, true);
assert.equal(recipe('metalPickaxe').ready, true);
game.setItemCount(w, 'stone', 32);
assert.match(recipe('metalPickaxe').status, /Backpack full/);

console.log('Camp recipe catalogue passed across station gates, recipe dependencies, pack and store sources, queue, beds and carry capacity.');
