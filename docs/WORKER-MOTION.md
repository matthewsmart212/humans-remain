# Worker animation repair

The worker keeps the existing movement, collisions, cardinal walk sprites and combat balance.

- All eight facings now have dedicated, feet-planted idle artwork. Releasing movement resets the stride immediately.
- Walk timing uses actual distance travelled, including collision-limited motion, rather than the world clock.
- Diagonal walking uses two opposed boot layers from the planted sprite. The head and body stay registered; the ankle overlaps hide cut edges. This is a compact runtime rig, not a finished multi-frame full-body diagonal run cycle.
- The attack uses eight directional extended-arm poses, with a short anticipation and recovery. Its facing follows the attack's recorded angle, not joystick changes mid-swing. Existing damage, range, stamina and cooldown are unchanged.
- Browser and native Skia share `worker-renderer.ts`, `worker-animation.ts`, the frame metadata and both sprite atlases.

Generated via built-in image generation. Prompts are in `WORKER-MOTION-PROMPTS.txt`. Atlas step-frame attempts were rejected for repeated foot leads; only idle/punch crops are referenced. Original artwork remains available in the repository.

Visual regression harness: open `/scripts/worker-preview.html` through the development preview. It uses the same worker renderer and offers planted idle, animated walking, animated punching, peak-stride and extended-punch inspection. This development page is not part of the production build.

Validation: all-direction animation assertions, survival regressions, TypeScript checks, native iOS export, and browser inspection of planted idle, peak diagonal stride and all eight punches. Physical iPhone performance has not been measured here.
