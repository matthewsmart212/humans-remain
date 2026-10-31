# Camp garden artwork

The abandoned patch is placed directly below the treatment centre, outside the circular path and inside the perimeter fence. The central fire clearing stays open. All existing authored placements are retained.

Four original transparent sprites are available in the Food and farming library: Abandoned vegetable patch, Ground vegetable patch, Raised vegetable beds and Camp greenhouse. Select the placed garden in Build, open Object settings and choose Broken or tiers 1–3. The position, canvas dimensions, anchor and ground blockers remain fixed across changes.

The one-time placement marker preserves later owner moves, tier selections and removals. An occupied lot is left alone. Existing survival saves receive the artwork on load; a returning player already standing in its footprint retains their position and receives the addition on a later load once clear.

These are artwork and editor upgrades. Planting, watering, harvesting, HQ unlocks and paid repairs remain design work, rather than implied functionality of the vegetable sprites.

## Files and registration

- Runtime sprites: `public/survival/camp-garden-v1/*.webp`, lossless RGBA, 1024 × 1024.
- Registered PNG masters: `artwork-archive/camp-garden-v1/`.
- Ground anchor: 0.5, 0.90. Default world canvas width: 380.
- Shared ground collision follows the beds' contact area rather than the greenhouse roof.
- Geometry and catalogue: `src/camp-garden-art.ts`, `src/camp-garden-catalogue.ts`.
- Authored placement: `src/camp-garden-placement.ts`.
- Web and native use the same catalogue and placement pass. All four sprites are included in native packaging, including unplaced upgrades.

## Artwork brief

Built-in image generation produced each state separately from the approved concept sheet and broken camp mockup. The brief requested one isolated transparent sprite, matching the existing elevated painted camera, weathered timber, rusty brackets, muted leaves and warm natural light. Each canvas preserves a reserved lot and ground anchor. The broken state has dry furrows, collapsed edging, dead stalks, weeds and a tipped watering can; Tier 1 has two low beds; Tier 2 has four raised beds; Tier 3 has a salvaged greenhouse, transparent covering, rain gutter and barrel.

Export registration removes transparent margin noise from the bounding-box calculation, scales each illustration to a common 900-pixel width, and aligns its front ground edge at pixel 920 in a 1024-pixel canvas. No screenshot background or HUD is included. Lossless WebP exports preserve the alpha channel.

## Validation

`node scripts/check-camp-garden.mjs` checks placement, preserved existing objects, owner edits/removals, occupied lots, all four tier bounds and blockers, routes to camp stations, and old-save migration without trapping a returning player. The existing first-expedition integration check covers gameplay/save regression. Root/native TypeScript, production web build and Expo iOS export are required for release.

`scripts/camp-garden-preview.html` is a development-only fixture using the production Skia renderer, bundled authored world and real tier selector. It is not a production route. Physical iPhone performance has not been measured for this asset pass.
