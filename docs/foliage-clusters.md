# Natural foliage and readable crops

Wild potato sprites are 112 world units wide; carrots are 110. Both retain
their root anchors, original artwork and picked-state sprites. Nearby ripe crops receive a slightly stronger warm silhouette outline, with
the active pick target strongest, using the existing web/iOS Skia outline
renderer and its bounded, cached discovery queries. Cultivated bed sizes are unchanged.

The shared authored-world preparation applies `forageSceneryVersion: 1` once.
It removes automatic decorative plants that crowd food or camp walls,
then opens coherent pockets until at least 23% of eligible
decorations have been removed. Clearance removals count toward this figure.
Dense woodland patches remain. Trees, food plants, manual decorations and
locked/custom-collision scenery are preserved. Only the two original northwest
crop sample positions can be corrected if unsafe; their IDs and picked state
remain intact. Later editor moves are retained.

## Place more clusters

From the repository root:

```sh
npm run foliage:clusters -- --input native/assets/world-snapshot.json --output .qa/foliage-clusters/world.json --seed 161126 --count 180
```

Use an exported current world as `--input` to include editor changes. The
input can be a `{layout, records}` snapshot, `{draft, records}` export or a
bare layout using built-in artwork. Output retains the input's wrapper and
artwork records. The source file is never overwritten or published.

Optional `--bounds x,y,width,height` restricts composition to a world-coordinate
rectangle. `--seed` is an integer from 0 to 4294967295; `--count` is the desired
number of new plants, capped by the existing world item limit. Safety checks may
produce fewer plants when space is scarce.

The script places irregular clusters of 4–8 plants. Each patch shares a small
palette, varies size/rotation/mirroring, and tapers toward its edges. It leaves
gaps between patches, preserves the camp clearing, and checks full sprite
envelopes against the registered roads, water, walls, buildings, food and
existing scenery. Trees and rocks are never moved or replaced.

Review the JSON and companion `-plan.svg` placement plan, then load the JSON
through the existing world-source workflow and review it in the editor before
publishing. The SVG is a placement plan, not an in-game screenshot. Light green
means new clusters, dark green existing foliage, and gold food plants.

Re-running on its own output replaces only unlocked `scenery-cluster-v1-*`
placements. A fixed seed and unchanged source produce identical placements.
Locked generated plants are retained. No generation runs in the frame loop.
