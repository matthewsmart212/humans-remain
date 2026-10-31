# Repair hammer and headquarters stairs

Headquarters remains the Day 1 repair that establishes Camp Level 1. Its plans
now show costs and mark existing ruined buildings on the map. These plans do
not repair those buildings remotely.

At a broken building, the action offers to equip the starter repair hammer.
Hold REPAIR for six seconds to restore a ruin, or four seconds to repair raid damage.
Headquarters' first repair and later upkeep also close the menu and use this
visible hammer action. A circular percentage indicator, repeated hammer swings,
sparks, and a HUD progress bar show the simulation-time work. Releasing drains
progress at the same rate; holding again resumes from the remaining amount.
The hammer animation stops on release. Touch, mouse, Space and E support holds,
including Space/Enter on a focused action button. Pause pauses simulation.
Moving, switching tools, taking a hit, dodging, travel, opening a station or
losing access cancels the job without spending resources. Resources are charged
only on successful completion and use
the cost shown when the job starts. Loading a save cancels unfinished work.
The furnace still requires Camp Level 2. Web and native simulation loops save
successful completion immediately, including repairs started with keyboard.

Night-raid Walkers, Hounds and Bombers target reachable restored camp buildings
when a nearby survivor does not draw their attention. HQ attackers enter the
doorway and approach the planning table; their feet stop at a collision-safe
socket while fists and impact sparks land at table height. The HQ roof fades
while raiders are inside, and the HQ health marker sits above the table.
Bombers use the same table approach for blast damage. Melee attacks retain
wind-up and recovery; bombers use their visible fuse and one explosion, with
blast damage to nearby structures. Every hit checks distance and line of sight.
Robots retarget when a building breaks, and camp attacks continue while the
survivor is underground. Headquarters retains its shield and existing defeat
rule. Other structures have persistent health, visible health bars and impact
sparks. At zero health they show the existing ruin art and their facility is
unavailable. Repair restores the structure and service without removing camp
levels, blueprints, stored inventory or queued furnace/cooking work. Broken
furnaces do not accumulate elapsed smelting progress. Repair cost for non-HQ
damage is proportional to missing health, rounded up per material; a fully
broken structure uses its original restoration cost. HQ upkeep uses two logs
and one stone and restores HQ health and perimeter defence.

New runs start with one wooden axe, one wooden pickaxe and one repair hammer.
Existing expeditions receive a missing pickaxe once when loaded, preserving
existing weapons and respecting any wooden/metal pickaxe in the bag or chest.
The hammer migration is also one-time. Persisted starter-kit markers
prevent repeated grants. The hammer is available in the quick selector, backpack and native asset mappings, with held
art and a repair pose. The tool cannot be dropped or used as a weapon.

The broken HQ roof image contains stair pixels. The roof pass now clips below
the building's front wall, and the entrance approach participates in roof
fading. Stairs remain in the floor pass beneath the survivor. This applies
after repair and with rotated or mirrored placements; collision geometry and
the entrance route are preserved.

The new hammer was generated with built-in image generation using the existing
wooden axe as a style reference. Its original, runtime asset and full prompt
are retained under art-source/tools and public/survival/equipment.

Validation: TypeScript; hold/release decay, resume, idle, cancellation and atomic
payment tests; Day 1 mining before any HQ/workshop repair;
Walker/Hound/Bomber structure damage and aggro tests, including actual routes
from the old outdoor HQ target to the planning table and table-height impacts; blocked strike rejection;
damage and destroyed-building save round trips; starter migration/stair tests;
camp-restoration, headquarters and first-expedition regression checks; native
entry bundling with resolved static assets. Browser QA uses the actual Skia
renderer at 844 x 390, checking visible stair approach, HQ Level 1, Find Workshop,
equip hammer, on-site workshop repair and immediate save (15 logs -> 11 -> 8).
The updated browser exercise also verifies the repair wheel at 33%, timed HQ
and workshop completion, and a robot reducing workshop health. A broken workshop
showed ruin art, the 50% repair wheel, restored crafting and the saved final
health/cost (180 HP; logs 8 -> 5). Native module
and static-asset bundling passed; no physical iPhone/Expo build was available.

Three older harnesses also fail on the unchanged pre-task commit eab372c:
check-backpack assumes an obsolete three-raw-chicken starter inventory;
check-quickbar lacks React Native animation/accessibility/scroll stubs;
check-field-kit has no loader for the existing bunker JPG. These failures were
verified against a temporary baseline checkout and are not reported as passes.

Future new-building construction belongs to HQ planning and should create a
placement after payment. The repair path intentionally only accepts existing
authored sites and never adds or moves buildings.

Hold-control browser check (844 x 390): a partial mouse hold showed falling
progress, returned to 0%, and saved Camp 0 with all 15 logs. Sustained keyboard
holds completed HQ, then saved Camp 1 with 11 logs. A Walker entered the HQ,
attacked beside the table, revealed the roof and reduced defence to 89%.
The remote preview ran slowly, so simulation-time progress was verified with
fixed-step tests; no physical iPhone was available.
