# World terrain expansion

The supplied world overview is the geographic guide, not a replacement background at a different zoom. The camp stays at its existing coordinates and art scale. Extend adjoining ground first, with foliage, buildings, water and resources remaining separately placed assets.

**Ground-only art rule (owner's video feedback):** backgrounds supply plain earth, subtle flat grass colour/texture and the necessary paths. Do not bake grass clumps, ferns, bushes, leaf rosettes, roots or foliage shadows into the floor. Create depth and density with separately placeable assets. Brown-tinted plant silhouettes are still baked foliage and must be removed, not recoloured. Preserve existing camp contacts without spreading their old leaf texture across the new ground.

**Master layout:** use `src/world-master-plan.ts` and [the master-plan production notes](world-master-plan.md) for all new geography. The view at `/world-plan.html` is generated from those coordinates. Before any new artwork, run `node scripts/plan-terrain-patch.mjs A5` (or the next batch ID) and inspect all actual neighbouring edges. A1–A4 now wrap southwest and west. A5–A6 continue northwest and north around camp. The older directional table below provides ground character; it does not override the master route network, river reservations or batch order.

## Built ground

| Piece | Source origin | Texture dimensions | Connection |
| --- | --- | --- | --- |
| Original camp | 0, 0 | 4800 × 4800 overall | Fixed reference and saved layout |
| 01 Camp approach | 4096, 3264 | 1538 × 1536 | Southeast camp path |
| 02 Woodland junction | 5630, 3264 | 1538 × 1536 | Stone route east; dirt trail north |
| 03 Camp east clearing | 4096, 1860 | 1538 × 1538 | Camp on west; approach on south |
| 04 Village trail | 5630, 1860 | 1538 × 1538 | Junction on south; next north/east routes |
| 05 Camp northeast clearing | 4096, 456 | 1538 × 1538 | Camp on west; clearing 03 on south |
| 06 Village outskirts | 5630, 456 | 1538 × 1538 | Trail 04 on south; wider dirt lane north |
| 07 Works footpath | 7036, 1992 | 1538 × 1406 | Village trail on west; service track on south |
| 08 Works service track | 7036, 3264 | 1538 × 1536 | Woodland stone route on west; footpath 07 on north |
| 09 North works clearing | 7036, 456 | 1538 × 1538 | Village outskirts on west; connector 10 on south |
| 10 Works trail connector | 7036, 1860 | 1538 × 266 | Short registered join from clearing 09 to works footpath 07 |
| 11 Works yard | 8442, 2124 | 1538 × 1274 | Footpath 07 on west; dirt lane 12 on south |
| 12 Works dirt lane | 8442, 3264 | 1538 × 1536 | Service track 08 on west; yard 11 on north |
| 13 Works meadow | 8442, 456 | 1538 × 1538 | Northern works 09 on west; mostly road-free open ground |
| 14 Meadow south contact | 8442, 1860 | 1538 × 266 | Short band beside works connector 10 |
| 15 Meadow yard contact | 8442, 1992 | 1538 × 266 | Short band beside footpath 07; joins yard 11 below |
| 16 South works clearing | 7036, 4668 | 1538 × 1538 | Service track 08 on north; open work ground below |
| 17 Scrap outskirts trail | 8442, 4668 | 1538 × 1538 | Dirt lane 12 on north; clearing 16 on west |
| 18 Camp southeast meadow | 4096, 4668 | 1666 × 1538 | Camp approach 01 on north; open ground 19 on east |
| 19 Camp–works open ground | 5630, 4668 | 1538 × 1538 | Junction 02 on north; meadow 18 on west; works clearing 16 on east |
| 20 Camp south clearing | 2690, 4412 | 1538 × 1794 | Main camp on north; southeast meadow 18 on east; open earth and grass |
| 21 Camp south trail | 1284, 4412 | 1538 × 1794 | Main camp southern exit on north; clearing 20 on east; stone becomes narrow dirt trail |
| 22 Southwest camp corner | −122, 4412 | 1538 × 1794 | A1: original camp above, piece 21 on east; southwest stone exit becomes dirt |
| 23 West camp lower ground | −1528, 3006 | 1794 × 1666 | A2 upper: camp and piece 22 on east; quiet earth between routes |
| 24 Southwest woodland trail | −1528, 4540 | 1794 × 1666 | A2 lower: piece 23 above, piece 22 east; dirt approach west |
| 25 West camp exit | −1528, 1598 | 1794 × 1540 | A3: camp western stone exit becomes gravelly dirt; piece 23 below |
| 26 West camp upper ground | −1528, 190 | 1794 × 1540 | A4: road-free brown earth with subtle olive ground colour; piece 25 below |

Pieces 18 and 19 were the first return west. They close the empty southern strip west from the works clearing back beneath the southeast camp approach. Both pieces stay road-free, with open brown earth and muted olive grass. The old northern leaf contact is retained without spreading red leaves into the new ground. This is the first return towards camp, not a completed surround. The active v2 artwork for these two pieces was rebuilt in four close-up passes after the owner reported coarse patterned ground and low resolution. Their positions and footprint are unchanged.

Pieces 20 and 21 extended the southern ground. They extend west directly below the central camp, joining the previous return ground. One existing camp exit continues from stone into a narrow dirt trail; the clearing beside it remains road-free. Four close-up generations keep enlargement below 7.7%. A 388-pixel northern overlap covers the old camp's baked dark edge before it starts, while preserving the camp coordinates and all saved objects. The southwest corner is now joined by piece 22.

Pieces 22–26 complete master batches A1–A4. Ten native close-up generations keep the maximum enlargement below 8.9%. Five lossless runtime textures retain exact registered contact pixels, and all are integrated into movement bounds, streaming and save validation. The western origin is now −1528 source pixels; camp coordinates and scale stay fixed. The newest northern pieces paint above their southern neighbours using a 36-pixel bottom feather, disabled if the southern texture is unavailable.

Their active `west-camp-v2` artwork is a ground-only correction, not an expansion: baked plant clumps were replaced with plain soil in ten close-up ImageGen edits. Existing roads, runtime rectangles and contact registration are retained. Original camp artwork, saved placements and the earlier 21 extensions were not edited in this correction; the older extensions have not all received this cleanup yet. Superseded v1 runtime files remain in `artwork-archive/west-camp-v1/runtime/`, with old public URLs redirected to v2 for older open tabs.

## Continue from the guide

The camp must sit within the world, with connected ground on every side. Complete the near-camp connections before extending distant districts. Do not keep lengthening the southeast arm. Continue northwest and north to join the existing northeast ground. This is a terrain connection, not a circular road: leave broad quiet spaces and connect only routes justified by the overview. Each batch should remain small enough to inspect at game scale and walk end to end.

| Order | District / direction | Ground character | Routes |
| --- | --- | --- | --- |
| Next | Northwest and north of camp | Woodland browns, grass and sparse leaf litter | Meet the existing northeast terrain and complete the near-camp connections |
| Later | Village ground north of the outskirts | Deeper brown earth, subdued grass, occasional old paving | Continue the widened dirt lane; keep space for separate buildings |
| Later | Southern meadows and wet low ground | Olive and brown soil, darker damp patches | Narrow meandering dirt paths and a few wider worn crossings |
| Later | Western river / waterworks ground | Brown-grey silt and pale gravel banks | Dirt bankside tracks; fixed bridge approach alignment |
| Later | Northwest logging ground | Deep woodland browns and leaf litter | Broad dirt hauling tracks with small footpaths |
| Ongoing | Ground between built districts | Interpolated neighbouring soil colours and texture density | Close loops and connect branches before adding detached land |

These later districts are planned, not built in this release. The reference illustration is preserved at `artwork-archive/world-guide/world-overview.jpeg`.

## Joining rules

- Start with the actual adjacent texture edges as an outpaint template. Include every adjoining side, not just an overall style reference.
- Keep `MAP_WIDTH / 3600` world units per source pixel. Do not stretch the camp or move saved objects to fit new art.
- Let regions vary through natural ground patterns. Do not use a different solid tint per square or impose a straight palette boundary along a tile edge.
- Keep plenty of quiet ground: plain dirt and flat grassy colour are desirable. Actual grass blades, bushes, ferns and other foliage belong in separate sprites, not the ground painting. Fallen-leaf accents, if wanted later, must stay sparse and local.
- Connect roads where destinations or traffic justify them. Adjoining terrain does not need a road on every edge: preserve broad road-free stretches in meadows and natural ground, with free movement across dirt and grass.
- Keep major and minor paths different widths. Most woodland paths can be dirt; stone is reserved for chosen established routes.
- Generate enough original detail for the game scale. Use smaller close-up passes when a single wide image would need substantial enlargement, and inspect interiors and joins at one source pixel per rendered pixel. Avoid repeated rings, pore patterns, embossed dirt and dense outlined pebbles.
- Register preserved contact pixels, split adjoining pieces from one continuous master, retain sampling overlap, and test the decoded lossless files.
- Register rectangles and draw order in the terrain modules. `OUTDOOR_FOOTPRINT` derives walking/building bounds from those rectangles, including inward corners and holes.
- Preserve the already loaded southern terrain if a new northern texture is pending or failed. Once both are ready, shared contact rows paint once.
- A short connector may use a separate image to follow the western-neighbour boundary. If it is unavailable while the main northern clearing is ready, render the existing southern image in full with its obsolete top fade removed.
- At the original camp, begin the new overlap before its baked dark border starts; preserve the actual northern pixels and cover the border without moving the camp.
- At southward contacts, preserve the existing bottom fade and use a 132-pixel overlap with a 36-pixel new-image top feather. Disable that top feather if the northern neighbour is unavailable. Where two northern images overlap, build the reference from their actual composite.
- At eastward contacts, use a 132-pixel overlap with a 36-pixel new-image feather. The new image must be opaque before the old 96-pixel outer fade starts, keeping both the interior join and unfinished corner continuous.
- At westward contacts, retain the old eastern left fade. Use a new 36-pixel right feather within the 132-pixel overlap, with exact registered pixels across that feather. If the eastern image is missing, remove the new right feather so the overlap remains complete.
- Walk across all new contacts, check the actual renderer, and validate a save/reload in the new area before publishing.

The original four camp textures remain resident. The twenty-six added textures are culled and streamed nearby. This supports the present small expansions; much larger worlds still require device testing and a larger-scale object/texture budget.
