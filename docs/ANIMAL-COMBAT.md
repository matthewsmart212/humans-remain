# Animal combat feedback

`src/animal-combat-renderer.ts` draws shared web/native feedback in play mode, after world scenery and lighting. It uses the field-kit palette: dark teal, warm cream, red health and coral damage.

## Health bars and hits

Living, nearby, visible chickens and rabbits have 32 CSS-pixel health bars; doe and stag bars are 40 pixels. Their size stays stable through camera zoom and device pixel ratio. Fill represents current HP in red at every health level, with a brief pale damage trail. Bars, species and current/max HP appear only for 3.5 seconds after a real hit, refreshed by each subsequent hit, or during active stag retaliation. The entire bar and label fade together over the final half-second. Passive animals, expired damaged animals and dead animals have no bar.

Hits against animals produce a warm gold broken-cross impact and actual damage number. A lethal hit adds a small `DOWN` finish. Incoming player hits use coral directional claw marks and a larger damage number; the existing screen-edge hurt effect remains. The previous rectangular stag attack warning is absent. Reduced motion removes drifting markers and the health trail while retaining fading feedback.

## Compact player health

The collapsed character card widens during fighting or for 3.5 seconds after a hunting hit. It keeps the 40-pixel square portrait, 40-pixel artwork height and 44-pixel touch target. Heart, live red health meter and health percentage precede the other three inline vitals. The frame ends 12 pixels before the pause button inside the safe edges. Fixed artwork slices preserve the portrait, end caps and crest while the quiet panel fields stretch. The fully opened card is unchanged.

`FieldKitController.healthCombat` is a display flag separate from fighting controls. Hunting passive prey therefore keeps contextual Collect/Cook available. The hit deadline survives corpse removal and pausing, expires on simulation time, and clears for a new run. Both platforms reuse the existing 10 Hz HUD sample and decoded UI artwork; no extra timer or texture is introduced.

## Simulation contract

`survival-engine.ts` owns health and damage. Animals expose `maxHp`, `healthFrom` and `lastHitAt`; hit effects expose `target`, `amount`, `lethal` and optional source `angle`. The renderer reads these values without changing simulation state.

Damage numbers use applied health loss: a 40-damage strike against 32 HP displays 32; a 12-damage player hit with 7 HP remaining displays 7. Corpse hits, successful dodges and hurt-immunity contacts produce no new damage marker. Environmental damage retains its separate treatment. Generic combat feedback skips target-tagged events to avoid duplicate markers.

## Rendering cost

Bars reject animals outside the hit/retaliation window, dead animals, animals beyond 900 world units and bars outside the viewport. Hit feedback inspects only the last 32 existing effects; impact strokes last 0.3 seconds and numbers expire after 0.85 seconds. Drawing uses Canvas primitives supported by the Skia adapter, with no new textures, image decoding, timers, UI nodes, collision queries or persistent animation state.

## Verification

- `npm run typecheck`
- `node scripts/check-field-kit.mjs`: actual hunting/received-hit triggers, grace after corpse removal, contextual collection, new-run reset, live compact fill on both platforms, unchanged expanded trees, fixed avatar/height, safe gap before Pause and native component layout proofs. Portrait and landscape combat pictures are included in the existing software proof set.
- `node scripts/check-animal-feedback.mjs`: red fill at all HP ratios, hidden passive/expired bars, real-hit visibility refresh, whole-bar fade, active stag visibility, damage trail, culling, zoom scaling, distinct hit styles, expiry, bounded effect processing, reduced motion, immutable rendering, actual engine overkill values and corpse/dodge/immunity guards. Internal raster proof: `.qa/animal-combat/feedback.png`.
- `node scripts/check-native-authored-world.mjs`: passed production native renderer checks for animal bars, dealt/received markers and stag impact, warning, charge and contact. Captures are in `docs/qa/camp-deer-v1/native-stag-*.png`; summary is `docs/NATIVE-VERIFICATION.json`. The four combat captures were visually reviewed.

Native verification runs the production Skia renderer through a CanvasKit software shim with platform services substituted. It is rendering/simulation proof, not a physical iPhone, GPU-performance or touchscreen-interaction test; `physicalIPhoneTested` remains `false`.
