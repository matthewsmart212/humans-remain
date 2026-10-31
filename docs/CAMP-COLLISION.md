# Home camp: terrain, buildings and collision

The map uses a hybrid scene. `home-terrain-hd-v2.webp` contains paths, dirt, grass and permanent perimeter scenery. `home-buildings-atlas-lossless.webp` retains the original building artwork; only each prefab's crop is drawn over the empty ground. This preserves the art instead of regenerating mismatched building sprites. Furniture, trees, machinery, supplies, well, fire and actors remain separate entities.

## Buildings

`src/camp-buildings.ts` owns three stable instances (`workshop`, `bunkhouse`, `fuel-store`). Each references a prefab containing its image key, crop, anchor, footprint, doors, attached pipes and foreground wall crops. Rendering, wall collision and the minimap derive from these definitions. Furniture uses building-local sockets. Front walls are sorted with actors by ground contact, rather than making the entire building an impassable rectangle.

Future upgrade work should register a new prefab and load its atlas, retaining the building ID. Art, door openings and collision must change together. The current definitions are resolved when the sector loads; runtime construction/upgrades, costs, persistence and navigation-index rebuilding are **not yet implemented**. A runtime upgrade must rebuild static collision/navigation, reposition any occupants that its new footprint overlaps, and migrate furniture sockets. Do not mutate a live prefab without these steps.

## Solid scenery

`src/camp-collision.ts` traces permanent fences, low brick ruins, the closed west gate arm, raised railway beams and large boulders. Segments and circles match irregular scenery without blocking entire rectangular gardens. Grass, flowers, paving and small pebbles are walkable. Trunks block feet; tree canopies do not. Prop footprints are defined at their ground contacts, not across their full painted height.

The broad-phase spatial index keeps checks local. Players, enemies, animals, melee visibility and pickup visibility share the collision query. Destroyed crates cease blocking. Closed shutters and intact barricades block immediately and reopen when expired/destroyed. Construction refuses to close a defence on an occupied threshold. Generator collision grows with its existing upgrade level. Movement/knockback are subdivided into at most eight-unit steps to prevent thin-wall tunnelling.

## Validation

`node scripts/check-survival.mjs` checks visibly selected wall/fence/rock/rail points, walks every doorway in both directions at both actor radii, checks fast wall/fence crossings, dynamic defences and alternate routes, compares indexed geometry with direct shape queries, and verifies prefab relocation moves art/collision together. Existing resource, food/water, combat, full-night and deterministic-run checks remain included.

Browser QA pushed the worker repeatedly into the repair hall's east wall and confirmed that position remained outside it; screenshot: `docs/qa/camp-wall-collision.jpg`. Web/native TypeScript and Expo iOS export pass. Physical iPhone testing is still required for native frame rate and touch feel.
