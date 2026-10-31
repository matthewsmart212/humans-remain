# Complete road artwork pass

The remaining 42-route network now has individually designed road-and-earth artwork. This adds 74 registered patches beneath the 12 previously approved camp and district patches, for 86 total. The original camp artwork and saved world objects are unchanged.

Each new patch was generated from its exact production-renderer terrain and road guide, with the approved southeast patch as the style reference. Original PNGs, prompts, source references, and generation paths are retained in `artwork-archive/complete-roads-v1/`. Full artwork remains at its native 1536 × 1024 or 1024 × 1536 resolution; WebP packaging does not resize it. The 96-pixel perimeter blend and original camp exclusion mask remain in use.

## Coverage and verification

- All 74 installed sections were rendered through the production CanvasKit renderer and visually reviewed in the `installed-*.webp` contact sheets in this folder. Native captures are in `../world-roads-v3/installed-route-*.webp`.
- All 42 route geometries and endpoints pass validation, and all seven district nodes remain connected.
- All 10,173 sampled centre/shoulder positions have opaque artwork coverage; none are uncovered. See `coverage.json` for per-route coverage.
- The four `checks-*.json` reports cover all 74 sections and confirm pixel-identical rendering of the original opaque camp interior.
- Five road-free areas and six reserved river crossings remain intact. This pass completes road surfaces; river and bridge structure artwork is future work.
- TypeScript checking and `git diff --check` passed. Streaming lifecycle checks passed (`stream-checks.json`); packaged asset checks passed (`asset-checks.json`).

Browser QA was unavailable in this environment. These are production-renderer and code checks, not a physical iPhone performance measurement.

## Loading

Full road artwork is excluded from editor entry and bulk terrain-detail loading. All 86 small overview textures total 1,551,908 bytes. Full-resolution artwork follows the camera, with at most 10 resident patches and two outstanding loads. Zooming out or leaving an area releases full-resolution images; previews remain available. Failed loads back off, and stale completions are released.

The 74 new full-resolution textures total 54,595,456 bytes across the entire world, loaded on demand rather than at editor entry. No runtime full-world composite bitmap is created.

The published build omits superseded world-ground-v1 and road-materials-v1 experiments, the retired olive texture, the obsolete perimeter preview, and six older planning exports. They remain recoverable in source; legacy image URLs redirect to current replacements. The active planning page, road and camp textures retain their full resolution and quality.

## Reproduce

Run `node scripts/check-road-stream.mjs` for lifecycle checks. Run `node scripts/check-world-roads.mjs --complete-check --range=0:74` for the full rendered check, or split the range into smaller batches. `--resume` reuses existing unchanged installed captures while still running geometry, coverage, and camp-preservation assertions. Remove affected captures when changing artwork or rendering before using that option.

Use `node scripts/road-contact-sheet.mjs installed START END` to create contact sheets. Packaging is in `scripts/package-complete-roads.mjs`. The planning script records the original placement procedure; do not rerun it after artwork generation without regenerating the affected guides and artwork.
