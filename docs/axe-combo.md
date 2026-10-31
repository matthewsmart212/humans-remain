# Scrap Runner: moving axe combat

The camp axe stays a physical survival tool. A quick cut links into a heavier return cut, with a brief steel-coloured blade trail and stronger metal/earth impact feedback. No projectile, magic power, extra combat button or new progression system is introduced.

## Controls and timing

- Tap Swing / Space once for a single cut.
- Tap again during the first cut, or hold Swing / Space, for the two-hit combination. Holding repeats pairs, with a recovery pause after the return cut. Two small marks on Swing show the active/queued cut.
- Keep the joystick or movement keys held to walk while attacking. Movement slows through contact; full movement and the existing sprint return when the attack ends. The facing of each cut is committed independently, so changing direction does not turn an already-active hit.
- Dodge / Q can cancel recovery after contact, clearing the queued follow-up. It cannot cancel the wind-up. World blockers still stop all movement; normal combat walking also respects enemy bodies, while Dodge can escape between them.
- Walk preview demonstrates the combo without damaging the draft. Play uses its existing runtime copy. No layout, asset placement or saved world data is changed.

| Cut | Damage | Contact | Duration | Reach | Half arc | Stamina outside test mode |
|---|---:|---:|---:|---:|---:|---:|
| First cut | 40 | 0.265 s | 0.58 s | 136 | 61.2° | 20 |
| Return cut | 48 | 0.29 s | 0.64 s | 144 | 72° | 24 |

The return can be requested 0.10–0.53 seconds into the first cut (holding queues it after 0.24 seconds, so a short press stays a single cut) and starts at 0.43 seconds or on the next simulation tick after a later accepted input. A cut applies damage once to up to three unobstructed targets. The existing short tap buffer handles late taps. Closing modal tools, losing focus, switching scene, being downed or dodging clears pending continuation. Test mode retains its existing unlimited stamina.

## Artwork and implementation

Five transparent atlases provide 40 new upper-body poses and eight directional views through the existing mirror convention. Each contains first-cut anticipation/contact/follow-through/recovery plus four return-cut poses. The axe is painted into these poses to keep its grip coherent. The approved moving/standing legs remain underneath, driven by actual movement distance. Normal walk/run artwork and its pose sequence are unchanged.

See [art files and complete built-in image-generation prompts](runner-axe-combo-art.md). Runtime atlas metadata lives in `public/survival/scrap-runner/axe-combo-v1/atlas.json`. `RUNNER_AXE_REGISTRATION` calibrates each drawing to the approved walking art's 78-unit hair width and −112 hair-top anchor. The first release used one scale for all attack cells, leaving measured head widths of 64–72 units; the resulting shrink on attack is now corrected. Vertical scale, waist registration and leg rendering stay unchanged, avoiding a longer coat covering the boots. These fixed per-pose transforms are calculated once, not animated as a size tween. Blade trails use the same calibrated coordinates. No new images or per-frame image analysis is needed. A shared simulation profile drives contact, frame selection and sound timing.

The short blade ribbon follows measured axe-head points from the actual artwork. Impact sparks stay in the existing bounded/expiring effect queue. Reduced-motion settings suppress the moving ribbon and retain readable impact feedback. Five shared textures are loaded with player artwork and warmed one per render frame; there is no directional image download during a fight. UI combo marks update only their small button at 80 ms intervals.

## Verification

`scripts/check-axe-combo.mjs` covers all eight directions, moving strikes, contact timing, two-hit chaining, committed aim, enemy/world collision, held and tapped input, safe preview, stamina, cancellation and unchanged ordinary gait. `scripts/render-runner-combat.mjs` validates alpha gutters and distinct poses and renders the actual CanvasKit character/legs/trails in all directions, both stationary and walking.

The existing axe, enemy combat, workspace transition, monitor, draft-safety and mobile-markup checks are also run for the release. Browser-control infrastructure is unavailable in this environment, so direct iPhone Safari interaction, audio and frame rate remain unverified; software CanvasKit output is visual QA, not device-performance evidence.
