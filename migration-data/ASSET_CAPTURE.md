# Authored world and external asset capture

The source checkout stores most graphics under `public/`, with original artwork under `art-source/` and `artwork-archive/`, and development evidence and asset ZIPs under `docs/`. Some owner-uploaded images and the current authored world are stored separately by the published application. This directory records a read-only capture of that public game content on 2026-10-31.

## Captured public state

| File | Published endpoint | Contents |
| --- | --- | --- |
| `world-layout.json` | `/api/world-layout` | Draft world, applied world, revision, update time. Current revision is 77; draft has 4,543 items and applied is null. |
| `artwork.json` | `/api/asset-artwork?scope=world` | Latest public artwork registry including retired records required by saved worlds: 15 records and 11 current custom assets. |
| `checklist.json` | `/api/base-checklist` | Public asset planning marks; current response has an empty rows list. |
| `external-assets.json` | `/api/asset-files/{id}` | Retrieval URLs, local paths, byte counts, dimensions, MIME types, and SHA-256 hashes for downloaded original image bytes; the one unavailable pending image is listed explicitly. |
| `asset-art-files.json` | Read-only Sites D1 table inventory | All 43 original upload metadata rows, captured without truncation, including original object keys and publication state. |
| `snapshot-provenance.json` | Same public origin | Snapshot provenance and hashes. |

The origin for these captures is `https://safety-last.matthew-smart212.chatgpt.site`. Asset and public game-state requests used only GET. The original upload metadata was subsequently read through the Sites read-only database viewer. The session-dependent `canEdit` field was removed from the saved API responses. No sign-in response, account information, browser save, telemetry, password, API credential, or private upload was captured through these endpoints.

The three public endpoint snapshots are application projections, not a full database backup. The separate `asset-art-files.json` contains the complete original upload metadata table. The server applies current artwork reskins when building the public registry; this can change an image URL while retaining an original upload ID. Public response data must not be mistaken for the original database row or complete revision history. Additional database exports, if supplied elsewhere in this export, have their own provenance.

## Uploaded images and working paths

The source and historical files in the current checkout contain 19 distinct real upload IDs. A complete read-only database inventory revealed 43 original upload rows: 42 published and one unpublished. All 42 published image URLs returned HTTP 200, including uploads not referenced by the current game. Their 72,606,551 bytes comprise 41 PNG images and one JPEG terrain image. Image formats, dimensions, MIME types, and byte counts were checked against the original database metadata. SHA-256 hashes were checked again after copying. The 11 image files already bundled under `native/assets/world/` exactly match the fetched original bytes. The one unpublished image is identified in the unavailable-files section below.

The downloaded bytes are stored at `public/api/asset-files/{id}`. These extensionless names preserve the existing `/api/asset-files/{id}` URLs in world layouts, imported artwork, original animation frames, and historical data. An HTTP server must use the MIME types in `external-assets.json` or inspect the bytes. The included local preview adapter handles these routes through the actual server code and locally seeded artwork metadata. For a hosted Worker deployment, recreate the `asset_art_files` rows and the `ARTWORK` object storage binding; `server/artwork.ts` resolves a row to its `object_key` and reads the original bytes from that store.

All 13 upload URLs appearing in the captured current world/artwork responses are present locally. Other original, retired, and currently unreferenced published uploads have also been retained from the complete database inventory. All 14 static artwork URLs in the current public artwork response are present under `public/`. All 1,801 file paths required by `native/bundled-art.ts` exist in the current source.

The server contains explicit replacement redirects for older terrain and artwork URLs, and the source retains retired catalogue metadata. Those historical strings do not themselves prove a missing current runtime asset. Keep `server/checklist.ts`, its redirect maps, and `src/retired-artwork-paths.json` together with the game source. Historical originals recovered separately should remain identifiable as historical material, rather than silently replacing current artwork.

## Native snapshot comparison

The existing `native/assets/world-snapshot.json` was preserved unchanged at revision 76. Its 4,543 placed item records match the current public draft exactly. The public world is revision 77 with a later update time; its item content is unchanged. Current public artwork contains one additional retired record, `exp_research_planning_t2` revision 2, dated 2026-10-08. The other 14 records are identical to the native snapshot. Both the original bundled snapshot and the captured current world data are included.

`native/config.ts` still points at the original published origin. Native online loading requests `/api/world-layout` and `/api/asset-artwork?scope=world`; it also has cached and bundled fallback behavior. Change that origin deliberately when moving the online service. The export did not alter or redeploy the existing site.

## Artwork, audio, and remaining service dependencies

The current tracked project contains 49 source paintings/images under `art-source/` (76,866,207 bytes), 10 archived artwork files under `artwork-archive/` (11,810,209 bytes), and extensive game artwork and QA media in `public/` and `docs/`. The source asset archives include `docs/world-rocks-v1-assets.zip`, `docs/world-scenery-v1-assets.zip`, and `public/survival/predators-v1/sprite-pack.zip`. Original and unused files are retained by the source export; no artwork was regenerated for this export.

The current checkout has no tracked MP3, WAV, OGG, M4A, AAC, or FLAC file. Current combat sounds are synthesized by `src/combat-audio.ts` using Web Audio oscillators and a generated noise buffer. Six original WAV files from earlier project history were recovered separately under `historical-assets/`: `hit.wav`, `dawn.wav`, `night.wav`, `damage.wav`, `pickup.wav`, and `deposit.wav`. Their original paths, hashes, and recovery provenance appear in `historical-assets/INVENTORY.json`; they are retained as historical assets without replacing the current synthesized implementation. The CanvasKit runtime binary is local at `public/skia/canvaskit.wasm`; `src/skia-web.ts` explicitly loads it from the same origin. The bundled font is `public/fonts/barlow-condensed-black.ttf`.

The only literal external application origin in runtime source is the published game URL in `native/config.ts`. SVG namespace URLs and the `https://app.local` URL-parsing sentinel in server authentication logic are not asset downloads. Package installation still requires the dependency registries named in the lockfiles. Hosted backend operation requires the database, object storage, and trusted owner authentication described in `MIGRATION.md`.

## Exact unavailable upload

The full original upload metadata table lists one pending image whose bytes are unavailable to this export. The ordinary asset GET returned HTTP 404, matching the server rule that unpublished uploads remain owner-only. No authentication was forged, no bypass token was generated, and no live publication flag was changed.

| Field | Original value |
| --- | --- |
| Upload ID | `b98a8a25-3e01-4ead-842a-a131ef19b7a0` |
| Entry | `world-terrain` |
| Original filename | `IMG_9396.jpg` |
| Format and dimensions | JPEG, 3600 × 3600 |
| Original size | 10,348,001 bytes |
| Created | `2026-10-07T04:56:17.106Z` |
| Publication state | `0` (unpublished) |
| Original storage key | `catalogue/world-terrain/b98a8a25-3e01-4ead-842a-a131ef19b7a0` |
| Public route | `/api/asset-files/b98a8a25-3e01-4ead-842a-a131ef19b7a0` — HTTP 404 |

Its metadata is included in `asset-art-files.json`, and its missing bytes are recorded in `external-assets.json` and `snapshot-provenance.json`. No matching file by original filename or byte count was found among the recovered historical media. The current world and current artwork do not reference it. Recovering that pending upload requires legitimate owner access to its bytes or the original image from the owner.

This capture includes every published upload in the complete `asset_art_files` table, including unused uploads. Direct enumeration of orphaned objects that have no database row was not available, so the export does not claim an independent full object-store dump. Other database tables and any limits of their exported revision history are documented separately in the migration materials.
