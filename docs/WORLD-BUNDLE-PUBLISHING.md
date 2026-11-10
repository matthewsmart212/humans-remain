# Publishing one world to Cloudflare and the iOS bundled snapshot

The editor can save a private draft or **Publish** the permanent layout. The
primary Publish button prompts before changing the world for new player runs.
The Cloudflare Workers URL is public, even when only one developer currently
uses it; anonymous publishing would let anyone overwrite the world.

## One-time setup (secrets are NOT GitHub source files)

The authoritative public game origin used by native is
`https://humans-remain.matthew-smart212.workers.dev`. Publish from its World
Editor, not the separate legacy or private ChatGPT Sites; their D1 stores may
not be the same Cloudflare database.

1. Create a **fine-grained GitHub personal access token**, restricted to
   `matthewsmart212/humans-remain` with **Contents: Read and write**. This is
   solely for the server to commit `native/assets/world-snapshot.json`.
2. In Cloudflare Workers & Pages, select the **humans-remain** Worker, open
   **Settings → Variables and Secrets**, and add the encrypted secret
   `GITHUB_WORLD_SYNC_TOKEN`. Do not store it in GitHub source, browser
   JavaScript, Expo config or a public environment variable.
3. To unlock editing on the public Cloudflare Worker, create a separate,
   unpredictable **32+ character** secret `WORLD_EDITOR_TOKEN` in the same
   Worker. Tap **Unlock Publishing** in World settings and enter this key
   **once per browser/device**. The Worker saves a secure HttpOnly owner cookie
   for 90 days. You don't need to sign into ChatGPT or re-enter the key on
   every visit. Keep the key private. The GitHub token must never be entered
   in the editor.
4. Once the Worker deploy includes this code, open its World Editor, tap
   **Unlock Publishing** if necessary, make a placement change and tap
   **Publish World**. Confirm the prompt. The status
   must say **Cloudflare and GitHub** and include a GitHub commit ID before
   considering the bundled update successful.

The same two values can also be set using the Cloudflare CLI in a configured
checkout, for example:

```sh
npx wrangler secret put WORLD_EDITOR_TOKEN --name humans-remain
npx wrangler secret put GITHUB_WORLD_SYNC_TOKEN --name humans-remain
```

Each command prompts privately for the value. Never commit credentials.

## Behaviour and rollback

- **Ctrl/Cmd+S / Save Draft**: saves locally and, once owner access is unlocked,
  also saves to the existing D1 database, without changing the world used by
  other players.
- **Publish**: saves the validated world as the Cloudflare published world,
  then commits the same layout and authoritative artwork metadata to
  `native/assets/world-snapshot.json` on `main`. The update uses GitHub's
  non-force Git API and preserves all other repository files.
- If the GitHub token is not configured, invalid or lacks permissions, the
  editor reports **iOS bundle NOT updated**; the newly published Cloudflare
  world remains available for new online sessions. An existing GitHub snapshot
  is never overwritten with a placeholder.
- GitHub's commit will trigger the existing repository build/deployment
  workflows. Pull the current `main` in Cursor, restart Expo/Metro if necessary,
  and start a new game to use the bundled snapshot. Already installed native
  binaries can only get a new bundled fallback through an app/OTA release.
  The native client separately checks Cloudflare's public published-world API
  on startup and keeps an offline fallback.
- Roll back the permanent world by publishing a prior exported layout in the
  editor. GitHub retains previous snapshot versions in commit history.

**Limits:** This publishes JSON placements, transformations, item IDs and the
artwork metadata used for rendering; it does not automatically put newly
uploaded image bytes inside the iOS app bundle. New art must be reachable at
the configured world origin or packaged via the native asset preparation
workflow before a release. Publishing from a separate ChatGPT Site updates
that Site, not the Cloudflare database used by native.
