# Camp axe trial

Historical first-equipment trial. The current attack system is documented in [moving axe combat](axe-combo.md); it replaces planted attacks with moving cuts and a two-hit combo. The standalone axe below remains the carry/fallback asset.

The Scrap Runner starts with an equipped camp axe in new games and the world editor. Tap AXE or press 1 to stow/equip. Tap/hold SWING or Space to swing. Editor controls appear in WALK mode; editor actions do not damage placed assets or change saved layouts.

In gameplay the axe strikes enemies, animals, and salvage crates in the facing cone. Each swing costs 20 stamina, does 40 damage, reaches 136 world units, contacts at 0.265 seconds, recovers at 0.58 seconds and permits the next swing at 0.66 seconds. Facing and feet plant during the swing. Damage checks happen once at contact; blocked targets and targets behind the player are excluded. Target selection does not turn the player around.

## Artwork

Built-in image_gen, one generation. Source/runtime asset: `public/survival/equipment/camp-axe-v1.png`, 1024 × 1536 RGBA with original alpha preserved. Grip pivot: (455,1125). The source is scaled as a separate held item; it is not baked into any existing character sprites. Front/behind drawing and a small redraw of the original palm hide the handle in the grip.

Prompt: One isolated upright salvaged one-handed camp axe for a stylized chibi survival game. Weathered gray-brown wood, a lower brown leather wrapped grip, chunky dark iron head, worn steel cutting edge and brass rivet. Thick warm outlines and painted material texture matching the Scrap Runner's cream jacket and rust sleeves. Blade right, handle vertical, warm upper-left highlights, portrait 1024 × 1536 canvas, genuine transparent alpha. No hands, character, labels, scenery, magic, blood, skulls or cast shadow.

The attack uses the existing directional idle/extended-arm artwork plus a separately timed axe arc. The approved gait artwork, pose sequences and leg reach remain unchanged. Forty measured locomotion hand positions track the held walking/running frames; mirrored views inherit their source's hand positions. This is the first equip/use trial, not a tool inventory, crafting tree or tree-felling system.

## Verification

`node scripts/check-axe.mjs <output directory>` tests all eight facing directions, pre-contact/no repeated damage, front versus rear targets, cooldown, stamina, downed state, planted feet, safe editor swings, crate salvage, and identical movement samples with/without equipment. It also renders the live CanvasKit adapter into a contact sheet and a 72-frame eight-direction swing sequence. `docs/qa/axe-eight-directions.png` shows the checked render. TypeScript and production build are checked before publishing. Physical iPhone Safari interaction was not available in this environment; controls use pointer capture and multi-touch activation patterns already used by Sprint.
