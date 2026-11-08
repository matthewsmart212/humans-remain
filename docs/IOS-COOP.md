# iOS co-op, phase 1: presence pilot

This is an isolated iOS-first presence transport, **not yet shared survival**.
Solo play remains entirely offline. A Cloudflare Durable Object is used for
private four-slot rooms with a short room code. Server state owns the room
roster and relays bounded position snapshots; it does **not** yet validate
movement using world collision, nor synchronize robot damage, loot, inventories,
camp construction, time, or game save data.

The iPhone renders its own world and sprites locally using Skia. Only character
identity, scene and position are exchanged (max ~10 outgoing poses/second).
The connection closes when iOS backgrounds the game, and reconnects when it
returns. The room has a 24-hour lifetime and the code is the invite credential.
Do not treat the pilot as anti-cheat protected or a persistent expedition.

## Deploy the independent lobby worker

Use Cloudflare Wrangler, authenticated to the Cloudflare account where you
want to host co-op:

```sh
npx wrangler@4 deploy --config wrangler.coop.jsonc
```

This deploys `humans-remain-coop` independently of the world-editor website.
It requires Cloudflare Durable Objects with SQLite migrations enabled.
The ordinary `wrangler.jsonc` and website deployment are unaffected.

Create `native/.env.local` locally:

```env
EXPO_PUBLIC_COOP_URL=https://<your-coop-worker-hostname>
```

Restart Metro after setting the environment variable. Build and run on two
actual iPhones; the WebSocket implementation uses React Native's native
WebSocket. Browser FPS results are not a substitute for physical iPhone testing.

## Contract tests

Run `node scripts/check-coop-room.mjs` after root `npm ci` to validate room
creation, hibernation attachments, host permissions, packet validation, room
expiry and player limits without connecting to Cloudflare. The PR typecheck
workflow runs this test too.

## Pilot protocol (v1)

`POST /rooms` -> `{code}`, then `GET /rooms/:code/socket` upgrades to
WebSocket with the selected `name` and `role` in the URL query.
Messages are `welcome`, `roster`, `pose`, `ping/pong`, and `start`.
Only the first connected player can send `start`; four concurrent WebSockets
are allowed. Every accepted message has basic size/type checks and position
packets are rate limited. Cloudflare stores connected-player attachments with
the WebSocket Hibernation API.

The native Play With Friends menu now creates/joins lobbies. When two devices
connect, the host can start the session. Other survivors are rendered with their
selected 8-direction Skia sprites; this is *visual presence only* and their
combat, loot and world simulation are not synchronized. Both phones must have
the same world and app build for coordinates to align. Next: test two physical
iPhones for rendering/latency/background recovery, then convert the shared
simulation to server authority before enabling multiplayer combat or resources.
