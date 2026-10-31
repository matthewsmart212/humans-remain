# Western river continuation

Extends the approved northwest headwaters through the logging crossing, western bends, waterworks approach, lower pools and southern turn. The main western river now spans 26 streamed sections; the meadow channel and eastern creek remain future work.

## Artwork and generation

Four full-frame painted masters, each with its exact imagegen prompt in `prompt.json` beside `master.png`:

- `artwork-archive/river-western-bends-v1/`
- `artwork-archive/river-waterworks-approach-v1/`
- `artwork-archive/river-lower-pools-v1/`
- `artwork-archive/river-southern-reach-v1/`

Each used the actual rendered game terrain, exact route guide and preceding master as references. Foliage remains separate. Runtime sections are native-pixel WebP crops with 128-world-pixel overlaps. Batch overlap is 396 world pixels, with a 384-pixel feather; corridor masks preserve surrounding terrain and roads.

## Motion and traversal

Twenty new colour-isolated flow windows reuse the existing 12-frame whitewater atlas and streamed river artwork. Their masks keep warm-coloured rocks, bridges and banks stationary. Existing eleven waterfall locations and the camp remain unchanged. River camera cycles six reaches; waterfall camera includes the new flow windows.

Four painted wooden crossings have narrow walkable deck corridors. Channel collision is derived from the installed paintings, not the future guide paths. No new river assets block editor entry. Streaming stays capped at three detail images and two simultaneous requests.

## Size and preservation

Nine existing PNG assets were encoded as lossless WebP, retaining every visible pixel and alpha value; old saved URLs redirect to the new files. Their originals are recoverable in `artwork-archive/lossless-runtime-v1/`. Superseded planning previews are retained in `artwork-archive/retired-runtime/river-planning-v1/`. This keeps room for the river without lowering terrain resolution.

## Verification

`scripts/check-river-complete.mjs` uses the real CanvasKit software renderer, checks movement/streaming, records rendered joins and bridges, compares camp/upstream pixels, and tests every new flow window for movement, protected ground and exact loop return. Results and rendered previews are in `docs/qa/river-complete-v1/`. Browser and iPhone QA are unavailable in this environment; confirm touch navigation and visual appearance on device after publication.
