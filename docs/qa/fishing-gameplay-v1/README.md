# Stillwater fishing — first playable loop

This update turns the existing Stillwater pier and visible perch into a playable fishing encounter. It retains the approved lake, jetty, shoreline and woodland artwork.

## Player experience

1. Walk beside the painted tackle box on the pier and choose **TACKLE**. The expedition receives one salvaged rod and ten worms. The rod needs 0.8 kg of backpack room; a rod already owned or stored cannot be duplicated.
2. Equip the rod from the backpack or quickbar. Stand on the pier or a nearby clear bank. **CAST** is only available when a visible perch can be reached over real water.
3. Tap to cast, or hold then release for additional distance. The float travels from the character to the chosen patch of water; an existing swimming perch approaches it. A canceled hold does not cast.
4. When the float dips, press **HOOK**. One worm is spent on the bite, so exploratory casts and early retrievals are free. Missing the bite lets the fish escape.
5. Hold **REEL** to bring the fish in. Release to ease line tension during its rushes. Constant pulling can snap the line. Rod flex, moving fish, float movement and water rings accompany the fight.
6. Choose **KEEP** or **RELEASE**. A kept perch becomes one raw fish portion; the catch card records its individual weight and personal best. A full bag leaves the catch safely undecided while the player makes room or releases it.
7. Cook perch with the existing campfire system. Cooking takes 12 seconds, produces ordinary collectible cooked food, and restores 30 food plus 6 health when eaten. Raw portions weigh 0.55 kg; cooked portions weigh 0.4 kg. Record weight is separate from prepared inventory portion weight.
8. Search the damp shoreline reeds for up to four worms. The bait tin holds ten; the 45-second search cooldown survives saving.

After claiming the tackle, **Pause → Game settings** contains the **Auto hook** and **Tap to reel** assistance switches. The fishing panel has no Options button. Both assists use the same fish, tension and reward rules. Movement, damage, menu/background interruption, a removed pier or a change of equipment ends an active attempt. A landed catch awaiting KEEP/RELEASE survives those interruptions and saving.

## Implementation

- `src/fishing.ts` owns cast eligibility, the selected ambient perch, the simulation state machine, tension, bait, catch resolution and interaction targets.
- `src/fishing-types.ts` keeps web, native, render and save contracts shared. `src/fishing-save.ts` validates persistent progress and pending catches. Held inputs and active attempts are transient.
- `src/fishing-character.ts` reuses the survivor's painted arms and body. `src/fishing-renderer.ts` supplies the rod, grip, curved line, float, ripples and landing; the shared painter is used by web and native Skia.
- The `FieldKitController` owns action presses and releases. Web pointer capture and native touch ownership distinguish intentional release from cancellation. Keyboard Space/E retains ownership of its original press.
- Existing inventory, chest, drop, pickup, campfire and food pathways carry the rod and both fish portions. The six painted item icons have literal native bundle entries and are collected by the asset preparation script.
- Scene travel shares persistent fishing progress and inventory, and cancels transient attempts. Restoration re-shares progress across serialized world copies before a catch can be awarded.

The first catchable species is perch. Additional species, rod upgrades, special salvage, story discoveries and seated fishing are outside this version.

## Verification

The focused checks use the actual authored world and production code:

```sh
node scripts/check-fishing-gameplay.mjs
node scripts/check-fishing-controls.mjs
node scripts/check-fishing-inventory.mjs
node scripts/check-fishing-save.mjs
node scripts/check-fishing-site-behavior.mjs
node scripts/check-fishing-water-life.mjs
npm run typecheck
npm run build
cd native
npm run typecheck
```

`gameplay-checks.json` records 60 valid body-sized casting positions, reachable tackle and bait interactions, and a complete reel/ease catch. Input checks exercise actual web/native handlers, canceled and repeated presses, full-bag decisions and a real authored-pier CAST → HOOK → REEL sequence. Inventory checks cook, collect, eat, drop and store real fish through the normal game pathways. Save checks cover old expeditions, native compact storage, malformed data, stored rods, transient input removal and undecided catches.

The rendering evidence uses the production native Skia adapter with the actual lake and character assets. It is software rendering, not a physical iPhone performance or touch test. A live browser layout capture was unavailable in this environment; the HUD review uses production component output and a software layout renderer, with that limit recorded alongside its evidence.

### Final verification — 23 November 2026

- All four fishing gameplay, controls, inventory and save checks passed.
- Existing pier behaviour and swimming-fish checks passed, including full-body deck support, bank access, water-only fish and foreground occlusion.
- Web TypeScript and the production web build passed.
- Native TypeScript and Expo's iOS export passed. Metro bundled 3,008 modules and included all six fishing equipment and food icons.
- The original native artwork needed by the export was restored from Git LFS and checked against its committed SHA-256 and byte size. Those unchanged artwork bytes are excluded from this update.
- `reeling-render.png` is a render from the production native world painter. `render-verification.json` records the six reviewed world captures and their zero missing textures. Neither is a physical-device screenshot.
- A physical iPhone performance and touch playtest remains unverified.

Existing unrelated verification limits are reported separately: the legacy field-kit check stops before its action checks because its snapshot fixture expects a chest with an obsolete role; the previously observed Node 22 co-op runner failure is not changed by this update. The fishing checks have their own CI step before the co-op test.
