# First expedition: survival progression

The first Survival milestone connects the existing gathering, crafting, weather and combat systems into one saved run. Web Play starts or continues Survival. The native app automatically opens into the saved expedition or a fresh Survival run. Only the browser pause menu offers the separate testing sandbox with stocked equipment and spawn tools.

## Player path

1. Start with a wooden axe, wooden spear, two tins of beans and four berry portions. Camp storage starts empty.
2. Visit the headquarters planning bench. Its blueprint overview shows Shelter, Metalworking and Reinforced camp, plus the current objective, costs and camp condition.
3. Track the salvage cache outside camp and recover replacement furnace bellows. This quest part is stored in progression, so dropping inventory cannot lose it.
4. Chop logs, craft a wooden pickaxe at the smithy, mine ordinary stone and collect loose scrap. Restore the furnace with the bellows, 4 logs, 3 stone and 4 scrap. No metal ingot is required to unlock smelting.
5. Fuel the furnace and smelt ore or scrap. Craft a metal weapon at the smithy. Existing metal equipment and bow/arrow recipes remain locked until restoration.
6. Defend headquarters through three nights. Repair between raids, or pay for stronger camp defences once a metal weapon has been crafted.

Daylight lasts 120 seconds and night lasts 60 seconds, using the existing dusk, dawn, sky clock and weather system. The first three raids contain 3, 4 and 5 robots. Walkers attack headquarters when the player is distant and engage the player nearby; Hounds and Bombers add pressure in the later raids. Initial raid robots have less health than sandbox robots. Spawns use reachable ground and obey the shared enemy cap. Dawn clears remaining raid enemies. Day four marks the first milestone complete once metalworking equipment has been earned. Subsequent nights repeat the third wave; a broader campaign is not implemented yet.

Camp defence is a shared reserve protecting headquarters. It is not individual destructible wall geometry. Headquarters reaching zero health ends the run. Outdoor Walkers continue their siege while the player is in the bunker.

## Saves and editor behavior

- One Survival save per browser/device: web localStorage and native AsyncStorage, under `safety-last-expedition-v1`.
- Autosave every 15 seconds, and on pause, exit/background and defeat. A native write queue prevents older saves overwriting a new run.
- Inventory, equipment, unlocks, time, active raid, camp health, furnace batches, kitchen state, gathered resources, enemies, dropped items and visited scene/return route are retained. Attack inputs and renderer caches are reset on load.
- Time does not advance while the app is closed. Continue loads the same run snapshot; New Survival run explicitly replaces it after confirmation.
- Unreadable or unsupported saves are kept and autosaving is blocked until the player explicitly starts a new run. Storage errors are shown rather than claiming success.
- A run owns a copy of its starting world. Restoring a furnace, mining, chopping and the salvage cache never modify the authored editor draft. Starting a new run picks up the latest loaded authored layout.
- Sandbox changes never overwrite a Survival save. Saves do not sync between the web browser and iPhone.

## Validation

Passed: root and native TypeScript checks; production web build; Expo iOS export; `check-first-expedition.mjs`, `check-scene-travel.mjs`, `check-ironworks.mjs`, `check-survival-cycle.mjs`, `check-walker-balance.mjs` and `check-play-spawns.mjs`.

The expedition integration check exercises the actual authored map, accessible objectives, primitive crafting, atomic repair, real mined/felled nodes, mid-smelt and mid-raid saves, three complete day/night cycles, camp defeat, bunker persistence and attacks, corrupt saves and ordered asynchronous writes.

Browser checks use the development-only expedition fixture with real production components/rendering and bundled authored artwork. Verified HQ blueprint selection, quest recovery, disabled repair requirements, successful restoration into the normal furnace panel, and phone landscape/portrait layout. The full local editor preview cannot access its hosted D1/R2 artwork API. Test fixtures are not production routes. No physical iPhone performance/play test, IPA signing or TestFlight publication was performed.

The older `check-studio-combat.mjs` fails on its pre-existing `80` HP Walker expectation: both the original source commit and this change use the current `160` HP sandbox Walker. Current Walker balance and spawn checks pass. That unrelated legacy test is unchanged.

## Next priorities

1. Play-balance the opening three nights on a physical phone: time to find materials, combat readability, repair costs, difficulty and save/resume behavior under app suspension.
2. Give the salvage destination a dedicated location kit and a clear exploration reward; build one complete excursion before expanding the entire map.
3. Add recipes with distinct uses: healing item, travel food, defensive consumable and a tool that opens a resource route. Connect each to a tier and material source.
4. Expand headquarters progression into another building repair/unlock, then add longer raid escalation and rewards. Keep prerequisite paths free of circular locks.
5. Add broader campaign persistence, migration/version support and optional cross-device saving before tackling co-op.
