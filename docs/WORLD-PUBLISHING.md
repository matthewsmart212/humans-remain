# Published world shared across devices

**Canonical world endpoint:** `https://humans-remain.matthew-smart212.workers.dev/api/published-world`

The browser editor distinguishes **Save** (private local/owner draft) and **Publish World** (the active world for new game sessions). The existing Cloudflare D1 `world_layout.applied_json` is the published layout; `draft_json` stays private. Both the editor and the native app use the same `WorldLayout` format, including object position, size, rotation, layers, collisions, asset IDs, and terrain references.

## Owner setup on Cloudflare

1. Deploy the Worker from `main` using the existing Cloudflare deployment action, and apply the D1 migrations.
2. In **Cloudflare Dashboard → Workers & Pages → humans-remain → Settings → Variables and Secrets**, create a **secret** named `WORLD_EDITOR_TOKEN` containing a randomly generated key of at least 32 characters. Do not use a plain-text variable, put the token in GitHub, or place it in client source.
3. Open the **Cloudflare-hosted** Humans Remain game (not the old Safety Last or separate private ChatGPT Site), enter the world editor from Settings, open **World settings → Unlock editor**, and enter that key. It is retained only in the current browser tab's session storage.
4. Move/resize/rotate assets, press **Save** to keep a draft, and press **Publish World** when ready. Publication requires explicit confirmation and server authorization.
5. Visit the public API above and check `updatedAt` and the returned `layout`. The next iOS game boot retrieves this data; if it is invalid, unavailable, or its artwork fails to warm, iOS falls back to the last cached published copy or the bundled snapshot.

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
