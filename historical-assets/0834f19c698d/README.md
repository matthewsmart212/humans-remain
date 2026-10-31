# Northern works — clearing and connection

This extension fills the gap beside the village outskirts and north of the works. The village's dirt footpath now joins the northern service track, closing another walking loop. A smaller branch continues east beside open ground. Cool grey-brown earth, darker soil and muted olive grass carry the works palette through the clearing, with sparse leaves and room for future separate scenery.

Created with the built-in image-generation tool. `generation-prompts.json` retains the exact prompt and reference roles. `generated-master-original.png` is the selected native 1209 × 1300 output. `registered-master.png` is the 1666 × 1792 master registered to the existing camp scale. The packaged dimensions do not imply native generation resolution.

Runtime assets:

| File | Original camp source origin | Packaged size |
| --- | --- | --- |
| `public/survival/maps/northern-works-v1/09-north-works-clearing.webp` | 7036, 456 | 1538 × 1538 |
| `public/survival/maps/northern-works-v1/10-works-trail-connector.webp` | 7036, 1860 | 1538 × 266 |

The second image is deliberately a short connector. Its visible 132-row band follows the change of western neighbour from village outskirts to village approach, while preserving the exact join with existing works ground.

`scripts/prepare-northern-works.mjs` reconstructs both reference contacts. `scripts/package-northern-works.mjs` retains 132 master contact columns, blends the following 128, and registers the southern works strip before cutting lossless WebPs. The first four output columns match the west contact exactly. The new cuts share 134 identical rows, meeting at source Y 1992. Six exact contact rows meet the existing works at source Y 2124. All decoded contact checks report zero channel error; details are in `terrain-manifest.json`.

The renderer uses the existing 36-pixel left feather inside a 132-pixel western overlap. If the connector is missing but the main clearing is ready, the original works image remains complete with its old top fade removed. Existing texture files, object placements and world scale are unchanged.

Checks passed: physical movement across the new route and existing expansions; boundary and missing-texture handling; prefetch, retry and release; production save/read handlers against in-memory SQLite preserving the 1,366-placement camp fixture and new placements in both pieces; production CanvasKit contacts, outer edge, portrait, night and missing-connector views; TypeScript. Evidence is in `docs/qa/northern-works-v1`. No browser or physical phone performance test was performed in this environment.
