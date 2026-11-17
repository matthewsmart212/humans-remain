# Loot chest depth and ground contact

The chest has 18% more front-to-back depth at its current width. Its lid rotates
continuously around a stationary hinge. Only the mouth's vertical projection
is extended; the front, crystal, straps and feet retain their authored sizes.
The opening still takes 0.9 seconds, with the loot menu following at 1.05 seconds.

The open compartment has a rounded amber source with a soft falloff before the
front lip. Reflected light strengthens toward the hinges and fades across the
raised wooden lid. Both production Skia renderers and the Canvas fallback use
the revised dimensions.

A small transparent earth, moss, leaf and pebble decal sits beneath the chest
on the terrain pass, below all actors. It renders as a 192 by 38 world-unit
detail at 46% opacity. Every survivor role preloads it, and Expo bundles the
local WebP for offline use. The runtime asset is
`public/survival/loot-chest-v4/ground-contact.webp` (640 by 117 pixels).

## Validation

- Web and native TypeScript checks passed.
- Production web client and Worker build passed.
- Both Skia versions render the actual chest and terrain in the existing chest
  regression suite. Checks cover rigid depth, stationary body pixels, opening
  timing, menu timing, light inside the lid, softened lip lighting, night,
  reduced motion, emptied chests, local ground contact, culling and disposal.
- All four roles' preload sources, live camp artwork sources, native bundled
  artwork registration and real WebP bytes were verified.
- `check-gameplay-artwork.mjs` has a pre-existing failure at
  `assert(first.woodenPickaxe)`. The identical assertion also fails with
  `src/gameplay-artwork.ts` restored from the starting main commit
  `f6de8959b020e598f53aae028b2a6a6a674a6cf2`.
- No physical iPhone test was performed.

## Footing artwork source

Created with built-in image generation using the supplied closed-chest camp
screenshot as a style and colour reference. The transparent output was trimmed,
resized and WebP-encoded for the runtime. The final prompt was:

> Use case: stylized-concept. Asset type: transparent ground-contact decal for
> an existing top-down survival game chest. The screenshot is a STYLE AND
> COLOUR REFERENCE ONLY. Create only a small, low-profile irregular patch of
> warm ochre earth, a few tiny weathered brown pebbles, sparse olive moss and
> 3 or 4 scattered dry autumn leaves to sit UNDER the existing wooden loot
> chest. Do not draw the chest, UI, buildings or background. Match the
> screenshot's painterly outlined hand-painted game art, autumn earth palette
> and high top-down three-quarter perspective. Composition: one extremely
> shallow wide footing patch, roughly 3.5:1 footprint, centred horizontally.
> Central soil area is subtly dark warm brown, soft and unobtrusive,
> surrounding edges feather smoothly into TRUE TRANSPARENCY; scattered little
> details break the silhouette especially along the front and sides. No solid
> oval, no stone border or circular platform, no luminous colour, no hard
> perimeter, no pedestal, no grass ring. Tiny moss tufts at front corners only.
> Keep it restrained: will be rendered about 220 world-pixels wide and 55 high
> under a chest whose body is 190 pixels wide. Transparent background. No words,
> labels or watermark.

The final runtime placement was reduced further after reviewing real-terrain
renders, making the soil contact subtle around the chest feet.
