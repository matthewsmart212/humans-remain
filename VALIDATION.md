# Validation performed for this export

Source commit: `4fb29e47ef5aac4ba49ee115dae54740a55ea614`; export date: 2026-10-31. Validation used an isolated staging copy and local test data. No production writes, deployment, GitHub push or original source changes were made.

## Source and current game

- Local HEAD, read-only remote main, and published version 322 source provenance matched.
- The authoritative checkout was clean; no newer unpublished code was found.
- The existing deployment was verified as succeeded at the published URL.
- Every current tracked source file is accounted for in `SOURCE-COMPARISON.csv`: original bytes, a documented public-safety edit, or an explicit temporary-file exclusion.
- Current live world revision 77 contains 4,543 items, identical to the item objects in the original bundled native revision 76.
- All 42 published uploaded image originals were downloaded, format/dimension/size checked against metadata, copied, and SHA-256 verified.
- All 13 uploaded URLs and 14 static artwork URLs in the captured current state resolve to included local bytes; all 1,801 native image require paths exist.

## Web and authentication

Toolchain: Node **24.22.1**, npm **11.9.0**.

| Command/check | Result |
| --- | --- |
| `npm run typecheck` at project root | Passed |
| `npm run build` at project root | Passed; Vite 6.4.3, 2,420 modules |
| Generated `public/world-plan.html` comparison | Identical to original |
| `node scripts/check-editor-access.mjs` | Passed |
| `node scripts/check-asset-library-cleanup.mjs` | Known pre-existing fixture failure; details below |

Root validation reused the authoritative checkout's already installed locked dependencies through a temporary staging symlink. That symlink and all dependencies are excluded from the export. The exact clean installation command for a new clone is `npm ci`; both lockfiles remain unchanged.

The authentication check covered anonymous access, configured owner access, other-account access, safe return URLs, no allowlist leakage, caching and all write guards. The public export uses a configurable server-only owner ID instead of the removed private identifier.

### Pre-existing historical test failure

`scripts/check-asset-library-cleanup.mjs` fails at its `retainedCustomIds` assertion around line 33. Its October 10 fixture expects “Base wall 1” to remain removed, while the current library policy includes that asset. The identical failure was reproduced in the untouched original source. The original fixture and current game behavior were preserved; no assertion was weakened to hide it.

This means the export is not represented as passing every historical test. This failure does not prevent the successful current web build or local runtime checks.

## Local game/editor adapter

The migration helper runs the actual compiled Worker, with local SQLite/object storage and no live API calls. Tests used an isolated data directory outside the exported project.

Passed:

- First seed matches captured world and artwork responses exactly.
- Original metadata includes all 43 uploads and all 12 custom asset rows; 42 image byte files are available.
- All 42 uploaded files hash-match through the original Worker routes with correct MIME types: 72,606,551 bytes.
- HTML, built JavaScript, CSS and CanvasKit WASM load.
- Local world save works; a stale revision receives HTTP 409.
- Artwork upload and streaming terrain upload persist correct local bytes.
- Saved world revision and uploads survive restart.
- Read-only visitor mode denies writes, including caller-supplied forged identity headers.
- Host/Origin checks reject foreign origins and write requests without a matching Origin.
- Large denied writes return HTTP 403 cleanly.
- The unavailable pending upload remains HTTP 404; no bytes are fabricated.

## Native build

From `native/`:

| Command/check | Result |
| --- | --- |
| Clean `npm ci` | Passed; 497 packages installed; lockfile unchanged |
| `npm run typecheck` | Passed |
| `EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 npm run export:ios -- --max-workers 2` | Passed |

Metro bundled 3,569 modules. The iOS export contained 1,875 assets and a 6,686,205-byte Hermes bundle. Its SHA-256 was `e8ea98a1e84e81bd913b400f41fe94fa20d2b0774225109f1791f3d6692a046f`.

The initial native export attempted to write Expo telemetry state to an inaccessible home directory. Disabling telemetry and network checks allowed the bundle to complete in this restricted environment. On a normal development machine the existing `npm run export:ios` command remains the standard script.

No signed IPA, physical device/simulator test, Apple signing, TestFlight upload or store distribution was performed. Generated native export output and installed packages were removed from the stage after validation.

## Original assets and public-data checks

The 3,320 recovered historical originals were verified against their Git blob identities, SHA-256 inventoried, and retained without regeneration. They include 3,159 media files, 133 JSON asset/world data files and 28 artwork context documents. Three historical PNG originals were already truncated; their condition and unchanged bytes are documented separately.

The three retained original asset ZIPs were checked for CRC integrity and safe internal paths. Fourteen obsolete native-source package ZIP versions were inspected and added no unique media. No unregistered object-store enumeration was available.

Credential-pattern, sensitive-filename, known private-owner-identifier, email and nested-archive checks were performed. Raster metadata was inspected for embedded location/device/owner data. These are concrete scoped checks, not an absolute guarantee that every conceivable sensitive value can be recognized. The user-facing security summary is `PUBLIC-EXPORT-REVIEW.json`.

## Archive verification

The supplied download report records the checks on the actual finished ZIP files: safe paths, no symlinks, unique file membership across parts, exact union with the staged payload, ZIP CRC validation while extracting, and SHA-256 verification of the extracted inventory.

The archive report and `SHA256SUMS.txt` are provided alongside the ZIPs to avoid circularly embedding each archive's own checksum. The ZIPs include this document, the inventory, source comparison, exclusions and a portable `tools/verify-export.py` verifier.
