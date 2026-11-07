# Hunter walk art (Ludo.ai)

The five original direction sheets have been split into 36 transparent registered frames each and exported to WebP 6×6 atlases (206×236 pixel cells). **All six binary assets are committed in this directory** and bundled for offline native use:

- `down.webp`
- `down-right.webp`
- `right.webp`
- `up-right.webp`
- `up.webp`
- `portrait.png`

`src/hunter-sprites.ts` mirrors the three leftward directions, keeps a common 112-world-unit character height, and cycles six gait poses per 112 units of travel, rotating rows across strides. Sprint temporarily speeds up this same walk; attacks temporarily hold the idle Hunter while weapon overlays still work.
