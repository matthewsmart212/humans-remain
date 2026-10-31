# High-resolution terrain replacement — 6 October 2026

Historical record of the 6 October replacement. This terrain has since been superseded by `public/survival/camp-ground-v3`; the obsolete image is preserved at `artwork-archive/retired-runtime/home-terrain-hd-v2.webp`. The production descriptions below document that earlier release.

- Actual decoded dimensions: 3042 × 4056 (12,338,352 pixels).
- Previous texture: 1086 × 1448 (1,572,528 pixels), preserved at `public/survival/home-terrain.png`.
- Pixel count increased 7.846×. The replacement contains newly generated ground detail, not simply an enlarged copy.
- Lossless WebP export: 20,921,646 bytes. Decoded RGB content matches the assembled source. No lossy quality reduction was used.
- Map dimensions remain approximately 2545.6 × 3394.1 world units. World-layout IDs, placements, player scale, collision traces and camera controls are unchanged.

## Production

The built-in image-generation tool repeatedly returned 1086 × 1448 for a whole-image edit. The successful process used nine overlapping sections of the original layout. A 3042 × 4056 guide was divided into 1086 × 1448 inputs on 1014 × 1352 strides, with 36-pixel horizontal and 48-pixel vertical margins. Each section was regenerated separately at its native output size using the same layout-preserving prompt in `terrain-hd-prompt.txt`.

`scripts/stitch-terrain.cjs` joins the nine generated tiles with normalised overlap weights and crops the guide padding. It requires Sharp for the export step; Sharp is not used by the game. Tile filenames are `detail-r0-c0.png` through `detail-r2-c2.png`.

The final flattened texture is the production asset. Its versioned URL prevents clients reusing the old cached terrain. `src/terrain-art.ts` provides the current image URL and source dimensions to the web game, editor, asset-yard preview and checklist HTML. The native entrypoint includes the same file via a static require.

## Verification

- All nine source outputs measured 1086 × 1448; final texture measured 3042 × 4056 and decoded successfully through Skia.
- Inspected the whole map for joins and rendered old/new textures at an identical 1920 × 1080 desktop camera using the actual world renderer, worker and starter assets.
- Fine leaves, grass blades, dirt and cobbles are visibly sharper in the resulting desktop view.
- TypeScript and world-editor asset/layout checks passed. The production build and public checklist validation are part of publishing.
- No new Expo device test was performed in this texture-only update.

Comparison: `docs/qa/terrain-resolution-comparison.webp`.
