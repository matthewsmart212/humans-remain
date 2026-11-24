# Fishing V2 — clear controls and a fuller lake loop

## Player experience

Tap CAST for a quick throw, or hold it and move the left thumb / WASD to aim.
The landing marker shows the exact committed target and marks invalid targets
with a cross. The survivor remains planted while aiming. Cancelled and invalid
casts spend no bait. A shallow nibble and the submerged float distinguish the
true bite; the HOOK action gains a gold highlight. Auto hook and tap-to-reel
assistance remain in Pause →
Game settings, alongside sound and native vibration controls.

Ordinary fishing shows only the bait count. During the fight, two slim meters
keep stable TENSION and TO SHORE labels, without changing explanatory text.
Fish turns warn of a strong pull at least 0.8 seconds ahead; rod strain, the
tension bar and its warning mark convey the load. Full instructions remain
available to assistive technology. The visual loop works without sound.

Perch, carp and pike have different silhouettes, sizes that reflect weight, turns, bursts
and tiring periods. Shifting feeding ripples guide cast selection. Rod/body/hand
animation, wakes, nibble and bite motion, landing droplets and keep/release
aftermath are rendered by the shared web/native renderer. The existing lake,
jetty and world artwork are retained.

Larger fish provide up to three raw portions with real pack weight. Carp and
pike each flow through the backpack, storage, dropping, collection, cooking,
quickbar and eating. A rare visible submerged scout-drone clue can be hauled
for six scrap and two iron ore (3 kg). Its intermittent signal is audiovisual;
this update adds no companion quest or new enemy-attraction behavior.

A successful landing automatically adds the complete reward to the bag. Full
bags preserve the catch; BAG opens inventory and RELEASE returns it to the
lake. Making room automatically collects the held catch. Existing serialized
perch catches retain their original
single reward; no live cast or feedback event is restored from a save. The game
still starts a fresh session on Play, as it did before this update.

## Visual fishing follow-up — 24 November 2026

The previous compact instruction card is replaced with a small bait badge,
visual feedback and a short collection receipt beside the action control in
both orientations. A normal catch has no Keep/Release decision screen. Its
thumbnail, name, weight, check mark and “In bag” confirmation fade after 2.6
simulation seconds. Receipts remain visible when the rod is unequipped, without
taking over another primary action, and are never restored from a saved run.

Automatic collection uses the existing whole-reward resolution path. This
preserves portions, real pack weight, records, counters and landing aftermath.
Repeated simulation steps cannot award twice. Full bags keep the complete fish
or mixed salvage pending, including old saved catches, and retry only when the
complete reward fits. Dead, downed and game-over worlds cannot collect it.

Both HUDs checkpoint each automatic award and newly held full-bag catch once,
scoped to the current world. Manual release still checkpoints. Polling and
receipt expiry do not replay saves. The full-bag exception keeps 44 px BAG and
RELEASE/RETURN targets; ordinary fishing has no panel buttons or visible
explanatory paragraphs. Large top-left success/release/escape explanations are
removed. Invalid casts and early retrieval retain only brief result notices.

This update passed web/native TypeScript, the web production build, fishing
gameplay, controls, inventory, save and feedback checks. Feedback covers 51
actual web/native component cases, including visual-only ordinary stages,
stable meters, accessible guidance, receipt-only success, full-bag handlers,
and once-only checkpoints. Engine checks cover every species, automatic
collection, atomic salvage, full-bag recovery, legacy portions and expiry.

The browser remains blocked by the runtime socket policy. Visual QA uses
static rendering of the actual React component, stylesheet, fonts and artwork,
plus source-based action-control bounds. Sixteen rendered states measured a
38×24 px bait badge, 132×55 px fight display and 178×44 px receipt. All 48
placements at 320×568, 390×844 and 844×390 fit the viewport and clear the primary
control. The fixture pins the declared 44 px button minimum for WeasyPrint
compatibility and uses zero safe-area insets for those calculations. It is not
physical iPhone or browser interaction testing. The earlier compact-card implementation and its original
measurements remain in commit 5909ff0; the broader V2 evidence below describes
the original mechanics, rendering and export work.

## Verification

The real authored map exposes 132 usable casting positions. The behavioral
check deliberately aims for all three species and the rare salvage clue. Its
measured hook-to-catch times, including landing, are 16.47 seconds for perch,
19.68 for carp, 18.63 for pike and 26.9 for heavy salvage. These are fixture
measurements, not guarantees for every player or cast.

The focused scripts cover actual web/native input handlers, independent aiming
and action contacts, invalid/cancelled casts, bait accounting, nibbles vs bites,
warning lead time, missed bites, snapped lines, bag capacity, duplicate Keep,
release, assist modes, old saves and offline art registration.

`check-fishing-feedback.mjs` exercises both actual HUD components through
platform primitive adapters, their control handlers, imperative/accessibility
labels, reward text and full-bag states. It checks one-shot event delivery,
throttled reel audio, paused/stale event suppression and deferred native audio
after world change, hidden HUD, pause, mute/unmute and disposal. Thirteen WAV
cues are checked byte-for-byte against their original deterministic source;
the true bite has a stronger double cue than a nibble.

Production renderer evidence uses the actual native Skia renderer under
CanvasKit, with source assets verified against Git LFS hashes. It is software
rendering evidence, not a physical iPhone screenshot or frame-rate benchmark.
The iOS production export includes all five new painted images and thirteen
offline sound cues, verified byte-for-byte in `native-export-checks.json`.

Passed local gates:

- Web and native TypeScript checks, web production build and iOS export.
- Fishing gameplay, controls, inventory, saves and feedback scripts.
- Camp recipes, menu/experience and cooked-food drop regressions.
- Shared water-life geometry and production native renderer checks.

A local Chromium launch was blocked by the runtime's socket policy. No browser
interaction, physical iPhone, TestFlight or on-device performance check is
claimed. The existing co-op-room CI test has a baseline Node 22 mock-method
failure unrelated to fishing; deployment is a separate existing workflow.
Two additional existing host harnesses remain blocked outside the workflow:
`check-field-kit.mjs` bundles with updated native platform adapters but the
unchanged authored snapshot has no open-frame chest fixture; `check-clean-play`
stops on React Native Flow syntax in unchanged Headquarters imports.

## Assets and reproducibility

The five generated source PNGs and exact prompts are archived under
`artwork-archive/fishing-gameplay-v2`. Alpha-preserving 512 px WebPs are the
runtime copies. `scripts/build-fishing-audio.mjs` rebuilds the original short
mono WAVs from `src/fishing-sound-design.ts`. Art and sound runtime assets are
ordinary Git blobs so web and iOS exports include them without new LFS objects.
