# Eastern works approach — connected sections 07 and 08

The village footpath and woodland stone route now connect to a winding north–south service track. The paving gradually breaks up into broad dirt, with an eastward dirt branch for the next expansion. Cooler grey-brown and umber soil with muted olive grass gives this district a different ground colour. The warm western contact is preserved; leaves remain sparse across the new ground. Buildings, foliage, resource rocks and water remain separate assets.

Created with the built-in image-generation tool in two passes: a connected outpaint, then a focused palette edit preserving its layout. The exact prompts and input roles are in `generation-prompts.json`. `generated-layout-original.png` retains the first pass. `generated-master-original.png` is the selected 966 × 1628 output. `registered-master.png` is the 1666 × 2808 master registered to the camp scale. Packaged texture sizes are not native generation resolution.

Runtime assets:

| File | Original camp source origin | Packaged size |
| --- | --- | --- |
| `public/survival/maps/eastern-works-v1/07-works-footpath.webp` | 7036, 1992 | 1538 × 1406 |
| `public/survival/maps/eastern-works-v1/08-works-service-track.webp` | 7036, 3264 | 1538 × 1536 |

`scripts/prepare-eastern-works.mjs` reconstructs the edit target from existing village and junction artwork. `scripts/package-eastern-works.mjs` registers 132 exact master contact columns, blends the following 128 columns, then exports lossless runtime cuts beginning 128 columns into the master. The four leftmost output columns match the existing west contact exactly. Both new images share 134 identical rows; their painted regions meet at source Y 3396. All decoded contact checks report zero channel error. `terrain-manifest.json` records coordinates and measurements.

The renderer uses a 36-pixel feather within the 132-pixel western overlap, reaching opacity before the old 96-pixel right fade begins. This keeps the contact opaque while preserving the unfinished top corner and the old fallback when a new texture is unavailable. If the western image is missing, the new image uses its complete left contact. The old camp and six earlier extension images, object positions and world scale remain unchanged.

Checks passed: continuous travel through all eight additions without a world switch; both new entrances and their shared join; unbuilt boundaries; image prefetch, failed-load retry and release; save/read handlers against in-memory SQLite with 1,366 camp placements preserved and new objects in both sections; production CanvasKit contacts, corner, portrait and night rendering; TypeScript. Evidence is in `docs/qa/eastern-works-v1`. Browser and physical phone performance were not tested in this environment.
