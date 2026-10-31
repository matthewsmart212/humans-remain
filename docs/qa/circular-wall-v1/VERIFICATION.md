# Circular wall layout verification

The fixture is the read-only production world captured at revision 78, updated
2026-10-31T18:17:30.675Z, with all 15 current artwork records. The checks use the
current source modules and final registered artwork collision paths. They do not
write to the hosted game, use the network, or alter a player's saved run.

Run from the project root after installing its locked dependencies:

```sh
node scripts/check-circular-wall-layout.mjs
node scripts/check-camp-perimeter-server.mjs
```

Both commands accept an optional first argument naming a directory containing
`source-world.json` and `source-artwork.json`. They bundle the current source into
a temporary directory and remove it afterwards. The server check uses Node's
`node:sqlite` module and an in-memory database, so use the project's Node 24
environment. It does not depend on a possibly stale `dist` build.

`scripts/check-camp-open-entrances.mjs` now delegates to the circular wall check.
The earlier v3-to-v4 gate-removal fixtures in `docs/qa/camp-moss-no-gates-v1` remain
historical evidence; the current test does not regenerate them or require a v4
marker after the v5 installation.

## Results

The saved reports `layout-verification.json` and `server-verification.json` were
produced by successful executions against the final 16-section metadata.

- Exactly 11 original camp walls are replaced by 16 circular sections.
- The world changes from 4,543 to 4,548 placements. All 4,529 unrelated
  placements remain identical. Two audited rocks and one apple tree move 160
  world units radially outward; their other properties remain unchanged.
- Later owner edits, deleted wall pieces, remote uses of old wall artwork,
  unsupported terrain, and a missing approved hearth remain preserved. Moving
  the hearth translates the wall layout equally. Repeating migration does
  nothing.
- All 28 final polygon colliders are valid: 16 annular foundations and 12 road
  endpoint post footprints. The checks use `placementBodies`, not the larger
  provisional guide polygons.
- All 798 road corridor samples are clear of the new wall, with a 19-unit player
  radius and samples at the road centre and 35 units to either side.
- All six entrances have a route from inside to outside through the complete
  world, checked in both directions at intervals of at most 7 world units. Full
  route coordinates are retained in the layout report.
- The player map follows moved and deleted sections. Deleting every section
  leaves no wall illustration and does not restore the legacy decorative circle.
- The current Worker reads historical v3 saved JSON and round-trips every
  placement in the full v4 and v5 worlds. Unknown version 6 is rejected, and
  stale revision writes return a conflict. Retired gates remain hidden.

Navigation deliberately checks real traversable routes, rather than requiring
every point of the older painted road centreline to be clear: the existing
northeast headquarters corner already overlapped part of that approach before
the wall replacement. The tested northeast route goes around that unchanged
corner and passes through the new entrance.

These checks cover geometry, migration, mapping and server persistence. Visual
sprite assembly, browser/native rendering, and publication are verified
separately.
