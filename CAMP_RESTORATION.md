# Day-one camp restoration

Current repair workflow: [on-site hammer repairs and HQ stairs](docs/on-site-building-repairs.md). Existing ruins are now repaired at their camp sites after HQ Level 1; the earlier HQ-only repair flow below describes the original release.

New Survival runs start at Camp Level 0 with nine broken sites. The HQ planning bench remains reachable inside the ruined HQ. Its menu contains only the initial repair and exit until the player pays four logs. This establishes Camp Level 1 and immediately shows its unlocks. Other facilities must be restored individually from their HQ plans. The furnace retains its existing Camp Level 2 requirement.

| Site | Initial repair |
| --- | --- |
| Headquarters | 4 logs |
| Workshop | 3 logs |
| Warehouse | 4 logs |
| Well | 2 logs, 1 stone |
| Bonfire | 1 log, 2 stone |
| Bunker | 3 logs, 2 stone, 3 scrap |
| Treatment centre | 3 logs, 2 scrap |
| Garden | 3 logs |
| Furnace | 4 logs, 3 stone, 4 scrap; Camp Level 2 |

The starter axe can obtain HQ and workshop materials. A wooden pickaxe then costs three logs, opening the stone-dependent repairs. Materials are paid atomically from backpack first, then camp stores. No additional tools or resources are granted by repairing HQ. Garden and treatment restoration repairs their structures; farming and medical treatment remain future features and are labelled accordingly in their plans.

`restoredBuildings` is run state, shared across interiors and saved with the expedition. An absent field identifies an existing expedition and preserves its established facilities. Editor layouts, placement transforms, foundations and collision geometry are never mutated. Sandbox access remains available for testing.

The nine approved mockups live in `public/survival/camp-ruins-v1/`. The shared renderer maps each complete transparent sprite to the original placement's exact bounds, including rotation and flips, without recropping. HQ retains its fadeable roof and a separate damaged interior. Both web and native loaders include the assets.

Image provenance: built-in image generation, using the original building sprites as edit targets and preserving their framing, scale, foundation and perspective. The added interior prompt requested a roofless cutaway matching the original 1536×1024 canvas, damaged boards and moss, a clear walking area, unchanged entrance and stairs, and transparent surroundings. Original generated PNG files are preserved for native packaging. The browser uses lossless WebP encodings with identical dimensions, alpha and every visible RGB pixel; the encoding report verifies those properties. Dimensions are normalized only by the game's existing world-space draw rectangle.

Validation: TypeScript, new restoration checks, existing camp-level/HQ/first-expedition/smithy/warehouse/campfire regression checks, and production build. Browser QA covered the real shared HQ component at desktop, portrait phone and landscape phone sizes, insufficient materials, HQ repair → Level 1, workshop repair, and all nine sprite pairs in the actual shared renderer. Native source and asset mappings are updated; no physical iPhone build was run.

Publishing: the 256 MiB expanded archive limit required lossless encoding of sixteen remaining large runtime PNGs. `scripts/package-publish-art.mjs` verifies canvas dimensions, alpha and every visible RGB pixel. Existing PNG URLs redirect through the established artwork compatibility map; original PNG files remain available to native packaging.
