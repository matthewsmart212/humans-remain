# Painted camp hearths

Three tiers now share the map's painted fieldstone, weathered oak and muted iron
palette. Existing `base_hearth_t1`, `base_hearth_t2` and `base_hearth_t3` IDs are
unchanged. The three earlier starter/provisions aliases also retain their IDs
while displaying the new T1 artwork.

## Animation contract

- Every exported state is **1024 × 1024**, transparent, lossless WebP.
- Every state uses ground anchor **(512, 960)**, including the unlit state.
- Eight flame frames at 10 fps; there is no per-frame auto-trimming or resizing.
- Each tier has ONE immutable illustrated base. Only a root-registered flame
  overlay changes. Pixels outside that overlay are copied verbatim from the
  base, including anti-aliased edges, to prevent compositing round-off shimmer.
- World widths remain 112, 132 and 164. Saved placement coordinates, scales,
  rotations, flips, layer settings and collision bodies are not migrated.
- Gameplay unlocks, fuel progression and weather remain unchanged. T2/T3 art
  availability does not mean their proposed upgrade mechanics are implemented.

## Source and rebuild

Generated masters, exact prompts, registration coordinates and flame masks are
in `artwork-archive/hearth-painted-v1/`. The superseded 627/1254 px runtime
exports were moved to `artwork-archive/hearth-legacy-v1/` rather than discarded.
Original publicly referenced source sheets remain available.

```sh
node scripts/prepare-painted-hearths.mjs
node scripts/check-painted-hearths.mjs /tmp/painted-hearth-review
```

Runtime playback shares constants in `src/camp-art.ts`. The checklist, editor,
survival renderer, asset yard and native image manifest use the same frame set.
Versioned URLs avoid stale browser artwork. User-uploaded overrides retain
priority; this update does not overwrite any uploaded artwork or saved world.

## Verification

The actual CanvasKit placed-world renderer produced the preview in
`docs/qa/painted-hearths.webp`. Automated checks passed for all 27 image sizes,
alpha edge clearance, all eight frame selections, identical lit/unlit drawing
rectangles, unchanged footprints and stable legacy IDs.

Pixel comparisons verified 375,191 / 401,408 / 531,343 visible base pixels,
respectively, identical to the unlit master throughout all eight frames.
On-device iPhone visual review is still distinct from these renderer checks.
