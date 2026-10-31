# Tree art consistency review

Compared all four trees in the current saved camp (1,366 existing placements), including the headquarters, warm stone paths, mossy palisades, foliage and Scrap Runner. All review placements were disposable: the live draft and saved map were not written.

The v1 trees shared the woodland theme but had more photographic bark, fuzzy tiny leaves and lower-contrast crowns than the existing illustrated game. Restyled all four using actual foliage/character and headquarters renders as image-generation references.

- Oak: distinct lobed leaf clusters, warmer painted trunk and readable moss.
- Pine: clearer needle sprays and bark shapes; retained its tapered silhouette and dark forest-green shadows.
- Birch: clearer leaves and ivory bark markings; narrowed the crowns to avoid adjoining-frame clipping.
- Deadwood: carved-looking bark planes, warm highlights and moss that tie into the existing wooden camp walls.

All retain their stable asset IDs, health, contact timing, hit sway, fall transition and stump behaviour. Frame crops and ground anchors were re-registered for the revised images. No changes to chopping code, collisions, map placements or resource systems.

## Outputs

- `public/survival/trees-v2/oak.webp`
- `public/survival/trees-v2/pine.webp`
- `public/survival/trees-v2/birch.webp`
- `public/survival/trees-v2/deadwood.webp`

Built-in image generation; full prompts and reference roles: `docs/tree-style-v2-prompts.json`. V1 artwork remains in source for comparison and rollback but is excluded from the active publish bundle.

Four shared 1536×1024 atlases, 1,550,250 compressed bytes total, unchanged 24 MiB maximum decoded image memory for all four. No new runtime image requests or draw passes per chop.

## Verification

`node scripts/render-tree-style.mjs after` renders the twelve states, four close-up day/night comparisons, and each species next to current foliage using the production CanvasKit adapter. It reads a local QA snapshot from `.qa/tree-style`, never writes to the live site, and records missing assets (zero).

`node scripts/check-trees.mjs docs/qa/trees-style-v2/checks` passes the existing contact, range, facing, obstruction, health, transformed placement, reduced motion, session reset, saved-layout isolation and shared-image checks (108 transform/arc cases). TypeScript and the production build are checked separately.

This is software-renderer visual QA, not a browser GPU or physical iPhone performance claim.
