# Cloudflare web deployment

This repo has a Workers deployment configuration at `wrangler.jsonc`. It uses:
- `npm run build` for the existing Vite client and Worker server bundle.
- `npx wrangler deploy` to publish `dist/server/index.js` and `dist/client`.
- `ASSETS` binding and Worker-first routing because `server/checklist.ts` handles root HTML, redirects, and dynamic editor APIs.

Cloudflare Git builds: connect `matthewsmart212/humans-remain`, use branch `main`, repository root `/`, build command `npm run build`, and deploy command `npx wrangler deploy`. Avoid editing or deleting the original ChatGPT Sites project while migrating.

**Storage is not configured yet.** The original ChatGPT Sites environment injects `DB` (D1) and `ARTWORK` (R2) via `.openai/hosting.json`. That file is NOT a Cloudflare Wrangler bindings config. Before enabling writing/editor use, create or migrate a D1 database and R2 bucket in the target Cloudflare account, then configure these bindings in `wrangler.jsonc`:

```jsonc
"d1_databases": [
  { "binding": "DB", "database_name": "<actual D1 name>", "database_id": "<actual D1 ID>" }
],
"r2_buckets": [
  { "binding": "ARTWORK", "bucket_name": "<actual R2 bucket name>" }
]
```

These entries must go at the top level alongside `assets`, using real IDs/names. Do not commit tokens or credentials. Reproduce the original `drizzle` schema/migrations, migrate live saved world and uploaded artwork if you need it, and test editor auth, loading, saving, and asset retrieval before treating the Cloudflare deployment as the primary website. Do not assume the original Sites D1/R2 can be accessed automatically from your own Cloudflare account.

A static front-end deployment by itself does not mean editor APIs work. Verify in the browser that the main menu loads, world assets appear, Play works, and the API endpoints and protected writes function before sharing the new address.
