# Player illustrated atlas

Open the folded-map utility button or press **M** in the web game. The map pauses play, centres on the player and shows a north-up direction arrow. Drag to explore, pinch/scroll or use the zoom buttons, use **Find me** to recenter, and **Whole map** to fit the active scene. **M**, **Escape** or the close button returns to play. Native uses the same geometry and supports Android back.

## Zoom from gameplay into the atlas

An outward gameplay pinch opens the atlas as it reaches the minimum gameplay
zoom (`0.7`, 30% out). Web touch, Ctrl+wheel trackpads, Safari GestureEvents and
the native world/movement touch handlers share that limit. Placing two fingers at
the limit or pinching inward does not open the map. Opening clears the active
gesture and held movement/actions, pauses gameplay and excludes map time from
the performance recorder. Closing keeps the gameplay camera at the same zoom.

The invisible left-30% movement region participates in gameplay pinches. On web,
capture-phase listeners on the shared world container see both thumbs before
movement handles the event. Native registers world and movement touch IDs and
observes their events at the common ancestor. A second gameplay finger stops
movement immediately; movement stays suppressed until all pinch fingers lift.
Action-button touches are excluded, so walking while attacking still works.

Web uses a 420 ms compositor scale/opacity entrance and a 220 ms exit. The modal
stays present and play stays paused until the exit completes, with a timeout
fallback for a missed animation-end event. The map viewport waits until the
entrance completes before taking drag/pinch input. Native uses the same durations
with native-driver Animated views and remeasures touch origin after the scale
animation. Both respect reduced-motion preferences.

Web map sizing uses untransformed layout dimensions, independent of that entrance
animation. Terrain repaints in a layout effect before the browser presents the
matching DOM player/landmark positions. Pointer coordinates are converted from
the displayed rectangle into the same layout space. This prevents zoom-dependent
marker drift and a frame of mismatched terrain/markers during camera changes.

On web, zooming below 95% begins decoding the active map artwork and caches the
decoded image for opening/reopening. This adds no startup map download. The
cache/prefetch is capped at four images; failed entries remain retryable. Map
geometry and artwork are unchanged.

`node scripts/check-play-zoom.mjs` checks the map handoff on all four input paths,
gesture cancellation, inward zoom after closing, decoded-image reuse, retry and
cache eviction. `node scripts/check-player-map.mjs` checks registration and map
geometry. Browser QA covers opening at the limit, close/keyboard dismissal,
retained gameplay zoom, and portrait/landscape layout in the component harness.
The harness's movement-pinch replay also exercises the production capture listener
and React movement component together (synthetic touch capture is stubbed).
`node scripts/check-field-kit.mjs --no-proof --no-report` verifies the actual
web/native movement handlers, pinch suppression, fresh drags, action independence
and lifecycle cleanup. This excludes the older software HUD image-proof path.
Web/native type checks pass; physical iPhone animation performance is unmeasured.

## Registration with the game

- `src/player-map.ts` is the shared web/native model. It reads the active world's bounds, scene, player position and eight-way facing direction. World coordinates already use east-positive X and south-positive Y; no additional isometric rotation is applied.
- `public/maps/world-illustrated.webp` is a 3072px illustrated atlas with inked waterways, bank relief, engraved bridges and traced roads on weathered paper. Its golden soil, olive/umber ground and turquoise water come from the actual registered terrain. `world-illustrated.json` records the exact source and world registration, geographic sources, material provenance and colour samples.
- The renderer averages dry terrain into a registered 192px colour field, softens it, and blends 57% terrain colour with 43% paper. Water is excluded from ground samples and supplies its own river hue, preserving dry banks. This bakes the real terrain's broad colour regions into the existing illustration without adding geographic detail.
- Water uses the installed collision masks with the same batch ownership as gameplay, including every disjoint side-stream/lake span. Roads use the rendered road geometry refined against the existing registered road artwork; the camp ring follows its actual trace. No prospective district features or invented mountains are added.
- Buildings, walls, trees, woodland washes and landmark pins come from the active layout using production placement transforms. The engraved shapes are cached in twelve path batches; they are not baked into the terrain image. Changes to saved placements therefore follow the current layout when the world is loaded.
- `art-source/maps/atlas-paper.png` is decorative generated material, with its prompt stored beside it. Generated material supplies no geographic information. The original `world-terrain.webp` is retained as a registration/evidence reference for the tracing script; it is no longer the outdoor player-map image.
- Interior scenes use their own terrain artwork and local coordinates. The bunker is never plotted on the outdoor map. Custom terrain preserves the existing terrain-border scaling.
- Map art, player, pins and pointer input share one isotropic projection. A 32px inset keeps the complete direction arrow visible at world boundaries.

## Updating and checking

After changing authored terrain, road or river artwork/geometry, regenerate the ground overview from the repository root:

```sh
node scripts/render-player-map.mjs
node scripts/render-illustrated-map.mjs
node scripts/check-player-map.mjs
npm run typecheck
```

Commit the regenerated images and registration metadata in `public/maps/` with the terrain change. The native map imports the same illustrated asset. The illustrated renderer checks wet/dry samples for all four river-side features and verifies unchanged world registration.

The geographic check covers real negative world bounds, source/pixel registration, all eight headings, projection round trips, all world corners at several zoom levels, bunker-local coordinates, custom terrain borders, moved landmarks and the illustrated asset's registration. The map frame uses deep olive, subdued brass, serif labels and distinct landmark pictograms; its compass moves aside at a player corner.

## Nighttime atlas

Web and native sample the simulation's `nightAmount` along with the player. The
shared `player-map-lighting.ts` eases that value through dusk and dawn, applies
moonlit blue/teal tones to the existing artwork, and lifts captions to pale ink.
Navigation pins and controls retain their original colours. Caption anchors,
13px type and the shared zoom-detail threshold are unchanged.

Two flat colour passes reuse the existing decoded map and retained geometry;
no additional map textures or continuous decorative animation are loaded. A
soft amber glow follows the actual bonfire illustration while its fuel is above
zero. Interior maps retain their own lighting. The component QA harness offers
daylight, dusk, night and dawn previews without advancing or saving a real run.

For development-only browser QA, open `/scripts/player-map-qa.html` in the Vite preview. It renders the actual HUD/map components from the bundled authored layout without cloud writes, with portrait, landscape and small-phone sizes plus camp, river, bunker and boundary positions. The harness is outside the production app entry point.

## Validation for this change

Web and native TypeScript checks pass. Geographic checks and the existing sky-clock regression check pass. Browser inspection covered phone portrait/landscape, the bunker, boundary arrows, zoom, drag, recenter and keyboard dismissal. Expo iOS export passes; a physical-device run is still required for device-specific performance assessment.
