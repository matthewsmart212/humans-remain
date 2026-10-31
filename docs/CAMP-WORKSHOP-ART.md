# Camp workshop artwork

The approved camp mockup's compact workshop is available as `base_workshop_t1` → **Camp workshop**, in **Workshop & repairs → Main workshop**. It is also listed in the World Editor under **Main workshop**. Existing world placements are not changed by this artwork addition.

- Image: `public/survival/camp-workshop-v1/camp-workshop.png`
- Original generated PNG: 1254 × 1254, RGBA; copied without resampling or cropping.
- Placement: 560 world units wide; normalized ground anchor `[0.52, 0.90]`.
- Collision: `src/workshop-art.json`; editable in the existing library and world editor. The base and supporting props are solid; the roof overhang and transparent padding are not ground blockers.
- Included: workshop, workbench/vice, tools, timber stack, crates and chopping block.
- This is placeable artwork. No crafting menu, new resource system or automatic map placement is introduced.

## Generation

Made with the built-in image-generation tool, using the approved camp mockup (`exec-c93dc18f-094f-4714-86ec-4f64adfb71e3.png`) as the visual reference, with actual background transparency enabled.

Prompt:

> Use case: background-extraction / precise-object-edit. Asset type: one high-definition transparent PNG game asset for this exact survival camp. Input image is the approved camp layout reference. Make a standalone enlarged high-detail cutout of ONLY THE SMALL WORKSHOP AT THE LEFT OF THE CENTRAL FIRE (not the large headquarters at the top). Preserve that workshop's design, shape, three-quarter overhead camera angle, orientation, muted grey-brown wood palette, roof slope, and supporting props from the reference. Enlarge it into a crisp production-quality game sprite at the highest available resolution with clean actual alpha transparency.
>
> The workshop is a compact open-front rustic wooden crafting lean-to. It has an asymmetrical sloped roof of weathered brown-grey boards and one small corrugated grey metal repair panel. Thick timber posts and framing, a darker back wall with a few hanging hand tools, an exposed waist-height timber workbench with hand tools and a metal vise, the small round chopping stump on the right, the neat stack of cut firewood/logs and one small timber crate tightly beside the left side, and one small open crate at the front post. Keep these together as ONE coherent placeable asset, matching the approved screenshot. No additional building, no furnace, no machinery, no characters. The player's character is NOT part of this asset. The campfire, benches, well, tent, HQ and fences are NOT part of this asset.
>
> Style: charming hand-painted illustrated 2.5D survival game asset with readable dark edge lines, worn timber grain, restrained warm highlights, subtle moss, detailed but clear at game scale, matching the reference world. Grounding should be a small irregular scattering of wood shavings, a few tiny moss tufts at feet, and delicate soft contact shadows hugging the base, with actual transparent alpha around and between elements. No large solid patch of ground, no square/oval tile, no grass mat, no terrain, no stone path. Transparent open space at the front where players approach the workbench; preserve the natural dark shaded building interior, not fake transparency through solid rear walls.
>
> Composition: centred isolated asset filling most of a square canvas, preserve entire roof, rafters, logs, crates and shadows with 5-7% clear transparent padding on every side. No clipping. Consistent overhead viewpoint; do not turn it into a frontal elevation or a low-angle render. True transparent background, not a white or black backdrop and not a painted checkerboard. No text, no captions, no UI, no borders.

## Verification

Verified image dimensions and alpha, catalogue/world-editor registration, artwork loading registration, collision validity, clear player approach to the bench, unblocked roof overhang and stable placement through library hydration. TypeScript check passed. Browser interaction QA was not available in this environment.
