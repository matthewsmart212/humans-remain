# Mossy original camp walls

Eight surface-treatment edits made with the built-in image-generation tool. The full final prompt set and input paths are in `prompts.json`. Original artwork remains in `public/survival/camp-walls-v2/`; original generated outputs are archived here as `wall-1.png` through `wall-8.png`.

## Integrated artwork

All files are saved under `/workspace/sites/safety-last/public/survival/camp-walls-moss-v1/`:

- `wall-1.webp`
- `wall-2.webp`
- `wall-3.webp`
- `wall-4.webp`
- `wall-5.webp`
- `wall-6.webp`
- `wall-7.webp`
- `wall-8.webp`

Forest-green and olive moss follows the low logs and shaded rails, with small ivy patches on a few upright posts. Timber, broken spikes, lashings, perspective and the worn stockade character remain visible. Each transparent edit is mechanically registered to the original occupied image bounds and original full canvas; see `registration.json` and `scripts/package-camp-moss-walls.mjs`. Gameplay dimensions, anchors, collision traces and placement coordinates were not changed.

## Camp update

The v4 perimeter migration removes six camp gates from the saved v3 layout without resetting any other placement. Road openings stay open, with no gate colliders or interaction prompts. Legacy artwork IDs are retained internally so old saves continue to load. Gate entries are removed from the placement catalogue. The bunker door is unchanged.

## Verification

- Current live revision 67 captured read-only: 1,374 objects before; 1,368 after, all remaining objects identical.
- All 11 original wall placements preserved; all six road approaches pass collision, pathfinding and bidirectional sprint checks.
- Eight alpha-bearing wall sprites retain world sizes, anchors, collision settings and future upload overrides.
- Production Worker tested against a disposable local database: old gate saves load; removal persists with marker v4; stale and invalid writes are rejected.
- World-recovery regression passes, including protection against the previous empty-world problem.
- Shared Skia renderer: all 25 props/walls rendered, zero omitted placements; overview and close-ups reviewed in `docs/qa/camp-moss-no-gates-v1/after/`.
- TypeScript and production build pass. No browser automation or physical iPhone QA was available.
