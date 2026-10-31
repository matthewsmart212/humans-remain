# Local game and editor preview

`local-preview.mjs` was added as migration support on 2026-10-31. It loads the
project's **actual compiled Worker** from `dist/server/index.js` and supplies
local equivalents of its D1, R2 and static asset bindings. The game, renderer,
editor, API validation and save logic still come from the original source.

This helper is for development on your computer. The original production Site
and its services are not changed by running it.

## Start

Use Node.js 24.22.1, the version used to verify this export. From the extracted
project root:

```sh
npm ci
npm run typecheck
npm run build
node tools/local-preview.mjs
```

Open <http://127.0.0.1:8787/>. The editor is available through the game's editor
navigation or <http://127.0.0.1:8787/#editor>. The local server binds only to
`127.0.0.1`; it is not available on another device over your local network.

On its first start the helper applies the project's original SQL migrations and
seeds a new local database using these exported public game snapshots:

```text
migration-data/world-layout.json
migration-data/artwork.json
migration-data/checklist.json
```

It preserves the saved draft, applied layout, revision, latest artwork
configurations, custom asset definitions and public checklist values. Uploaded
files are read from `public/api/asset-files/<id>` and retain their original
`/api/asset-files/<id>` URLs. Their actual bytes determine MIME type and image
dimensions, including original uploads that later received a different runtime
reskin. Existing artwork metadata stays unchanged in the API snapshot.

When the following original table metadata exports are present, the helper
uses their actual rows for custom assets, checklist values and uploaded-file
metadata:

```text
migration-data/custom-assets.json
migration-data/checklist-rows.json
migration-data/asset-art-files.json
```

Cached upload bytes are checked against original MIME type, dimensions and byte
count before the seed is committed. Metadata for an unavailable upload can be
preserved; its file remains unavailable and the API correctly returns 404.

The seed is a development database assembled from the included public
projections and original table metadata. It is not represented as an original
D1 database dump. Latest artwork configurations come from the complete public
snapshot; the helper does not reconstruct unexposed or truncated revision
history or any inaccessible upload. Additional archival database evidence is
documented separately in `MIGRATION.md`.

## Local saves and artwork import

The default mode supplies a fictional local owner identity
`local-owner@example.test` to the original Worker. It lets you save editor
changes, edit the asset checklist and import new artwork without logging in to
the production Site. Incoming identity headers are discarded.

All local database changes and newly uploaded files stay under:

```text
.local-preview/database.sqlite
.local-preview/objects/
```

The exported snapshots and cached originals are not overwritten. Subsequent
starts reuse this local database and do not reset your edits. Browser-only
drafts and Survival progress also continue to use the application's original
browser storage; switching preview ports changes that browser origin.

To preview anonymous/visitor access:

```sh
node tools/local-preview.mjs --read-only
```

Use a different port when another process already uses 8787:

```sh
node tools/local-preview.mjs --port 8788
```

Use a separate data directory for a fresh isolated seed, keeping existing local
work untouched:

```sh
node tools/local-preview.mjs --port 8788 --data-dir /absolute/path/to/new-preview-data
```

When you want to return the default preview to the exported starting state,
stop it, move `.local-preview/` to a backup location, then start it again. Keep
the backup until you have recovered any local work you want. Also use a fresh
browser profile or export/clear the relevant browser-local draft if you want to
discard that separate local state.

## Iterating on source

This helper serves the production build. After changing app source, stop the
preview, rebuild and restart:

```sh
npm run typecheck
npm run build
node tools/local-preview.mjs
```

The repository's original `npm run dev` starts Vite alone. It does not run the
Worker or configure an API proxy; on its own, the artwork gate can receive HTML
instead of JSON and show “Artwork unavailable.” The tested migration workflow
above supplies the required backend. It does not provide Vite hot reload.

`npm run build` creates `dist/client/` and `dist/server/index.js`, regenerates
the world plan page and prunes superseded images from generated build output.
Finished original artwork remains in the export according to the inventory.

## Authentication and hosting limits

The fictional local owner exists only in this helper. The server checks the
loopback address and Host header, rejects cross-origin requests, and requires a
matching Origin header for writes. It does not read real `.env` files, use
production credentials, authenticate with ChatGPT, or call live APIs for its
seed data. The local sign-in/out links explain this development mode.

Do not expose this helper through a tunnel, proxy or public host. A later public
deployment needs a real authenticated gateway and the application's required
bindings. The original Sites server trusts identity headers supplied by Sites;
a new public server must never trust arbitrary caller-supplied copies. See
`MIGRATION.md` for the production dependency and migration boundary.

This helper does not point the native app at localhost. `native/config.ts`
continues to use the existing published Site, and the bundled native snapshot
remains its offline fallback. Physical iPhone tests need a deliberately
configured reachable backend or the bundled offline mode.

## Verification scope

The export's `MIGRATION.md` records the checks actually completed. The helper
can exercise the original Worker APIs, static assets, local saves and uploaded
art storage. It does not emulate Cloudflare performance limits, production
authentication, device rendering performance, Apple signing or App Store
distribution.
