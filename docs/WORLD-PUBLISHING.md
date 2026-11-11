# Publish the Humans Remain world — simple key setup

The live game is at https://humans-remain.matthew-smart212.workers.dev .

## One-time Cloudflare Worker secret

1. Visit https://dash.cloudflare.com/ and open **Workers & Pages → humans-remain → Settings → Variables and Secrets**.
2. Add a **Secret** named `WORLD_EDITOR_TOKEN`. Generate a random value **at least 32 characters** long (use a password manager). Save and deploy it. Keep it private and do **not** paste it into GitHub or ChatGPT.
3. Open the **Cloudflare-hosted** game → **Settings → World editor → World settings → Unlock Publishing**.
4. Enter the same value **once**. The server returns a secure HttpOnly session cookie that remembers this browser for up to **90 days**.
5. Move and rotate buildings, move independent upgrade tiers, and press **Save Draft** for local/private work. Press **Publish World** and confirm when ready to update Cloudflare's shared world.

The shared world loads for **new** iOS/web game sessions. A running session is not automatically rewritten. Publishing requires owner authentication; anonymous visitors can play but cannot publish.

### Different tokens

- `WORLD_EDITOR_TOKEN`: this is **the one you need** to unlock publishing. It exists only as a Cloudflare Worker secret.
- `CLOUDFLARE_API_TOKEN`: already used separately by GitHub Actions to deploy the website. **Not** entered into the world editor.
- `GITHUB_WORLD_SYNC_TOKEN`: optional **server-only** integration to automatically commit the published layout to `native/assets/world-snapshot.json` for iOS offline fallback. Without it, the newly published Cloudflare world still loads for online iOS/web sessions, but the **offline bundled snapshot will not be updated**.

### Checking your changes

Open `/api/published-world` on the game hostname and verify `updatedAt` after publishing. Start a **new** game session on iPhone while online to see the new placements. If you need to recover local changes, the World editor also offers **Export world**.

### Optional alternative

The repository also supports a passwordless Cloudflare Access sign-in through `/owner-login`, but it requires additional Cloudflare configuration. You do **not** need to set that up for the simple key workflow.

The old ChatGPT Site (if still available) and the live Cloudflare Worker use different databases; publish from the Cloudflare-hosted editor.
