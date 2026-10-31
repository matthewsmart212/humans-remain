# World road layout — 15 October 2026

The road surface layer now uses five district materials throughout the existing open world. It follows the established 42-section route graph and connects the seven district areas, with wider main routes, narrower trails, six future bridge crossings and five reserved road-free areas. Local district streets will be fitted around buildings later.

The original camp is unchanged. Road extensions draw above the world soil and beneath the original camp artwork, so the existing stone paths emerge through their normal edge feather. Camp access lines through the hearth are graph connections only and are never drawn through the clearing. The six surveyed camp exits, saved hearth, buildings, placements, scale and playable bounds stay fixed.

`src/world-master-plan.ts` owns route anchors, control points and intended widths. `src/world-roads.ts` derives rounded centre lines, smooth width transitions at junctions, closed road outlines and feathered meshes. `src/world-road-renderer.ts` submits visible surfaces to the Skia adapter. The layer is shared by Build, Walk and Play through `drawHomeTerrain`, and is excluded for custom replacement terrain and indoor scenes. Road rendering waits for the shared outdoor ground material so it cannot appear floating over unloaded ground at entry.

| Material | Placement |
| --- | --- |
| Camp stone | Extensions of all six original camp paths; worn paving around the northern village |
| Compacted earth | Ordinary connecting lanes and southern meadow trails |
| Dark woodland earth | Logging tracks and damp waterworks approaches |
| Factory gravel | Factory and rail-yard service routes |
| Salvage gravel | Warmer brown gravel in the scrap warehouse district |

The original material-filled ribbon has been replaced by complete painted road sections. Each section includes its centre, complete boundary stones, displaced chips, small contact shadows and irregular soil shoulders. `src/world-roads.ts` bends the artwork along the existing curves using distance along the route, so a road-shaped mask no longer slices through edge stones. `src/world-road-materials.ts` supplies continuous district weights. The outside soil is translucent and the surrounding terrain shows through between the edge chips. Road cores, route anchors and intended widths are unchanged; their soft visual shoulders extend beyond the old core outline.

The same five section images are reused along routes, with mirrored end sampling to avoid texture gaps. Junctions combine the adjoining road sections. This is modular artwork rather than a unique image for every road. Geometry is cached and visible sections are culled; there is no world-sized raster or per-frame offscreen mask. Roads, ground textures and placed foliage remain independent. No foliage is baked into the new materials. Bridge routes still reserve a continuous strip of ground; water, deck art and water collision are future work.

Five 1024 × 1536 road section images total 3,004,460 encoded bytes; they load as optional background terrain detail, adding zero images to editor-entry readiness. A quiet earth fill displays while optional art is pending. The original transparent PNGs are archived and runtime copies use WebP quality 96 at the original resolution, with exact alpha-channel comparisons. Movement, collision, saves and the foliage toggle are unchanged.

Validation is recorded in `docs/qa/world-roads-v3`: production CanvasKit renders of the whole network, all six camp exits, district materials, junctions and trails; exact camp-interior pixel comparison with the road layer disabled; geometry checks for district connectivity, reserved crossings, road-free areas, artwork coordinates and district blend weights. TypeScript and the production build are also checked. Browser and physical iPhone testing were unavailable. Earlier road passes remain in `docs/qa/world-roads-v1` and `v2`.

Artwork was created with built-in ImageGen using a native-detail crop of the original camp walkway. Exact prompts and source/output paths are in `artwork-archive/road-sections-v2/prompts.json`; encoding sizes and alpha preservation are in `public/survival/road-sections-v2/manifest.json`.
