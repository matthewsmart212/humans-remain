# Fresh Humans Remain deployment

The replacement Site is live at
<https://humans-remain.matthew-smart212.chatgpt.site> and is currently private
to its owner's ChatGPT account. Use the exact project identity and bindings in
`deploy/hosting.json` for its separate hosting checkout. The legacy Safety Last
Site and the root `.openai/hosting.json` are retained separately.

The first release publishes game source commit
`b72fa9ac8af2a734654fb7b3c2a2b3cdf9acaec8` from hosting commit
`33f198d8d5690e473c14702ed19f77aaf4442976` (Site version 1).

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

The initial source transfer encountered a 64 MiB limit per Git push. Its full
release was transferred in six successive commits without omitting any files.
Keep subsequent changes incremental; splitting a first import into commits
requires pushing each commit before the next one, not pushing all six together.
The local artifact upload timed out, so the successful first publication used
the complete hosted source and its dependency-free server-side build.

The game release remains private until its audience is explicitly changed.
