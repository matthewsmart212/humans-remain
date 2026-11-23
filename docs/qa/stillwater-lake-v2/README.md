# Stillwater Lake visual polish

The first fishing implementation had a high-contrast, repeating wave painting,
a continuous rim of oversized boulders, and support posts whose visible cutout
ends made the jetty appear to sit above the water. This update gives the existing
lake a calmer woodland palette and integrates the same jetty into its surface.

## Visual changes

- Repainted the lake with broad emerald depth, quiet surface variation, muted
  shallows, wet earth and separated groups of flatter stones.
- Registered the new painting against the existing terrain and pier approach.
  The walking deck, world placements, water masks, bridges and waterfalls retain
  their original geometry.
- Added a cached material for the approved pier sprite. Its lower timbers tint
  toward the water and fade below the surface; the planks and foreground
  uprights remain intact. Custom replacement artwork uses its ordinary painter.
- Added a restrained shadow following the actual deck outline and broken
  contact ripples at the submerged supports.
- Increased the five existing fish silhouettes' contrast and added a faint
  interior dorsal glint. Their deterministic water-only routes are unchanged.

## Actual renderer captures

These images use the production native renderer and published world snapshot,
with CanvasKit software rendering and minimal platform adapters. They are not
generated mockups. The viewport is 844 × 390 points at 2× density; clear and rainy
conditions use the same scene and camera positions for comparison. UI is omitted
to make the environment legible.

| Capture | Purpose |
| --- | --- |
| [before-platform.webp](before-platform.webp) | Previous deployed artwork and material |
| [after-platform.webp](after-platform.webp) | Repaint, submerged posts and fish at gameplay scale |
| [after-overview.webp](after-overview.webp) | Wider bank and lake integration |
| [after-rain.webp](after-rain.webp) | The weather condition shown in the user's screenshots |

Renderer loading and capture results are recorded in
[renderer-report.json](renderer-report.json). Physical iPhone testing was not
performed in this environment.

## Validation

- `npm run typecheck` in the root and `native/`.
- `npm run build` for the web release bundle.
- `node scripts/check-fishing-site.mjs` for existing/saved-world placement,
  owner replacement artwork, dry approach and editor behavior.
- `node scripts/check-fishing-site-behavior.mjs` for full-body movement onto and
  off the deck, water collision, foreground depth, reduced motion and real
  shader pixels. The new pixel assertions check that planks remain intact while
  support ends disappear through a soft underwater transition.
- `node scripts/check-stillwater-lake.mjs` for decoded versioned exports,
  offline native bindings, retained geometry hashes, shader compilation and
  unchanged rendering outside the repaint scope.

The existing CI workflow runs both fishing checks and the lake-art check. The
unrelated co-op protocol test was already failing on the previous deployed
commit because the pinned Node runner cannot mock its requested method.

## Artwork and integration

The generated source and complete generation prompt are preserved in
`artwork-archive/stillwater-lake-v2/`. The registered export report records the
protected geometry hashes and exact image dimensions. Runtime exports are
ordinary Git WebP blobs under `public/survival/stillwater-lake-v2/`, available to
both Cloudflare and the offline native bundle.

`scripts/package-stillwater-lake.mjs` assembles the original high-detail master,
registers the repaint inside the shared scope, preserves protected source
pixels, and produces aligned high-detail chunks with their existing gutters
plus medium and preview images. The runtime shader reads that same scope.

This remains the visual phase of fishing: the lake, walkable jetty and ambient
fish are present; casting, catching, bait and fishing rewards are a later task.
