import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build} from 'esbuild';

const temp = mkdtempSync(join(tmpdir(), 'smallholding-'));
try {
  const modules = [
    'authored-world', 'imported-art', 'world-layout', 'outdoor-terrain', 'studio-play',
    'survival-engine', 'play-interaction', 'expedition-inventory', 'foraging', 'forage-art',
    'loot-chest', 'wooden-loot-art', 'chest-animation', 'scene-travel', 'run-save',
    'smallholding-placement', 'player-map',
  ];
  const outfile = join(temp, 'game.cjs');
  await build({
    stdin: {contents: modules.map(name => `export * from './src/${name}'`).join('\n'), resolveDir: process.cwd()},
    outfile, bundle: true, format: 'cjs', platform: 'node',
  });
  const game = createRequire(import.meta.url)(outfile);
  const snapshot = JSON.parse(readFileSync('native/assets/world-snapshot.json', 'utf8'));
  game.installImportedArt(snapshot.records);
  const layout = game.prepareAuthoredWorld(snapshot.layout);
  const world = game.createCampPlaySession(layout, undefined, 'survival');
  world.outdoorReady = new Set(game.OUTDOOR_TILES.map(tile => tile.key));

  const cottage = layout.items.find(p => p.assetId === 'art_smallholding_cottage');
  assert(cottage, 'The current camp includes the cottage');
  assert(cottage.x > layout.spawn.x && cottage.y > layout.spawn.y, 'The cottage is southeast of camp');
  const chest = layout.items.find(p => p.id === cottage.id + '-chest');
  assert(chest, 'The cottage contains a placed loot chest');
  assert(game.insideBuilding(cottage, chest.x, chest.y));
  assert.deepEqual(game.validateLayout(layout).errors, []);
  assert.equal(game.placeSoutheastSmallholding(layout), layout, 'Preparing the same layout cannot duplicate the site');
  const pin = game.playerMapFeatures(layout).landmarks.find(mark => mark.id === cottage.id);
  assert.equal(pin?.label, 'Overgrown smallholding');
  const beds = layout.items.filter(p => p.id.startsWith('smallholding-') && game.FORAGE_BY_ID.has(p.assetId));
  assert.deepEqual(new Set(beds.map(p => game.FORAGE_BY_ID.get(p.assetId).kind)), new Set(['carrot', 'potato']));

  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function walk(point) {
    for (let i = 0; i < 600 && distance(world.player, point) > 1; i++) {
      const dx = point.x - world.player.x, dy = point.y - world.player.y;
      const divisor = Math.max(5, Math.hypot(dx, dy));
      game.movePlayer(world, {x: dx / divisor, y: dy / divisor});
      world.tick++;
    }
    assert(distance(world.player, point) <= 1, `Walk to (${point.x}, ${point.y}) stopped at (${world.player.x}, ${world.player.y})`);
  }
  function followPath(point) {
    const route = game.pathTo(world.player, point, world, Infinity, 19);
    if (distance(world.player, point) > 80) assert(route.length && distance(route.at(-1), point) < 80, 'Connected route to ' + JSON.stringify(point));
    for (const node of route) walk(node);
    walk(point);
  }

  const yard = game.placementArtPoint(cottage, .337, 1.1);
  const openGate = layout.items.find(p => p.id === 'smallholding-fence-gate');
  assert(openGate, 'The ruined fence has a standing open gate');
  const gate = {x: openGate.x + 112.5, y: openGate.y + 58};
  // Cross the southeast opening in the camp stockade before following the outer road.
  followPath({x: 2870, y: 2700});
  followPath({x: gate.x, y: gate.y + 100});
  walk(gate);
  walk(yard);
  assert(!game.buildingInteriorExposed(cottage, world.player), 'The roof covers the room from the yard');
  for (const plant of beds) {
    const kind = game.FORAGE_BY_ID.get(plant.assetId).kind;
    followPath(plant);
    const count = game.itemCount(world, kind);
    const carried = game.itemCount(world, 'pallets');
    game.setItemCount(world, 'pallets', 99);
    assert(!game.pickForage(world, plant.id), 'A full pack leaves the crop in the bed');
    game.setItemCount(world, 'pallets', carried);
    const action = game.playInteraction(world);
    assert.equal(action?.target?.forageId, plant.id, 'The interaction selects the crop at the player’s feet');
    assert(action.perform());
    assert.equal(game.itemCount(world, kind), count + 1);
    world.tick += 60;
    assert(!action.perform(), 'Repeating the pickup cannot harvest a plant twice');
  }

  followPath(yard);
  const doorway = game.placementArtPoint(cottage, .337, .70);
  walk(doorway);
  assert(game.buildingInteriorExposed(cottage, world.player), 'Walking in reveals the room');
  const sideWall = game.placementArtPoint(cottage, .147, .72);
  assert(game.worldBlocked(world, sideWall.x, sideWall.y));
  const latch = game.placementArtPoint(chest, ...game.WOODEN_LOOT_LATCH);
  walk({x: latch.x, y: latch.y + 14});
  const action = game.playInteraction(world), id = game.placedLootChestId(chest.id);
  assert.equal(action?.target?.id, 'rare-chest:' + id);
  assert(action.perform());
  world.tick += 90;
  game.stepLootChest(world);
  assert.equal(world.stationPanel, 'rare-cache');
  const contents = game.lootChestContents(world, id);
  const reward = Object.keys(contents).find(key => contents[key] > 0);
  const previous = game.itemCount(world, reward);
  assert.equal(game.takeLootChestReward(world, reward, 1), 1);
  assert.equal(game.itemCount(world, reward), previous + 1);
  const remaining = game.lootChestRemaining(world, id);
  world.stationPanel = undefined;
  const resources = {ready: () => true, prepare: async () => {}, pin() {}};
  const save = game.encodeRun(new game.SceneTravel(world, resources));
  const restored = game.decodeRun(save).worlds.find(([scene]) => scene === 'camp')[1];
  assert.equal(game.lootChestRemaining(restored, id), remaining);
  const oldSave = JSON.parse(save);
  const oldCamp = oldSave.worlds.find(([scene]) => scene === 'camp')[1];
  const siteIds = new Set(layout.items.filter(p => p.id.includes('smallholding')).map(p => p.id));
  oldCamp.layout.items = oldCamp.layout.items.filter(p => !siteIds.has(p.id));
  delete oldCamp.layout.smallholdingVersion;
  Object.assign(oldCamp.player, oldCamp.layout.spawn);
  const upgraded = game.decodeRun(JSON.stringify(oldSave)).worlds.find(([scene]) => scene === 'camp')[1];
  assert.deepEqual(upgraded.layout.items.filter(p => siteIds.has(p.id)).map(p => p.id).sort(), [...siteIds].sort(),
    'A continued expedition receives the same smallholding as a new run');
  assert(game.buildingInteriorExposed(cottage, restored.player), 'Continue preserves the indoor player position');
  for (const bed of beds) assert.equal(game.forageRemaining(restored, bed), 0, 'Picked plants stay picked on Continue');

  walk(doorway);
  walk(yard);
  assert(!game.buildingInteriorExposed(cottage, world.player), 'Walking out restores the roof');
  console.log(`PASS: walked from camp to the southeast cottage, picked ${beds.length} vegetables, entered and exited, collected chest loot and continued with saved state.`);
} finally {
  rmSync(temp, {recursive: true, force: true});
}
