# Scrap Runner axe combo artwork

Created with the built-in `image_gen` tool in identity-preserving edit mode. No CLI fallback or API key was used.

## Production files

- `public/survival/scrap-runner/axe-combo-v1/down.webp`
- `public/survival/scrap-runner/axe-combo-v1/down-right.webp`
- `public/survival/scrap-runner/axe-combo-v1/right.webp`
- `public/survival/scrap-runner/axe-combo-v1/up-right.webp`
- `public/survival/scrap-runner/axe-combo-v1/up.webp`
- `public/survival/scrap-runner/axe-combo-v1/atlas.json`

Five 1536 × 768 atlases contain forty distinct upper-body drawings. Mirroring the east-facing views supplies all eight gameplay directions. Total optimized WebP download: **804,596 bytes**. Decoded shared RGBA texture memory: **22.5 MiB**.

These are upper-body layers ending at the belt/vest hem. They include the head, torso, arms, hands and one axe. They contain no new legs, floor shadows, particles or trails. The existing approved leg animation is drawn underneath by the game renderer.

## Atlas contract

Every cell is 384 × 384 pixels. The authored foot anchor is `[192,340]`; base scale is `0.4`. Each sheet has four columns and two rows. Hair tips are registered at cell y=60 (world y=−112 relative to the feet). A single uniform packing scale is used for each view; translation-only measured hair-center/top registration is used between poses. The source atlases remain unchanged. The runtime now additionally calibrates horizontal scale per pose from `sourceHairBox` to the approved walking head width of 78 units, eliminating the smaller/narrower attack silhouette. Vertical scale and the approved leg animation are unchanged. See `src/runner-axe-art.ts`; consumers should use `RUNNER_AXE_REGISTRATION` and `runnerAxePoint` rather than assuming the authored base scale on both axes.

Frames 0–3 are the first cut: anticipation, contact, follow-through, recovery.
Frames 4–7 are the linked return cut: anticipation, contact, follow-through, ready.

The metadata includes `views[view].image` and eight `views[view].blade` points. The blade points are measured axe-head centers in cell-local pixels. Convert them to world-local coordinates with `runnerAxePoint(view, frame, point)`, which includes the runtime size correction, and negate x for mirrored directions. They are intended for short matching blade trails, not collision detection.

The visible hips/vest hem naturally end around world y=−25 to −34, giving overlap with lower-body layers. A broad rectangular crop of an old full-body sprite can accidentally retain its relaxed hands beside the waist; gameplay should use the existing separated legs or a shaped lower-body mask.

### Stable original face during combat

Matching hair width alone did not preserve the exposed face: the generated attack heads had shallower cheeks and smaller eyes. `src/runner-combat-head.ts` now reuses the **original approved idle head** for front, front-diagonal and side attacks (mirrored for west). Its source pixels, scale, and foot-relative anchor are unchanged through both cuts. Rear-facing artwork is unchanged.

Composition order is approved legs → attack torso/rear weapon with the generated head excluded → original head → measured foreground arm/axe silhouettes → blade trail. The head cut follows the original chin/hair with a small antialiasing allowance; foreground masks allow raised hands to pass naturally in front without restoring the old generated face. No new textures, readbacks, offscreen surfaces, downloads, or asset rewrites are needed. Clip coordinates are registered once at module load. Walking, sprinting, attack timing, damage, hit detection and saved worlds are untouched.

Run `node scripts/check-runner-combat-head.mjs` for pixel-level original eye/cheek comparisons, plus `node scripts/render-runner-combat.mjs /tmp/runner-combat-qa` for standing/moving eight-direction render inspection. Face correctness is now checked against the original face, not inferred from a hair bounding box.

## References and packing

Character references: `public/survival/scrap-runner/motion-a-v1.png` and `motion-b-v1.png`. Weapon reference: `public/survival/equipment/camp-axe-v1.png`. All local references were inspected before generation. Directional reference crops were made mechanically with Sharp, then used for image generation.

The original built-in outputs remain in the generated-images directory. Their exact filenames, measured hair boxes, complete alpha-connected sprite bounds, packing scales, blade points and output bounds are recorded in `atlas.json`. Reproduce the production packing with:

```sh
node scripts/prepare-runner-axe-combo.mjs /path/to/generated_images
```

The packer identifies eight complete alpha-connected figures, retaining axes that extend over the source sheet's nominal grid boundaries. It preserves the source antialiasing and genuine alpha, then translates/resamples each entire figure at the view's shared scale. It does not paint, rig-warp, change anatomy, create replacement artwork or modify any approved player locomotion image.

A targeted built-in edit corrected the southeast return cut so its axe travels left across the body while the head still faces southeast. The original southeast sheet is not used in production.

## Validation

- Exactly five RGBA atlases and forty distinct frame payloads.
- All expected 384 × 384 crops and eight direction mappings.
- Transparent cell edges and padding around every complete axe/hair silhouette.
- Art inspected at full resolution and at actual game scale composited over original lower bodies.
- Original walk/run source files are untouched.
- Final animation timing and shaped lower-body joins are integrated/checked in the game renderer separately.

## Full prompt set

### Down

```text
Use case: identity-preserve
Asset type: production 2D game sprite animation sheet, upper-body layer.
Image 1 is the exact approved Scrap Runner identity/style and DOWN-facing camera reference. Image 2 is the exact camp axe material/shape reference. Preserve character identity, huge tousled dark-brown hair, simple black oval eyes with no mouth or nose, warm tan skin, short rust-orange sleeves, worn cream sleeveless vest over dark olive shirt, dark belt and diagonal leather satchel strap. Preserve the compact head-heavy chibi proportions and softly painted cel shading with crisp dark outlines.
Create EIGHT distinct upper-body axe fighting poses, all looking toward the BOTTOM of the image at the same fixed slightly overhead game camera. One single practical small axe with a wood handle, wrapped brown grip and a dark steel head with worn silver edge. Two hands naturally gripping its ONE handle during powerful cuts. Single blade, no second axe.
LAYOUT: exactly four columns by two rows, equal square cells on a wide 2:1 canvas. Each pose centered at the same hip anchor. Same head size and torso length in all eight cells. Keep generous clear gutters, every axe fully visible inside its cell. No touching silhouettes.
The first row depicts one diagonal cut left-to-right: 1 compact wind-up with axe behind the right shoulder and torso twisted slightly; 2 strike contact with arms driving axe in front, blade low to screen-right; 3 follow-through across waist to screen-right with torso turn; 4 relaxed recovery with axe lowered. The second row is the matching reverse cut: 5 opposite-shoulder wind-up; 6 clear reverse strike contact toward screen-left; 7 follow-through on screen-left; 8 neutral ready stance, axe lowered diagonally.
CRITICAL: These are UPPER BODIES ONLY, for compositing onto our EXISTING ANIMATED LEGS. Draw head, neck, shoulders, torso, both arms and hands, belt, vest hem and satchel. End the character cleanly at the belt/hip line. NO thighs, NO trousers below belt, NO legs, NO boots. The axe may extend below the hem. Keep the head steady around its same position through the whole sheet, small shoulder twist only, no lunging or jumping.
Backdrops: GENUINE TRANSPARENT ALPHA throughout empty space and all gutters. No ground, shadows, opaque black or white fill, tiles, labels, text, numbering, borders, particles, trails, blur, glow, electricity, magic or extra objects. This is painted production animation, not a concept poster. Match original identity closely; do not redesign or make taller or realistic.
```

### Down-right

```text
Use case: identity-preserve
Asset type: production 2D game sprite animation sheet, upper-body layer.
Image 1 is the EXACT approved Scrap Runner identity and DOWN-RIGHT-facing camera reference. Image 2 is the approved upper-body axe-cut sheet to match for clothing, quality, axe size and pose order, but it looks straight downward: CHANGE THE CAMERA/FACING for this new sheet to DOWN-RIGHT in all eight cells. Image 3 is the actual camp axe reference.
Make exactly EIGHT distinct upper-body fighting poses facing DOWN-RIGHT (southeast, three-quarter FRONT, toward bottom-right of the screen), matching the head view in Image 1. Both oval eyes remain visible, far eye narrower, visible near left ear, no nose or mouth. Head and torso stay oriented down-right with restrained shoulder twists. Do not use front-facing poses.
Preserve identity and proportions: huge tousled dark-brown hair, tan skin, short rust-orange sleeves, worn cream vest, olive undershirt, belt and leather satchel. Preserve compact head-heavy chibi proportions, softly painted cel shading, crisp dark outlines. Same short practical single camp axe, dark steel head with worn silver edge, wood handle and brown grip. TWO hands naturally grip its ONE handle. No additional weapon.
Four columns × two rows, equal square cells on a wide 2:1 canvas. Same head size and torso length across eight poses, same hip anchor, generous empty gutters, full axe wholly inside every cell. No overlap between cells.
Row 1 is first diagonal axe cut: 1 wind-up behind right shoulder, 2 strike contact out in front and down-right, 3 follow-through across body, 4 lowered recovery. Row 2 is return cut: 5 wind-up opposite shoulder, 6 reverse-cut contact in front, 7 return follow-through, 8 ready with axe low. Actual visible different shoulder/arm positions, not eight same poses.
UPPER BODY ONLY: head, neck, shoulders, torso, arms, hands, belt, vest hem and satchel. Stop naturally at hip/waist line. Absolutely NO thighs, NO trouser legs, NO knees, NO boots, NO feet. The axe can project below belt. Head steady around same registered location; no jumping or lunging.
Genuine TRANSPARENT ALPHA background and gutters. No ground, shadows, black/white fill, text, labels, cell borders, particles, light streaks, motion blur, magic, glow, electricity. Painted production game layer, not concept art. Keep exact character, size, identity, material and style of supplied reference.
```

### Down-right targeted reverse-cut correction

```text
Use case: precise-object-edit
Edit the supplied transparent 4×2 upper-body combat sprite sheet. KEEP ALL eight Scrap Runner heads, identity, hairstyle, clothing, head positions and head scale unchanged. Keep the entire TOP ROW unchanged. Keep bottom-row columns 1 and 4 unchanged. Keep the genuine transparent background and empty gutters.
Change ONLY THE ARMS AND AXE in the BOTTOM ROW, COLUMN 2 and COLUMN 3, so these are a clearly REVERSE cut: the handle projects from both hands toward SCREEN LEFT, with the axe head well to the LEFT of the character. Column2 is the reverse strike contact: both hands low before the waist driving the axe leftward, blade at the left edge. Column3 is its follow-through: arms reach further left across the torso and blade fully extended on the LEFT side. The head and body still face southeast/down-right, NOT mirrored. Do not reverse the character, only change the arm pose/axe direction. One complete identical steel camp axe and two hands per pose, correct gripping and no detached fingers. Preserve axe shape, scale and shading.
These are head-and-torso layers ENDING AT THE BELT, with no legs or feet. No new legs, ground, text, effects, particles, swishes, background, borders or labels. All other poses must remain unchanged.
```

### Right

```text
Use case: identity-preserve
Asset type: production eight-frame 2D game animation sheet, upper-body layer.
Image 1 is the EXACT approved Scrap Runner RIGHT-FACING PROFILE game character. Image 2 is the exact axe weapon material/shape reference.
Generate EIGHT distinct UPPER-BODY axe combat poses of this EXACT character viewed FROM HIS LEFT SIDE facing screen RIGHT / EAST in EVERY CELL. All eight must be side profile like image 1: one visible black oval eye, rounded near ear, face pointed right, no nose/mouth, far eye hidden. The viewer sees his left side and a little top of his huge dark tousled hair, consistent fixed slightly overhead camera. Do not turn him toward us or toward the back.
Preserve the original chibi shape, huge same-size dark brown hair, warm tan skin, rust-orange sleeves, cream vest, olive undershirt, belt and brown satchel strap/pouch. Crisp dark outlines, softly painted cel shading, no realism redesign.
He uses ONE camp hatchet, a compact weathered dark-steel axe head with a silver worn edge on a short wood handle with brown leather grip, held naturally in BOTH hands with no duplicates. Axe size about 2/3 of torso+head height, not oversized fantasy weapon.
LAYOUT EXACTLY FOUR COLUMNS by TWO ROWS on a wide 2:1 transparent canvas. EIGHT individual separate silhouettes, same head size, hip center and body length each. Generous gutters, keep all axe tips inside each cell and separated. No labels or borders.
POSE ORDER row1 left to right: 1 wind-up with axe raised above/behind shoulder on screen-left; 2 forward/down cut CONTACT extending both arms and the axe to screen-right around chest height; 3 follow-through axe to screen-right lower at belt height; 4 recovery returning the axe near the body. Row2: 5 low wind-up with axe to screen-right near hip; 6 reverse/rising cut CONTACT driving axe upward in front to upper-right; 7 follow-through axe high to upper-right; 8 settle to ready holding axe low in front. Different meaningful shoulder/arm action in each frame. Head remains steady, torso twists just a little. No jumping/lunging.
UPPER BODY LAYER ONLY: include complete head/hair, torso, arms/hands, cream vest hem, belt, satchel. End cleanly at hips just beneath belt. Absolutely NO legs, NO knees, NO trousers below hips, NO boots, NO feet. Axe may extend lower than hem. Original animated legs will be attached separately.
REAL transparent alpha background/gutters. No shadows or floor. No black or white backdrop. No magic, glow, motion blur, swishes, trails, particles, numbering, text, watermark. Keep original identity and exact right-profile direction.
```

### Up-right

```text
Use case: identity-preserve
Asset type: production eight-frame 2D game animation sheet, upper-body layer.
Image 1 is the EXACT approved Scrap Runner UP-RIGHT-FACING REAR THREE-QUARTER game character. Image 2 is the exact axe weapon material/shape reference.
Generate EIGHT distinct UPPER-BODY axe combat poses of this EXACT character viewed FROM BEHIND and LEFT, facing screen UPPER RIGHT / NORTHEAST in EVERY CELL, like Image1. In all eight poses we see the BACK of his huge dark tousled hair, back of cream hood/vest, diagonal leather satchel strap, side ear at screen-right. His face and eyes are HIDDEN. Head and body facing remain fixed northeast throughout. No front-facing or side-front poses.
Preserve original chibi silhouette, same huge dark brown hair, tan skin, short rust-orange sleeves, cream hooded vest, olive undershirt, belt and brown satchel pouch. Crisp dark outlines, softly painted cel shading, no realism redesign.
He wields ONE compact camp hatchet: weathered dark-steel single axe head with worn silver blade, short wood handle and brown leather grip. Hands hold the same single handle naturally. Both arms participate, far arm partly occluded by torso where needed. Axe size about 2/3 of torso+head height, no oversized fantasy weapon.
LAYOUT EXACTLY FOUR COLUMNS by TWO ROWS on a wide 2:1 transparent canvas. EIGHT individual separate silhouettes, same head size, hip center and body length every pose. Generous empty gutters and margins; keep all axe tips wholly inside each cell, no overlap.
Row1 left to right: 1 wind-up axe drawn behind shoulder to screen-left, hands raised; 2 diagonal axe strike CONTACT in front toward upper-right, blade prominently visible beyond the head’s right edge; 3 follow-through on the right at shoulder height; 4 recovery with axe lowered at side. Row2: 5 alternate wind-up with axe low to right; 6 reverse rising-cut CONTACT toward upper-right, raised shoulders; 7 follow-through weapon high in front, 8 settle to ready axe down near right hip. Each pose visibly different arms/axe placement. Head steady around same location, restrained shoulder twist only. No jumping/lunging.
UPPER BODY LAYER ONLY: complete hair/head, torso, shoulders, arms/hands, belt, cream vest hem, satchel. End cleanly at hips just below belt. Absolutely NO legs, knees, trousers below hips, boots or feet. Axe may project below hem. We will draw existing animated legs underneath this.
Genuine transparent alpha background and gutters. No floor, shadows, black/white backdrop, text, labels, watermark, borders, magic, glow, streaks, blur, swishes or particles. Exact original identity, camera and REAR-three-quarter-facing-up-right direction.
```

### Up

```text
Use case: identity-preserve
Asset type: production eight-frame 2D game animation sheet, upper-body layer.
Image 1 is the EXACT approved Scrap Runner UP-FACING REAR game character. Image 2 is the exact camp axe material/shape reference.
Generate EIGHT distinct UPPER-BODY axe combat poses of this EXACT character viewed STRAIGHT FROM BEHIND facing screen UP / NORTH in EVERY CELL, like Image1. Back of tousled dark brown head and back of vest face us, both small ears partly visible, face and eyes COMPLETELY HIDDEN. Head remains facing straight away/up, no side profile or front poses. Fixed slightly overhead game camera.
Preserve same huge rounded messy hair, chibi proportions, tan arms, rust-orange short sleeves, cream hooded vest, dark belt, olive undershirt, diagonal dark leather satchel strap and brown pouch. Same warm painterly cel-shaded production game style and crisp dark outlines.
ONE small practical camp axe with weathered steel single blade, bright worn silver edge, short wood handle and leather grip. Same axe in all frames, naturally held in BOTH hands, far hands partly occluded correctly. No duplicates.
EXACTLY FOUR COLUMNS × TWO ROWS on a wide 2:1 transparent canvas. EIGHT separate complete upper-body silhouettes. Uniform head width and torso length, same hip registration point, generous empty gutters/margins; every weapon completely visible and separated from adjacent cells.
POSES first row: 1 wind-up with axe above screen-left shoulder and shoulders twisting left a little; 2 first chop CONTACT crossing in front toward screen-right, axe head visible above/right of head; 3 follow-through axe at right side shoulder height; 4 recovery lowered at right side. Second row: 5 opposite wind-up with axe above screen-right shoulder; 6 reverse chop CONTACT crossing to screen-left, axe head visible left of head; 7 follow-through low on left side; 8 ready stance axe lowered near right side. Visible meaningful arm/axe movement, head stays registered with only tiny shoulder twist. No jumps or lunges.
ONLY UPPER BODIES: include hair/head, torso, arms/hands, vest hem, belt and pouch; END CLEANLY AT HIPS, immediately below belt. NO legs, NO trousers beneath belt, NO knees, NO boots, NO feet. This layer will be placed on top of existing independently animated legs. Axe may extend below hip.
Genuine transparent alpha background and all gutters. No ground/shadows/backdrop, no opaque black/white, no text/labels/numbers/grid/watermarks, no motion trail/blur/particles/electricity/glow/magic. Original identity must remain recognisable, identical scale and rear facing in every frame.
```

