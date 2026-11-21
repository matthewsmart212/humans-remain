import assert from 'node:assert/strict';

export function collectStarterTools(model, world) {
 const cache = model.campLootChest(world);
 Object.assign(world.player, {x:cache.x, y:cache.y+55});
 assert(model.openLootChest(world));
 world.tick += model.LOOT_CHEST_OPEN_TICKS + model.LOOT_CHEST_REVEAL_HOLD_TICKS;
 model.stepLootChest(world);
 assert.equal(model.takeAllLootChestRewards(world), 3);
 assert.equal(model.takeAllLootChestRewards(world), 0);
 world.stationPanel = undefined;
}

export function visitHQ(model, world) {
 world.stationPanel = undefined;
 Object.assign(world.player, model.headquartersDock(model.headquartersBench(world)));
 assert(model.openHeadquarters(world));
}

export function supply(model, world, cost) {
 for (const [material, count] of Object.entries(cost)) {
  model.setItemCount(world, material, count);
  model.setStoredCount(world, material, 0);
 }
}

export function establishBuilding(model, world, id) {
 if (id === 'headquarters') visitHQ(model, world);
 else {
  world.stationPanel = undefined;
  const {x, y} = model.campRepairSite(world, id);
  Object.assign(world.player, {x,y,equipped:'repairHammer'});
 }
 supply(model, world, model.CAMP_REPAIRS[id].cost);
 assert(model.restoreCampBuilding(world, id), id);
}

export function reachCampLevel(model, world, target) {
 if (!model.campAccessLevel(world)) establishBuilding(model, world, 'headquarters');
 while (model.campAccessLevel(world) < target) {
  const next = model.campAccessLevel(world) + 1;
  for (const id of model.CAMP_MILESTONES[next].requires) {
   if (!model.buildingRestored(world, id)) establishBuilding(model, world, id);
  }
  visitHQ(model, world);
  supply(model, world, model.CAMP_MILESTONES[next].cost);
  assert(model.expandCamp(world), 'Reach Camp level ' + next);
 }
}
