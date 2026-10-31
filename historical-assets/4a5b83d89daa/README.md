# Works meadow

One open meadow fills the northeast corner above the works yard. A single narrow dirt path joins the existing northern works branch to the yard below. The northern half and eastern side remain road-free grass and earth, with unrestricted walking across them. Muted olive/green ground and exposed brown soil leave space for later separate natural scenery. No new red/orange leaves or standing foliage are baked into the art.

Created with the built-in image-generation tool. `generation-prompts.json` retains the exact prompt and reference roles. `generated-master-original.png` is the selected native 1167 × 1347 output. `registered-master.png` is the 1666 × 1924 master aligned to existing camp scale. Packaged dimensions do not imply native generation resolution.

Runtime assets:

| File | Original camp source origin | Packaged size |
| --- | --- | --- |
| `public/survival/maps/works-meadow-v1/13-works-meadow.webp` | 8442, 456 | 1538 × 1538 |
| `public/survival/maps/works-meadow-v1/14-meadow-south-contact.webp` | 8442, 1860 | 1538 × 266 |
| `public/survival/maps/works-meadow-v1/15-meadow-yard-contact.webp` | 8442, 1992 | 1538 × 266 |

The two short strips are contact bands within this same meadow, not separate districts. Their boundaries follow the western neighbours so the existing overlap and missing-texture behaviour remain consistent.

`scripts/prepare-works-meadow.mjs` reconstructs the west and south contacts. `scripts/package-works-meadow.mjs` preserves 132 master contact columns, blends the next 128, registers the southern yard strip, and makes three lossless cuts from the continuous master. The first four output columns match the western contact exactly. Adjacent new cuts share 134 identical rows. Six exact rows meet the original yard. Decoded checks report zero channel error; see `terrain-manifest.json`. Paint boundaries are source Y 1992, 2124 and 2256.

The established 36-pixel left feather and 132-pixel western overlap remain. If either short contact fails to load, the image below stays complete with its obsolete top fade removed when the next northern image is ready. Existing artwork files, world scale and saved camp placements remain unchanged.

Checks passed: repeated physical walking from the saved camp across the path and road-free ground; boundaries and missing-texture blocking; prefetch, retry, eviction and reload; production save/read handlers against in-memory SQLite preserving the 1,366-placement camp fixture and placements in all three cuts plus an off-path spawn; production CanvasKit contact, open-ground, portrait, night and unavailable-contact views; TypeScript. Evidence is in `docs/qa/works-meadow-v1`. Browser and physical phone performance were not tested in this environment.
