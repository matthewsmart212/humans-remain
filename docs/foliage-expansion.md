# Expanded bonfire foliage — 13 October 2026

The first 12-plant patch shipped as Site version 98. The follow-up request for taller, more varied foliage was still unimplemented when this continuation began. This expansion adds 48 plants around the fire, for 60 plants using seven designs. The latest saved camp (revision 58) has 37 placements; all are preserved exactly, including the original 12 plants.

## New artwork

Four transparent sprites were generated with the built-in `image_gen.imagegen` tool using the actual terrain and first foliage patch as style references. The exact prompts are in `artwork-archive/foliage-v2/prompts.json` and the original PNGs are beside it. Final runtime files:

- `public/survival/foliage-v2/olive-shrub.webp`
- `public/survival/foliage-v2/golden-shrub.webp`
- `public/survival/foliage-v2/copper-fern.webp`
- `public/survival/foliage-v2/pale-flowers.webp`

The two shrubs reach approximately waist height next to the runner; copper ferns are intermediate height and flowers are smaller accents. They share the existing rooted mesh animation, spring-back, sprint reaction, depth sorting and offscreen culling. Four new shared textures total 431,984 bytes. No new animation atlases, collision bodies or per-frame image decoding are introduced.

`node scripts/package-foliage-expansion.mjs` reproduces runtime images from the archived originals. Packaging removes only near-invisible alpha noise, trims with a transparent margin, proportionally resizes, and encodes lossless WebP. It does not repaint or recolour the artwork. Ground anchors, crops and native dimensions are recorded in `artwork-archive/foliage-v2/packaging.json`.

## Placement and persistence

`addApprovedFoliageExpansion` appends the approved patch once to the existing camp, retaining its objects and terrain. A `foliageTrialVersion: 2` marker prevents duplicates and preserves moved/deleted foliage. The old trial also recognises the newer marker, so deleting all plants cannot reintroduce the original patch. Expansion candidates overlapping a newly built solid object are skipped. The south cooking/food-drop approach stays clear.

The existing editor loads whichever local/cloud draft its normal rules select, applies the one-time expansion and uses its existing owner-authorized Save API. The public read-only API reports `canEdit: false` to this agent, so no direct remote draft edit is performed. Opening the updated editor applies the expansion; authorized sessions save it through the normal flow. The seven designs are available through the existing asset catalogue.

## Verification

- `npm run typecheck`
- `node scripts/check-foliage.mjs` — original interaction, sprint, recovery, reduced motion, depth/culling, passability and deletion persistence.
- `node scripts/check-foliage-expansion.mjs` — current 37 placements retained, 48 additions, marker migration, later user edits, blockers, unchanged collision map, clear south approach, genuine alpha and rooted movement across all four new designs.
- `node scripts/render-foliage.mjs --expanded` — actual CanvasKit/Skia day/night, front/behind character views and walk/sprint clip in `docs/qa/foliage-v2/`.
- Production build and `node scripts/check-foliage-server.mjs` — actual Worker/SQLite save/load for all seven IDs and marker 2, deletion persistence, optimistic concurrency, unauthorized-write rejection and catalogue entries.

The render is software QA, not a browser screenshot. Browser and physical iPhone testing are unavailable in this environment; on-device smoothness remains to be checked.
