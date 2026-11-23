# Stillwater pier, fish and shoreline refinement

Matthew's screenshots showed a narrow gangway, an abrupt bank connection,
simple dark fish silhouettes and blue water patches at the lake's joins. This
update widens the existing jetty, seats a short landing on the dry bank and
adds more convincing, faster-moving fish with restrained surface disturbances.

## Changes

- A new transparent pier painting preserves the existing style, direction,
  stool and tackle box. The walkway is broader, the platform has more space,
  and a short plank apron reaches the bank. The bucket hangs from its handle.
- The pier's world width changes from 740 to 820. Deck support, post/prop
  collision and foreground occlusion follow the new artwork. Submerged
  timbers retain their soft water fade; the landing's contact shadow stays
  close to the ground instead of using the deeper water shadow offset.
- Known, unmodified v1 artwork records migrate to v2 in published and offline
  saved worlds. Owner replacement images, edited widths and custom collision
  remain authoritative. World placement and the lake footprint are unchanged.
- Six fish use three body forms, with shaped heads, gills, fins, forked tails,
  subtle markings and an animated rear-body bend. Their irregular routes
  cruise, accelerate and ease smoothly. Small near-surface wakes and broken
  rings complement the broader lake ripples.
- Lake water uses a broad feathered material field through the inlet and
  outlet. The old repaint's rectangular protection areas no longer define
  water colour boundaries. A shared colour treatment preserves underwater
  stone reflections and foam across the waterfall join.

## Actual renderer evidence

The before baseline is frozen at
`9ad7ea50415cd488ae015b7eb6bbda8e57f6cf20`. Captures use the production native
renderer, bundled world snapshot and SHA-verified artwork through CanvasKit's
software platform adapter. They are actual game renders, not generated
mockups. Environment review omits the HUD. Landscape captures are 844 × 390
points at 2× density, with several camera zooms; portrait is 390 × 844 points.

| Capture | Review purpose |
| --- | --- |
| [Before platform](before-platform.webp) / [After platform](after-platform.webp) | Deck width, fish and submerged supports |
| [Bank entry](after-entry.webp) | Continuous apron and contact with dry ground |
| [Overview](after-overview.webp) | Pier and shoreline together |
| [North join](after-north-join.webp) / [South join](after-south-join.webp) | Waterfall and bridge transitions |
| [Before full lake](before-full-lake.webp) / [After full lake](after-full-lake.webp) | Complete lake material continuity |
| [Portrait](after-portrait.webp) / [Rain](after-rain.webp) | Phone framing and the supplied weather condition |

The renderer report records all views, source hashes, loading completeness,
and checks that the bank entry and deck are walkable while open water blocks
movement. The internal collision overlay is only a diagnostic; it is not part
of the delivered game artwork.

`fish-motion.gif` shows six seconds of the same shared fish painter at 16 fps
on a plain water-colour background so movement can be reviewed clearly.
`fish-anatomy.webp` shows the three forms enlarged. These are detail studies,
not full terrain captures.

The preserved [native QA runner](render-production.mjs) can be run from the
repository root with `node docs/qa/stillwater-refinement-v3/render-production.mjs after`.
Its exact baseline and recapture commands are recorded in
[renderer-report.json](renderer-report.json). Summary checks are in
[validation.json](validation.json).

## Validation

- Root and native TypeScript checks pass.
- The production web build passes.
- `scripts/check-fishing-site.mjs` verifies existing/saved-world placement,
  the known-artwork migration, owner edits and the dry approach.
- `scripts/check-fishing-site-behavior.mjs` verifies 205 full-body wet-deck
  standing samples, walking onto and off the pier, transformed placements,
  retained bridge collision, support immersion, foreground depth, culling
  and reduced motion.
- `scripts/check-fishing-water-life.mjs` checks 14,400 route samples for full
  fish/effect water containment, deterministic continuous motion and reduced
  motion. Average speeds range from 13.05 to 26.61 world units per second;
  the peak sampled speed reaches 58.59 units per second during acceleration.
- `scripts/check-stillwater-lake.mjs` checks shader compilation, both lake
  joins, moving water, unchanged dry timber/earth/stone samples, untouched
  outside reaches, retained geometry hashes and offline artwork bindings.
- The existing CI Stillwater step now runs the dedicated fish check too.

Geometry validation and the native software renders do not replace physical
iPhone frame-rate or touch testing. No physical iPhone was available for this
pass. The unrelated co-op protocol check was already failing on the baseline
CI runner because its pinned Node version cannot mock the requested method.

## Source and scope

The unmodified generated pier source and complete edit prompt are preserved
under `artwork-archive/stillwater-fishing-v2/`. Its lossless transparent WebP
is a normal Git blob under `public/survival/stillwater-fishing-v2/`, with an
offline native binding. Original artwork remains available.

Fish routes are validated and cached per placement geometry; draw poses reuse
small scratch objects. This update introduces no per-frame texture creation
or additional water texture samples. The scene stays in the visual phase of
fishing; casting, catching, bait and rewards remain a later task.
