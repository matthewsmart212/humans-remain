# River streams and Stillwater Lake

Three slender connected offshoots are placed at the logging reach, western bends
and southern meadows. Stillwater Lake widens the lower river between the existing
bridges. The camp and the ten retained waterfall/rapid locations are unchanged.
No foliage or additional whitewater was added.

## Artwork provenance

Tool mode: built-in `image_gen`, reference-image editing. Exact submitted prompts
are in [prompts.json](./prompts.json). Each input was the corresponding native
painting in `artwork-archive/river-calm-v2/`.

| Edited master | Native size | Original generated output |
| --- | --- | --- |
| `logging.png` | 1254 × 1254 | `/workspace/scratch/b21393be6c68/generated_images/exec-8ee6205e-8cb8-41c5-8b41-5bc8e4083242.png` |
| `western.png` | 1330 × 1182 | `/workspace/scratch/b21393be6c68/generated_images/exec-90e40996-7b0b-49e4-9c59-9fcf245b94d7.png` |
| `lower.png` | 1330 × 1182 | `/workspace/scratch/b21393be6c68/generated_images/exec-3adc320c-47ee-482d-821a-0d699d227393.png` |
| `southern.png` | 1269 × 1240 | `/workspace/scratch/b21393be6c68/generated_images/exec-7270952a-50bd-45cf-8722-c20b3e43d5d7.png` |

Selected copies are retained here. Native tile crops and small preview images
are packaged in `public/survival/river-features-v4/`; none is upscaled. Superseded
exports are recoverable in `artwork-archive/retired-runtime/river-before-features-v4/`.

## Integration and checks

- `scripts/package-river-features.mjs` crops the paintings, derives softly
  feathered bank footprints and creates multi-span water collision masks.
- Each stream uses its own flow direction, with the existing animated river
  surface and reflections. Calm water movement does not depend on waterfall
  animation. Preview water also moves.
- Dry peninsulas between branches remain walkable. All four existing bridge
  decks retain their crossing exemptions.
- Editor: **Tools → Camera → Streams & lake** cycles the four new locations.
- `scripts/check-river-features.mjs` exercises the real CanvasKit renderer,
  checks water motion without waterfall overlays, still banks, dry-land/water
  collision, four bridge decks and unchanged camp rendering. Results and
  composed-world images are in `docs/qa/river-features-v4/`.
- Browser and phone QA were unavailable; renderer, type and build checks were
  used. Existing small-preview/detail streaming limits remain unchanged, and no
  river artwork was added to the editor's blocking entry-image set.
