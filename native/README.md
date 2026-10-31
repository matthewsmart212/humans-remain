# Humans Remain for iPhone

This Expo app plays the authored editor world through native Skia. It uses the
same simulation, Scrap Runner artwork, tree chopping, foliage contact, terrain
streaming and bunker travel as web Play. The old factory mode is removed.

Open the parent project folder in Cursor, then:

```sh
cd native
npm ci
npx expo start
```

Use a compatible Expo Go build for SDK 57, or `npm run ios` on a Mac with Xcode
and signing configured. Keep the parent `src` and `public` folders alongside
this folder. Read `../docs/APP-RUNTIME.md` for world syncing, offline fallback,
controls, checks and device-testing limits.

Survival progress saves in AsyncStorage on this device. Continue resumes it; New Survival run replaces it after confirmation. HQ blueprints, furnace restoration and the opening three night raids share their rules with the web game. The testing sandbox does not overwrite Survival saves. See `../docs/FIRST-EXPEDITION.md`.
