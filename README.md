# Humans Remain

The authored world editor and clean Play game, with a shared Expo/iPhone runtime.

## Cursor and iPhone

Open this whole folder in Cursor. Keep `src`, `public` and `native` together.
Use Node.js 22.13 or newer. In the terminal:

```sh
cd native
npm ci
npx expo start
```

Scan the QR code with an Expo Go version compatible with SDK 57. Native game
code lives in `native/App.tsx`; gameplay and rendering are shared with `src`.
Save changes in the web editor to sync its latest world to the app. A complete
current world snapshot and artwork are included for offline first launch.

See [app runtime and validation](docs/APP-RUNTIME.md) for controls, architecture,
source preparation and device-testing limits. To create a fresh source ZIP:
`node scripts/package-native.mjs`.

## Web editor development

```sh
npm ci
npm run dev
```

The hosted web editor uses the configured Cloudflare D1 and R2 bindings for
world saves and uploaded artwork. Those remote services and their credentials
are not part of the source archive. The native app reads the published saved
world and includes its own offline snapshot; it does not require a local web
server. Publish web changes through the existing Sites project workflow.

Survival runs now save locally on each device. See [the first expedition](docs/FIRST-EXPEDITION.md) for headquarters blueprints, furnace restoration, night raids and validation. Online co-op, cross-device saves, signed IPA and TestFlight publication are not included.
