# Camp road rollout — five new exits

The approved southeast patch is retained. Northwest, northeast, west, southwest and south now each use an individually designed road-and-earth image at native camp-source scale. These are six local exit treatments, not a claim that every district road has been repainted.

## Preserved

- Original camp interior, buildings, placed foliage and saved positions.
- Approved southeast artwork and its installed appearance.
- Existing road centreline network, district connections and bridge reservations.
- Quiet wilderness areas; no added paths or baked-in foliage.

New artwork loads as optional terrain detail after editor entry and is culled outside the viewport. It is never repeated, rotated or stretched along a route. The source coordinate manifest is `src/camp-road-patches.json`. Ground edges blend over 96 source pixels; the camp-protection mask covers the original interior on all four sides.

## Artwork files and prompts

Mode: built-in ImageGen, precise-object-edit. Each target was captured from the actual production renderer; the approved southeast patch supplied the style reference. The west join received a targeted second pass to remove doubled stones.

- Source PNGs: `artwork-archive/camp-road-patches-v1/northwest.png`, `northeast.png`, `west-final.png`, `southwest.png`, `south.png`.
- Runtime WebPs: `public/survival/camp-road-patches-v1/` with corresponding compass filenames (`west.webp` for west).
- Complete prompts: `artwork-archive/camp-road-patches-v1/prompts.json` and `west-refinement.json`.
- Runtime dimensions and byte sizes: `public/survival/camp-road-patches-v1/manifest.json`.
- Repackage: `node scripts/package-camp-road-patches.mjs`.

## Checks

`npm run typecheck`

`node scripts/check-world-roads.mjs --camp-check`

The check renders all five new sections through the game's CanvasKit renderer, compares the original camp interior pixel-for-pixel, and compares the approved southeast rendering to the previous saved capture. It also checks the existing 42 road sections, seven district connections, six bridge reservations and five quiet areas. Result: `docs/qa/camp-road-patches-v1-checks.json`.

Installed captures: `docs/qa/world-roads-v3/installed-{direction}.webp`.

No browser automation or physical iPhone test was available. The district approaches and distant roads still use the previous road treatment and are the next rollout stage.
