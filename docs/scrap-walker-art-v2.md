# Scrap Walker directional artwork v2

Generated with the built-in image generation tool (transparent mode), 12 October 2026. Original identity reference: `public/survival/scrapling.png`.

## Runtime files

- `public/survival/scrap-walker-v2/atlas.json`
- `public/survival/scrap-walker-v2/down.webp`
- `public/survival/scrap-walker-v2/down-left.webp`
- `public/survival/scrap-walker-v2/right.webp`
- `public/survival/scrap-walker-v2/up-right.webp`
- `public/survival/scrap-walker-v2/up.webp`

Five 1536 × 768 transparent WebP atlases, eight poses each; 40 painted poses total. Each atlas has four 384 × 384 cells per row. Top row is the four-pose alternating-leg walking loop. Bottom row is anticipation, strike, follow-through, recovery. Anchor is (192,300) in every cell. Idle uses frame 3. Diagonal/side mirrors supply all eight headings; the metadata is the authority for exact image/mirror assignments. No runtime image-plane rotation is needed.

## Packing and verification

`scripts/prepare-scrap-walker-v2.mjs` does mechanical extraction and packaging only. The generated native sheets are 1774 × 887. Because a few claws cross the invisible nominal cell divisions, extraction starts from the eight alpha-opaque connected cores and retains original edge alpha within six pixels, omitting isolated translucent generation noise. This avoids slicing through claws. Every frame then receives the same 0.68 scale and source registration origin (235,365); there is no per-frame fitting, stretching, redraw, or scale normalization. Translation-only registration aligns the walking poses to the stable orange torso-armor landmark, eliminating generated grid-spacing drift. Each column's same translation applies to both rows so attack crouch/lunge displacement is preserved. All frames have at least eight pixels of transparent padding. Source bounds, translation offsets and packed bounds are recorded per frame in the metadata.

All five atlases together are 1,389,816 bytes. Decoded RGBA size is 4.5 MiB per atlas, 22.5 MiB total; load once and reuse across all enemies. Sprite display cell widths around 150–160 world pixels give a body size close to the original enemy. Background remains genuinely transparent; do not bake shadows or particles into the artwork.

These are hand-painted generated keyposes, not a skeletal 3D rig. The south view retains some of the source character's asymmetrical tank and shell perspective. Four clear contact/passing poses are intended for a deliberate mechanical gait; additional polish should come from timing, not heavy per-frame bob/stretch. Front/back/side identity and complete feet were visually inspected.

## Generation sources

Sources are retained outside the repo in `/workspace/scratch/70b89d3083f7/generated_images/`; only optimized production assets are shipped. The script lists exact source filenames. The first source became down-left despite its original south instruction because it preserved the original diagonal camera heading. Later prompts explicitly corrected heading; back views hide the eye lamps behind the opaque body.

## Prompt set

The original identity image was input 1 on every call. After the first call, its sheet was input 2 as animation/style reference. Every call used `transparent_background: true`.

### First sheet (selected as down-left)

```text
Use case: identity-preserve
Asset type: production animation sprite sheet for a top-down painted survival game.
Input image 1 is the exact identity and material reference for the Scrap Walker. Create the same squat FOUR-legged crab-like salvage robot, not a humanoid: worn teal circular faceplate with two round glowing amber eyes, chipped orange top shell, tangled dark teal hoses, rear canister, orange armored mechanical claws. Preserve the recognizable proportions, colors, shapes and hand-painted black-edged game-art finish.

Create ONE transparent animation sheet: EXACTLY 4 columns by 2 rows, 8 complete robots, evenly centered in equal cells, landscape 2:1 layout with generous margins and transparent gutters. Each robot faces DOWN, south on the ground plane, directly toward the bottom of the page, seen from the SAME elevated three-quarter game camera. Never rotate the image plane. Robot scale, body volume and ground-contact baseline remain identical in all frames. Body width occupies about 65% of each cell; every claw must stay completely visible.

Top row left to right: 1 walking left-front and right-rear legs planted forward with opposite legs back; 2 clear passing pose raised opposite claws, body level; 3 walking opposite contact with RIGHT-front and LEFT-rear claws planted forward and other legs back; 4 opposite passing pose. The four-leg alternating gait must be visibly different in each frame. Keep the main shell steady.

Bottom row left to right: 1 attack anticipation, body crouched and BOTH FRONT CLAWS raised clearly up beside face; 2 attack strike, front claws extended sharply downward/forward for a double-claw slam and face thrust forward; 3 attack followthrough with body low and front claws planted wide; 4 recovery rising back into normal neutral stance. Attack is a short predatory mechanical pounce using its existing front legs, no new arms or weapons. Exactly four mechanical legs total in every pose.

Backdrop genuinely transparent alpha, including all space between the legs. No floor, no baked shadow, no dust, sparks, swooshes, background, checkerboard, text, labels, borders or grid lines. Crisp high-quality complete edge detail. Layout strictly 4 by 2.
```

### Shared prompt for the remaining four sheets

```text
Use case: identity-preserve
Asset type: production transparent animation sprites for a top-down survival game.
Image 1 is the exact Scrap Walker character reference; Image 2 is the approved animation sheet/style reference. Preserve the same squat FOUR-legged crab salvage robot: rounded worn teal body/faceplate, two circular amber eye lamps at the FRONT ONLY, chipped orange top shell, dark teal hoses, rear canister, and four short orange-armored claw legs. Same character proportions, colors, materials, small-scale painterly black-edged game-art finish.

ONE landscape 2:1 sprite sheet, EXACTLY 4 columns × 2 rows of equal cells, 8 complete robot poses, transparent gutters and margins, no grid or labels. SAME facing direction in all 8 poses. Keep the body scale and center fixed within each cell; complete claws never clipped.
Top row from left: four visibly distinct walking keyposes alternating diagonal limb pairs: left-front/right-rear forward planted, passing with right-front/left-rear lifted, opposite contact, opposite passing. Do not clone the same leg pose.
Bottom row from left: attack anticipation crouch with both FRONT claws clearly lifted; attacking forward double-claw slam with face thrust forward; low wide planted followthrough; recovering normal posture. Use only its four existing legs: no new limbs, no weapons. Do not shift or rotate the sprite on the sheet. Body shape coherent across frames.
Genuinely transparent alpha. No ground, floor, baked shadows, clouds, particles, dust, sparks, effects, backgrounds, text, labels, checkerboards or borders.
```

### down: appended heading constraint

```text
CRITICAL DIRECTION: This is the SOUTH / DOWN-facing sheet: robot looks STRAIGHT toward the BOTTOM edge of the canvas, from an elevated overhead three-quarter game camera. Its face is horizontally centered and almost symmetrical, with BOTH amber eyes equal apparent size; two front claws one left and one right. Rear tank/cables visible behind the shell at the top. Do not preserve the diagonal turn from either reference. No view of just one side: this is a direct frontal south-facing character, body heading exactly screen-down.
```

### right: appended heading constraint

```text
CRITICAL DIRECTION: This is the EAST / RIGHT-facing sheet: robot's front is pointed exactly toward the RIGHT edge of the canvas. Elevated game camera stays fixed above the world. Show SIDE PROFILE of its body with the faceplate on the RIGHT side and the back/tank on the LEFT; one near amber eye visible in side profile, far eye occluded. The four legs travel to screen-right/left along the ground, not into the camera. No front-facing diagonal turn. Body heading exactly screen-right, no image-plane rotation. Attack poses extend claws to the RIGHT.
```

### up-right: appended heading constraint

```text
CRITICAL DIRECTION: This is the NORTHEAST / UP-RIGHT-facing sheet: robot's front points diagonally AWAY from the viewer toward the TOP-RIGHT of the canvas. This is a rear three-quarter view. We see mostly its curved rear orange armor, back tank, hoses, rear joints. Its two eye lamps face AWAY and are NOT visible through the back; only a very thin right-side edge of the faceplate may appear on the far upper-right. Show the same recognizable robot TURNED AROUND in ground-space, NOT the reference orientation and NOT image-plane rotation. Rear is lower-left, front upper-right. All walking legs and attack claw reach align along the upper-right ground heading. Camera stays elevated overhead three-quarter as on reference.
```

### up: appended heading constraint

```text
CRITICAL DIRECTION: This is the NORTH / UP-facing sheet: robot walks directly AWAY from the viewer toward the TOP edge of the canvas. We see its BACK. Back shell/canister and tangled hoses dominate, symmetrical rear mechanics, four feet below. We cannot see its face or either amber eye lamp AT ALL: the faceplate points fully away and is hidden by the opaque body. Same orange armor, teal hoses, rear canister, claw legs and rear rivets. Do not draw eyes on its back. Body heading exactly screen-UP in every frame, not a sideways turn and not an image-plane rotation. Attack front claws extend away toward the TOP edge, seen partly above and around the shell from this elevated game camera. Rear limbs remain bottom-left/right.
```

