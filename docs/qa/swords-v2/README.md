# Continuous sword swings

The previous version swapped between idle and punch artwork while rotating the sword. Its wrist teleported at the pose boundaries and the recovery returned too quickly.

Both swords now use a continuous arm rig made from the approved character's painted sleeve and fist. Two connected arm segments share an elbow, and the fist and sword share the same wrist on every frame. A small turn around the belt and a forward weight shift follow the cut. The original head retains its size and is layered over the arm in rear views.

Shape-preserving cubic curves drive the wrist, blade and body, with continuous velocity through anticipation, contact, follow-through and recovery. The hand eases from and back into the current walking grip. Legs continue the existing distance-based gait. Rounded sleeve joints avoid exposed rectangular cutout edges. A short tapered trail follows the actual blade tip; reduced-motion mode omits it.

Contact remains at 0.22 seconds, with unchanged 0.68-second cooldown, damage, reach and group-hit rules. Recovery now finishes at 0.62 seconds rather than 0.52 seconds.

## Validation

- TypeScript check passed.
- Sword combat/inventory checks passed, including wall clearance, range, one hit per target, interruption and both simulation loops.
- Knife and spear regression checks passed.
- Production Skia renderer: 144 carry poses and 160 swing/recovery poses across all eight directions and both swords.
- Curves sampled at 1 ms intervals: no wrist or angle discontinuities; both arm segments end at the registered wrist.
- `node scripts/check-swords.mjs --motion` renders and encodes `swing-preview.mp4`: 120 frames at 60 fps, showing stationary swings followed by moving swings. Temporary frames are written beneath ignored `.openai/qa/`.
- Visual reviews included all directions, with close-ups of south, southwest and southeast, plus elbow seams and rear-view occlusion.

The existing Skia path deprecation notices do not fail these checks. This does not substitute for a physical-device play test.
