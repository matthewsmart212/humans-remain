# Village outskirts — third connected row

Two more ground sections extend north from the existing village trail. The dirt lane gradually widens, with a smaller track branching east. Bare brown earth, darker compacted soil and muted grassy patches leave room for later buildings and foliage. Fallen leaves remain sparse and local.

The built-in image-generation tool produced a 1706 × 922 master using the adjacent camp and trail contact strips, the approved sparse-ground trail as the style reference, and the supplied overview as the geographic guide. `generation-prompts.json` retains the exact prompt and reference roles. `generated-master-original.png` is the original output. `registered-master.png` is the 3072 × 1660 master registered to the existing camp scale; the packaged dimensions are not native generation resolution.

`scripts/package-village-outskirts.mjs` preserves the first 128 camp contact columns, blends the next 128, and registers the existing southern trail rows. It exports two lossless 1538 × 1538 WebPs with four identical shared columns. Six identical contact rows straddle the north/south paint boundary at source Y 1992. Decoded contact checks report zero channel error; `terrain-manifest.json` records the coordinates and measurements. Future exit coordinates are approximate guides, not collision or navigation geometry.

Runtime assets:

- `public/survival/maps/village-outskirts-v1/05-camp-northeast-clearing.webp`, source origin `(4096, 456)`.
- `public/survival/maps/village-outskirts-v1/06-village-outskirts.webp`, source origin `(5630, 456)`.

The renderer keeps sampling gutters and paints matching rows only once. Existing southern terrain remains visible if a northern texture is still pending. The camp artwork, earlier four extension textures, saved camp placements and world scale are unchanged.

Validation passed: physical travel through all six added sections with one world/player instance; missing-texture movement gating, prefetch, retry and release; real save/read handlers against in-memory SQLite preserving 1,366 camp placements; production CanvasKit rendering of contacts, landscape, portrait and night; and TypeScript. Renderer evidence is in `docs/qa/village-outskirts-v1`. Browser and physical phone performance have not been tested in this environment.
