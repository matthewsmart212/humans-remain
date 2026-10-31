# HUD recovery at the gameplay/map boundary

Reproduced before the fix with the actual FieldKitHUD, PlayerMap and web pointer adapter: pinch from 1 to 0.68, then release both fingers. The HUD remains hidden while map opacity is 0.0553936. This matches the reported symptom of terrain remaining visible without the HUD; the exact cause on the user's device is not confirmed.

The shared zoom state now settles a released gesture to gameplay (0.7) or the fully visible map (0.56), whichever is nearer. Active gestures retain the continuous crossfade. Release completes smoothly in 150 ms; interruptions settle immediately. Both platform adapters notify only after all registered pinch contacts have left, and a fresh pinch cancels a settling animation. Tween endpoints are exact and near-boundary values normalize to the gameplay minimum.

Validation:
- Web and native TypeScript checks pass.
- Gesture model regressions cover the fractional transition band, final-touch release, cancellation, blur/resize, Safari fallback, wheel idle, disposal, native action exclusion and exact animation completion.
- Existing waypoint and player map model checks pass.
- Browser: the actual HUD regression fails before the fix and passes afterward. The test waits for animation completion because background preview frames can be throttled.
- Browser: continuous pinch out into the mounted map and back in passes; four repeated map/waypoint pinch cycles, captured releases, thumb taps and drag rejection pass.
- Physical iPhone not tested.

The existing nighttime map changes are retained from source e43692c0987191089ed64e130dcd08b274e61f96.
