# Humanoid Scrap Walker

The approved yellow-armoured humanoid is now the Scrap Walker. The four-legged explosive robot remains the Scrap Bomber. Active Walker rendering loads `scrap-walker-v3` and does not fall back to the retired four-legged Walker artwork.

## Behaviour

- 160 health, 200 world pixels/second and 22 damage per punch. It closes distance quickly and resists unarmed pressure.
- Obstruction-aware pursuit, stable eight-direction facing, distance-driven footsteps and separation between nearby robots.
- At 82 world pixels it plants its feet for a 0.294-second punch wind-up (30% quicker). Its facing stays committed through the strike. Contact occurs 0.055 seconds into the 0.18-second strike, followed by 0.42 seconds of recovery.
- The warning sector uses the same 106-pixel reach and angle as the hit test. Moving behind the committed strike, leaving its reach, solid cover and dodge invulnerability prevent damage.
- Bare-handed hits deal 35% damage (11 for the normal punch), push it only two world pixels and cannot cancel its wind-up, strike or recovery. A weapon hit interrupts the wind-up and plays the registered impact poses. A punch resolves damage only once. At most two Walkers can wind up or strike simultaneously.
- Death plays the generated fall/rest poses without rotating or rescaling the sprite. Its lenses go dark and it drops the normal one or two scrap pieces. It does not self-destruct.

## Visuals and integration

Five painted source views supply all eight headings by mirroring. Walking, punch anticipation/contact/follow-through/recovery, impact and disabled states use their own atlas poses. The cell is displayed at a fixed 215-world-pixel size. Live red visor lenses share each frame's source registration, mirroring and recoil, and render after night lighting/weather. Rear views hide the eyes. The warning sector also stays readable after the night layer. Browser audio uses the existing combat-sound preference and bounded synthesized servo/metal impacts.

Punches build an orange knuckle glow and hot crescent during anticipation, then leave three short curved streaks between measured fist positions. Successful contact adds a white-hot flash, orange shock ripple and ten metal sparks at the painted fist; misses and dodges retain the swing trail but produce no hit burst. All effects follow the simulation clock and render after darkness. Interrupted attacks immediately lose their charge/trail. Reduced motion keeps a restrained local glow and impact ripple, without travelling streaks or sparks. No new textures, timers or effect entities are allocated for charging/trails; only the existing two committed attackers render them.

Settings → Spawn → Robots offers Scrap Walker alongside Scrap Bomber, with quantities 1/3/5. The existing twelve-robot total cap, clear-spawned action, health restoration and map/session isolation are shared. The editor combat tester also offers both robots. Native uses the same simulation and renderer, with the five atlases and thumbnail registered in `native/walker-art.ts`.

Artwork packing, generation provenance and measured lenses are documented in `scrap-walker-v3.md`. Source PNGs remain outside the published public directory. Runtime artwork is warmed before spawning and shared by every Walker instance.

## Verification

`node scripts/check-scrap-walker.mjs <output-directory>` checks all eight attack headings, planted wind-up, committed misses, dodge, solid cover, interruption, one-contact damage, defeat/drop/clear, mixed Walker/Bomber caps and unchanged map data. It checks sixty distinct alpha-safe poses and exercises the actual shared Skia world renderer for idle/walking/punch/impact states at day and night, including visor emission. `check-play-spawns.mjs` covers all eight catalog kinds. `check-scrap-bomber.mjs` protects the bomber's independent appearance, lights, warning and self-destruct behaviour. TypeScript and the production build are also checked.

Software rendering checks do not measure iPhone hardware frame rate. Native source and asset registration are included; this update publishes the existing web game.

Balance regression: `node scripts/check-walker-balance.mjs` verifies fist damage/knockback resistance, committed punches through bare-handed hits, effective weapon interruption, one-on-one unarmed trading, and pursuit speed.
