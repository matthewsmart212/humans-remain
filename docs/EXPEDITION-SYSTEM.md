# Expedition survival system

The loop is now: prepare at camp, carry an appropriate load, hunt in known territories, bring food home, refuel the fire, cook and restock. Web and native share the simulation, item rules and station view model.

## Carrying and quick access

- One 24 kg capacity covers materials, raw food, prepared meals, the axe and canteen. Items of the same type stack automatically; quantities have no separate arbitrary stack cap.
- Up to 18 kg is comfortable. From 18–24 kg, walking/sprinting speed decreases gradually by up to 12%, and sprint stamina cost increases by up to 30%.
- Pickups take only what fits. Excess stays on the ground. Drop one or the whole stack; splitting and recollecting cannot change weight or award more scrap score.
- Quick slots 1–6 are fists, axe, chicken, rabbit, wild meat and canteen. They reference backpack contents and do not create extra storage.
- The axe weighs 2 kg. The canteen weighs 0.25 kg empty, plus 0.25 kg per drink. Both stay with the survivor.
- The canteen holds three drinks, each restoring 35 water, with two seconds between drinks. The well restores thirst and refills as much water as the pack can carry.
- New runs start with three raw chicken portions, two logs, the axe and a full canteen: 7.45 kg.
- Camp chests share storage for materials and both raw/cooked food. Store/take one, store all or take the maximum that fits. Station access is checked again for every transfer.

| Item | Raw weight | Cooked weight | Cook time | Food restored | Health restored |
|---|---:|---:|---:|---:|---:|
| Chicken | 0.65 kg | 0.45 kg | 12 s | 35 | 8 |
| Rabbit | 0.45 kg | 0.30 kg | 8 s | 25 | 6 |
| Wild meat | 0.90 kg | 0.65 kg | 18 s | 50 | 12 |

Meals have a shared eight-second cooldown. Eating cannot interrupt an attack, dodge or active injury reaction, and full food/health does not waste a meal. Logs weigh 1.25 kg, scrap 0.20 kg and fuel units 0.08 kg.

## Fire and cooking

The fire starts with three minutes of fuel and holds eight minutes maximum. One log adds 90 seconds, using carried wood before camp stores. A log relights an extinguished fire. Adding wood with insufficient room is rejected without consuming it.

Cooking uses a FIFO queue of four items and a rack of six completed meals. Queuing reserves one raw portion. Cold fires retain progress; a full rack pauses cooking while the fire continues consuming fuel. Cancelling returns the raw portion only if it fits. Collection takes the meals that fit and leaves the rest safely on the rack.

Fire time follows simulation time, including a catch-up on returning from an interior. Pausing the game or opening the paused backpack does not burn fuel. Cooking/storage screens keep the simulation running, lock movement/attacks, and close if danger reaches the survivor or station access is lost. The fire's light and flame use the existing fuel-driven rendering.

## Wildlife

64 animals occupy 31 stable habitats across the outdoor footprint. Positions are validated against terrain, water and authored collision independently of texture streaming. Predators begin outside the camp's safe starting area.

| Species | Population | Social structure | Earliest return after hunting |
|---|---:|---|---:|
| Chicken | 20 | Five flocks of four | 10 min |
| Rabbit | 18 | Four warrens of three, six solitary | 12 min |
| Deer | 12 | Three herds of two does and one stag, three solitary stags | 20 min |
| Boar | 7 | Two pairs, three solitary | 25 min |
| Wolf | 7 | Two pairs, three solitary | 30 min |

Prey share short local alarms. Nearby predator companions share actual sightings, not recursively renewed memories. Wolves alternate their tells and attacks while the companion circles. The existing wolf bite/lunge, boar gore/charge, collision navigation and directional boar scale corrections remain intact.

Each habitat slot has a population cap. A replacement requires the delay to expire, the player to be more than 1,700 world units away and the original harvest to have been collected. No animal appears beside the player, and uncollected kills cannot accumulate replacement food. Distant wildlife sleeps; group checks run at 4 Hz and predator navigation retains its shared search budget.

## Verification

`scripts/check-expedition-system.mjs` exercises weight conservation, partial pickup, burden, cooking/fuel/rack failures, cancellation, canteen limits, meal cooldowns, chest access, danger closure, scene travel, all 64 spawn positions, offscreen respawns, flock alarms and alternating wolf attacks.

Existing backpack, quickbar, HUD, survival-needs, chicken/rabbit/deer/predator and individual wolf/boar checks were updated or rerun. Web/native TypeScript checks and the offline iOS export pass. Production Skia rendering was exercised through CanvasKit for portrait/landscape views, streamed habitats and predator attack poses. UI layout proofs use the existing software component-tree adapter; they are not browser or physical-device screenshots. No physical iPhone or browser session was available in this environment.
