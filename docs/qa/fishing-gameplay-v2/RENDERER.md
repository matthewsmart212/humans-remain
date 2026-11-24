# Fishing V2 rendering evidence

These images use the production native renderer, the actual authored Stillwater
lake, the approved pier painting, and the original survivor atlases. The native
Skia adapter runs through its CanvasKit software platform for reproducible
inspection. They are rendered evidence, not physical iPhone screenshots or
measurements of device frame rate.

## Visual review

| Evidence | What it shows |
| --- | --- |
| `world-aiming.webp` | Gold water landing marker and its matching sampled trajectory. |
| `world-invalid-aim.webp` | Rust marker and cross on an invalid deck landing, with a dark outline for contrast. |
| `world-casting.webp` | The float travelling along the displayed trajectory. |
| `world-nibble.webp`, `world-bite.webp` | A shallow preliminary bob versus the decisive dip and larger splash. |
| `world-warning.webp`, `world-surge.webp` | The fish turning away before its pull, then its stronger wake. |
| `world-landing.webp` | The same weighted carp lifted above the deck, with a small flop and droplets. |
| `world-release-air.webp`, `world-release-water.webp` | The released catch returning through the air to its actual water point, then swimming away. |
| `world-drone-aiming.webp` | A deliberate cast onto the real, rare metal clue. The side view also clearly shows the projected cast arc. |
| `world-drone-hauling.webp`, `world-drone-landing.webp` | The corroded scout drone underwater and airborne, with broken rotors, reeds, drips and a subdued red lens. |
| `fish-species-and-drone.webp` | Readable scale views of the perch, carp, pike and drone, underwater and landed. |
| `water-cues.webp` | Close views of waiting, nibble, hook, warning, surge and tired fish. |
| `reeling-eight-directions.webp` | Painted survivor arm and rod placement across all eight facings. |

The fish and drone encounters in the world images are driven by the actual
fishing controls and state machine. The drone sequence begins at the seeded
450-second feeding epoch, aims at the visible clue, hooks it and alternates
reeling with easing off. It does not inject a forced catch or replace an
ambient fish with a drone.

The renderer inspection found two issues which were corrected: the cast
release previously recalculated a slightly different landing point, and the
invalid marker had too little contrast against the deck. The engine now
preserves the exact preview target or rejects the cast. The marker has a dark
outline and a clearer rust colour. The warning also includes an explicit
progressive turn before the burst.

## Rendering checks

`renderer-verification.json` contains the compact results, source hashes,
real encounter stages, shoreline checks and image hashes.

- Preview and flight use the same 33 sampled points and endpoint.
- The rod reuses its 21-point geometry. Per-world scratch records and the
  three authored species profiles are cached.
- Six visible, weighted fish use three distinct anatomical forms. Their
  complete routes passed 14,400 water-containment samples.
- Reduced motion freezes decorative swimming, float bobbing, wakes and
  reel motion. The native rendering check compares identical output across
  different clock values with reduced motion enabled.
- The production world renderer warmed 68 required source assets with no
  missing textures. Original LFS artwork was hydrated with byte-length and
  SHA-256 verification; the lake and pier imagery were not replaced.
- All new drawing uses the shared native-supported path, ellipse, transform,
  clip, fill, stroke and image operations. No offscreen animation canvas,
  generated per-frame texture, unsupported curve command or shader was added.

The full-world proof images are 1688 by 780 pixels, corresponding to an
844 by 390 logical landscape viewport. Compressed WebP copies preserve their
original dimensions. The machine report identifies the views refreshed after
the final rendering changes and the unchanged-phase views retained from the
earlier production inspection.

## Reproduce

Install the root and native dependencies and hydrate the original native
artwork. Run from the repository root:

```sh
node scripts/check-fishing-water-life.mjs --output=.qa/fishing-gameplay-v2/water-life
node docs/qa/fishing-gameplay-v1/render-character.mjs
node scripts/check-fishing-v2-render.mjs
node docs/qa/fishing-gameplay-v1/render-production.mjs after --views=aiming,invalid-aim,casting,nibble,bite,warning,surge,landing,release-air,release-water,drone-aiming,drone-hauling,drone-landing
```

The production harness batches any required original LFS assets and verifies
their bytes before decoding them. Runtime PNGs and detailed reports go under
`.qa/fishing-gameplay-v2`; the committed evidence here is compact review output.
Physical touch timing, haptic strength, speaker balance and sustained iPhone
performance remain device checks rather than claims made by this renderer QA.
