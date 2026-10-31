# Survivor cosmetic art contract

> Archived design direction. The current player is the complete Scrap Runner
> character documented in `scrap-runner.md`. Its renderer does not use these
> cosmetic layers. Existing appearance data is retained for compatibility.

The survival game and editor share `drawWorker`, now drawing the accessory-free
survivor. The legacy worker sheets remain archived; live movement never switches
back to them. Existing collision, speed, attack timing and survival stats stay
unchanged. Four directional views represent eight-way movement; diagonal motion
uses the corresponding side view. Attacks currently use a small body lunge with
the existing game effects, not a separately drawn punch animation.

## Current artwork

- `public/survival/survivor/base-motion-v1.png`: four rows (up/right/down/left),
  five poses per row. Measured crops, not an equal-grid slice.
- `public/survival/survivor/base-idle-v1.png`: corrected side standing artwork.
- `src/survivor-art.ts`: authoritative crop, anchor and render-scale metadata.
- Standing uses its own planted pose; walking advances from distance travelled.
  Being blocked or releasing the controls stops the cycle and retains facing.

## Slots and registration

`SurvivorAppearance` supplies `outfit`, `headwear`, and `back` IDs. Register art in
`SURVIVOR_COSMETICS` and its image paths in `WORLD_IMAGE_SOURCES` before exposing it.
The empty catalogue is intentional: no uncreated cosmetics or shop are shown.

Each cosmetic supplies a transparent main atlas and a companion image whose key
is the main key plus `Idle`. Both must use the matching base sheet dimensions,
frame coordinates, body scale and ground anchors. All layers receive the same
direction, gait phase and transform. Never make an accessory cycle on its own
timer. Outfits replace the base; headwear overlays it. A `bodySheet` can supply a
matching hair-hidden base for headwear; full outfits may hide headwear or backs.
Allow enough space inside the registered crop for an item: if a tall hat or wide
costume exceeds it, explicitly expand the shared crop and adjust its anchor—do
not let the renderer clip it or change the ground origin.

Back accessories draw behind the body in front/side views and over its back in
the rear view. Side accessories must be drawn with the appropriate occlusion in
their artwork. Headwear is drawn last. Test all directions, all gait phases,
idle transitions and collision occlusion before registering each cosmetic.

Cosmetics contain no stat modifiers. These are rendering foundations only, not
a purchase, wardrobe, ownership or entitlement service. Future paid unlocks
must be validated server-side; a client appearance ID is not proof of ownership.

Artwork generated with built-in image generation: chunky overhead adult survivor,
short dark hair/beard, plain oatmeal shirt, brown trousers and boots; no permanent
hat, scarf, backpack, cape, straps or tools. True transparent alpha was verified.
