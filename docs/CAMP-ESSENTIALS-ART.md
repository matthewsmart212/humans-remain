# Well, treatment centre and fuller hearths

The approved camp mockup is the design reference. The new assets match the camp workshop's illustrated weathered timber, grey fieldstone and muted olive/tan canvas.

## Asset library and placement

- **Water → Water source → Rope-and-bucket well** (`base_well_t1`): fieldstone well, oak windlass, rope bucket, two water barrels and a small earth apron. The original 1091 × 1012 canvas, 138-unit width and [471, 995] ground anchor remain unchanged. A source-ID-specific reskin replaces the original well upload while preserving its custom collision and saved dimensions. Future uploads take priority.
- **Hearth, shelter & care → Medical station → Tier 2: Treatment centre** (`base_medical_t2`): open-front canvas shelter, beds, blankets, supplies, washbasin and lantern. 1536 × 1024 transparent lossless WebP, 680-unit default width, normalized anchor [0.5, 0.87]. Ground blockers follow furniture and fabric while leaving a continuous central approach. Treatment mechanics and menus are not connected.
- Library family cards prefer a matching tier with available artwork, so the treatment centre is visible instead of an empty first-aid-crate thumbnail. All tier tabs remain available.
- No world-layout rows or existing object positions, scales, rotations or layers were changed.

## Hearth refresh

All three stable hearth IDs and legacy aliases use `hearth-painted-v2` artwork:

1. Low soot-darkened fieldstone ring with logs.
2. The same ring with an iron cooking rail and pot.
3. Weathered oak rear supports and a small patched plank shelter.

Eight broad flame cells at 10 fps are registered at one scale to one root. Each tier reuses one immutable base, never eight separately generated pits. All lit/unlit images are 1024 × 1024 with the same [512, 960] anchor and original world dimensions (112, 132, 164). The roofed tier occludes the flame where it meets the shelter edge. Ground artwork is a separate underlay with no collider: irregular worn ochre dirt, ash, flat pebbles and small scattered wood pieces.

## Source and reproduction

Built-in image generation created the well and treatment shelter from the approved camp mockup and workshop reference. Prompts specified a single fully contained transparent asset, matching elevated orthographic camera, weathered materials, readable painted contours, supporting props and clear front access. The treatment prompt specified four recovery places, a central aisle and no separate gameplay implementation.

The hearth prompt specified a low irregular fieldstone ring, charcoal and split logs, small rear-only oak shelter and offset pot, with no flame or ground. Tier edits removed the roof/posts for the basic ring and replaced them with an iron rail for the cooking tier, preserving the ring's perspective and scale. The flame prompt requested exactly eight broad flame clusters in a 4 × 2 sheet, common baseline and scale, several orange/amber/yellow tongues, no logs or background. The ground prompt specified an opaque worn-earth centre covering underlying foliage, softly broken transparent edges and no standing objects.

Generated masters are retained in `artwork-archive/camp-essentials-v1` and `artwork-archive/hearth-painted-v2`.

- `node scripts/prepare-camp-essentials.mjs`
- `node scripts/prepare-hearths-v2.mjs`

These scripts only register and encode generated pixels. The registration manifest records flame roots, scales, base bounds and sockets.

## Verification

- TypeScript check passed.
- `scripts/check-camp-essentials.mjs`: catalogue and editor availability, transparent image dimensions, required image loading, valid saved placements, clear continuous approach for a character with radius 19, bed/supply blockers, preserved well geometry and future upload priority.
- `scripts/check-painted-hearths.mjs`: all 27 states have matching dimensions and transparent margins; every base pixel outside the flame is identical; all 8 frames and the unlit state use identical renderer destinations; saved placement and collision geometry stay unchanged. Legacy aliases are retained.
- Rendered using the actual CanvasKit terrain and placed-object renderer. Included the ground pass and inspected the well, treatment shelter, workshop and all three lit hearth tiers on terrain.
- Browser interaction QA was unavailable in this environment.

The public release is an artwork/library update, not new healing, sleeping or crafting gameplay.

Superseded `hearth-painted-v1` runtime copies are excluded from the production build to stay within the hosting archive limit. Original artwork remains in the repository and history; every active hearth ID resolves to v2.
