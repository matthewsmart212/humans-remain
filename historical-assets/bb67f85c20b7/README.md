# Camp structure ground-edge refresh

Built-in ImageGen edits replace the broad smooth ground islands around the bunker and warehouse with warm ochre soil, tiny gravel, dry leaves and irregular transparent edges that match the camp terrain. Exact prompts and references are recorded in `prompts.json`.

`package.mjs` registers the generated footprint art onto the original canvases. It preserves the original architectural pixels, storage contents, bunker door and stairs. The bunker uses the same generated exterior collar across all three original doorway frames. The script only performs alpha registration and lossless WebP packaging; it does not paint, recolour or generate textures.

Runtime files are in `public/survival/camp-structures-v3/`; their exact source upload IDs are guarded by `src/camp-structure-refresh.json` and `src/artwork-reskins.ts`. A changed bunker base or animation frame prevents the entire replacement sequence from applying. Owner uploads therefore retain priority. Canvas sizes, anchors, collision paths, world widths and animation settings are unchanged.

The new source URLs intentionally do not attach the older generic foundation decals. Their ground contact is already part of the registered artwork, avoiding a second soil island underneath.

Validation completed:

- TypeScript compilation passed.
- All replacement URLs exist, dimensions match the originals, and saved geometry/animation fields remain identical.
- New base uploads and changed animation-frame uploads retain priority.
- 112,150 doorway and stair pixels per bunker frame were compared after lossless decoding and remain exactly equal to the corresponding original frame.
- Transparent output and footprint edges were inspected after compositing against a solid warm background. Some image viewers show RGB values in fully transparent WebP pixels as red; those pixels have alpha zero and are invisible in the game renderer.

Total runtime artwork is 6,075,926 bytes. Parent task owns the full terrain and in-game visual review before publication.
