# FitLife Completion Bundle
This bundle is designed for the source snapshot supplied on 11 Sep 2026. It adds a final authoritative responsive layer, universal demo filtering and tombstones, a Supabase production migration, deployment files, phase checklists, and 33 visual previews.

## One-copy install
From the root of the FitLife repository, unzip this bundle and run:

```bash
bash fitlife-completion/install.sh
```

The installer creates a timestamped backup branch/tag when git is available, copies all files, patches `src/main.jsx`, installs dependencies, builds, and reports the result.

## Supabase
1. Open Supabase SQL Editor and run `sql/fitlife-production-migration.sql`.
2. In Authentication > URL Configuration add the production Cloudflare Pages URL and any preview URL used for testing.
3. In Storage create a private bucket named `fitlife-media`. Add owner-only policies before enabling uploads.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Cloudflare Pages. Never expose the service-role key.
5. Test create on desktop, edit on iPad, delete on iPhone, then refresh all three. Deleted rows must remain tombstoned.

## Cloudflare Pages
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 20 or 22
- SPA fallback is provided by `public/_redirects`.
- Add environment variables to Production and Preview.
- Deploy from a clean release commit and retain the generated git tag for rollback.

## Important
The previews are layout references, not data fixtures. Production views must show only saved user records. Empty datasets must render empty states.
