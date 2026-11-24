# Fishing V2 — clear controls and a fuller lake loop

## Player experience

Tap CAST for a quick throw, or hold it and move the left thumb / WASD to aim.
The landing marker shows the exact committed target and marks invalid targets
with a cross. The survivor remains planted while aiming. Cancelled and invalid
casts spend no bait. A nibble says WAIT; the submerged float and TAP HOOK prompt
identify the true bite. Auto hook and tap-to-reel assistance remain in Pause →
Game settings, alongside sound and native vibration controls.

The largest HUD line always gives the current action. A warning precedes every
strong pull by at least 0.8 seconds. Releasing changes the instruction to WAIT ·
EASING. Tension and progress to shore have separate labels and shapes. All
essential instructions remain visible with sound and vibration disabled.

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

Full bags preserve the complete catch. Keep reserves room for the complete
reward and consumes the pending catch once. Release visibly returns the same
animal to the lake. Existing serialized perch catches retain their original
single reward; no live cast or feedback event is restored from a save. The game
still starts a fresh session on Play, as it did before this update.

## Compact HUD follow-up — 24 November 2026

The web and native overlays now share concise presentation copy. The normal
card is 184 px wide and the catch card is 200 px. Each phase has one primary
action, a small bait count and only the context needed for that action. The
generic stage heading, species footer, cast-distance meter and heavy double
frame are removed. The landing marker continues to show the actual cast.

Touch guidance explicitly says to hold CAST and drag on the left; keyboard
guidance names Space and WASD. Nibble, bite, incoming pull, easing, invalid aim,
no bait and failed catches remain distinct. Tension and shore progress retain
separate slim meters, text labels and accessible values. Complete instructions
remain available to assistive technology, including actual live-region text on
web for changes that only affect the detailed guidance.

The catch card keeps a small image, species, weight, a record marker and the
actual reward with pack weight. Raw portions remain labelled as raw. Keep and
Release retain 44 px minimum touch targets. A full bag still disables only
Keep, and the card explains that the catch is held safely while space is made.
Fishing mechanics, inputs, rewards, animation and audio are unchanged.

This follow-up passed the web and native TypeScript checks, web production
build, fishing-controls checks and 30 web/native feedback UI cases. Those
component checks cover input-specific guidance, hold/toggle/easing distinctions,
reward decisions and full-bag recovery. Static rendering of the actual React
component, CSS, fonts and artwork checked 34 states: the ready card measured
184×55 px, reeling 184×84–102 px, catches 200×131 px, and full-bag catches
200×167 px with 44 px buttons. The layout check covered 320/390 px portrait
and 844/1024 px landscape widths, retaining clearance from the action controls.

The local browser remains blocked by the runtime socket policy. These are
static HTML/CSS measurements under WeasyPrint, not browser or physical iPhone
screenshots. Unsupported dynamic/media features and a landscape full-bag
pagination artifact were assessed from the production anchors and measured
card bounds rather than treated as browser behavior. Static button previews
pin the declared 44 px minimum because WeasyPrint drops that minimum for nested
flex controls. The older V2 verification
below records the broader gameplay, rendering and export work from the
mechanics update.

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
