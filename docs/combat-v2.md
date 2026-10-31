# Scrap Walker combat — October 12, 2026

## Play

Open Play → Combat and spawn 1, 3 or 5 Scrap Walkers. The touch dock closes after a successful spawn so it leaves the game visible. At most 12 walkers may exist at once. Spawned enemies and combat progress remain session-only; Stop restores the draft.

- Move with the joystick or WASD / arrows. Sprint is unchanged.
- Tap Swing / Space for a moving 40-damage cut; tap again during it or hold to link a wider 48-damage return cut. An 80-health walker takes two hits. See [moving axe combat](axe-combo.md) for the current player poses, timing and controls. A 140ms tap buffer catches late-recovery taps.
- Tap Dodge / press Q while moving to choose a dodge direction; stationary dodges use the facing direction. Dodge lasts 0.24s, avoids damage during its first 0.18s and recharges in 1.65s. It respects every authored blocker and cannot cancel an axe swing before contact.
- A filling amber ground arc shows the walker's committed strike. Move outside its reach or direction, interrupt its wind-up with the axe, or retaliate during recovery. At most two walkers commit attacks at once.
- Combat → Combat guide & stats shows landed hits, damage, interrupts and dodges, plus an optional sound switch, Restore health and Clear enemies.

## Artwork and rendering

40 new hand-painted-style keyposes were created with the built-in image-generation tool. Five atlases provide eight facings using explicit mirrored counterparts; each direction has four walking poses and four attack poses. Original robot identity, teal/orange salvage materials and complete feet are preserved. Fixed-size cells, common scale, translation-only torso registration and one ground anchor avoid cropping and body-size pulsation.

The [art provenance document](scrap-walker-art-v2.md) contains the complete final prompt set, source files, asset paths and packing details. Runtime assets live in `public/survival/scrap-walker-v2/`; `atlas.json` is the renderer's source of truth. The original robot image remains a fallback and library thumbnail.

Walking phase advances by actual distance, so blocked walkers do not tread in place. Attacks use the simulation's committed clock. Hit reactions, health trails, sparks, floating damage, interrupts, dodge trails and depth-sorted collapses provide feedback. Light camera impact and optional synthesized sounds add weight. Reduced-motion mode suppresses camera shake, sprite recoil/collapse rotation and player damage blinking, and reduces particles.

All atlases are loaded and GPU-warmed before spawning, one texture per render frame. They are not part of editor startup. The five shared atlases download in 1.39 MB and decode to 22.5 MiB regardless of enemy count. Particles expire within the existing 1.2-second effect window; draw processing caps effect feedback at 48 entries. Pathfinding remains budgeted to one bounded search per tick. Audio uses one gesture-unlocked context, one noise buffer and at most eight concurrent voices; it is optional and creates no downloads.

## Verification

Passing checks:

- `npm run typecheck`
- `node scripts/check-combat-v2.mjs` — every facing's wind-up, single contact and recovery; attacks miss behind their locked direction; interrupts prevent ghost hits; dodge timing/cooldown/wall collision; attack tap buffer; 12-enemy stress and two-attacker limit; 40 distinct, alpha-safe sprite cells; real CanvasKit rendering and no-browser audio safety.
- `node scripts/check-studio-combat.mjs` — visible spawn bounds, cap, pursuit, authored collision, axe hits, healing, clearing, session resets and stale asynchronous cancellation.
- `node scripts/check-axe.mjs` — existing player gait, eight-direction axe contact, cooldown and survival behavior retained.
- `node scripts/check-studio.mjs`, `check-studio-transitions.mjs`, `check-studio-monitor.mjs`, `check-studio-render.mjs` — saved draft unchanged, Build/Play/Library transitions, core camp interactions and desktop/mobile markup.
- `git diff --check`

The simulation stress run measured about 0.02ms/tick in this environment. Software CanvasKit measured approximately 29ms/frame for the eight-robot animation grid; this is not iPhone/WebGL FPS. Asset contact sheets and software-rendered animations were inspected. A browser-control surface was unavailable, so live Safari visual/audio behavior and on-device frame rates have not been verified. The existing live FPS monitor is the appropriate way to measure the deployed scene on the target phone.
