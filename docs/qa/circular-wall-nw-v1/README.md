# North-west stonework consistency

Section 15's small squared stones did not match the larger irregular stones of adjoining section 16. The replacement changes only the stone material within the existing section-15 foundation. All original alpha bytes, timber pixels outside the material mask, dimensions, anchors, placements, curved collision and road openings are preserved.

`world-before-after.jpg` compares the actual shared game renderer at the north-west join. Its pixel difference is confined to section 15's foundation; the surrounding authored world is unchanged. The fixture reconstructs the previously captured revision-80 world from the committed native snapshot and the existing northeast fixture overrides. Both views retain the version-7 northeast saved-layout repair.

`verification.json` records the successful TypeScript, layout, saved-run and native asset checks. `native-verification.json` includes all eighteen circular wall images and the twenty-four retained legacy images. Native packaging now derives retained circular artwork from the shared manifest, so regenerating the bundle keeps the two older northeast shapes available for customized saved worlds.

Reproduce the raw north-west captures from the repository root:

```sh
node docs/qa/circular-wall-nw-v1/render-world.mjs before
node docs/qa/circular-wall-nw-v1/render-world.mjs after
```

Raw PNG captures are ignored because they duplicate the compact comparison and can be regenerated. This is an offline CanvasKit check of the production renderer, not a physical-device test. The original ImageGen output, prompt, mask, registration script and lossless editable PNG are retained in `artwork-archive/circular-wall-nw-v1`.
