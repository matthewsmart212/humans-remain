# District road textures — 15 October 2026

The black road placeholders have been replaced with five materials. Camp stone continues the original paths, compacted earth serves rural lanes, darker soil serves logging and waterworks, grey gravel serves the factory, and brown gravel serves the salvage district. Materials blend across approaches; road edges feather into the soil. Terrain, saved placements and the original camp are preserved.

## Artwork

Generation mode: **built-in ImageGen**, using the original camp artwork as the style reference. The final stone uses a native-detail crop of the existing camp path. The first grainy stone candidate was rejected and is retained only in the source archive.

| Material | Generated source in this project | Runtime asset |
| --- | --- | --- |
| Camp stone | `artwork-archive/road-materials-v1/camp-stone.png` | `public/survival/road-materials-v1/camp-stone.webp` |
| Compacted earth | `artwork-archive/road-materials-v1/dry-earth.png` | `public/survival/road-materials-v1/dry-earth.webp` |
| Dark woodland earth | `artwork-archive/road-materials-v1/dark-earth.png` | `public/survival/road-materials-v1/dark-earth.webp` |
| Factory gravel | `artwork-archive/road-materials-v1/works-gravel.png` | `public/survival/road-materials-v1/works-gravel.webp` |
| Salvage gravel | `artwork-archive/road-materials-v1/salvage-gravel.png` | `public/survival/road-materials-v1/salvage-gravel.webp` |

Exact prompts, reference paths and original generation paths: [prompts.json](../../../artwork-archive/road-materials-v1/prompts.json). Every selected source is 1254 × 1254 pixels. Runtime WebP files retain these dimensions and total 4,462,696 bytes. The [manifest](../../../public/survival/road-materials-v1/manifest.json) records encoding size and mean channel error for every texture. No generated material contains foliage or props.

## Verification

`node scripts/check-world-roads.mjs` uses the actual production CanvasKit renderer and records results in [checks.json](checks.json). It checks 42 road sections, connectivity across seven districts, six reserved bridge crossings, five road-free areas, valid meshes, and exact preservation of the original camp interior. It also verifies that none of the five new texture keys is part of the editor-entry image gate.

The captures show the whole world, all six camp joins, district materials, junctions and a stone-to-earth transition. New images load in the background; a subdued earth surface appears while they are pending. The whole-world image is also used in the planning page.

TypeScript and the production build are checked before publication. No browser automation or physical iPhone test was available. River water, bridge artwork, district buildings and local streets around those future buildings are outside this texture pass.
