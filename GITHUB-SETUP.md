# Working with this repository

This import contains the verified Humans Remain export from published version
322, source commit `4fb29e47ef5aac4ba49ee115dae54740a55ea614`. All 8,721 export
files are preserved. The GitHub import adds only this document and
`.gitattributes`, which places binary originals and embedded-image SVG maps in
Git LFS and preserves exact line endings.

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
python3 tools/verify-export.py
```

On Windows, use `py -3 tools/verify-export.py` if Python is installed through the
Windows launcher. Run the inventory check before making development edits.

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
See `MIGRATION.md` for the separate Expo/native install, iOS export commands,
backend bindings and authentication requirements.

## Export and hosting provenance

`FILE-INVENTORY.csv` covers the verified export payload. The two inventory
metadata files are covered by the original archive checksums. The new Git
attributes and this setup document are import support, outside that original
payload inventory.

This repository includes no GitHub Actions deployment workflow. The preserved
`.openai/hosting.json` identifies the original live Site; it is provenance, not
an instruction to redeploy that Site. Configure a new hosting workflow
deliberately when you are ready to change hosting.
