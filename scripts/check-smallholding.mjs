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
    'smallholding-placement', 'smallholding-yard', 'placed-world-renderer', 'player-map', 'world-assets',
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
  const previousSite = {x:3138, y:4820};
  assert(cottage.x > previousSite.x && cottage.y > previousSite.y);
  assert(Math.hypot(cottage.x-layout.spawn.x, cottage.y-layout.spawn.y) >
    2 * Math.hypot(previousSite.x-layout.spawn.x, previousSite.y-layout.spawn.y));
  assert.equal(chest.scale, 1, 'The cottage chest uses its full artwork size');
  assert(game.insideBuilding(cottage, chest.x, chest.y));
  assert.deepEqual(game.validateLayout(layout).errors, []);
  assert.equal(game.placeSoutheastSmallholding(layout), layout, 'Preparing the same layout cannot duplicate the site');
  const pin = game.playerMapFeatures(layout).landmarks.find(mark => mark.id === cottage.id);
  assert.equal(pin?.label, 'Overgrown smallholding');
  const beds = layout.items.filter(p => p.id.startsWith('smallholding-') && game.FORAGE_BY_ID.has(p.assetId));
  assert.deepEqual(new Set(beds.map(p => game.FORAGE_BY_ID.get(p.assetId).kind)), new Set(['carrot', 'potato']));

  const missingIds = new Set([...beds.map(p => p.id), chest.id]);
  const partial = {...layout, items:layout.items.filter(p => !missingIds.has(p.id))};
  const repaired = game.placeSoutheastSmallholding(partial);
  assert.deepEqual(repaired.items.filter(p => missingIds.has(p.id)), [...beds, chest]);
  assert.equal(game.placeSoutheastSmallholding(repaired), repaired);
  const gardenRabbits = w => w.animals.filter(a => a.rabbit && a.wildlife?.group === 'smallholding-rabbits');
  assert.equal(gardenRabbits(world).length, 3);
  for (const rabbit of gardenRabbits(world)) {
    assert(Math.hypot(rabbit.x-cottage.x, rabbit.y-cottage.y) < 1100);
    assert(!game.worldBlocked(world, rabbit.x, rabbit.y, 20));
  }

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
  const gate = game.yardPoint(cottage, 400, 630);
  const rail = game.placementBodies(openGate)[0];
  assert(game.worldBlocked(world, (rail.x + rail.ex) / 2, (rail.y + rail.ey) / 2), 'The gate leaf blocks its painted rail');
  assert(!game.worldBlocked(world, gate.x, gate.y), 'The path between gateposts is open');
  const view = {playing:true, follow:true, zoom:1};
  const camera = game.editorCamera(393, 710, {...world, player:gate}, view, 1);
  for (const p of layout.items.filter(p => p.assetId.startsWith('smallholding-yard-rail-'))) {
    assert(p.x > camera.x && p.x < camera.x + 393 / camera.scale, 'The enclosure fits in portrait at the gate');
  }
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
  // Inspect the same drawables sorted by the web and native renderers.
  const rear = layout.items.filter(p => p.id === 'smallholding-rear-birch' ||
    (p.assetId.startsWith('smallholding-yard-rail-') && p.y < cottage.y));
  const visible = [...rear, cottage, chest, openGate];
  const scene = {...world, layout:{...layout, items:visible}};
  const images = game.requiredImages(visible.map(p => p.assetId));
  const draws = game.placedDrawables({}, images, scene);
  assert.equal(draws.length, visible.length);
  const [room, furniture, frontGate] = draws.slice(rear.length);
  assert(draws.slice(0, rear.length).every(d => game.compareWorldDrawables(d, room) < 0), 'The rear rails and tree sort behind the exposed cottage');
  assert(game.compareWorldDrawables(room, furniture) < 0 && game.compareWorldDrawables(room, {y:world.player.y}) < 0,
    'The chest and survivor sort above the interior painting');
  assert(game.compareWorldDrawables(room, frontGate) < 0, 'The front gate retains its normal depth');
  scene.player = {...world.player, ...yard};
  const outsideDraws = game.placedDrawables({}, images, scene);
  assert(outsideDraws.slice(0, rear.length).every(d => (d.layer ?? 0) === 0), 'Walking out restores normal outdoor depth');

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
  oldCamp.animals = oldCamp.animals.filter(a => a.wildlife?.group !== 'smallholding-rabbits');
  oldCamp.ecology.slots = oldCamp.ecology.slots.filter(slot => slot.group !== 'smallholding-rabbits');
  const upgraded = game.decodeRun(JSON.stringify(oldSave)).worlds.find(([scene]) => scene === 'camp')[1];
  assert.equal(gardenRabbits(upgraded).length, 3);
  assert.equal(gardenRabbits(restored).length, 3);
  assert.deepEqual(upgraded.layout.items.filter(p => siteIds.has(p.id)).map(p => p.id).sort(), [...siteIds].sort(),
    'A continued expedition receives the same smallholding as a new run');
  assert(game.buildingInteriorExposed(cottage, restored.player), 'Continue preserves the indoor player position');
  for (const bed of beds) assert.equal(game.forageRemaining(restored, bed), 0, 'Picked plants stay picked on Continue');

  // Continue an expedition saved in the v2 room, with an opened chest, picked
  // crops and a watering can removed in the editor.
  const v2Run = JSON.parse(save);
  const v2Camp = v2Run.worlds.find(([scene]) => scene === 'camp')[1];
  const toOldSite = p => ({...p, x:previousSite.x+(p.x-cottage.x), y:previousSite.y+(p.y-cottage.y)});
  v2Camp.layout.smallholdingVersion = 2;
  v2Camp.layout.items = v2Camp.layout.items.filter(p => p.id !== 'smallholding-watering-can').map(p => {
    if (!siteIds.has(p.id)) return p;
    const old = toOldSite(p);
    if (old.id === chest.id) old.scale = .85;
    return old;
  });
  v2Camp.player = toOldSite(v2Camp.player);
  const moved = game.decodeRun(JSON.stringify(v2Run)).worlds.find(([scene]) => scene === 'camp')[1];
  const movedItems = moved.layout.items.filter(p => siteIds.has(p.id));
  assert.equal(movedItems.length, siteIds.size-1);
  assert(!movedItems.some(p => p.id === 'smallholding-watering-can'));
  for (const p of movedItems) {
    const expected = layout.items.find(item => item.id === p.id);
    assert(distance(p, expected) < 1e-6 && p.scale === expected.scale, 'Relocated ' + p.id);
  }
  assert(distance(moved.player, restored.player) < 1e-6 && game.insideBuilding(cottage, moved.player.x, moved.player.y));
  assert.equal(game.lootChestRemaining(moved, id), remaining);
  for (const bed of beds) assert.equal(game.forageRemaining(moved, bed), 0);

  // A v1 expedition may be saved inside the smaller cottage after gathering food.
  const oldRun = JSON.parse(save);
  const camp = oldRun.worlds.find(([scene]) => scene === 'camp')[1];
  const oldCottage = {...cottage, ...previousSite, scale:1};
  camp.layout.items = camp.layout.items.filter(p => !siteIds.has(p.id));
  camp.layout.items.push(oldCottage, {...chest, ...game.placementArtPoint(oldCottage, .606, .60)},
    {...openGate, assetId:'smallholding-fence-gate'}, {...beds[0], x:cottage.x - 295});
  camp.layout.smallholdingVersion = 1;
  Object.assign(camp.player, game.placementArtPoint(oldCottage, .337, .69));
  const continued = game.decodeRun(JSON.stringify(oldRun)).worlds.find(([scene]) => scene === 'camp')[1];
  assert.equal(continued.layout.smallholdingVersion, 3);
  assert.deepEqual(continued.layout.items.filter(p => siteIds.has(p.id)).map(p => p.id).sort(), [...siteIds].sort());
  assert(game.insideBuilding(cottage, continued.player.x, continued.player.y));
  assert(!game.worldBlocked(continued, continued.player.x, continued.player.y));
  assert.equal(game.lootChestRemaining(continued, id), remaining);
  for (const bed of beds) assert.equal(game.forageRemaining(continued, bed), 0);

  restored.round++;
  for (const bed of beds) assert.equal(game.forageRemaining(restored, bed), 1, 'Garden crops return the next day');

  walk(doorway);
  walk(yard);
  assert(!game.buildingInteriorExposed(cottage, world.player), 'Walking out restores the roof');
  console.log(`PASS: walked from camp to the southeast cottage, picked ${beds.length} vegetables, entered and exited, collected chest loot and continued with saved state.`);
} finally {
  rmSync(temp, {recursive: true, force: true});
}
