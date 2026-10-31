# Contact foliage and rendering performance

Foliage has no ambient wind. Only moving players, living moving enemies and
moving animals create contact targets. Standing inside a plant does not keep
it active. After contact, the spring returns to rest, its state is removed, and
the plant uses the original image draw. Reduced-motion settings still bypass
all deformation. Choppable trees retain their existing hit/fall animations.

The motion simulation queries the existing local spatial index, reuses its
target map per world and does no plant-query/state work when the world has no
moving actors or recovering springs. The native survival tick now calls the
same contact simulation as editor Play.

Visible-object queries retain at most two exact viewport results per immutable
layout. The main camera, ground pass and nearby-player query can reuse results;
edited layouts and imported-artwork changes invalidate them. Ground decals are
drawn from the local result while retaining their original placement order.
Offscreen objects stay culled; player/roof/layer depth order is preserved.

The shared Skia adapter reuses image paints and mesh texture shaders rather than
allocating and disposing them for each sprite each frame. Cache entries remain
bounded by the existing 256-entry LRU; streamed image release invalidates every
shader referencing it, and renderer teardown disposes the cached resources.
Image sampling, alpha, brightness, resolution and artwork bytes are unchanged.

Visible scenery still draws while the game renders. These changes remove idle
mesh generation, duplicate queries and native resource churn. They do not claim
that static scenery has zero drawing cost or that the whole world has been
flattened into a bitmap. Draw ordering remains important for walking behind
trees/buildings, so sprites are not reordered merely to group their textures.

## Verification

`node scripts/check-contact-foliage-performance.mjs` checks moving/stationary
player and NPC contact, recovery/sleep, fixed roots, reduced motion, the native
simulation path, 600 static plants, one active plant, query reuse/invalidation,
and ground ordering against the 4,465-placement authored world.

The before/after run used preserved pre-change renderer modules in `.qa/`:
`node scripts/check-contact-foliage-performance.mjs --baseline`. It compared
100 spatial queries and full rendered pixel outputs, including recorded Skia
Pictures, opacity changes, brightness filters, mirroring and rotation. Results
are in `docs/qa/contact-foliage-performance/checks.json`.

- 600 idle plants: zero deforming meshes; one contact: one mesh.
- 1,200 repeated image draws: 1,200 native Paint allocations before, 2 after.
- Immediate and recorded-Picture output: identical pixels.
- No artwork files, map placements or collision data changed.

These are deterministic behavior, resource-allocation and software-renderer
checks, not iPhone GPU/frame-rate measurements. Browser interaction and native
release-build performance remain unmeasured in this environment.

## Native profiling references

The existing native entry already uses a Skia Picture/shared value for the
world and a slower HUD update instead of a React component/update per sprite.
The shared adapter and simulation improvements apply there too; a new native
binary must be built to include source changes.

React Native recommends evaluating performance in release builds because dev
mode adds substantial JavaScript overhead:
https://reactnative.dev/docs/performance

Skia's Picture API supports reusing recorded draw commands, and its Atlas API
supports efficient repeated textures. Future batching should preserve the
current depth order and be evaluated against release-build CPU/GPU profiles:
https://wcandillon.github.io/react-native-skia/v2/docs/shapes/pictures/
https://wcandillon.github.io/react-native-skia/v2/docs/shapes/atlas/
