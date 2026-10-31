# Choppable woodland trees

Four placeable variants in the asset library's **Choppable trees** family: broad oak, Scots pine, silver birch and deadwood. These do not replace existing decorative trees or alter saved map placements.

In Walk or Play, face a tree and use the equipped axe. A resolved contact changes intact artwork to an axe-notched trunk, with brief rooted sway. At zero health the tree fades/leans away over 0.55 seconds, leaving its matching stump. Reduced motion skips sway/fall. Normal hits require 4 / 3 / 3 / 2 contacts respectively. Enemies retain axe target priority.

Damage belongs to the current simulation, not the authored map. Restart Play or return from Walk to Edit to restore trees. Stumps retain a small trunk collision footprint. Timber collection and regrowth are not implemented.

## Artwork

Built-in image generation; final prompt set in `docs/tree-art-prompts.json`. Original muted-palette outputs were selected after alpha compositing QA. WebP encoding preserves transparency. Each atlas contains all three states, so chopping needs no image request or decode. Placed instances share textures and use existing viewport culling; undamaged trees have no per-frame sway simulation.

- `public/survival/trees-v1/oak.webp`
- `public/survival/trees-v1/pine.webp`
- `public/survival/trees-v1/birch.webp`
- `public/survival/trees-v1/deadwood.webp`

Together: 1,450,514 compressed bytes, up to 24 MiB decoded when all four species are loaded. Trees are loaded only when requested by the existing asset/placement loader.

`node scripts/check-trees.mjs` checks contact timing, one hit per swing, range, facing, obstruction, rotation/mirroring/scale, stage rendering, reduced motion, session reset, saved-layout isolation, library registration and shared texture requests. Production CanvasKit software output: `docs/qa/trees-v1/states.png`. Browser GPU and physical-device performance are unverified.
