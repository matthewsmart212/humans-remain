# Camp rabbits

Eight rabbits spawn on clear ground just outside the existing camp perimeter when a new authored Play session starts. They hop, run, graze, blink, flee nearby players and sleep when distant. Simulation uses the existing fixed tick and collision path, with 10 Hz decisions, a 280-unit home leash and the chicken direction stabilizer. Movement speed is 72 walking / 215 fleeing. Each visible rabbit draws one cached atlas sprite and its ground shadow.

Five lossless transparent atlases contain 80 unique frames, providing eight directions by mirroring three views. Every atlas is 768 × 768 with 192-pixel cells and a shared [96,170] ground anchor. Packing uses one scale per view, preserving pose proportions and complete ears/paws. Decoded atlas storage is 11,796,480 bytes; compressed atlas files total 1,421,612 bytes. Food icons are separately cached 256 × 256 images.

Frames 0–3: gentle hop. 4–7: running bound. 8–9: idle/blink. 10–11: graze. 12–13: hit/recovery. 14–15: fall/downed. Movement frames follow distance; idle/graze and damage poses follow simulation time.

Rabbits have 32 health: two punches or one axe hit. A kill awards exactly one raw rabbit; repeated hits on a corpse award nothing. Raw rabbit uses the supply bag, cooking takes six seconds, and cooked rabbit shares the existing four-meal pouch with chicken. The fire uses available raw chicken first, then raw rabbit. Rabbit stays a distinct item through collecting, cooking, dropping/recollecting, the backpack, holding/eating and scene travel. The Rabbit quick slot replaces one empty slot; two empty slots remain. Keyboard selection uses 4. Cooked rabbit restores up to 50 food and 15 health.

## Assets and generation

Artwork was created with the built-in image-generation tool, using the approved rabbit mockup and existing chicken food as references. Final files:

- `public/survival/rabbit-v1/{down,down-left,left,up-left,up}.webp`
- `public/survival/rabbit-food-v1/{raw-rabbit,cooked-rabbit}.webp`
- `public/survival/rabbit-v1/artwork.json` records source images, packing bounds, scale and frame order.

The final prompt set used the following shared specification, once per named direction:

> Create a production transparent 4 × 4 sprite atlas of the exact approved chestnut chibi rabbit: bold dark-brown contours, rounded head, compact body, simple black oval eyes, cream cheeks/chest/tail, warm pink ears, golden highlights and dark chocolate painted shadows. Keep the elevated top-down three-quarter camera and character identity, volume, colour and outline thickness consistent. Face down, down-left, left, up-left or up for the entire sheet. Row 1 is a four-pose gentle hop; row 2 is a four-pose running bound; row 3 is idle, blink, graze-down and graze; row 4 is hit, recovery, non-graphic fall and downed. Equal cells, common scale/ground baseline, transparent padding around every complete silhouette, no text, props, backgrounds or shadows.

Food prompts requested one compact raw rabbit haunch plus a smaller portion, and the matching golden roasted version, with the existing chicken food's outlines, painted shading and camera. Both use genuine transparency and include no plate, background, blood, face or fur.

`scripts/prepare-rabbit-art.mjs` mechanically extracts connected silhouettes and packs the atlases; it does not draw or recolour the art. The seven runtime images are in `native/bundled-art.ts` for offline first launch.

## Verification

`check-camp-rabbits.mjs` covers seeding/collision/leash, movement/animation, hunting, no duplicate drops, carrying and food capacity, cooking identity, holding/eating, dropping/recollecting, scene transfer, pickup icons, culling and complete padded alpha frames. The existing chicken, backpack, survival and field-kit suites pass. Native renderer software proofs draw rabbits, held rabbit food and both pickup types. Root/native TypeScript and the Expo iOS production JS export pass. These checks do not constitute a physical iPhone or browser play test.
