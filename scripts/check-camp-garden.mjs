import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-garden-'));
try {
  const modules = ['authored-world', 'imported-art', 'world-layout', 'world-tiers', 'camp-garden-art',
    'camp-garden-placement', 'studio-play', 'run-save', 'scene-travel', 'world-scenes', 'potato-farming'];
  const outfile = path.join(temp, 'model.cjs');
  await build({stdin: {contents: modules.map(id => `export * from './src/${id}';`).join('\n'),
    resolveDir: process.cwd()}, bundle: true, platform: 'node', format: 'cjs', outfile});
  const m = createRequire(import.meta.url)(outfile);
  const snapshot = JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
  m.installImportedArt(snapshot.records);

  // Reproduce the production migration from the old, completely walk-through patch.
  const current = m.prepareAuthoredWorld(snapshot.layout);
  const isGarden = p => p.id === m.GARDEN_PLACEMENT_ID;
  const old = {...current, potatoGardenVersion: 1,
    items: current.items.map(p => isGarden(p) ? {...p, solid: false} : p)};
  const rawGarden = old.items.find(isGarden);
  const layout = m.addApprovedCampGarden(old), garden = layout.items.find(isGarden);
  assert.equal(rawGarden.solid, false, 'Source placement is immutable');
  assert.equal(garden.solid, true, 'Existing patch gains fence collisions');
  assert.deepEqual(garden, {...rawGarden, solid: true}, 'Keep owner placement, size, frame and tier positions');
  assert.deepEqual(layout.items.filter(p => !isGarden(p)), old.items.filter(p => !isGarden(p)));
  assert.equal(m.addApprovedCampGarden(layout), layout, 'Migration runs once');
  for (const items of [layout.items.filter(p => !isGarden(p)), old.items]) {
    const edited = {...layout, items};
    assert.equal(m.addApprovedCampGarden(edited), edited, 'Later removal or explicit non-solid override survives');
  }
  const roundTrip = m.validateLayout(JSON.parse(JSON.stringify(layout)));
  assert.deepEqual(roundTrip.errors, []);
  assert.equal(roundTrip.layout.potatoGardenVersion, layout.potatoGardenVersion);

  // Points are fixed landmarks from the artwork, independent of collider definitions.
  const gate = [.662, .78], outside = [.688, .925], inside = [.635, .696];
  const beds = [[.312,.507], [.570,.438], [.427,.650], [.700,.590]];
  const fence = [[.435,.835], [.85,.71], [.776,.50], [.34,.416], [.187,.688]];
  const worldPoint = (p, [u,v]) => {
    const b = m.placementBounds(p);
    return m.placementPoint(p, b.x + b.width*u, b.y + b.height*v);
  };
  const walk = (worldLayout, p, a, b) => {
    for (let i = 0; i <= 32; i++) {
      const point = [a[0] + (b[0]-a[0])*i/32, a[1] + (b[1]-a[1])*i/32];
      assert.equal(m.layoutBlocked(worldLayout, ...worldPoint(p, point), 19), false,
        `${p.assetId}: a player can walk through ${point} on the route from ${a} to ${b}`);
    }
  };
  // Shipped garden in situ, including neighbouring camp assets.
  walk(layout, garden, outside, gate);
  walk(layout, garden, gate, inside);
  for (const bed of beds) walk(layout, garden, inside, bed);

  let cases = 0;
  for (const art of m.GARDEN_ART) {
    assert(fs.existsSync('public'+art.image), art.image);
    const tier = m.changePlacementTier(layout, garden.id, art.tier).items.find(isGarden);
    for (const transform of [{scale:1}, {scale:1.4, rotation:37, flipX:true}, {scale:2, rotation:90, flipY:true}]) {
      const p = {...tier, ...transform}, test = {...layout, items:[p]};
      walk(test, p, outside, gate);
      walk(test, p, gate, inside);
      for (const bed of beds) walk(test, p, inside, bed);
      for (const point of fence) assert(m.layoutBlocked(test, ...worldPoint(p, point), 19),
        `${p.assetId}: fence rail at ${point} stops a player`);
      cases++;
    }
  }

  // This player can stand outside the rear rail, within arm's reach of the
  // nearest crop on the other side. The solid rail must still reject the action.
  const smallGarden = {...garden, scale:1}, smallPlot = {...layout, items:[smallGarden]};
  const outsideRail = worldPoint(smallGarden, [.303,.355]);
  const bedCentre = m.gardenBedPoint(smallGarden, 0);
  assert(Math.hypot(outsideRail[0]-bedCentre.x, outsideRail[1]-bedCentre.y) < 58);
  assert.equal(m.layoutBlocked(smallPlot, ...outsideRail, 19), false);
  const visitor = m.createCampPlaySession(smallPlot);
  [visitor.player.x, visitor.player.y] = outsideRail;
  assert.equal(m.nearPotatoPatch(visitor), null, 'Fence stops interactions with a nearby bed');
  for (const [index,point] of beds.entries()) {
    [visitor.player.x, visitor.player.y] = worldPoint(smallGarden, point);
    assert.equal(m.nearPotatoPatch(visitor)?.bed, index, 'Standing on the soil offers its own bed');
  }

  const world = m.createCampPlaySession(old, undefined, 'survival');
  const travel = new m.SceneTravel(world, {pin(){}, prepare:async()=>{}, ready:()=>true});
  // Earlier runs can have feet, spawn, or an interior return point on a fence.
  const [x,y] = worldPoint(garden, fence[0]);
  for (const location of ['player', 'spawn', 'return']) {
    const saved = JSON.parse(m.encodeRun(travel)), camp = saved.worlds[0][1];
    if (location === 'player') Object.assign(camp.player, {x,y});
    if (location === 'spawn') camp.layout.spawn = {x,y};
    if (location === 'return') saved.route.push({sceneId:m.CAMP_SCENE_ID, spawn:{x,y,direction:'down'}});
    const resumed = m.decodeRun(JSON.stringify(saved)), home = resumed.worlds[0][1];
    const point = location === 'return' ? resumed.route[0].spawn : location === 'spawn' ? home.layout.spawn : home.player;
    assert(!m.layoutBlocked(home.layout, point.x, point.y, 19), 'Old '+location+' remains playable after migration');
  }
  console.log(`PASS: authored gate route to all four beds; five fence faces across ${cases} tier/transform cases; old-save safety and editor overrides.`);
} finally {
  fs.rmSync(temp, {recursive:true, force:true});
}
