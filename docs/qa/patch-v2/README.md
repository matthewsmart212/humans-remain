# Patch — readable letter, larger companion and articulated walking

This update addresses the three reported phone problems: the letter's pale text, Patch's very small on-screen body, and movement using static standing art. It is based on `dd3c17abebe6e3495b4d5f8fc18745922f757433` and keeps the existing Reclamation opening and quest story.

## Letter and conversation

The production `.world-editor p` selector explicitly set pale UI text on every paragraph. The original paper only inherited its darker ink from the parent, so the production rule won. The new letter sets ink directly on its paragraphs, signature and provenance, with scoped selectors and an explicit WebKit text fill. The base ink/paper pair is `#303025` on `#e8dfc6`, approximately **10.03:1** contrast.

The note uses quiet parchment, a folded corner, readable serif spacing, a proper note emblem, a signed ending and a 44px return target. Its text, zero-weight status and continued access after collecting supplies remain intact. Web and native share the same presentation hierarchy. The paper scrolls within the existing safe-area-aware menu.

Companion conversations now show a short current status, a clear primary Follow action, secondary Stay and Return actions, and the selected command. The note icon is an optional StationMenu emblem; existing station panels keep their artwork and behavior.

## Size and gait

- The shared visual scale changes from **0.30 to 0.45**: exactly **50% larger in both dimensions**, including the damaged pose.
- The new transparent atlas has **eight directions and eight distinct walking phases**, with articulated legs and opposite arm motion. Every leg region is unique.
- Ground distance drives phase. Heading changes preserve phase; stopping uses planted standing feet. No rigid-body bob or rotation substitutes for leg movement.
- The complete cycle spans the existing 112-unit gait distance, retaining serializer compatibility.
- The lamp is measured and registered per frame. Contact shadows, repair feedback, glow, speech clearance and visibility bounds fit the larger silhouette.
- Reduced-motion mode retains essential walking while suppressing decorative beacon pulsing.

The new atlas is one 2048×2048 WebP, **1,452,844 bytes**, available offline in both web and Expo. Its decoded RGBA footprint is 16MiB. The original image-generation output, exact prompt and registration measurements are in `artwork-archive/patch-v2/`. `scripts/package-patch-walk.py` only cuts cells, translates them onto common ground anchors, applies one common scale and encodes the atlas. It preserves generated alpha and does not independently resize frames or synthesize limbs.

## Follower and quest polish

- Patch completes a route around a corner instead of stopping within straight-line range on the far side of a wall.
- Catch-up speed changes continuously and eases to stationary feet.
- Opening his conversation pauses movement without changing the selected command; closing it resumes that command.
- Dialogue reflects Following, Waiting or Returning. “Shelter occupied.” remains the camp arrival/waiting line.
- Interrupted repair says “Repair stopped · Servo kept,” accurately describing its restart behavior.

His physical radius stays 15 units. The intentional 88-unit following stand-off remains outside the 80-unit interaction reach so he does not continually replace the player's tool action. A small approach allows conversation. No world placements, navigation collisions, progression persistence, co-op authority or combat abilities are added by this polish pass.

## Verification and evidence

| Check | Coverage |
| --- | --- |
| Web/native TypeScript | Shared runtime, panels and asset bindings |
| Web build | Production application and Worker |
| Expo iOS export | Real Hermes bundle; all six Patch textures found by SHA-256 |
| `check-patch-quest.mjs` | Full quest, real controller/simulation, corner routing, smooth catch-up, stopping, conversation pause/resume, commands, repair cancellation, reward uniqueness and serializers |
| `check-patch-site.mjs` | Existing world preservation, owner transforms/removal, dry approaches and return route |
| `check-native-compact-save.mjs` | Existing serializer compatibility |
| `check-patch-animation.mjs` | All 64 gait frames, exactly 1.5× scale, lamps, culling, idle, reduced motion and partial repair ring |
| `check-patch-ui.mjs` | Actual React markup and the full production CSS cascade, original failure fixture, 7.72:1 minimum text contrast, unchanged lore and five phone geometries |
| Production native renderer | 13 staged captures with no missing textures |

The animation check executes the production painter through browser Skia 2.6.2 and native Skia 2.14.0. Their outputs match exactly for all tested frames: **zero different pixels**. Adjacent walking phases, including the loop seam, change at least 643 leg pixels. These are renderer checks, not a physical device frame-rate claim.

`animation-verification.json`, `native-export-checks.json`, `renderer-report.json` and `letter-cascade-verification.json` record the measurements. The existing CI workflow includes the new animation and letter checks.

### Visual files

- `walk-cycle.gif` plays actual native painter outputs at the enlarged runtime size.
- `discovery.webp`, `discovery-night.webp`, `repair.webp`, `following.webp` and `homecoming.webp` use the production native game renderer with staged quest states.
- `damaged-scale.webp` and `repair-feedback.webp` isolate the enlarged damaged pose and partial ring.
- The `note-*-static-proof.png` files use actual React SSR markup and the complete production CSS in WeasyPrint. They verify the real ink cascade and provide static style proofs; they are **not browser or device screenshots**. Print rendering does not reproduce Safari scrolling, media/container behavior or every decorative transform.

Physical iPhone touch, GPU performance and Safari behavior require device verification. The local Chromium process is blocked by this execution environment's socket policy, so it is not included in the local verification claim. Live browser verification is separate from these reproducible local checks.
