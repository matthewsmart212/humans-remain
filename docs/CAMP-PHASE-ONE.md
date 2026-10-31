# Base settlement: phased delivery

## Delivered: starter courtyard (B1a)

This is the first playable increment, not the complete 36-concept catalogue.
Existing movement, worker animation, Skia renderer, landscape controls, buildings,
generator, combat and night progression are retained.

- New individual transparent hearth body and rope-and-bucket well images.
- Separate reusable flame image, animated by the shared renderer.
- Shared supplies station reuses the existing wooden salvage crate. New chest
  attempts were rejected for unwanted halos; a final standalone chest is pending.
- Supplies are deliberately deposited through the SUPPLIES context button and
  store action. Passing the generator no longer empties the backpack.
- Scrap, fuel and pallets enter the existing shared workshop stock. Raw meat stays
  in the backpack. Duplicate or out-of-range deposits are rejected.
- Hearth starts with 180 seconds of fire, burns one second of fuel per second,
  and accepts a stored pallet for up to 120 seconds more (180-second capacity).
  Cooking requires six seconds of remaining fuel. Ready food can be collected
  after the fire goes out. Fire provides light without generator power.
- Manual well remains functional without electricity.

## Placement and asset contract

src/camp-stations.ts defines per-run positions, current body footprints, accessible
front sockets and future lot reservations. Only current bodies block movement.
Reservations are planning metadata, not invisible walls or a placement editor.
src/camp-art.ts defines source crops and ground anchors; PNG masters remain intact.
Both native and web load the same artwork and call the same renderer/simulation.
Station tier is currently 1; no upgrade appearances or tier purchase UI are claimed.
The new objects can be repositioned through state, but live placement/removal,
upgrade validation and saved camp restoration still need implementation.

## Next manageable production batches

| Batch | Art and implementation | Acceptance gate |
|---|---|---|
| B0 remaining | Separate remaining terrain-baked solids; editable lot/entrance metadata; save and restore run state | No ghost blockers; reload restores the same camp |
| B1b | Approved standalone chest; hearth, well and shared supply storage tiers 2–3; early lighting | Upgrade appearance and capacity visibly change; entrances stay clear |
| B2 | Cooking station, water storage and main workshop, tiers 1–3 | Cooking is separate from central hearth; water collection and reserve are separate |
| B3 | Shelter and medical station, tiers 1–3 | Recovery costs supplies; no skipping night or unlimited revives |
| B4 | Vegetable plots, tiers 1–3, all growth/harvest states | Plant, grow and harvest; irrigation is deferred |
| B5 | Walls and gates, tiers 1–3, modular joins, open/closed/damaged states | Visible openings match collision; all approaches stay navigable |
| B6 | Remaining lighting tiers, construction/damage overlays and whole-camp integration | All 12 families have first three tiers tested together |

The 12 core families remain hearth, cooking station, well, water storage,
vegetable plot, shelter, medical station, workshop, shared storage, walls, gate
and lighting. The existing generator remains for compatibility with the current
survival objective; advanced power progression is not added in this batch.
Animals already present in the prototype are preserved, not expanded into farming.
Online co-op, other sectors and the extended catalogue remain later work.

## Verification

Automated simulation tests cover existing routes, doors, scenery collision,
movement, combat, nights, manual storage, station bodies/approaches and
independent hearth fuel/cooking. Web and native TypeScript checks and an Expo iOS
bundle export are run before publication. scripts/render-camp-preview.mjs can
produce day/night/blackout composition checks using the shared renderer; it
requires @napi-rs/canvas in the development runtime.
These checks do not substitute for a physical iPhone playtest or GPU frame-rate
measurement. New camp save/resume and all catalogue upgrades remain unimplemented.

Legacy check-packaging.mjs fails its pressActive assertion at 9.5 seconds.
Both that test and packaging-engine.ts are unchanged from the restored revision;
this unrelated old-mode issue is not silently fixed as part of the camp batch.
