# Patch: world placement and native rendering

The maintenance station sits on the west bank beyond Stillwater Lake. Its
existing southern bridge connects the camp-facing bank to the discovery site.
The update appends two scenery placements and preserves all 2,914 existing
objects in the bundled published world.

| Element | World anchor | Purpose |
| --- | --- | --- |
| Maintenance shed | -3850, 7000 | Discovery landmark with stone footing and rusted hoist |
| Damaged P-04 | -3725, 7080 | Repair and recruitment on the open ground in front of the shed |
| Service locker | -4090, 6840 | The guaranteed drive servo; interaction approach is 35 units in front |

`patchSiteVersion` records the one-time migration. It preserves subsequent
owner movement, rotation, scaling and removals. Existing unmarked scenery is
recognized without replacement. Two nearby surveyed clearings provide
fallbacks when the primary site is occupied; an entirely obstructed area is
left unchanged. Custom terrain is untouched.

The shed is a non-enterable scenery prop with collision traced around its
masonry and pump footing. Both quest interactions are outside. Its baked roof
therefore cannot hide a survivor walking inside an unsupported interior.
The editor can move the shed and locker independently. The unrepaired robot's
anchor follows the shed's transform; repaired companion positions belong to
the run, not to the editor layout.

## Artwork and drawing

The generated transparent artwork is packed under `public/survival/patch-v1/`.
The robot has eight independent facing poses, preserving the asymmetric
winch, satchel and replacement plate; none are mirrored. Registered 256-pixel
cells share a foot anchor. Standing art renders at approximately 60 world
units high and the seated damaged pose at 48. Movement adds a restrained body
sway; this version does not contain a separate multi-frame leg walk cycle.

Robot feet participate in the normal actor depth sort. Tight ground contacts
seat the shed and locker in the terrain. The amber emitter follows measured
lamp centers for each facing and the damaged pose, including movement sway.
It uses three slow pulses followed by a pause, with a steady reduced-motion
alternative. A blocked sight line hides its overlay. Short speech appears only
when the quest emits it; there is no permanent companion label.

The repair ring uses explicit arc points because the native Canvas adapter's
`ellipse()` draws a complete ellipse regardless of start/end angles. The
actual native capture confirmed a partially completed ring after this fix.

## Actual native renderer evidence

These are production game renders through the native Skia renderer and its
CanvasKit software platform adapter. The camera is 844 by 390 points at 2×
pixel density. Quest states and positions are staged for visual review;
gameplay transitions are exercised separately by the quest checks.

| Capture | Review |
| --- | --- |
| [Discovery](discovery.webp) | Shed, locker, robot scale and the existing bridge/shore |
| [Night](discovery-night.webp) | Small amber beacon after the normal night lighting pass |
| [Repair](repair.webp) | Partial ring at 3.2 seconds of the six-second repair |
| [Following](following.webp) | Repaired standing pose beside the survivor |
| [Homecoming](homecoming.webp) | Original camp chest, arrival speech and the still-broken fire |

The final five captures report zero missing camp, river or artwork textures.
The report records 176 source artwork files, their hashes, the working-tree
model hash and the base commit `ef4fc17a0d6b3f500e6d05ae261822b88e1685a7`.
The runner can hydrate Git LFS assets from an immutable public GitHub media
URL, checking both file size and SHA-256 against each committed pointer
before using the bytes.

Run from the repository root:

```sh
node scripts/check-patch-site.mjs
node docs/qa/patch-v1/render-production.mjs
```

The site checks cover migration, immutable preservation of the published
world, transformed discovery anchors, deliberate deletion, unknown-version
rejection, occupied-site fallback, dry full-body approaches and collision-clear
routes from camp to all three quest points and back. These checks and renders
do not constitute a physical iPhone touch or frame-rate test.
