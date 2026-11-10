# Publish the Humans Remain world without entering a token

The public game is at `https://humans-remain.matthew-smart212.workers.dev`.

- **Edit:** Drag buildings, adjust tiers, move props, and save a local draft immediately. This works without sign-in. No other player's world changes until Publish.
- **Publish World:** Sign in as the owner with Cloudflare Access (email one-time PIN or your chosen identity provider). The server verifies Cloudflare's signed session, then writes the shared layout to D1.
- **Play:** New game sessions load `/api/published-world`. Running games are not silently moved. Expo/iOS also has cached and bundled offline fallbacks.

## One-time Cloudflare Access setup (no publishing key in the editor)

The public game must remain public; **do not protect the whole Worker**.

1. Cloudflare dashboard → **Zero Trust → Access controls → Applications → Add application → Self-hosted**. Make an application for the exact game hostname, with the path `/owner-login` only. If your dashboard offers Worker-level protection, do **not** select it; it would require every player to sign in. Cloudflare supports application-specific path rules.
2. Allow **only your own email** in the application's Access policy. Enable **One-time PIN** as the identity provider (or use your existing trusted SSO account). Set the application cookie's **Cookie Path Attribute to disabled**, so the signed `CF_Authorization` cookie can be sent to the normal same-host editor API after returning to `/#editor`. Leave HttpOnly enabled.
3. From the new Access app, copy its **Application Audience (AUD) tag**. Find your **team domain** in Zero Trust (format `https://YOUR-TEAM.cloudflareaccess.com`).
4. In **Workers & Pages → humans-remain → Settings → Variables and Secrets**, add:
   - `CF_ACCESS_TEAM_DOMAIN`: full HTTPS team domain.
   - `CF_ACCESS_AUD`: the application's AUD tag.
   - `CF_ACCESS_OWNER_EMAIL`: your own exact sign-in email, in a server-only variable/secret.
   Use encrypted secrets if preferred. The app does not read these values in client JavaScript.
5. Deploy the latest `main` (normally automatic). In the game, enter **Settings → World editor → World settings → Sign in to publish**. Cloudflare asks for your email PIN once per configured Access session, then returns to the editor. Publishing requires one explicit confirmation.

The editor no longer asks you to enter `WORLD_EDITOR_TOKEN`. The old server-side owner-cookie mechanism is retained only as compatibility for sessions already unlocked; **it is not required by the new sign-in**. Until the Access setup above is completed, the world can still be edited and saved locally, but public publishing remains locked. We do not allow an anonymous overwrite of your world.

### GitHub snapshot is a separate optional setting

`GITHUB_WORLD_SYNC_TOKEN` is **not** an editor sign-in token. It is an optional server-only fine-grained GitHub credential that commits a newly published world snapshot to `native/assets/world-snapshot.json`. Without this separate server-side integration, **Cloudflare's D1 world still publishes and online iOS/web sessions can load it**, but the offline bundled fallback does **not** automatically update. Configure the token only if you need automatic GitHub snapshot commits, with repository **Contents: read/write** permission. Never expose it in the editor.

## Test the setup

1. Open the public game in a private window: it should launch normally, and unauthorized `PUT /api/world-layout` must return **403**.
2. Open `/owner-login` as the owner: Cloudflare should present sign-in or reuse the signed session, then redirect to `/#editor`. The **Publish World** control should appear after the access status loads.
3. Move one building, choose **Save Draft**: it must not change `/api/published-world`.
4. Choose **Publish World**, confirm: `/api/published-world` must return a newer `updatedAt` and the new position. On iOS, start a fresh run while online and check it loads the updated placement.
5. Disconnect the network: the previous cached/bundled world should remain available.

A Cloudflare D1 world and any legacy ChatGPT Site's D1 are **different databases**. Publish from the Cloudflare Worker above for all devices.
