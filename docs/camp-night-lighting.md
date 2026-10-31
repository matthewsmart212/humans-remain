# Camp night lighting

The sun/moon button in the workspace toolbar switches between Day and Night in Build, Walk and Play. The change fades over 0.7 seconds, including while gameplay is paused. This is a local preview preference; it survives reopening the workspace and Play/Stop/Restart, without modifying the saved world. It does not enable the retired wave system or an automatic day/night timer.

At night, the camp is dark with a cool ambient tint. Each lit hearth has a warm clearing that gradually fades into the surrounding darkness. Lighting and flame artwork use the existing hearth fuel state, so an extinguished hearth has no glow. Light position and radius follow placed artwork dimensions, including fixed tier dimensions, movement, scale, rotation and flips. Non-fire ground decorations emit no light.

The current bunker has baked indoor lighting. Its image and player stay visible under that lighting, while the selected outdoor time is carried through the trip and restored on return. New map definitions default to outdoor lighting; set `lighting: 'baked'` for already-lit interior artwork.

## Rendering and cost

- `camp-lighting.ts` caches fire geometry per immutable layout and invalidates it when shared artwork changes.
- `night-lighting-skia.ts` combines native radial gradients once into a small world-space lightmap. The image is at most 256 × 256 (256 KiB), bilinearly sampled; terrain, assets and characters retain their original resolution.
- A normal camp keeps that lightmap throughout camera movement, zoom changes, character movement and fire animation. Only source position, dimensions or lit state rebuild it. Dense maps use a budget of 16 nearby lights.
- Each night frame adds one cached texture draw; daytime adds no lighting draw. There is no full-resolution off-screen buffer, per-frame lightmap generation, custom per-pixel loop, React animation update, or new network artwork request. The small texture is warmed on the actual render surface during startup/resizing and disposed with the renderer.
- Lighting is applied after world artwork and before editor collision/selection overlays. Workspace controls stay outside the Play viewport.

## Verification

`node scripts/check-camp-lighting.mjs` checks the actual CanvasKit pixels for bright fire cores, continuous falloff, warm/cool tint, extinguished fires, overlapping lights, pan/zoom alignment, day/night fade, preference persistence, transformed placements, culling and the light budget. It verifies that 120 moving-camera frames do not rebuild the lightmap.

To render a saved camp, append artwork JSON, world-layout JSON and a QA directory containing uploaded images named `<file-id>.image`. This was checked against live revision 55: all 24 placements were preserved, daytime/night/fire-out and landscape renders were inspected, and indoor pixels matched exactly between outdoor day and night settings. Representative renders are in `docs/qa/camp-night/`.

The studio transition, monitor, markup, gameplay and connected-map tests also pass. They cover Play/Stop/Restart, night retention after bunker travel, desktop/mobile toolbar hierarchy and the existing movement, cooking and interaction flow. TypeScript and the production build are checked before publishing.

Browser and real iPhone GPU/FPS testing were unavailable in this environment. Software CanvasKit tests verify rendering and caching, not device frame rates. The cached lighting pass measured similarly to an ordinary image draw in this environment; an earlier expensive per-pixel implementation was discarded.
