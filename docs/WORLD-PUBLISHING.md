# Published world shared across devices

**Canonical world endpoint:** `https://humans-remain.matthew-smart212.workers.dev/api/published-world`

The browser editor distinguishes **Save** (private local/owner draft) and **Publish World** (the active world for new game sessions). The existing Cloudflare D1 `world_layout.applied_json` is the published layout; `draft_json` stays private. Both the editor and the native app use the same `WorldLayout` format, including object position, size, rotation, layers, collisions, asset IDs, and terrain references.

## Token-free owner publishing (one-time setup)

The editor now supports **Cloudflare Access email sign-in**. No WORLD_EDITOR_TOKEN is needed to publish after owner sign-in. The old key method remains available as a fallback during migration.

1. In Cloudflare **Zero Trust → Access → Applications**, add a **Self-hosted** application for **only** the path `/api/editor-session` on the public Humans Remain hostname. Restrict its policy to **your exact email address** (email one-time PIN works). Do **not** protect the entire Worker or `/api/published-world`: new iOS game sessions and public players need to read it.
2. In **Workers & Pages → humans-remain → Settings → Variables and Secrets**, set `SITE_OWNER_EMAIL` to that same owner email. It is a simple account setting, not a publishing token. You only do this once.
3. Redeploy `main`, including the automatic D1 migration `0005_owner_editor_sessions.sql`.
4. Open the Cloudflare-hosted game → Settings → World editor → **Owner Sign-In**. Cloudflare verifies your email. After successful sign-in the editor stores an **HttpOnly, Secure, 60-day device session** whose random verifier is stored only hashed in D1.
5. Move buildings, reposition each upgrade tier, save drafts, and press **Publish World** when ready. Changes publish to Cloudflare for all players starting a new session. The optional `GITHUB_WORLD_SYNC_TOKEN` on the *server* is still required to also update the bundled iOS fallback on GitHub.

The owner login endpoint is never considered proof of ownership from request headers alone: it requires Cloudflare's verified Worker `ctx.access` identity, matching `SITE_OWNER_EMAIL`. Anyone else remains read-only even if they try to forge an email header. The application should leave only the sign-in path behind Access, rather than restricting public game assets or the world read API.

If you have not configured Access yet, the existing legacy **Use existing owner key** option still works. It uses `WORLD_EDITOR_TOKEN` only if that old Worker secret is already installed. This avoids locking you out while switching methods.

The published endpoint is read-only, returns no editor draft, and allows cross-origin GETs for the iPhone app. A published release is selected when a **new game boots**; it does not rewrite a running player's positions, inventory, building condition, or personal progress.

The iOS game's `WORLD_URL` must point to the same public Cloudflare Worker for images uploaded to its R2 artwork storage. New artwork needs to be uploaded and published on that Worker too. Native gameplay changes, new art types needing renderer support, and app-store binary changes still require an app update.

## Important: there are two hosting databases

The private ChatGPT Site at `humans-remain.matthew-smart212.chatgpt.site` and the Cloudflare Worker have **separate** D1 storage. Publishing from one does not automatically update the other. To guarantee the immediate cross-device result, edit and publish using the **Cloudflare-hosted editor**.

The separately configured `GITHUB_WORLD_SYNC_TOKEN` integration, when available, can commit a published snapshot to `native/assets/world-snapshot.json` on GitHub, which triggers the Cloudflare workflow. This is a bundled fallback and deployment path, **not a substitute for checking the Cloudflare live endpoint**. Do not claim cross-device publication until the Cloudflare endpoint reflects the new `updatedAt` value.

## Verification checklist

- Cloudflare editor unlocks with the server-side owner key but a normal visitor cannot publish.
- Move one object, Save Draft: `/api/published-world` does **not** change.
- Publish World: the same endpoint returns the new coordinates and a newer `updatedAt`.
- On iPhone, close the current game and start a fresh session: the moved object appears at the published location.
- Disable network and start again: cached or bundled world still opens.
- Test any newly uploaded custom artwork against the Cloudflare R2 image URL, not merely the editor preview.

No background updates are applied to live Survival runs. Co-op hosts and joining peers should start on the same published world revision; if offline clients have different revisions, their geometry can differ until the next successful online load.
