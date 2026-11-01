# Humans Remain development and publishing

- Use `matthewsmart212/humans-remain` as the shared development repository. Start
  from its latest `main` and preserve changes made in other chats or checkouts.
- For every completed game update, commit and push the changes to GitHub **and**
  publish the matching source to the existing live Site. This also applies when
  the behavior change is specific to the Expo/iOS app, unless Matthew explicitly
  asks to skip publishing or to work locally only.
- Keep the existing Site project ID and audience. Read the Sites skill and
  reconcile newer Site source before building or publishing; never overwrite
  changes from another chat to make the copies match.
- Validate the affected code, build the web deployment from the reconciled
  source, and verify the production deployment succeeds. Native changes also
  need the applicable native checks.
- At handoff, clearly identify the GitHub commit and live Site URL/version.
  If either push or publication fails, report which one is incomplete; do not
  describe the update as finished while one destination is still behind.
