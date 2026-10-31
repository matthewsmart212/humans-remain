# Scrap Hound

The approved olive-and-rust mechanical canine is a fast hunter with a committed **Overdrive Pounce**, distinct from the Brute's area smash and grapple. It has pointed ears, an angular metal muzzle, four piston-driven legs, broad paws, red eye slits and dorsal exhausts.

## Combat and counterplay

- **120 health, 310 world pixels/second**, 20-pixel body. It can catch ordinary walking; sprint, dodge, use cover or fight back. It drops the normal 1–2 scrap on defeat.
- **Overdrive Pounce:** between 130 and 400 pixels it loads its servos for 0.42 seconds. It follows recent real player movement for the first 0.2 seconds with a 0.4-second movement lead and then commits. A clear, paired scratch-track warning shows the chosen lane. The 0.42-second leap travels at most 480 pixels, including up to 48 pixels of overshoot. It never homes in midair.
- **Contact:** the rushing body checks cover and player proximity in substeps of at most six pixels. It deals 28 damage once, with modest knockback. Dodge invulnerability consumes that contact attempt rather than damaging again when the dodge ends. Cover added before launch cancels the rush; cover added in flight stops it safely. The same body radius is used for spawning, paths, movement, arrows and player avoidance.
- **Recovery:** a short collision-tested skid, scratching paws and vent steam precede a 0.62-second recovery. Incoming damage during recovery increases to 125%, rewarding a well-timed counterattack. The pounce cooldown is 3.1 seconds plus a small fixed per-enemy offset.
- **Bites:** close targets get a separate 0.19-second wind-up, a 0.16-second committed bite with contact at 0.045 seconds, then 0.25 seconds of recovery. It reaches 100 pixels in its forward arc for 15 damage once. The separate 0.95-second bite cooldown avoids long idle periods after a rush.
- **Interrupts:** weapon hits can break anticipation and stagger a grounded Hound for 0.3 seconds. Fists deal normal damage but cannot repeatedly freeze its servo drive. A launched pounce continues through nonlethal hits; lethal hits remove the attacker normally.
- **Groups:** at most two Hounds commit a bite/pounce at once; the rest pursue and separate through the shared bounded pathfinder. All five robot types retain the shared twelve-enemy limit. Healing, clearing and scene arrival cancel stale Hound attacks; arrival gives 0.75 seconds of grace.

## Artwork and effects

Five transparent 1536×1152 atlases contain twelve distinct 384-pixel poses each: idle/run0–3, loaded crouch4, pounce5, bite6, skid7, recoil8, stagger9, collapse10 and disabled11. Five views mirror to eight headings. Every view uses the same 0.84 packing scale and `[192,320]` anchor; runtime display size is 215 world pixels. No per-frame rescaling, baked terrain or idle shadow circle is used.

Eye and vent registrations follow the exact packed artwork. Normal red eyes and warm dorsal apertures remain visible at night; charging brightens them and produces short orange exhaust jets, followed by heat trails, paw sparks, skidding dust and cooling steam. Rear views illuminate visible vents rather than inventing eyes through the back of the head. Occluded apertures have no floating light. Disabled lenses are dark. Warning tracks use the cached painted alpha contour to stay beneath the charging Hound. Reduced motion keeps timings and aim warnings while removing vertical lift, jets and travelling debris.

The runtime WebPs total about 1.61 MB including the thumbnail, shared by every instance. Source images, exact prompts, reference and hashes are retained in `art-source/scrap-hound-v1`. `scripts/prepare-scrap-hound-v1.py` reproduces packing. See `scrap-hound-art-v1.md` for the art audit.

## Integration and validation

Settings → Spawn → Robots offers **Scrap Hound** in quantities1/3/5; the editor combat tester also includes it. Textures load on demand and survive scene-cache cleanup. Bow lock uses the correct name and height. Native has an explicit six-image bundle map and uses the same AI and renderer.

`node scripts/check-scrap-hound.mjs <output-directory>` checks all eight headings, one-contact damage, committed targeting, a timed sideways dodge, early/new cover, fist resilience, weapon interruption, airborne commitment, real walking retreat, pursuit, bow labels, mobile dodge controls, heal/travel/defeat cleanup, group limits, mixed-robot budgets, sixty unique alpha-safe poses, painted emissive attachment and day/night/reduced-motion shared Skia output. The other four robot suites, eleven-kind spawn suite, TypeScript and production build are checked before publication. Browser QA uses the real SpawnMenu, spawn factory, AI and shared web renderer in an ignored local harness. Native hardware frame rate is not inferred from web/software rendering.
