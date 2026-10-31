# Wooden and metal swords

Both swords start in the backpack, alongside the existing spears. Axes and knives remain in the headquarters chest. Gear ownership controls the backpack and quick selector; storing the equipped sword returns the player to fists.

The wooden sword deals 26 damage; the metal sword deals 42. Both use a 0.68-second attack interval, a 0.52-second swing and contact at 0.22 seconds. The wide forward arc hits up to three nearby targets once each. Reach and wall clearance are checked at contact. Downing, losing the weapon or dodging after contact cancels the swing safely.

## Validation

- `npm run typecheck` passed.
- `node scripts/check-sword-equipment.mjs` passed: inventory, equip/stow, group damage, target limit, timing, reach, walls, evasion, cooldown, interruption, dodge and both simulation entry points.
- `node scripts/check-chest-ui.mjs` and `node scripts/check-quick-selector.mjs` passed for the web and native component harnesses. These harnesses do not replace an on-device native test.
- `node scripts/check-spear-equipment.mjs` and `node scripts/check-knife-equipment.mjs` passed as weapon regressions.
- `node scripts/check-swords.mjs` rendered 144 idle/walk/run poses and 160 attack/recovery poses through the production Skia renderer. Contact points forward in all eight directions.
- Visually reviewed carry and swing sheets, including south, southwest and southeast. Per-source grip pivots stay on the palm; existing body pixels cover the fingers. Rear views render the blade behind the body.

The existing native Expo base-config warning and Skia path deprecation notices remain; the checks exit successfully.

## Files

- `woodenSword-72-poses.png`, `metalSword-72-poses.png`: eight directions, idle plus four walking and four running frames.
- `woodenSword-swing-sequence.png`, `metalSword-swing-sequence.png`: eight directions, carry through wind-up, sweep and recovery.
- `asset-prompts.md`: exact image-generation prompts and measured source registration.
