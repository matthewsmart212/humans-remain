# Patch — letter and conversation presentation

This pass completes the companion story presentation on top of `65e56fe`. The existing rescue, repair, homecoming, following, size and walking animation remain the gameplay foundation.

## Player experience

The camp note opens as an illustrated, weathered sheet with folds and worn edges over the dimmed world. All approved note text remains real selectable text, with the signature at the end of the scrolling sheet. The note remains available after collecting the supplies. Returning to supplies still checks that the player is near the camp chest.

Talking to Patch opens a larger painted portrait and a short greeting that follows the actual quest stage and selected command. `Ask Patch` reveals optional questions about his identity, the supplies, his decision to help and his damaged leg. Repairing him removes the obsolete damage question. These replies are transient UI state and do not advance the quest or change saved progress.

Follow, Stay and Return remain gated by the existing homecoming logic. Their controls remain outside the conversation scroll on normal phone layouts. The native version adapts to larger accessibility text by allowing the actions to scroll with the dialogue when the available height is too short.

Patch's existing timed world responses now use cream text in a dark olive speech bubble with a restrained amber border and pointer. The shared painter uses only Canvas/Skia primitives already supported on web and native. Visibility, line of sight, response duration and world layering remain in force.

## Art and packaging

- `public/survival/patch-v3/letter.webp`: 819×1024 RGBA, 174,974 bytes.
- `public/survival/patch-v3/portrait.webp`: 1024×1024 RGB, 234,058 bytes.
- Original generated images, full prompts and packaging hashes are retained in `artwork-archive/patch-v3/`.
- Both runtime images are ordinary Git bytes and are included directly in the native component's offline asset imports.

The paper uses actual generated alpha. Body/signature ink is `#292a20`; provenance ink is `#353629`. The UI check decodes the real paper and samples 535,790 pixels in its central reading area, compositing conservatively over black. Minimum measured contrast is 7.16:1 for body/signature and 6.06:1 for provenance. Minimum central alpha is 249/255. These texture measurements are separate from browser typography and touch behavior.

## Verification

- Web and native TypeScript checks.
- Production web client and Worker build.
- Full Expo iOS export: 3,048 modules, 1,017 assets and the Hermes bundle. Both new images are present with SHA-256 hashes matching their source files.
- `node scripts/check-patch-quest.mjs`: existing complete rescue and following behavior.
- `node scripts/check-patch-site.mjs`: existing placements and travel routes.
- `node scripts/check-patch-dialogue.mjs`: discovery/repair/homecoming gates, stale question rejection, state-sensitive greetings and no world mutations.
- `node scripts/check-patch-ui.mjs`: real React markup and complete production CSS, exact lore, retained zero-weight note, direct ink regression, generated paper contrast, safe phone geometry, controls and command rows.
- `node scripts/check-patch-animation.mjs`: browser Skia 2.6.2 and native Skia 2.14.0, including real timed speech and visible glyph pixels, one/two-line bubbles and render parity.
- Browser review of the production components: scrolling to the letter signature, question/reply navigation, command activation and compact layouts. An additional actual phone-viewport fixture checks responsive media queries and production fonts.

No physical iPhone touch, GPU performance or device screenshot claim is made. Publishing remains the existing GitHub `main` → Cloudflare Actions workflow.
