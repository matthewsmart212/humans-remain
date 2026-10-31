# Sword artwork v1

Mode: built-in `image_gen.imagegen`, generate intent, two independent calls with `transparent_background: true`. The supplied image is a style/material reference, not an edit target.

Reference: `/workspace/scratch/879eea77dcaa/generated_images/exec-c8c335bb-705c-4457-a60a-306b2dc3eea3.png`

## Outputs and registration

Both assets are 1024 × 1536 RGBA PNGs. Coordinates below are in source pixels. Bounds use Pillow's exclusive right/bottom convention.

| Asset | Project path | Generated source | Grip center | Tip | Silhouette bounds, alpha ≥128 |
| --- | --- | --- | --- | --- | --- |
| Wooden sword | `public/survival/equipment/wooden-sword-v1.png` | `/workspace/scratch/879eea77dcaa/generated_images/exec-11622dd6-2830-49c6-8b57-9420d933eb87.png` | (513, 1255) | (512, 31) | (295, 31, 731, 1499) |
| Metal sword | `public/survival/equipment/metal-sword-v1.png` | `/workspace/scratch/879eea77dcaa/generated_images/exec-1ec987c0-9626-48b5-9f48-7fea8217c1a5.png` | (528, 1215) | (530, 44) | (338, 44, 716, 1479) |

Wooden grip wrap spans approximately y=1135–1375. Metal grip wrap spans approximately y=1055–1370; y=1250 is also within the usable grip if the animation deliberately holds the lower portion.

## Alpha and visual QA

- Original generated alpha is preserved byte-for-byte in project copies; no background removal or image editing was applied.
- Alpha extrema are 0–254 for both files. Wooden has 1,316,440 fully transparent pixels; metal has 1,319,786.
- Both were composited over an opaque forest-green background and visually checked. The visible weapon edges are clean and there is no visible brown glow, black rectangle, label, extra item, or cast shadow.
- The raw image viewer displays hidden brown RGB around the silhouettes. Those pixels are transparent in normal alpha compositing.
- Alpha ≥1 bounds are (25, 28, 970, 1504) for wood and (65, 42, 954, 1498) for metal due to very faint generated alpha pixels. The alpha ≥128 bounds above give meaningful visual silhouette bounds.
- Wooden material is timber and brown leather only. The metal sword uses salvaged steel, restrained rust, teal remnants and brown leather. Both have an upright readable sword silhouette with complete tip and pommel.

## Exact wooden-sword prompt

```text
Use case: stylized-concept
Asset type: production equipment sprite for a top-down painted survival game.
Input image: the provided survival equipment concept board is a STYLE AND MATERIAL reference only. Match its warm, richly painted texture and crisp hand-painted silhouette. Do not reproduce its board, labels, arrangement, other items, or diagonal perspective.
Scene/backdrop: truly transparent background, empty pixels around the weapon with alpha zero.
Composition/framing: one entire upright sword only, tip pointing straight up and pommel pointing down, strict front view with broad blade face visible. Portrait 1024x1536 canvas. Sword runs along vertical x=512. Blade tip at approximately (512,55). Crossguard centered near y=1080. Leather hand grip from y=1130 to y=1400, grip center around (512,1250), handle bottom near y=1490. Whole sword fully within the frame. A practical broad short one-handed sword: blade width about 185px, crossguard width about 330px, handle width about 95px. Straight centerline, no diagonal tilt, no curve, no foreshortening.
Style/medium: detailed stylized hand-painted game equipment, dark brown contour definition, warm edge highlights, readable bold sword silhouette at a small gameplay scale. Practical scavenger craft rather than ornate fantasy.
Constraints: no character, no hand, no text, no labels, no border, no floor, no cast shadow, no checkerboard graphic, no background color or glow. Crisp clean alpha cutout. Exactly one weapon.
Primary request: a hand-crafted WOODEN SWORD from the same survival equipment family.
Subject and materials: a broad carved timber blade with warm honey-brown woodgrain, long carved bevels and a broad faceted pointed tip. Slight natural wear and nicks, but sturdy intact shape. Blade carved from one straight timber blank. Simple small wooden crossguard. Brown leather strip wrap around a wooden grip, small faceted wooden pommel. All blade, guard, fittings, and pommel are wood. There is absolutely no metal anywhere. Wood and leather only. No teal painted metal. The blade is much longer and broader than a knife, but remains a compact practical survival sword.
```

## Exact metal-sword prompt

```text
Use case: stylized-concept
Asset type: production equipment sprite for a top-down painted survival game.
Input image: the provided survival equipment concept board is a STYLE AND MATERIAL reference only. Match its warm, richly painted texture and crisp hand-painted silhouette. Do not reproduce its board, labels, arrangement, other items, or diagonal perspective.
Scene/backdrop: truly transparent background, empty pixels around the weapon with alpha zero.
Composition/framing: one entire upright sword only, tip pointing straight up and pommel pointing down, strict front view with broad blade face visible. Portrait 1024x1536 canvas. Sword runs along vertical x=512. Blade tip at approximately (512,55). Crossguard centered near y=1080. Leather hand grip from y=1130 to y=1400, grip center around (512,1250), handle bottom near y=1490. Whole sword fully within the frame. A practical broad short one-handed sword: blade width about 185px, crossguard width about 330px, handle width about 95px. Straight centerline, no diagonal tilt, no curve, no foreshortening.
Style/medium: detailed stylized hand-painted game equipment, dark brown contour definition, warm edge highlights, readable bold sword silhouette at a small gameplay scale. Practical scavenger craft rather than ornate fantasy.
Constraints: no character, no hand, no text, no labels, no border, no floor, no cast shadow, no checkerboard graphic, no background color or glow. Crisp clean alpha cutout. Exactly one weapon.
Primary request: a METAL SCRAP SWORD from the same survival equipment family as the scrap sword at upper right of the provided board.
Subject and materials: a broad salvaged dark grey steel blade with worn bright sharpened edges, a modest asymmetrical angled/chamfered pointed tip, shallow edge nicks, restrained rust patches and scratches. Subtle remnants of old teal paint near the base of the blade and on the scrap metal crossguard. Two small workshop drill holes near the spine are optional. Short straight practical scrap metal crossguard, brown leather wrapped one-hand grip, small battered metal pommel with old teal traces. Strong clear sword silhouette, not a cleaver, not a knife, not a gigantic fantasy weapon. Preserve the same whole-sword proportions as the wooden version described in composition.
```

