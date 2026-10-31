# Round timber fortification

The owner's existing camp receives a circular timber perimeter centred at (1780, 1480), radius 1530 world units. Twenty-six short wall bays follow that circumference. Six hinged double gates cross the existing road centre-lines. Heavy painted oak, battered tops, braces, ironwork and mossy feet replace the thin fence artwork.

Generated source sprites and exact prompts are retained in `artwork-archive/camp-fortification-v4`. `scripts/package-camp-fortification.mjs` registers those sprites to the world and writes the runtime art, catalogue and placement plan. Old wall IDs remain available for validation of earlier saved worlds.

The one-time version-2 perimeter migration replaces only previous perimeter placements and preserves all 1,357 other placements exactly, including 1,335 foliage and eight puddles. It runs through the existing editor save flow; no production database snapshot is overwritten. Later owner moves and removals remain intact.

## Verification

- Whole-camp and close-up renders use the actual shared software Skia game renderer with the saved camp's uploaded artwork. No placements were omitted.
- Every joint lies on the circle; short connected chords and all six gates form one closed collision boundary. 1,250 boundary samples passed.
- Gates block sprinting and dodging when closed, open from either side, permit pathfinding and walking, and refuse unsafe closure on the player. Mirrored and rotated gate copies retain correct collision.
- Previous and migrated saved layouts validate; marker idempotence and deliberate removals are preserved.
- Production Worker tests run against disposable local SQLite, including persistence, stale-write rejection and the earlier empty-world recovery regression.
- TypeScript and production build checks are required before publication.

Browser and physical iPhone verification were unavailable in this environment. These images show the shared game renderer, not an iPhone capture.
