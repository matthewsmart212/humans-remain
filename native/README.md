# Humans Remain for iPhone

This Expo app opens straight into Survival through native Skia. It uses the
same simulation, Scrap Runner artwork, tree chopping, foliage contact, terrain
streaming and bunker travel as web Play. There is no native world editor, editor
sync, launch menu, testing sandbox or spawn panel. Existing progress resumes
automatically; a first launch starts a fresh run.

Open the parent project folder in Cursor, then:

```sh
cd native
npm ci
npx expo start
```

After pulling an update, run `npm ci` again if dependencies changed and use
`npx expo start --clear` to discard an old Metro bundle.

Use a compatible Expo Go build for SDK 58, or `npm run ios` on a Mac with Xcode
and signing configured. Keep the parent `src` and `public` folders alongside
this folder. Read `../docs/APP-RUNTIME.md` for world syncing, offline fallback,
controls, checks and device-testing limits. The world and its artwork ship with
the app and work offline. Saving a browser editor draft does not change the
iPhone game; world updates are reviewed and bundled into a new app update.

Survival progress saves in AsyncStorage on this device. New Survival run in the
pause menu replaces it after confirmation. An unreadable save is kept and shown
on the pause screen rather than silently overwritten. HQ blueprints, furnace
restoration and the opening three night raids share their rules with the web
game. See `../docs/FIRST-EXPEDITION.md`.

The native save store keeps changing progress separate from cached world layouts.
Existing saves migrate automatically; a failed update keeps the previous valid
checkpoint. Do not delete app storage to install this update.

Native map gestures use the Expo-compatible Gesture Handler dependency. Run
`npm ci` after pulling this update, then restart Metro with `npx expo start --clear`.
For optional iOS memory, thermal and Low Power Mode measurements, rebuild a native
development/release app; Expo Go continues to support the normal recorder and
explicitly marks those extra measurements unavailable. See
[`IOS-PERFORMANCE-CONTEXT.md`](../docs/IOS-PERFORMANCE-CONTEXT.md) for native build
and Instruments instructions.
