# Fresh Humans Remain deployment

`replica-worker.ts` wraps the existing web game for a newly created Site. Its
first request installs the same authored world and artwork definitions bundled
with the iOS game. It does not copy browser progress, old checklist status or
editor history, and never overwrites an initialized destination world.

The normal static game assets are included in the release. Legacy uploaded
artwork is read from the exact, checksum-verified GitHub commit recorded in
`replica-worker.ts`, then cached in the destination's own R2 bucket. No request
uses the old Site's database or artwork storage. New artwork uploads and world
edits continue through the existing owner-authorized APIs.

Build and validate the web client from the same shared source before running:

```sh
node scripts/package-hosted-game.mjs --destination /absolute/new-site-checkout --built-game /absolute/validated/dist --source-commit <full-github-commit>
```

The destination must already contain its own `.openai/hosting.json` with `DB`
and `ARTWORK` bindings. Keep its identity separate from the original Site.
Configure its `SITE_OWNER_EMAIL` or `SITE_OWNER_ID` using verified owner details.
The generated hosting repository contains the ready-to-run game and assets,
with no package dependencies or development history for the remote builder to
download. Future updates still come from the shared GitHub development repo.

The game release remains private until its audience is explicitly changed.
