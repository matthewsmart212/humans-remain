# Survival needs balance

Web and native use the same fixed-step simulation. A fresh round starts with
100 health, stamina, food and water. The existing three raw chickens remain in
the backpack; they must be cooked before eating.

| Mechanic | Initial balance |
| --- | --- |
| Sprint | 10 stamina/second while actually moving; about 10 seconds from full |
| Axe | No stamina cost for either cut; chopping also allows normal recovery |
| Punch | 16 stamina; 32 damage to enemies, 16 to a chicken (two hits) |
| Dodge | 18 stamina; existing cooldown and committed movement remain |
| Recovery | Starts 1.1 seconds after the last expenditure; 14 stamina/second |
| Exhaustion | Sprint waits until stamina reaches 25; walking remains available |
| Recovery food | 0.025 food per restored stamina: 2.5 food per full bar |
| Passive hunger | 3 points/minute; about 33 minutes from full while healthy and idle |
| Passive thirst | 4.5 points/minute; about 22 minutes from full while idle |
| Sprint thirst | An extra 3.9 points/minute of actual sprinting |
| Low needs | Below 20 food or water slows stamina recovery; empty needs slow it further |
| Natural healing | 0.4 health/second after 10 seconds without expenditure or injury, with food and water at least 35 |
| Healing cost | 0.12 food and 0.06 water per health restored |
| Empty food | 0.35 health damage/second |
| Empty water | 0.6 health damage/second; both penalties add together |
| Cooked chicken | Existing +50 food and +15 health, capped at 100 |
| Well | Refills water to 100; existing two-second interaction cooldown |

Damage from needs is accumulated and applied once a second. It bypasses
combat invulnerability and dodging, without repeated camera shake or hurt
flashing. Zero health ends the round and offers Restart; a finished round
cannot be resumed.

Health does not decay while healthy. Low-need and exhaustion messages explain
what to do. Meals cannot be wasted on sub-percent passive drift while the
display still reads full. Neither failed actions nor pushing against a wall
spend stamina. Low food slows recovery but never prevents walking home.

Needs pause with the backpack, pause menu, inactive app/tab and scene fades.
Bunker transfers retain needs, exhaustion, regeneration delays and pending
damage. Build/Walk preview remains independent, and no runtime changes are
written into the authored map.

`src/survival-needs.ts` owns the tunable rates. Run
`node scripts/check-survival-needs.mjs` for production movement/combat,
consumption, damage, transfer and timed balance checks. Its report is in
`docs/qa/survival-needs-v1/checks.json`. These are initial tuning values;
physical iPhone playtesting is still needed for subjective pacing.
