# Village approach terrain

Two connected ground pieces extend north from the existing woodland junction. Brown and umber earth gradually replaces the orange camp soil, with a wider northbound dirt route and a narrower eastern branch.

Created with the built-in image-generation tool, then registered to preserved neighbouring pixels and cut into lossless textures. The generated master is 1706 × 922; the registered texture scale is matched to the existing camp. The 1538 × 1538 texture dimensions are packaging dimensions, not native generation resolution.

Files in this directory:

- `generated-master-original.png`: selected brown-ground generation.
- `generated-master-before-palette.png`: first generation retained for provenance.
- `registered-master.png`: registered source before texture cuts.
- `generation-prompts.json`: initial outpaint prompt.
- `palette-edit-prompt.json`: the user's regional-colour direction and final edit prompt.
- `terrain-manifest.json`: placement coordinates and exact contact-pixel checks.

Runtime assets:

- `public/survival/maps/village-approach-v1/03-camp-east-clearing.webp`
- `public/survival/maps/village-approach-v1/04-village-trail.webp`

The deployment keeps both pieces in the same outdoor world as the camp. The full terrain schedule is in `docs/world-terrain-plan.md`; software-rendered join, portrait and night checks are in `docs/qa/village-approach-v1`.
