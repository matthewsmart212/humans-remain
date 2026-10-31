# Bonfire foliage trial

The approved trial adds 12 small walk-through plants to the bare ground left/southwest of the saved bonfire. It uses only three new library assets: Woodland leaf clump, Woodland fern and Camp grass tuft. No existing terrain, object positions, paths, collisions, player animation or combat art is changed. The food-drop corridor south of the fire stays clear.

## Runtime

- Plants are ordinary editable placements, layer 0, non-blocking. They can be moved, scaled, mirrored, duplicated and removed through the existing inspector.
- `foliage-motion.ts` spatially indexes only plant footprints per layout. Nearby players/enemies push them away; sprint uses a stronger target. Only contacted/recovering plants carry spring state. Settled plants sleep after recovery.
- `foliage-renderer.ts` bends a 35-vertex / 48-triangle textured mesh. Source roots and lower contact pixels remain fixed. Every copy shares its asset image; no sprite frame atlases, offscreen canvases, image readback or per-frame decoding are added.
- Foliage is culled outside the viewport, sorted against the character at ground level, and drawn before existing night/weather passes. Reduced Motion disables both breeze and contact bending. Pausing stops spring simulation.
- Runtime spring state is not serialized into the draft. Restart starts a clean session; each connected map owns its own state.

## One-time placement and persistence

The trial installer is scoped to this existing camp's bonfire ID and known terrain. It checks that the fire has not moved significantly and that the trial space has no new blockers. Existing placements are retained byte-for-byte. A validated/exported `foliageTrialVersion` marker prevents duplicate additions and prevents deleted plants from reappearing.

On the next editor load, the installer runs against whichever local/cloud draft the normal editor loading rules choose. The normal owner-authorized Save API syncs it if the session has edit permission; otherwise the editor retains it locally and uses the existing Save workflow. The agent's read-only Site request returned `canEdit: false`, so no direct remote draft write was attempted and no access controls were changed.

## Verification

`node scripts/check-foliage.mjs`: actual saved 25-object camp, all existing transforms retained, 12 non-blocking additions, library registration, three shared textures (233,808 bytes), root invariants, sprint strength, recovery, reduced motion, culling, front/behind ordering, save/import marker, deletion persistence, and a 600-plant local-query stress check. Container timing is not an iPhone FPS claim.

`node scripts/render-foliage.mjs`: actual CanvasKit renderer with the current uploaded camp artwork. Produces day/night views, front/behind boot views and a walk/sprint clip in `docs/qa/foliage-v1`. This is software rendering, not a browser screenshot. Browser and real iPhone QA were unavailable in this environment.

`node scripts/check-foliage-server.mjs` (after build): real Worker + SQLite save/load of all three IDs and the marker, deletion persistence, owner/origin protections, stale-save rejection, artwork upload/replacement and published library entries.

Regression suites passed: studio simulation, studio markup (including iPhone orientations), Build/Play transitions, world-editor persistence/collision, lighting/weather and combat. Original eye/cheek silhouette checks preserve the approved character face during attacks. The older `check-art-imports.mjs` stops at its retired `base_shelter_t4` upload fixture, which is no longer in the curated catalogue; the current asset API is checked by the foliage-specific Worker test instead. Retired assets were not reintroduced to satisfy that stale fixture.

Art originals, exact built-in image-generation prompts and transparent sprite packaging are documented in `docs/foliage-art.md`.
