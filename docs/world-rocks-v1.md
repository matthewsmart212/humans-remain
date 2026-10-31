# World rocks expansion

Twenty new rock designs matched to Humans Remain's existing illustrated terrain, foliage and character. Created with built-in image generation using the approved rock artwork and an actual game render as style references. Full prompts: `docs/world-rocks-prompts.json`.

Find the new assets in the world editor under **World scenery**, grouped as **Woodland rocks**, **River rocks**, **Dryland rocks** and **Exposed rocks**. These are optional editor additions; the pack does not automatically scatter objects across the saved map.

| Group | Five designs |
| --- | --- |
| Woodland | Moss-capped boulder, lichen twin stones, split forest rock, mossy flat shelf, forest pebble patch |
| River | Smooth river boulder, river stone trio, flat river slab, river shingle patch, eroded bank rock |
| Dryland | Ochre lone boulder, rust sandstone fin, cracked chalk rock, dry scree scatter, layered sandstone shelf |
| Exposed | Dark basalt blocks, blue-grey split crag, slanted schist slab, weathered standing stone, broad granite erratic |

The **17 larger designs are solid scenery** with individual ground collision polygons. The **forest pebble patch, river shingle patch and dry scree scatter are walkable ground details**, drawn below characters. None adds mining, stone drops or other harvesting behaviour.

Mix one dominant rock type with a few contrasting low stones. Put mossy rocks near the woodland plants, smooth stones near riverbanks, and bare warm stone near drier paths. Keep the central walking route clear; use modest scale changes and occasional mirroring for variation.

## Delivery and verification

- Transparent WebP sprites: `public/survival/world-rocks-v1/`.
- Dimensions, anchors, world widths and walkable flags: `src/world-rock-art.json`.
- Ground blockers: `src/rock-collisions.json`.
- The complete 20-sprite pack is 2,065,360 bytes (about 2.07 MB), with 17.67 MiB of decoded RGBA pixels when all designs are loaded.
- Twenty shared textures for any number of instances; unused rocks add no startup image requests. No animation sheets or new per-frame rock simulation.
- Artwork is cropped and sized for gameplay, with the generated alpha preserved inside the padded cutout.
- Three existing PNGs were losslessly encoded to WebP to make publish space. Alpha and all visible RGB pixels were verified identical; original files remain in source and legacy URLs redirect.
- Checks cover transparency, editor visibility, ground layers, walkability, rotated/mirrored/scaled blockers, shared image loading and draft immutability. Production CanvasKit renders check all twenty designs against the actual terrain and character.

Software checks do not measure browser GPU or physical-device frame rates. The review scenes are temporary examples, not saved map edits.
