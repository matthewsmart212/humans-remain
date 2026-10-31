# Skitter

A small teal salvage robot with four jointed legs, front pincers and one red eye, matching the approved robot concept. It is a fast ranged enemy: the pincers are part of its silhouette, while its eye fires the laser.

## Behaviour

- 56 health, 260 world pixels/second, 12 damage per laser. It is substantially smaller and more fragile than the humanoid Scrap Walker.
- Uses the existing obstruction-aware pursuit and bounded pathfinder. At medium range it strafes while recharging and retreats when approached closely, subject to solid collision and separation.
- Within 300 world pixels and clear sight, it plants its feet and charges for 0.65 seconds. It tracks the player for the first 0.4 seconds, then locks its aim for the final 0.25 seconds. A dashed orange aim line becomes solid red at the lock.
- The laser fires once, follows the locked angle, reaches at most 360 world pixels and stops at solid cover. Its visible origin is registered to the eye; simulation projects that eye ray into ground collision space at chest height. Stepping off the line, dodge invulnerability and cover prevent damage.
- Nonlethal hits interrupt a charge and play hit poses; fists deal normal damage. Lethal hits cancel the pending shot, play collapse/rest poses and drop scrap. A resolved laser never damages again through its visual fade.
- At most three Skitters charge/fire simultaneously. Walker punch admission and Bomber fuses remain independent; the existing twelve-robot total limit is shared. Spawning and clearing affect runtime entities only, preserving the authored map.

## Art and effects

Five generated source views provide eight headings through mirroring. Each atlas has twelve poses: idle/run 0–3, charge 4, fire/follow-through 5–6, recover 7, impact/settle 8–9, collapse/disabled 10–11. Published atlases use 384-pixel cells in a 4×3 sheet and are displayed at 145 world pixels with a common foot anchor. Source art and generation provenance live in `art-source/skitter-v1`; registered lenses and direction mappings live in the published `atlas.json`.

Normal live lenses glow red at night. Charging builds the eye's hot core and short inward sparks. The laser has a red halo, orange core, fine white centre and a brief endpoint spark burst. These effects run after darkness and weather, using shared simulation time. Rear views hide the eye. Disabled lenses are covered and emit no light. There is no baked terrain or circular shadow. Reduced motion removes travelling charge/impact sparks and keeps a quieter beam/glow.

Settings → Spawn → Robots includes Skitter in quantities 1/3/5. The editor tester, demand-loaded textures, scene cache protection, bow lock label/reticle height and native bundled art map include it. Browser sound honours the existing combat sound preference, with a rising eye-charge and short laser crack. The shared renderer/simulation is used by web and native; this publication updates the web game, without claiming native hardware frame-rate validation.

## Verification

`node scripts/check-skitter.mjs <output-directory>` exercises eight-heading laser timing, early tracking/final lock, one-contact damage, dodge/sidestep/cover, clipped ray visuals, interruption/no ghost shot, speed, close-range vulnerability, death/drop/clear, swarm/total caps, sixty alpha-safe distinct poses and day/night/reduced-motion Skia rendering. `check-play-spawns.mjs` covers all nine spawnable kinds. Existing Walker, Walker balance and Bomber suites protect their independent behaviour. TypeScript and the production build are checked before publication.
