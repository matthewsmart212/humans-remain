# Day-one camp restoration

New Survival runs begin at Camp Level 0 with nine ruined sites. Bring four logs to the planning bench inside the ruined HQ to establish Level 1. The HQ shows the repairs and resources needed for each later level. Use the repair hammer at each building's site.

| Camp level reached | Requirement at HQ | Sites opened for repair |
| --- | --- | --- |
| 1 | 4 logs | Well and campfire |
| 2 | Working well and campfire, 8 logs, 4 stone | Warehouse and vegetable patch |
| 3 | Working warehouse and vegetable patch, 12 logs, 6 stone, 2 scrap | Workshop and furnace |
| 4 | Working workshop and furnace, 16 logs, 8 stone, 4 scrap | Bunker and treatment centre |

Each building has its own repair cost. Materials are paid from the backpack first, then shared camp stores. The starter cache holds the axe, pickaxe and repair hammer. Once restored, the furnace smelts iron ore with wood fuel, the workshop crafts equipment, the bunker opens for exploration and the treatment beds restore health over time.

Building condition and camp level persist across travel and saves. Damage can interrupt a service. Earlier expeditions retain access to buildings they already established. [On-site repair controls](docs/on-site-building-repairs.md)

The nine approved mockups live in `public/survival/camp-ruins-v1/`. The shared renderer maps each complete transparent sprite to the original placement's exact bounds, including rotation and flips, without recropping. HQ retains its fadeable roof and a separate damaged interior. Both web and native loaders include the assets.

Image provenance: built-in image generation, using the original building sprites as edit targets and preserving their framing, scale, foundation and perspective. The added interior prompt requested a roofless cutaway matching the original 1536×1024 canvas, damaged boards and moss, a clear walking area, unchanged entrance and stairs, and transparent surroundings. Original generated PNG files are preserved for native packaging. The browser uses lossless WebP encodings with identical dimensions, alpha and every visible RGB pixel; the encoding report verifies those properties. Dimensions are normalized only by the game's existing world-space draw rectangle.

Validation: TypeScript, new restoration checks, existing camp-level/HQ/first-expedition/smithy/warehouse/campfire regression checks, and production build. Browser QA covered the real shared HQ component at desktop, portrait phone and landscape phone sizes, insufficient materials, HQ repair → Level 1, workshop repair, and all nine sprite pairs in the actual shared renderer. Native source and asset mappings are updated; no physical iPhone build was run.

Publishing: the 256 MiB expanded archive limit required lossless encoding of sixteen remaining large runtime PNGs. `scripts/package-publish-art.mjs` verifies canvas dimensions, alpha and every visible RGB pixel. Existing PNG URLs redirect through the established artwork compatibility map; original PNG files remain available to native packaging.
