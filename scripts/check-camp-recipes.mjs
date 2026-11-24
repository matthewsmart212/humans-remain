import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';

const modules = ['camp-recipes', 'studio-play', 'imported-art', 'authored-world', 'expedition-inventory'];
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

assert.deepEqual(groups().map(station => station.id), ['fire', 'garden', 'furnace']);
assert.equal(recipes().length, 11);
assert(recipes().every(row => !row.ready));
assert.equal(recipe('woodenAxe'), undefined);
assert.match(recipe('smelt-ore').status, /Camp 3/);
assert.equal(recipe('cookedFish').name, 'Cooked perch');
assert.deepEqual(recipe('cookedFish').ingredients.map(({name, have, need}) => ({name, have, need})), [{name: 'Raw perch', have: 0, need: 1}]);
assert.equal(recipe('cookedFish').method, '12 sec over the fire');
assert.equal(recipe('cookedFish').result, '+30 food  ·  +6 health');
for(const [raw,cooked,name,seconds,food,health] of [['rawCarp','cookedCarp','carp',16,38,8],['rawPike','cookedPike','pike',18,44,10]]){
 assert.equal(recipe(cooked).name, `Cooked ${name}`);
 assert.deepEqual(recipe(cooked).ingredients.map(({name,have,need})=>({name,have,need})),[{name:`Raw ${name}`,have:0,need:1}]);
 assert.equal(recipe(cooked).method, `${seconds} sec over the fire`);
 assert.equal(recipe(cooked).result, `+${food} food  ·  +${health} health`);
}

w.progression.restoredBuildings.push('headquarters', 'well', 'fire');
w.progression.campLevel = 1;
game.setStoredCount(w, 'rawRabbit', 1);
assert.equal(recipe('cookedRabbit').ready, false, 'Raw ingredients must be carried');
game.setItemCount(w, 'rawRabbit', 1);
assert.equal(recipe('cookedRabbit').ready, true);
game.setStoredCount(w, 'rawFish', 1);
assert.equal(recipe('cookedFish').ready, false, 'Stored raw fish cannot be queued from the pack');
assert.equal(recipe('cookedFish').ingredients[0].have, 0);
assert.equal(recipe('cookedFish').status, 'Gather ingredients');
game.setItemCount(w, 'rawFish', 1);
assert.equal(recipe('cookedFish').ready, true, 'Carried raw fish can be queued at the restored campfire');
assert.equal(recipe('cookedFish').ingredients[0].have, 1);
for(const [raw,cooked] of [['rawCarp','cookedCarp'],['rawPike','cookedPike']]){
 game.setStoredCount(w,raw,3);
 assert.equal(recipe(cooked).ready,false,'Stored species portions do not count as carried ingredients');
 game.setItemCount(w,raw,2);
 assert.equal(recipe(cooked).ready,true);
 assert.equal(recipe(cooked).ingredients[0].have,2,'The HQ shows the actual species portion count');
}
w.fire.queue = Array.from({length: 4}, (_, id) => ({id, species: 'rabbit', remaining: 8}));
assert.match(recipe('cookedRabbit').status, /Spit full/);
assert.equal(recipe('cookedFish').ready, false, 'Fish uses the shared campfire spit capacity');
assert.match(recipe('cookedFish').status, /Spit full/);
for(const cooked of ['cookedCarp','cookedPike'])assert.match(recipe(cooked).status,/Spit full/);
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
assert.equal(recipe('smelt-ore').ready, false);
w.progression.restoredBuildings.push('furnace');
w.progression.furnaceRestored = true;
game.setItemCount(w, 'ironOre', 1);
game.setStoredCount(w, 'ironOre', 1);
const [ore] = recipe('smelt-ore').ingredients;
assert.equal(ore.have, 2);
assert.equal(ore.need, 2);
assert.equal(ore.name, 'Iron ore');
assert.equal(recipe('smelt-ore').ready, true);
assert.match(groups()[2].condition, /Cold furnace/);
w.camp.hearth.fuel = 15;
assert.equal(groups()[0].condition, 'Fire lit');
assert.match(groups()[1].condition, /0 \/ 4 beds free/);

console.log('HQ recipe catalogue passed for station access, distinct perch/carp/pike ingredients and benefits, carried versus stored portions, shared spit capacity, garden beds and heat.');
