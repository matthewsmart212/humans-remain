# Working with this repository

This repository was initialized from the verified Humans Remain export of
published version 322, source commit `4fb29e47ef5aac4ba49ee115dae54740a55ea614`. The initial import preserved all
8,721 export files and added this document and `.gitattributes`. Subsequent
commits contain ongoing development. Binary originals and embedded-image SVG
maps use Git LFS, with exact line endings preserved.

The export reports describe the state when the downloadable archives were
created, before this GitHub import. Keep them as provenance. Missing historical
backend items and pre-existing damaged historical images remain explicitly
documented in `MIGRATION.md` and `EXCLUSIONS.json`.

## Clone and retrieve all artwork

Install Git and Git LFS on your development machine, then run:

```sh
git lfs install
git clone https://github.com/matthewsmart212/humans-remain.git
cd humans-remain
git lfs pull
git lfs fsck
```

The `FILE-INVENTORY.csv` hashes and `tools/verify-export.py` describe the original
export, before ongoing development. Run that checker on the original archives
or the initial import commit (`ab7ffa0146d9d6684ab8557a78ab9f6244dc8263`).
Later intentional source changes are expected to differ from those historical
hashes. Use `git lfs fsck` for the current checkout's large asset integrity.

There are 7,185 LFS-managed asset paths representing 6,816 unique original
objects (3,557,435,200 bytes). A checkout without the LFS objects contains small
pointer files at those paths and cannot build or render the complete game.
The ordinary source, JSON and documentation remain ordinary Git files.

## Run locally

Use the tested Node 24.22.1 / npm 11.9.0 toolchain:

```sh
npm ci
npm run typecheck
npm run build
node tools/local-preview.mjs
```

Open <http://127.0.0.1:8787/>. Local editor changes stay in `.local-preview/`.
After source changes, stop the preview, rebuild, and restart it. `npm run dev`
alone starts the frontend without its required Worker APIs.
See `MIGRATION.md` for the separate Expo/native install, iOS export commands,
backend bindings and authentication requirements.

## Export and hosting provenance

`FILE-INVENTORY.csv` covers the verified export payload. The two inventory
metadata files are covered by the original archive checksums. The new Git
attributes and this setup document are import support, outside that original
payload inventory.

This repository includes no GitHub Actions deployment workflow, so a GitHub
push alone does not publish the live Site. Matthew's development workflow is
to complete both steps for every game update, including native-only changes:
commit and push the shared repository, then reconcile, build and publish the
matching source through Sites. `.openai/hosting.json` identifies the existing
live Site and its bindings; preserve them and its audience. See `AGENTS.md` for
the required handoff and source reconciliation rules.
