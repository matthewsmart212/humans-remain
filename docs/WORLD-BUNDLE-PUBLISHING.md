# Publish the shared world and optional iOS snapshot

The world editor on `https://humans-remain.matthew-smart212.workers.dev` now uses **Cloudflare Access owner sign-in** instead of asking for a publish key. See [WORLD-PUBLISHING.md](WORLD-PUBLISHING.md) for the one-time passwordless sign-in setup. The game stays public. Building placement edits save on your device as a draft even when unsigned.

**Publish World** is the one-click, confirmed operation that writes your world to Cloudflare D1 for new online web and iOS sessions. Publishing is restricted to a verified owner; arbitrary clients cannot overwrite your world.

## Optional GitHub bundle sync

The main app also contains an offline bundled world snapshot at `native/assets/world-snapshot.json`. To keep it automatically synchronized after a successful Publish, the Worker needs a **server-only** GitHub fine-grained personal access token:

1. Create a GitHub fine-grained token scoped to `matthewsmart212/humans-remain` with **Contents: read/write**.
2. Add it under Cloudflare Worker **Settings → Variables and Secrets** as encrypted `GITHUB_WORLD_SYNC_TOKEN`.
3. Never add that token to GitHub files, app code or the browser; it is **not** required to sign in or publish online.

If configured, Publish writes the live D1 layout then makes a non-force commit of the snapshot on `main`; this triggers the existing Cloudflare Actions deployment. If not configured, the editor reports that Cloudflare was published but the **iOS bundle was not updated**. New iOS sessions can still retrieve the online published layout. Offline app bundles only change on later releases.

The editor refuses to publish an empty world and protects against simultaneous saves using revisions. You can export a draft JSON file before experimenting and import it to roll back placements. A publish never silently alters an existing running player's camp.
