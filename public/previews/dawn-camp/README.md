# Humans Remain — seamless camp and character idle

The selected dawn camp now runs on a **seamless 16-second master cycle**. The tree retains its full upper canopy and clear wind sway. The seated survivor has a more visible resting idle: breathing through the shoulders and upper body, a gentle head/weight shift and softly blended blinks. The sky remains the supplied static artwork.

## Preview

The published `watch.html` is a lightweight looping video preview. The full interactive sprite renderer and all masters remain in this source folder and the downloadable kit. Only the watch page enters the live deployment; its videos stream from the immutable shared-repository version.

Open `index.html` in a modern browser. It loads local files without external requests. Pause the animation, change wind, toggle the seated survivor, or isolate layers. Reduced-motion preferences start paused; hidden tabs stop drawing. The standalone HTML embeds the same assets.

`preview.mp4` contains one complete **16-second loop at 60 fps**. The separate GIF is 25 fps with equal 40 ms frame delays. The character close-up uses the same final video, cropped for easier review. The export omits a duplicate end frame: the next frame after the last is the first frame of the next cycle.

## Seamless movement

Tree motion uses integer cycles over the shared period: three main sways, five secondary gusts and eight tip flutters. This keeps its position and velocity continuous at the join while maintaining layered wind movement. The root is anchored to the main trunk. The 192-pixel upper overscan and painted crown extension remain, keeping the crop edge outside even the strongest allowed downswing.

Fire, local firelight, smoke, falling leaves and embers use compatible periods too. Different phase offsets keep the effects from restarting together. Particles fade out before wrapping. Smoke and flames blend between source frames. Falling leaves pass behind the survivor; ground-blown leaves remain in front.

## Character animation

The approved neutral pose is cached once. A connected deformation moves the upper body with four breaths per master loop, a slow weight shift and small head settling movements. The lower legs and boots stay planted. Neighbouring drawing strips overlap slightly to prevent antialiasing cracks.

Two blinks occur at uneven intervals within the cycle. The closed-eye patch is smoothly blended over the neutral eye regions before the character is deformed, so the eyelids follow the face. Hair, clothes and boots retain the same source pose throughout; there is no full-body texture pop when blinking. No new character design or outline glow is added.

## Assets

| Asset | Purpose |
| --- | --- |
| `approved-background.jpeg` | Exact original supplied 1536 × 864 scene |
| `dawn-clean-plate.png` | Scenery hidden behind animated foreground subjects |
| `branch-cleanup.png` | Ground replacing the redundant distant fire pit and scenery behind the moving bough |
| `autumn-canopy.png` | Approved complete woody bough and leaves |
| `canopy-top-extension.png` | Added upper foliage for safe overscan |
| `survivor-idle-8.png` | Eight source character cells; playback uses the stable neutral body and one closed-eye patch |
| `campfire-flames-8.png` | Eight painted flame frames |
| `smoke-12.png` | Twelve smoke source frames |
| `autumn-leaves-16.png` | Leaf particle source views |
| `embers-and-dust-16.png` | Spark and dust source views |

All inventory files are under `assets/`. The ten unchanged master textures contain 62 sprite cells/layers plus three scene images. `manifest.json` records dimensions, hashes, timings, registrations, reconstruction regions, placements and loop settings. `scene-renderer.js` is the reference Canvas implementation. `scene-provenance.json`, `source-prompts.json` and `references/` retain source history and generation briefs.

## Validation

`validation.json` records identical full-scene images at t=0 and t=16 and at the same phase in successive cycles. The tree's mean pixel change just before the join is 1.3159 channel levels per frame, and just after is 1.3089; there is no reset-sized jump. Character pixels change during the idle while the sampled boots stay identical. Reduced motion freezes the scene. The full scene and a character close-up are visually reviewed before delivery.

## Integration

Use the canonical **1536 × 864** coordinates and scale placements together for a landscape viewport. Drive all effects from the shared clock; do not independently restart the tree, character and particles. Reuse decoded assets and the cached character/branch surfaces. Clear the dynamic Canvas frame state between draws to avoid accumulating recorded commands. Pause when the app backgrounds and honour reduced motion. In the native app, preserve the same phase functions and registrations in the UI-thread renderer.

The original textures use approximately **59 MiB of decoded RGBA pixels**. Cached scene, character and branch surfaces, decoder/GPU allocations and application overhead are additional. These remain visual-review masters; choose final texture resolutions and measure the native implementation on an actual iPhone before integration. A 60 fps exported video is not an on-device frame-rate measurement.

This deliverable updates the artwork and animation-preview kit. It does not install a new game start screen or publish the live game. Logo, menus and player stats remain separate.
