# Calmer western river

The river retains ten waterfall/rapid animation areas, down from 31 (32.3% retained). Six continuous paintings replace excess whitewater with blue pools and gentle flow. The existing 26 tile positions, source scale, overlap, shoreline collision and four bridge decks are preserved.

The remaining areas are distributed as 2 headwaters, 1 logging, 2 western bends, 1 waterworks, 2 lower pools and 2 southern reach. Strong motion masks are limited to these locations; the whole river retains subtle moving reflections. Removed areas no longer load waterfall masks or the old pool-entry reference artwork.

## Artwork provenance

Created with the built-in `image_gen` editing tool using each original continuous river painting as its reference. The exact six prompts are in [prompts.json](../artwork-archive/river-calm-v2/prompts.json).

Saved masters: `artwork-archive/river-calm-v2/headwaters.png`, `logging.png`, `western.png`, `waterworks.png`, `lower.png`, and `southern.png`. Originals remain in their original archive folders. Runtime crops and previews are in `public/survival/river-calm-v2/`.

`scripts/package-calm-river.mjs` crops the paintings at existing native pixel boundaries and generates water-only masks. Superseded runtime crops are archived, and saved old URLs redirect to current images. The map guide uses a fresh render of the actual terrain renderer.

## Validation

`scripts/check-calm-river.mjs` checks tile overlap, all four bridge decks, river collision, streaming limits, ten retained areas, and the motion/loop/bank protection of the retained section masks. It renders the full river, all five batch joins and all four crossings using the actual CanvasKit renderer. Results are saved under `docs/qa/river-calm-v2/`.

No browser or physical phone session was available; the visual checks use the real renderer in software mode. Startup still loads no river artwork and streaming retains at most three detail textures with two concurrent requests.

Validation passed: typecheck, production build, 111 collision samples, four bridge decks, nine retained section animation loops (plus the unchanged original pilot), and zero animation changes outside protected water masks. All five batch joins and four bridge renders were visually inspected. The runtime build is approximately 265.8 MB before archive packaging, slightly smaller than the previous version.

## Visible surface-flow correction

The first calmer-river release reduced surface highlights too far and removed the broad motion windows along with the excess rapids. The ordinary water therefore appeared still. `RIVER_SHADER` now moves the painted blue-water surface downstream using two crossfading samples, follows the bends, and restores readable reflections. Surface movement works before the reflection atlas loads. The ten waterfall areas and all artwork, geometry, collision and streaming budgets remain unchanged.

`scripts/check-river-surface-motion.mjs` renders calm water in all six paintings with every waterfall overlay absent. All six pass with and without the reflection atlas, and the low-resolution preview passes too. Between frames 0.75 seconds apart, 67–90% of the sampled full-detail water pixels visibly change. Dry pixels in the isolated paintings stay unchanged. Results and an animated sample are in `docs/qa/river-surface-v3/`. Typecheck passes. Browser/phone verification remains unavailable.
