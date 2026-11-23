# Stillwater lake repaint

The imagegen input and prompt are archived here. The repaint is registered to
the existing lake; it does not change collision, river layout, bridges, or pier
placement. `source.json` identifies the preserved v5 source tiles and sampling
rectangles. The source master is 2660 × 2364 pixels.

To rebuild, fetch only the original batch4 LFS assets:

```sh
git lfs fetch --include='public/survival/river-detail-v5/riverHD4_*.webp,public/survival/river-detail-v5/river-lower-pools-v1-*-*.webp' --exclude='' origin HEAD
node scripts/package-stillwater-lake.mjs --input=artwork-archive/stillwater-lake-v2/lake-repaint.png
node scripts/check-stillwater-lake.mjs
```

The packager verifies each LFS object's SHA256 and size before hydration. It
always resolves the original v5 filenames, even when the current runtime
manifest already points to v2, so rebuilding cannot compound the repaint.
The `.qa` source master is a disposable cache of those originals.

The original bridge capsules and active waterfall rectangles remain exact.
Only their edited sides receive a broad transition to the new material. A
small sampling adjustment pulls the eastern bank towards the unchanged water
boundary near the pier, retaining a wet mud margin. It does not add ground.

Affected HD samples keep their original cores and eight-pixel gutters. Medium
and preview images retain the existing decoded pixels outside the edit scope.
New assets use versioned URLs and direct Git blobs for both web and offline iOS.
