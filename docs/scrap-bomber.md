# Scrap Bomber artwork and animation

The original four-legged Scrap Walker is now the Scrap Bomber. Its round teal faceplate, amber eye lamps, orange shell, dark teal hoses and short claw legs remain its identity. A hazard band and warning beacon identify its self-destruct role. The new humanoid concept retains the Scrap Walker name and is a separate enemy.

## Production assets

`public/survival/scrap-bomber-v1/atlas.json` is the authority for all artwork dimensions, source registration, animation frames and eight heading assignments. Measured light registration in `src/bomber-sprites.ts` supersedes the atlas’s automatic beacon colour detection.

- Five 1536 × 1152 transparent WebP atlases, 384 × 384 cells, anchor `(192,310)`.
- All eight headings use down, down-left, right, up-right and up source views; mirrored diagonals and side supply the remaining headings.
- Frames 0–3: alternating four-legged walk. Idle uses frame 0 and locomotion advances by distance, not elapsed wall time.
- Frames 4–7: plant feet, brace, arm and final self-destruct charge.
- Frames 8–9: impact recoil and settling. The northeast second hurt source faces the wrong way, so northeast/northwest runtime hurt uses frame 8 throughout.
- Frames 10–11: disabled collapse and toppled shell, with eye lamps dark.
- `explosion.webp`: eight chronological ignition, fire, fragment and dissipating smoke frames. 512 × 512 cells in four columns, anchor `(256,430)`, 1.05-second runtime sequence.
- `thumbnail.webp`: standalone first southwest pose for the enemy picker.
- Combined runtime WebP size: approximately 2.17 MB. Generated PNG sources are kept outside the runtime directory in `art-source/scrap-bomber-v1`.

The southwest beacon now uses an attachment sampled from the existing painted front-view dome in poses that omitted it. Other views retain the unlit dome during walking. Beacon glow and blast warning are runtime effects, never baked into terrain. `bomberBeacon` returns unmirrored source-cell coordinates; the renderer applies the same horizontal mirror as `bomberView`.

## Generation and mechanical packing

Created with the built-in image-generation tool on 26 October 2026. Identity references were the original `scrap-walker-v2/down-left.webp` and the approved Scrap Bomber concept. After the first southwest sheet, that approved animation atlas became an additional style reference for the remaining headings. Every generation requested actual alpha transparency.

Reproduce the runtime atlas packaging with:

```sh
python3 scripts/prepare-scrap-bomber.py
```

The script requires Pillow, NumPy and SciPy. It only extracts and packs existing pixels. It does not repaint artwork, stretch individual body parts or fit individual poses to a new size. All robot frames use one scale, `0.86`. Walking columns receive translation-only registration against the stable orange upper shell; each column's same correction applies to the other rows. Charge and disabled poses receive an additional Y translation to put their lowest foot/shell contact at the average walking baseline. This removes generated row drift while preserving their painted compressed shapes and fixed scale. Alpha-connected core extraction retains the original antialiasing within four pixels while excluding isolated generated noise. Every robot has at least eight pixels of transparent gutters after encoding.

Explosion components and detached shards are grouped by their nearest main opaque core, preserving source-size progression with one `0.85` scale. Baselines and centers receive translation only. Ignition stays small, the peak expands, and late smoke fades to a small wisp; frames are never individually enlarged to fill their cells.

## Prompt set

Shared robot prompt: create the same squat four-legged salvage robot with a rounded worn teal faceplate, two circular amber eye lamps, chipped orange shell, tangled dark teal hoses, rear canister with worn yellow/black hazard band, small red warning beacon and four short orange-armored claw legs. Preserve the original richly painted dark-outline game-art finish, body volume, scale, fixed elevated overhead camera and ground-contact baseline. Output exactly four columns by three rows of complete centered robots with generous transparent margins, no grid, labels, ground, shadows, effects or other characters. First row is four alternating diagonal-pair walking contacts/passing poses; second row is braking, planting feet, crouching and final bracing for self-destruct; third row is recoil, settling, disabled folded legs and toppled shell. No body swelling, image-plane rotation or new appendages.

Heading instructions used one view per image:

- Southwest: face toward bottom-left as in the original identity atlas, both amber lamps visible.
- South: face straight toward bottom edge, symmetric front, both lamps equal apparent size, tank behind at top.
- East: front at right, rear tank at left, one near lamp visible, far lamp occluded, movement follows screen-right.
- Northeast: front points away toward top-right; rear shell, tank and hoses dominate; face and lamps hidden on far side.
- North: symmetric back view toward top edge, rear canister and hoses dominate, no face or lamp visible through the shell.

Subsequent views also received the approved southwest animation sheet with instructions to match its identity and row arrangement while obeying the new heading. They were instructed to retain an unlit physical dome during walking, and to keep the camera fixed rather than rotating the image plane.

Explosion prompt: exactly four columns by two rows of transparent overhead painted VFX with a fixed ground anchor. Eight chronological frames: small orange ignition, yellow flash, peak round orange fiery burst with teal/orange scrap, spreading darkening burst, receding flames and growing charcoal smoke, dissipating smoke/embers, thin wisps and two embers, almost vanished smoke. Preserve small-to-large-to-small progression. No robot body, terrain, warning rings, labels, borders, clipped fragments or photographic rendering.

## Visual verification

Verified the five views at walk, charge and disabled stages; checked all 60 robot cells for transparent gutters and complete alpha silhouettes. Eight-heading GIF and explosion GIF were exported for internal animation review. Generated southeast/southwest and northeast/northwest mirror assignments preserve the view heading. The known incorrect northeast second hurt pose is excluded by the runtime frame selector.

## Gameplay integration

Play's pause menu exposes Combat testing → Spawn Scrap Bomber, which loads the art and resumes play. Clear enemies and Restore health are in the same section. The legacy enemy tester also defaults to Scrap Bomber. The humanoid Scrap Walker concept is reserved for its separate art/animation pass; the historical melee kind remains internal for regression fixtures and is not offered in the picker. Bombers use shared obstruction-aware pursuit and direction hysteresis. At 82 world pixels they plant their feet, commit to a 1.9-second fuse and draw the exact 142-pixel blast radius. At most two bombers arm together. The warning ring fills, the beacon pulses and browser warning beeps accelerate. The blast has distance falloff (44 maximum damage), respects solid cover and dodge invulnerability, and resolves once. Retreating does not move or cancel an armed bomb. Nonlethal hits do not reset its fuse or move its blast circle; a lethal hit disables it and awards the normal scrap drop. Self-detonation grants no kill or scrap reward. Clearing enemies removes pending fuses/effects. All changes are runtime only and never write the authored map.

The web combat tester loads only the selected enemy's atlas pack before spawning, avoiding unnecessary legacy walker textures. The native pause menu includes Spawn Scrap Bomber, Clear enemies and Restore health; native image requires include all six atlases. Both platforms use the same simulation and Skia-compatible drawing. Browser audio uses the existing combat sound preference. iPhone hardware performance and native audio were not device-tested in this pass.

Validation: `npm run typecheck`, production build, `node scripts/check-scrap-bomber.mjs`, `node scripts/check-axe-combo.mjs`, and `node scripts/check-bow-lock.mjs`. The bomber suite checks all eight headings, exact fuse timing, stationary warning centre, one-shot damage, safe retreat, solid cover, dodge, nonlethal fuse commitment, lethal disarm/loot, simultaneous-fuse cap, clear/reset, alpha gutters, and actual Skia rendering of direction/charge/blast frames.

## Settings spawn menu

The normal Play pause/settings menu has a Spawn button immediately beside Performance recording. Its catalog contains only implemented creatures: Chicken, Rabbit, Deer (doe), Stag, Wild Boar, Wolf and Scrap Bomber. All/Animals/Robots filters and quantities 1/3/5 keep the picker compact. Selecting Spawn loads the appropriate artwork, places creatures on reachable clear ground within the visible viewport and resumes gameplay. Clear spawned removes test animals and runtime enemies while preserving natural wildlife and habitat slots. Test animals are capped at 30; robots keep the existing 12-enemy cap. Native settings mirror the same catalog and simulation helpers. Six UI thumbnails are direct crops of existing game atlas idle poses.

`node scripts/check-play-spawns.mjs` verifies every catalog kind, per-species behaviour state, clear/visible placement, unique IDs, count caps, unchanged authored map, no habitat respawn for test animals, and preservation of natural wildlife. The actual React settings menu was checked in a local browser harness: Spawn is adjacent to Performance, seven kinds appear, quantity selection updates the action, and spawning three rabbits reports success. The data-backed local camp entry requires production APIs; the published camp itself was verified separately.

## Red warning revision

Removed the live robot's artificial ground-shadow oval and the oval scorch decal. During the committed fuse, front/side lens overlays turn the existing eyes red with a warm bright centre; rear views correctly hide them. Lens centres follow each of the four source warning poses and the same mirror/anchor transform as the sprite. The warning is now a glowing red ring that grows and shrinks between 84% and 100% of blast radius, accelerating with the existing fuse pulse clock. A faint fixed red perimeter still marks the real damage reach. Reduced-motion mode keeps the ring steady. Body scale, fuse timing, actual radius, damage and all spawn controls are unchanged.

The warning perimeter uses a closed equal-axis oval instead of a full-sweep arc, with no partial countdown edge. Its dedicated overlay pass follows depth-sorted scenery so later ground decorations cannot cut the ring into fragments. The red outline remains circular throughout its breathing pulse.

## Centred neon warning

The breathing ring is centred on the union of the four planted robot silhouettes for each heading, mirrored with the sprite. Its fixed registration raises the circle from the foot anchor to the visible body centre without animation jitter. A smooth red-orange annular gradient surrounds an orange line with a thin warm yellow core; its centre stays transparent and the secondary faint outer circle is removed. The complete-ring overlay and accelerating pulse remain. The visual registration changes no simulation position, collision, damage radius or fuse timing. The Skia suite compares the ring centre with actual atlas alpha bounds in all eight headings and samples the orange circumference at three zooms and five fuse ages.

## Outward charge and inward collapse

The warning no longer breathes: its radius grows once from zero to 142 world pixels across the first 1.72 seconds, then accelerates inward during the final 180 milliseconds of the existing fuse. Detonation still occurs at 1.9 seconds. A wider feathered crimson gradient spreads inside the orange neon edge and softly beyond it. Reduced-motion mode retains a steady full-size ring. Warning-body registration, damage, spawn controls and eye/beacon effects are preserved. Regression checks verify monotonic growth, full endpoint, monotonic collapse to zero, reduced motion and complete circles across zoom levels.

## Night emission and local light

Warning eyes, beacon and orange-red ring now render after the night overlay and atmospheric washes, keeping their bright cores visible at day, dusk and midnight. The beacon has a small bright core as well as its soft halo. Armed bombers cast a restrained red light with a 110-world-pixel soft falloff, revealing the nearby world artwork. At most two warning sources enter the existing night shader as uniforms; their movement never rebuilds the cached camp-fire lightmap. Death, clearing or detonation removes the source immediately. All eight headings are checked through the actual world renderer at day/dusk/night, and shader pixel checks cover red spill, local falloff, source removal and cache reuse.

## Walking lights and consistent beacon

Alive idle/walking/impact poses now emit normal amber eye light after the night overlay; the fuse changes those same lenses to red. Rear views keep their eyes hidden. Every live pose retains the red back beacon. Measured per-frame glass centres replace the automatic detector, which had often selected orange-shell rust. Southwest/southeast poses 0–4 and 8–9 reuse a clipped copy of the existing front-view painted dome as an attached sprite component, with the same scale, mirroring and recoil as the robot. The atlas bitmaps remain unchanged. Checks cover all 32 directional walking poses in day/night, amber eye colour, bright beacon emission, and the physical painted dome without its glow overlay.
