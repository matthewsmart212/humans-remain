# Full-world ground foundation

The original camp artwork and saved placement data are retained. All 26 previous post-camp sectors have been retired from the active terrain registry. Their originals remain recoverable under `artwork-archive/world-ground-v1/retired-sectors` and source history; the build omits their runtime directory.

## Ground assembly

- Complete planned bounds: source x -7200 to 12800, y -6200 to 13800; 20,000 × 20,000 terrain pixels.
- 256 overlapping placements, each 1437.5 source pixels wide, using three 1254 × 1254 native images. The smaller placement size prevents the initial 2675px stamps from stretching the art too far.
- 200px shared overlaps with directional edge feathers. Four-way contacts remain opaque over earlier tiles. Missing-neighbour feathers are disabled until their support arrives.
- Full-frame warm-earth artwork is rotated and mirrored, not assembled from tiny sampled patches. Brown/olive variants blend through broad world-coordinate gradients so biome colour changes do not follow square boundaries.
- The same three decoded images and GPU textures are shared between placements. No giant full-world raster is allocated.
- Original camp image files remain byte-for-byte unchanged. Only its outer dark-frame margin is feathered into the new surrounding terrain; the central camp and saved coordinates are untouched.
- No extension roads, structures or foliage are baked into the new ground. The original camp roads remain. Future road, river and scenery overlays are identified as planned in the field guide.

## Reproduction and verification

Run `node scripts/package-world-ground.mjs`, `node scripts/render-world-plan-ground.mjs`, and `node scripts/build-world-plan.mjs` to rebuild the lossless material packaging and planning overview. Native generated originals and full built-in ImageGen prompts are in `artwork-archive/world-ground-v1`.

- `node scripts/check-world-ground.mjs`: physical tour of every square and all seven district centres, no scene fades, unchanged player/inventory/weather, saved-camp southwest exit and return, 10,000 coverage samples, bounds, readiness and streaming retry checks.
- `node scripts/check-world-ground-save.mjs`: real save/read handlers in **in-memory SQLite only**, preserving the 1368-placement fixture and new test placements across all 256 squares; stale and unauthorized writes rejected.
- `node scripts/check-world-ground-render.mjs`: production CanvasKit software renders, including 64 representative square centres, original camp contacts, portrait/night, full world, and a missing-neighbour contact.
- TypeScript and production build checks.

Visual review is a software-renderer check, not a physical iPhone/WebGL performance test. No live saved-layout database was modified. Automated route checks initially caught the creature pathfinder selecting a line across a thin camp fence on its changed coarse grid; the camp-return test uses the authored southwest gate route instead. This terrain pass does not change creature pathfinding.

The current terrain is intentionally sparse. Completed ground coverage does **not** mean district buildings, water, bridges, resources or encounters are built.
