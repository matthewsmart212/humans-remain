# Humans Remain — source export and migration

Export date: 2026-10-31  
Destination requested: `matthewsmart212/humans-remain`  
Authoritative source commit: `4fb29e47ef5aac4ba49ee115dae54740a55ea614`  
Published game: <https://safety-last.matthew-smart212.chatgpt.site> — version **322**

## 1. What this export is

This is a copy of the actual project repository used to build and publish Humans Remain, formerly Safety Last. It includes the current game and world editor, the Worker backend, the separate Expo/React Native/Skia app, both dependency manifests and lockfiles, SQL schema and migrations, build and development scripts, documentation, current artwork, original paintings, unused material, and original asset packs. It also includes separately captured game-authoring data and 42 uploaded images that were stored by the live service.

The local source HEAD, current remote main, and published version 322 all identify the commit above. The source checkout was clean: no newer local modifications or untracked project files were found. No newer unpublished source commit was found. The current live deployment was verified as succeeded. The comparison establishes source provenance; it does not mean this ZIP is byte-for-byte the compiled deployment archive.

The live game's mutable world/artwork data is separate from Git. The captured world is revision **77**, with **4,543** placed items. The original native fallback is revision **76**. Their placed item objects are identical; only revision and update time differ. Current public artwork has 15 records; the native fallback has 14, with the difference being one older retired record. Both originals and the current capture are preserved. See `migration-data/ASSET_CAPTURE.md`.

The export has four deliberate public-safety edits to original files: owner identity configuration in `server/edit-access.ts`, synthetic identities in two test files, and additional ignore rules in `.gitignore`. There are also clearly identified migration helpers, captured data and documentation. `EXPORT-CHANGES.md` and `SOURCE-COMPARISON.csv` distinguish these from the published source. The live source checkout, database, deployment, artwork and settings were not changed, deleted or redeployed during this export.

## 2. Extract and verify all parts

The downloadable ZIPs are **independent normal ZIP archives**, each rooted at `humans-remain/`. They are not byte-split ZIP volumes. Download every numbered part and extract every part into the **same empty parent folder**, merging the common `humans-remain/` directory. Do not nest one part inside another, and do not concatenate ZIP bytes.

The first part contains code, current runtime assets, configuration and migration materials. Other parts contain original artwork, documentation media and recovered historical media. All parts are required for the full inventory.

On macOS/Linux, from a folder containing only this export's numbered ZIPs:

```sh
mkdir -p restored
for part in humans-remain-part-*.zip; do
  unzip -q "$part" -d restored
done
cd restored/humans-remain
python3 tools/verify-export.py
```

On Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force restored | Out-Null
Get-ChildItem humans-remain-part-*.zip | Sort-Object Name | ForEach-Object {
  Expand-Archive -LiteralPath $_.FullName -DestinationPath restored -Force
}
Set-Location restored/humans-remain
py -3 tools/verify-export.py
```

Before extracting, `SHA256SUMS.txt` alongside the ZIPs verifies the archive downloads. Use `sha256sum -c SHA256SUMS.txt` on Linux or `shasum -a 256 -c SHA256SUMS.txt` on macOS. `ARCHIVE-INDEX.json` lists every archive, its checksum, size and member count.

Inside the project, `FILE-INVENTORY.csv` records the relative path, byte size and SHA-256 of each payload file. Its own file and the generated `INVENTORY-SUMMARY.json` are excluded from self-hashing; those files are covered by the archive checksums. `SOURCE-COMPARISON.csv` records every tracked source file, including the two deliberately excluded temporary files. `historical-assets/INVENTORY.csv` maps each recovered historical original to its original path and Git blob.

Verify before making development edits. Later intentional edits will naturally fail the original export hashes. ZIP integrity and payload checks were performed when this export was produced; actual results are recorded in `VALIDATION.md` and the downloadable verification report.

## 3. Install and run the web game/editor locally

Use **Node.js 24.22.1 and npm 11.9.0**, the toolchain used for this export's root build. The repository's older README minimum is insufficient for some locked optional packages; Node 24.12+ in the 24 line or 22.20+ in the 22 line satisfies the observed stricter engine requirement, but the checked toolchain is preferable.

From the extracted project root:

```sh
node --version
npm --version
npm ci
npm run typecheck
npm run build
node tools/local-preview.mjs
```

Open <http://127.0.0.1:8787/> and use the game's editor navigation, or <http://127.0.0.1:8787/#editor>.

The new local helper runs the **actual compiled original Worker** from `dist/server/index.js`. It supplies a local SQLite adapter for D1, local files for R2, and the built static assets. It applies the original migrations and seeds the captured game data. It uses a fictional local owner so you can edit and save on your own machine without production credentials.

Local changes persist in `.local-preview/`; exported snapshots and original asset bytes remain untouched. Stop and restart the helper to keep using that database. For a separate fresh preview use:

```sh
node tools/local-preview.mjs --port 8788 --data-dir /absolute/path/to/new-preview-data
```

To exercise visitor/read-only behavior:

```sh
node tools/local-preview.mjs --read-only
```

After changing source, stop the helper, run `npm run typecheck` and `npm run build`, then restart it. This is a build-and-restart workflow. The original `npm run dev` is a Vite-only frontend server and has no Worker/API proxy; on its own it cannot load the required artwork API. It remains available for future HMR integration.

The helper binds only to loopback, strips incoming identity headers, and keeps all mutations local. It is a development adapter, not a production authentication service. Its full options, persistence behavior and scope are in `tools/README-local-preview.md`.

## 4. Web build and backend services

```sh
npm ci
npm run typecheck
npm run build
```

The original build script is `scripts/build-checklist-server.mjs`. It produces:

- `dist/client/`: the Vite web client and runtime assets.
- `dist/server/index.js`: the bundled Worker backend.

The build regenerates `public/world-plan.html` and removes superseded artwork from generated output. It does not replace the archived originals. Dependencies, build output and caches are intentionally not shipped in the ZIPs.

The production Worker expects these bindings:

| Binding/setting | Purpose and migration requirement |
| --- | --- |
| `DB` | D1-compatible SQLite database. Original schema: `db/schema.ts`; apply the five SQL migrations in `drizzle/` in filename order. |
| `ARTWORK` | R2-compatible object store for uploaded art; supports put/get/delete. Original object keys are retained in `migration-data/asset-art-files.json`. |
| `ASSETS` | Static-asset binding serving `dist/client/`. |
| `SITE_OWNER_EMAIL` | Optional private allowlist setting for the verified owner's email. |
| `SITE_OWNER_ID` | Optional private allowlist setting for the verified owner's subject ID; replaces the personal ID removed from the public export. |
| Trusted identity gateway | Verifies login and injects `oai-authenticated-user-id` and optionally `oai-authenticated-user-email`. |

At least one configured owner allowlist value and a trusted authenticated identity are needed for production editing. No configured owner means editing fails closed. `.env.example` contains placeholders and binding notes. Neither the original Worker nor the local helper automatically loads a real `.env` file.

Sites currently provides authenticated identity headers and the `/signin-with-chatgpt` and `/signout-with-chatgpt` routes. A different public host must implement verified authentication and discard caller-supplied identity headers. Setting an email alone is not a login system.

The original `.openai/hosting.json` is included as nonsecret provenance/configuration and still identifies the existing live Site. Do not use it to publish to that Site when setting up a new host. The source has no existing standalone Wrangler configuration or deployment pipeline to GitHub Pages; these have not been invented or deployed. Moving the repository does not automatically migrate the hosted services.

For a hosted data migration, preserve uploaded metadata rows and import each available cached file into its recorded `object_key`. The local adapter demonstrates working D1/R2 bindings and data import without touching production. The captured latest artwork is an application projection with current reskins; preserve that distinction when deciding whether to seed effective current data or historical original rows. No incomplete record should be silently treated as a full database backup.

## 5. Native Expo / React Native / Skia app

The `native/` app has its own `package.json` and `package-lock.json`. Its React/React Native versions intentionally differ from the web root's dependencies. Keep both lockfiles and run separate installs.

From the project root:

```sh
cd native
npm ci
npm run typecheck
npm run export:ios
npm start
```

`npm start` runs Expo. `npm run export:ios` runs `expo export --platform ios` and creates a JavaScript/asset bundle; it does **not** create a signed IPA. Actual results from this environment are in `VALIDATION.md`.

The native bundle was verified in this restricted environment with `EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 npm run export:ios -- --max-workers 2`, after a clean native install. Those environment options disabled telemetry/home-directory writes and network checks; the actual Expo build script and lockfile were unchanged.

On a configured Mac with Xcode and Apple signing set up:

```sh
cd native
npm run ios
```

The corresponding Android command is `npm run android`. These are the existing package scripts. Native platform generation, device builds and signing require their respective platform toolchains. No pre-existing `native/ios/`, `native/android/`, Xcode project, `eas.json`, signing keys, provisioning profiles or signed IPA were available in the source workspace, so none are claimed to be exported.

The display name is **Humans Remain**. Existing application identity remains `com.safetylast.prototype`, and the Expo slug remains `safety-last-native`; those original identifiers were preserved so this export does not silently create a new app identity.

`native/config.ts` still contains the original published `WORLD_URL`. Native online loading uses that service, with cached/bundled fallback. The included offline world and all 1,801 required local image paths are present. When migrating the backend, deliberately change that constant to the new reachable origin. A physical device cannot reach the loopback-only desktop preview server. Do not refresh bundled native data against production accidentally; the original preparation scripts are retained for intentional use.

## 6. Captured assets and exact completeness limits

The complete current tracked project was copied except two temporary files listed in `EXCLUSIONS.json`. All 42 published upload rows in the complete database inventory have local original bytes, including unused uploads. Existing root artwork, asset packs, maps, layouts, documentation images and archived branding are retained.

An additional **3,159** original media blobs absent from current HEAD were recovered from the existing Git history: **2,451,464,519 bytes**, including six original WAVs. Another 133 original JSON asset/world data files and 28 original artwork README/prompt files preserve their development context. Together the historical collection contains **3,320 originals / 2,454,036,598 bytes**. They are stored once by content under `historical-assets/` with their original filenames and provenance. All 14 obsolete native-source ZIP versions were checked; they contained no unique media beyond the retained originals, so old source-package copies were excluded.

These limits are explicit:

1. **One unpublished upload is unavailable:** `IMG_9396.jpg`, 3600×3600, 10,348,001 bytes; upload ID `b98a8a25-3e01-4ead-842a-a131ef19b7a0`, created 2026-10-07. Its normal download route returns HTTP 404. Metadata is included; image bytes are not. The current game does not reference it.
2. **One historical artwork configuration remains incomplete:** the database viewer returned 37 revision rows, with two hearth cells truncated. Revision 2 was recovered in full from the actual public API and verified against the returned database prefix and unchanged original source captures. Revision 1 remains unavailable in full: `base_hearth_t1`, created `2026-10-10T15:06:47.860Z`. Its metadata and returned prefix are preserved. `migration-data/artwork-history.json` distinguishes 35 complete raw database rows, one public-response recovery, and the one unavailable full configuration. The full effective current artwork and world are captured separately.
3. **Three old PNG masters were already truncated in Git:** exact original bytes are preserved, not repaired. Paths and hashes are in `historical-assets/ORIGINAL-ASSET-LIMITATIONS.md`. These are historical copies, not current runtime images.
4. **No independent complete object-store dump:** all registered published uploads were captured, but no direct enumeration of unregistered/orphaned R2 objects was available.
5. **Hosted services, private account/session data and device/browser saves are not files in this source export.** No private user data, real environment files, credentials or signing material are included. No Git repository metadata or original commit history is included; source and asset provenance are supplied separately.

No unavailable file has been replaced with generated artwork, conversation-derived code or a fabricated database value.

Current combat audio is synthesized in `src/combat-audio.ts`; the recovered WAVs are additional historical originals. CanvasKit WASM and the game's bundled font are local. Dependency registries, production hosting/authentication, and the native online origin remain external dependencies as documented.

### Historical artwork-generation and QA scripts

The standard web build and native export passed using the included finished artwork. Some older authoring tools preserve machine-specific paths or intermediate `.qa` inputs that are not portable to a new checkout. Examples are `scripts/render-tree-style.mjs`, `scripts/prepare-tree-variant-budget.mjs`, `scripts/check-trees.mjs`, `scripts/pack-tree-variants-v1.mjs`, and `scripts/render-camp-perimeter.mjs`; the last has an old scratch `camp-art-downloads` default. Some of these tools also expect separately supplied `sharp`, `canvaskit-wasm`, Python Pillow/NumPy/SciPy, or `CODEX_PRIMARY_RUNTIME_NODE_MODULES`. Their source is preserved, but their old temporary input directories and undeclared tool environments are not claimed to be reproducible. Review each script's explicit inputs before rerunning it. Historical QA reports are retained as evidence of past work, rather than a claim that every old generation command passes today.

## 7. Put the extracted project in GitHub

Do not upload the ZIP parts themselves as the source repository. Extract them first and keep the inventory for review. No GitHub push, repository change or deployment was performed during this export.

There is no individual exported source/media file above GitHub's ordinary per-file hard limit, but the complete assets/history are several gigabytes. Configure **Git LFS before the first commit** if you want all binary originals in the public repository. GitHub limits a single ordinary Git push to 2 GiB and recommends LFS for large binary material. LFS storage and bandwidth follow your account's plan; verify available capacity.

For a new empty local repository, after extraction:

```sh
git init -b main
git lfs install
git lfs track "*.png" "*.jpg" "*.jpeg" "*.webp" "*.gif" "*.wav" "*.mp3" "*.ogg" "*.m4a" "*.zip" "*.wasm" "*.ttf" "*.woff" "*.woff2" "*.mp4" "*.pdf" "public/api/asset-files/*"
git add .gitattributes
git add .
git status --short
git lfs ls-files
```

Review the staged files and commit when ready. The destination remote is:

```sh
git remote add origin https://github.com/matthewsmart212/humans-remain.git
```

If that repository already has commits, clone it first and import the extracted files on a branch, preserving its existing `.git/` and reviewing filename conflicts. Do not replace its history or force-push to import this export. A later clone using LFS needs `git lfs install` and `git lfs pull` so real asset bytes are available to the build.

The expanded binary collection includes original art and historical variants, not merely runtime necessities. It may alternatively be maintained as a separately backed-up original-assets collection, but the supplied export keeps it all available.

Official references:

- <https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github>
- <https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits>
- <https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage>

## 8. Verification and review files

Start with `VALIDATION.md` for actual build/runtime checks and known pre-existing test failures. `EXPORT-PROVENANCE.json` records the published version and source comparison. `EXPORT-CHANGES.md` explains every changed original file and the added migration support. `FILE-INVENTORY.csv`, `SOURCE-COMPARISON.csv`, `EXCLUSIONS.json`, and the archive checksums make the delivered contents auditable.
