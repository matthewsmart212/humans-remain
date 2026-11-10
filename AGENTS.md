# Humans Remain development

- Use `matthewsmart212/humans-remain` as the shared development repository. Start
  from its latest `main` and preserve changes made in other chats or checkouts.
- For every completed game update, commit and push the changes to GitHub on
  `main`, unless Matthew explicitly asks for local-only work or another branch.
- Matthew is no longer using the ChatGPT project Sites. Do not publish, deploy,
  or update those Sites as part of game changes unless he explicitly asks.
  Leave their existing identities, audiences, and deployments intact. Historical
  hosting files and `deploy/README.md` are retained for reference, not as an
  instruction to publish.
- The existing GitHub Actions workflows handle Cloudflare deployment after
  pushes to `main`. Keep that automation in place unless Matthew requests a
  change; it does not require a separate ChatGPT Sites publication.
- Validate the affected code and build the web client. Native changes also need
  the applicable native checks. Report any verification limits accurately.
- At handoff, identify the GitHub commit and relevant validation results. If a
  push fails, report it rather than describing the update as finished.
