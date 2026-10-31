# Export-only changes

The authoritative source is commit `4fb29e47ef5aac4ba49ee115dae54740a55ea614`, published as Humans Remain version 322. The original checkout and live game were not modified during this export.

## Original files deliberately changed in this public export

| File | Reason and resulting behavior |
| --- | --- |
| `server/edit-access.ts` | Removes a real private owner identifier. Adds optional server-only `SITE_OWNER_ID`, alongside the existing `SITE_OWNER_EMAIL`. Owner access requires a configured allowlist and trusted identity; no configuration fails closed. |
| `scripts/check-editor-access.mjs` | Replaces personal identity fixtures with `migration-test-owner`, configures it explicitly, and verifies missing configuration fails closed. |
| `scripts/check-asset-library-cleanup.mjs` | Replaces the personal fixture with `migration-test-owner` and its explicit test environment setting. Historical assertions otherwise remain unchanged. |
| `.gitignore` | Ignores additional real environment variants, local preview data and signing/package artifacts; explicitly permits `.env.example`. |

No unredacted diff containing the removed identifier is distributed. `SOURCE-COMPARISON.csv` records original and exported hashes and detects any additional build-generated differences.

## Added migration material

- `.env.example`: public placeholders; no real secrets.
- `tools/local-preview.mjs` and its README: a loopback-only Node adapter running the original built Worker with local SQLite/object storage. The app/game/editor source remains the actual source.
- `tools/verify-export.py`: validates extracted payload hashes.
- `migration-data/`: read-only captured world/artwork/checklist data, original game-only database metadata, cached-asset provenance and completeness limits.
- `public/api/asset-files/`: 42 original published uploads, keeping the existing URL paths.
- `historical-assets/`: exact media blobs recovered from existing Git objects, with provenance and original defects documented.
- Root migration, provenance, exclusions, inventory and verification documents.

## Excluded material

Dependencies, generated build output, caches, real environment/credential files, private user data, Git metadata, and temporary files are not part of the export. Two tracked temporary files are individually listed in `EXCLUSIONS.json`. Obsolete historical native-source ZIPs are excluded after checking that all their media is otherwise preserved. Unavailable remote material is explicitly identified; no substitute is supplied.

The live host URL, native application identifiers, lockfiles, authored gameplay, current runtime assets and original archive names are preserved as found. The captured data and development adapter supplement the real source; they are not represented as previously published code or a complete raw backend dump.
