# Headquarters space and terrain integration v4

The headquarters exterior, roof, interior, entrance, wall mask and collision grow together by 18% in each dimension, adding 39.24% floor area. Its existing placement origin, frame, orientation and layers remain unchanged. The six room props follow their relative locations while keeping their own physical size, so the extra floor remains usable. Props moved out of the room are left alone. The upgrade applies once and respects subsequent editor changes.

The same expansion runs for authored worlds and continued expeditions. Newly overlapping collision is checked against the survivor and camp return points without resetting inventory or progression. The earlier rear-floor migration remains supported.

The original foundation and roof transition remain aligned. A new transparent soil/moss/stone/leaf decal sits below the building in both states. A matching feathered contact-shadow profile now runs through the HQ-specific renderer branch, which previously bypassed the camp contact-shadow pass. This uses the existing static ground layer and contact-stroke renderer: one preloaded texture and no per-frame texture generation or blur filters.

## Artwork

Built-in ImageGen, saved as `public/survival/headquarters-south-v1/ground-contact-v4.webp` (1536 × 1024, alpha preserved, WebP quality 90). The original building artwork is unchanged.

Prompt: Create only a transparent, narrow irregular ground-contact apron for the south-facing HQ, using the exterior sprite as a geometry guide and the user's screenshot as the ochre soil/stone/olive moss/dry leaf style reference. Remove the entire house, foundation, steps, props and HUD. Keep the top half and most of the center transparent. Put small disturbed-soil/contact-dirt bands along the side foundations and front stone plinth, with slightly worn earth in front of the central steps. Sparse tiny stones, moss and leaves; feathered irregular edges; no opaque plate, lawn, black halo or new path. Match the game's detailed hand-painted pixel-art style.

## Validation

- Shared navigation and collision checks, including four clear standing positions, central aisle, chest and table access.
- 39.24% area increase, preserved furniture scale, untouched unrelated placements, one-time migration and later editor resize preservation.
- Root/native TypeScript and on-site repair/HQ raid regressions.
- Production native renderer with offline bundled assets, repaired and ruined states, intermediate entrance frames.
- Fixed foundation pixels through the reveal; ground asset preload/bundle registration.
- Production web build and deployment archive/source parity.

Native render evidence is in `docs/qa/headquarters-space-v4/`. No physical iPhone test was performed.
