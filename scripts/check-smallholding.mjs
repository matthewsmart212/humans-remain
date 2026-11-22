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
    stdin: {contents: modules.map(name => `export * from './src/${name}'`).join('\n') +
      "\nexport {validateSavedWorld} from './native/game-world';\nexport {handlePublishedWorld} from './server/world-layout';", resolveDir: process.cwd()},
    outfile, bundle: true, format: 'cjs', platform: 'node',
    plugins: [{name:'smallholding-native-storage', setup(builder) {
      builder.onResolve({filter:/^@react-native-async-storage\/async-storage$/}, args => ({path:args.path, namespace:'storage-stub'}));
      builder.onLoad({filter:/.*/, namespace:'storage-stub'}, () => ({contents:
        "export default {getItem(){throw Error('Unexpected storage read')},setItem(){throw Error('Unexpected storage write')}};", loader:'js'}));
    }}],
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

  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const toOldSite = p => ({...p, x:previousSite.x+(p.x-cottage.x), y:previousSite.y+(p.y-cottage.y)});
  const rails = layout.items.filter(p => p.assetId.startsWith('smallholding-yard-rail-'));
  assert.equal(rails.length, 18, 'All painted fence panels have a physical placement');
  const railIds = new Set(rails.map(p => p.id));
  const gatePoint = game.yardPoint(cottage, 400, 630);
  const railSamples = p => {
    const [body] = game.placementBodies(p);
    assert.equal(body?.shape, 'segment', 'Fence collision follows its painted post feet: ' + p.id);
    return [0, .25, .5, .75, 1].map(t => ({x:body.x+(body.ex-body.x)*t, y:body.y+(body.ey-body.y)*t}));
  };
  function checkFences(fixed, label) {
    const fencedWorld = {...world, layout:fixed};
    for (const expected of rails) {
      const actual = fixed.items.find(p => p.id === expected.id);
      assert(actual && distance(actual, expected) < 1e-6, label + ': attached ' + expected.id);
      assert.equal(actual.solid, true, label + ': solid ' + expected.id);
      for (const point of railSamples(expected)) {
        const hits = game.layoutColliderHits(fixed, point.x, point.y, 19);
        assert(Array.isArray(hits) && hits.some(hit => hit.id.startsWith(expected.id + ':')),
          label + ': the actual rail blocks its post/quarter/midpoint');
        assert(game.worldBlocked(fencedWorld, point.x, point.y), label + ': gameplay blocks ' + expected.id);
      }
      const old = toOldSite(expected);
      const oldHits = game.layoutColliderHits(fixed, old.x, old.y, 19);
      assert(Array.isArray(oldHits) && oldHits.every(hit => !railIds.has(hit.id.split(':')[0])),
        label + ': no abandoned collision ring near camp');
    }
    assert(!game.worldBlocked(fencedWorld, gatePoint.x, gatePoint.y), label + ': entrance remains open');
    assert.equal(game.placeSoutheastSmallholding(fixed), fixed, label + ': repair is idempotent');
  }
  checkFences(layout, 'Bundled world');

  // Reproduce the broken v3 save: its ground painting moved southeast, but the
  // transparent fence copies and their colliders stayed near the original camp.
  const removedOptional = new Set(['smallholding-watering-can', 'smallholding-gate-birch']);
  const detachedIds = new Set([...railIds, 'smallholding-kindling', 'smallholding-rear-birch']);
  const customFence = {...toOldSite(rails[4]), id:'owner-custom-fence', locked:false};
  const detached = {...layout, items:[...layout.items.filter(p => !removedOptional.has(p.id))
    .map(p => detachedIds.has(p.id) ? toOldSite(p) : p), customFence]};
  const detachedBefore = JSON.stringify(detached);
  // Prime the old collision cache before migration, as an already-open layout can.
  const oldRail = toOldSite(rails[0]);
  assert(game.layoutColliderHits(detached, oldRail.x, oldRail.y, 19).some(hit => hit.id.startsWith(rails[0].id + ':')));
  const joined = game.placeSoutheastSmallholding(detached);
  checkFences(joined, 'Detached v3 world');
  assert.equal(JSON.stringify(detached), detachedBefore, 'Repair leaves the input snapshot unchanged');
  for (const id of removedOptional) assert(!joined.items.some(p => p.id === id), 'Do not recreate deliberately removed ' + id);
  for (const id of ['smallholding-kindling', 'smallholding-rear-birch']) {
    assert.deepEqual(joined.items.find(p => p.id === id), layout.items.find(p => p.id === id), 'Reattach existing ' + id);
  }
  for (const p of detached.items.filter(p => !detachedIds.has(p.id))) {
    assert.equal(joined.items.find(item => item.id === p.id), p, 'Preserve unrelated/editor placement ' + p.id);
  }
  const nearbyEdit = {...rails[4], x:rails[4].x+12, y:rails[4].y-8, locked:false};
  const edited = {...layout, items:layout.items.map(p => p.id === nearbyEdit.id ? nearbyEdit : p)};
  assert.equal(game.placeSoutheastSmallholding(edited), edited, 'Nearby intentional rail adjustments are retained');

  const missingRail = rails[3], disabledRail = rails[8], emptyRail = rails[12];
  const incomplete = {...joined, items:joined.items.filter(p => p.id !== missingRail.id && p.id !== 'smallholding-yard').map(p =>
    p.id === disabledRail.id ? {...p, solid:false} : p.id === emptyRail.id ? {...p, collision:{paths:[], lineWidth:.012}} : p)};
  const completed = game.placeSoutheastSmallholding(incomplete);
  checkFences(completed, 'Missing/disabled v3 rails');
  assert.equal(completed.items.filter(p => railIds.has(p.id)).length, 18, 'Missing rails return exactly once');
  assert.deepEqual(completed.items.find(p => p.id === 'smallholding-yard'), layout.items.find(p => p.id === 'smallholding-yard'),
    'A missing ground painting returns with the enclosure');
  const legacyFence = {...toOldSite(rails[4]), id:'smallholding-fence-west-0-0', assetId:'smallholding-fence-front'};
  const legacyPath = {...legacyFence, id:'smallholding-footpath', assetId:'smallholding-footpath', solid:false};
  const withLegacy = {...completed, items:[...completed.items, legacyFence, legacyPath]};
  const retired = game.placeSoutheastSmallholding(withLegacy);
  assert(!retired.items.some(p => p.id === legacyFence.id || p.id === legacyPath.id), 'Retire seeded v1 fence/path leftovers');
  assert.equal(retired.items.find(p => p.id === customFence.id), customFence, 'Retirement preserves owner-created fences');
  checkFences(retired, 'Retired legacy enclosure');

  const native = game.validateSavedWorld({...snapshot, layout:detached}, 'Stale cached published world');
  checkFences(native.layout, 'Native cached world');
  assert.equal(native.source, 'Stale cached published world');
  // Exercise the public Worker read path with a newer, detached D1 layout. No
  // database writes, live requests or owner editor actions are involved.
  const publishedSource = {...detached, updatedAt:new Date(Date.parse(snapshot.layout.updatedAt)+1000).toISOString()};
  const databaseReads = [];
  const readOnlyDB = {prepare(sql) {
    assert.match(sql, /^SELECT /, 'Published-world repair must remain read-only');
    databaseReads.push(sql);
    return {all:async () => ({results:sql.includes('FROM world_layout') ? [{applied_json:JSON.stringify(publishedSource)}] : []}),
      run() {assert.fail('A published-world read must not write to D1');}};
  }};
  const response = await game.handlePublishedWorld(new Request('https://game.example/api/published-world'), readOnlyDB);
  assert.equal(response.status, 200);
  const published = await response.json();
  checkFences(published.layout, 'Published D1 world');
  assert.equal(published.updatedAt, publishedSource.updatedAt, 'Repair preserves the owner publication timestamp');
  assert(databaseReads.some(sql => sql.includes('FROM world_layout')), 'The published D1 layout was exercised');
  assert.deepEqual(published.layout.items.find(p => p.id === customFence.id), customFence);
  const gardenRabbits = w => w.animals.filter(a => a.rabbit && a.wildlife?.group === 'smallholding-rabbits');
  assert.equal(gardenRabbits(world).length, 3);
  for (const rabbit of gardenRabbits(world)) {
    assert(Math.hypot(rabbit.x-cottage.x, rabbit.y-cottage.y) < 1100);
    assert(!game.worldBlocked(world, rabbit.x, rabbit.y, 20));
  }

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
  // Continue an already harvested/looted expedition whose fence copies were
  // detached or absent. A survivor and a mine return point on restored rails
  // must move to nearby clear ground, without resetting the run's inventory.
  for (const [label, brokenLayout] of [['Detached', detached], ['Missing/disabled', incomplete]]) {
    const brokenSave = JSON.parse(save);
    const savedCamp = brokenSave.worlds.find(([scene]) => scene === 'camp')[1];
    savedCamp.layout = brokenLayout;
    const occupied = railSamples(missingRail)[2], returnPoint = railSamples(disabledRail)[2];
    Object.assign(savedCamp.player, occupied);
    brokenSave.route = [{sceneId:'camp', spawn:{...returnPoint, direction:'up'}}];
    const repairedSave = game.decodeRun(JSON.stringify(brokenSave));
    const continuedCamp = repairedSave.worlds.find(([scene]) => scene === 'camp')[1];
    checkFences(continuedCamp.layout, label + ' Continue');
    assert(!game.worldBlocked(continuedCamp, continuedCamp.player.x, continuedCamp.player.y), label + ': survivor remains on clear ground');
    assert(distance(continuedCamp.player, occupied) > 19 && distance(continuedCamp.player, occupied) < 100,
      label + ': move the survivor just clear of the restored fence');
    const safeReturn = repairedSave.route[0].spawn;
    assert(!game.worldBlocked(continuedCamp, safeReturn.x, safeReturn.y), label + ': return point remains clear');
    assert(distance(safeReturn, returnPoint) > 19 && distance(safeReturn, returnPoint) < 100,
      label + ': move the return point just clear of the restored fence');
    assert.deepEqual(continuedCamp.bag, restored.bag, label + ': keep the backpack');
    assert.deepEqual(continuedCamp.gear, restored.gear, label + ': keep carried tools');
    assert.equal(game.lootChestRemaining(continuedCamp, id), remaining, label + ': keep chest loot state');
    for (const bed of beds) assert.equal(game.forageRemaining(continuedCamp, bed), 0, label + ': picked crops stay picked');
    for (const removed of removedOptional) assert(!continuedCamp.layout.items.some(p => p.id === removed), label + ': optional removal survives');
  }
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
  console.log(`PASS: restored all 18 smallholding rails in detached, missing and disabled layouts across web, native, published reads and Continue; checked fence samples, open entrance, safe landings and retained edits/loot. Walked from camp, picked ${beds.length} vegetables, entered/exited and continued with saved state.`);
} finally {
  rmSync(temp, {recursive: true, force: true});
}
