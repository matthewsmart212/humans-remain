# A Light Left On — first playable companion quest

Implemented on top of `ef4fc17a0d6b3f500e6d05ae261822b88e1685a7`, including its visual fishing feedback and automatic catch collection.

## Playable journey

Start a new Survival run and open the existing chest above the campfire. After the lid finishes opening, **A folded note** appears beside the starter tools. Read it for P-04's invitation. The paper has no backpack weight and remains after every supply is collected.

Travel beyond Stillwater Lake, across the existing southern bridge to the west bank. The abandoned maintenance shed contains no new interior. P-04 is seated outside, signalling with three slow amber pulses. Inspect him, recover the unique drive servo from the nearby service locker, then hold **REPAIR** beside him for six seconds. The repair needs neither a workshop nor possession of the starter hammer. Moving, taking damage, releasing the action or cancelling input stops the hold and keeps the servo.

After the repair, interact again and choose **Come with us**. P-04 follows over physical ground, uses the survivor's walked route around obstacles and catches up when separated. Bring him back to the original chest: **Shelter occupied.** He becomes Patch, deposits two logs and two scrap into the chest once, and unlocks **Follow me**, **Stay here** and **Return to camp**. Approach him to use these commands. His normal following distance leaves the action button free for tools.

## Story continuity

The note was written before his final trip to the maintenance station. It describes his intention to find replacement parts; it does not predict his breakdown. His rescue chevrons, canvas satchel, damaged drive and visibly severed receiver wires carry the established character concept into the game. Repairing the leg does not repair the receiver.

The original Reclamation film, narration, soundtrack and opening flow remain unchanged. The optional memory film and its narrator production are a later part of the update. This release does not invent the original voice preset or replace that opening.

## Run and world ownership

- The latest game deliberately starts a new Survival run on each launch. This change preserves that behaviour. Quest facts last within the active run; the existing web/native save serializers also support them without re-enabling autosaves.
- Note reading, discovery and servo acquisition are independent facts. Finding the part or robot first works. The servo is a unique story item, so a full bag cannot block the quest.
- The parcel is delivered atomically once and remains inside the chest until it fits in the bag.
- Held repair input is transient and excluded from serialized runs. Malformed or contradictory quest milestones are rejected.
- Patch belongs to the outdoor camp world and waits outdoors during interior travel. He does not collide with or block the survivor. Retained owner-authored gates wait for his feet before closing.
- The two authored scenery additions preserve all 2,914 existing placements. The one-time migration honours later owner movement, transforms and removal. See `world-and-rendering.md` and `site-checks.json`.
- This is one companion per local run. Shared co-op quest/companion authority, combat protection, towing, workshop modules, expanded idle/walk animation and the memory film are not implemented in this milestone.

## Artwork and presentation

Five offline runtime WebPs total **457,582 bytes**: an eight-facing robot atlas, damaged pose, portrait, maintenance station and locker. Source cutouts and the exact built-in image-generation prompts are retained in `artwork-archive/patch-v1/`; `scripts/package-patch-art.py` performs only technical crop/registration, resizing and encoding while retaining source alpha.

Both renderers share the same depth sorting, motion sway, per-facing lamp registration, speech and repair feedback. Native partial progress uses explicit arc segments because the existing Skia Canvas adapter draws full ellipses. The eight facing poses currently use procedural movement sway, not a separate leg walk cycle.

The chest and companion menus use the established compact StationMenu components. The note is scrollable parchment, and there is no permanent quest instruction panel covering the play area. Native actions have a literal offline binding for Patch's portrait.

## Verification

Passed on the final working tree:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run build` | Pass; existing chunk-size and CanvasKit externalization notices |
| Native `npm run typecheck` | Pass |
| Native `npm run export:ios -- --max-workers 2` | Pass; real iOS Hermes bundle and offline art |
| `node scripts/check-patch-quest.mjs` | Pass; real controller and simulation integration, cancellation, ordering, claims, commands, gate occupancy and serializer compatibility |
| `node scripts/check-patch-site.mjs` | Pass; layout preservation, transforms, deletion, dry approaches and physical routes |
| `node scripts/check-fishing-controls.mjs` | Pass after merging the new fishing update |
| `node scripts/check-fishing-feedback.mjs` | Pass; 51 component cases |
| `node scripts/check-fishing-gameplay.mjs` | Pass; all species and automatic collection |
| `node scripts/check-fishing-save.mjs` | Pass |
| Existing four-script Stillwater site, behavior, water-life and lake suite | Pass; complete owner layout preservation, physical deck routes, fish and shaders |
| `node scripts/check-fishing-inventory.mjs` | Pass; fish, tools, food and atomic rewards |
| `node scripts/check-coop-room.mjs` | Pass; existing room protocol and interpolation |
| `node scripts/check-hunter-walk-frames.mjs` | Pass; existing walking, sprinting and carried-tool frames |
| `node scripts/check-native-compact-save.mjs` | Pass |
| Existing station menu layout suite | Pass; 108 cases |
| Patch UI component and safe-area checks | Pass; four phone sizes, see `ui-verification.json` |
| Production native renderer captures | 5/5 pass with zero missing textures, see `renderer-report.json` |
| `git diff --check` | Pass |

The `Typecheck web and iOS` workflow now runs both Patch regression scripts on pushes and pull requests. The existing offline fishing-cache check separately verifies that loading an older cache preserves every owner-authored item while adding exactly the two approved Patch scenery objects.

The route fixture walks the actual authored bridge journey in 2,364 movement ticks and asserts that Patch never teleports or enters blocked ground. This is a navigation regression check, not a claim about first-time quest duration.

The five images show staged quest poses through the actual production native renderer using CanvasKit. The gameplay transitions are tested separately. Physical iPhone touch, GPU performance and frame rate have not been tested here. Browser UI screenshots were blocked by the execution environment's socket policy; UI verification uses actual component rendering and shared layout bounds.

## Review images

- `discovery.webp` — maintenance station and damaged P-04.
- `discovery-night.webp` — night signal and visibility.
- `repair.webp` — partial six-second repair feedback.
- `following.webp` — repaired standing companion.
- `homecoming.webp` — original chest, supply arrival and broken-fire continuity.
