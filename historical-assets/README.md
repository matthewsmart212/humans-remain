# Historical original assets

These are original media and asset-data files recovered directly from the project’s existing Git objects. They include older artwork masters, retired runtime art, superseded image versions, original audio, artwork prompts/registration/manifests, and map/world-plan JSON data that are no longer present in the current checkout. No assets were recreated.

The current game source remains in the project root. Files here do not change the active game or its asset references. Keep this directory as an archive of development materials.

`INVENTORY.csv` and `INVENTORY.json` map every exported file to its original project path, Git blob identifier, exact byte size, and SHA-256 checksum. A content blob is preserved once even when it appeared at several historical paths. The listed original path is the one reported by `git rev-list --objects --all`; it is not a complete rename history. Blob identifiers are content provenance, not credentials.

The folder name is the first twelve characters of the Git blob identifier; the original basename is preserved inside it. Superseded variants of one filename therefore remain separate. Current-HEAD duplicates are omitted because their exact content is already in the main export.

Git repository metadata, commit history, old source-code packages, credentials, caches, and temporary build outputs are not included here. Obsolete native source-package ZIPs were deliberately excluded as archives.

All 14 obsolete native source-package ZIP versions were inspected for media members. Every media member was already preserved in the current source assets or the historical files above; those archives added no unique artwork or audio. Their old source code and package copies were not exported.

Three PNG masters in the original historical Git data are truncated. Their original bytes are still preserved; see `ORIGINAL-ASSET-LIMITATIONS.md` for exact paths and scope.

The archive contains 3,159 original media blobs (2,451,464,519 bytes) and 133 original artwork/map data blobs (2,514,305 bytes), plus 28 original artwork README/prompt text files (57,774 bytes), for 3,320 original asset and context files totaling 2,454,036,598 bytes. Historical application source, dependency manifests, private data, and generated runtime logs were excluded. The artwork/map JSON files contain no credential matches, account fields, email literals, or external URLs in the export audit.
