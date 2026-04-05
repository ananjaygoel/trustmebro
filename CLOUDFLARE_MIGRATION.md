# Cloudflare Migration

This repo is now prepared to run on Cloudflare Pages plus Pages Functions instead of Netlify.

## What Changed

- Static hosting moves from Netlify to Cloudflare Pages.
- `/.netlify/functions/ask` moved to `/api/ask`.
- `/.netlify/functions/vibes` moved to `/api/vibes`.
- Netlify Forms for `contact` and `newsletter` moved to `/api/contact` and `/api/newsletter`.
- Netlify Blobs for reactions moved to Cloudflare D1.
- `netlify.toml` headers and redirects were copied into `public/_headers` and `public/_redirects`.
- GitHub Actions no longer deploys directly to Netlify. Cloudflare should auto-deploy from GitHub on push.

## Cloudflare Setup

1. Create a Cloudflare Pages project named `trustmebro`.
2. Create a D1 database and apply `cloudflare/d1/schema.sql`.
3. Store the Pages/D1 config in `wrangler.jsonc` and treat it as the source of truth.
4. Add GitHub Actions secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
5. Add runtime/environment variables in Cloudflare when available:
   - `GROQ_API_KEY`
   - `PUBLIC_GA_ID`
   - `PUBLIC_ENABLE_ASK`
6. Add `trustmebro.pro` as a custom domain in Cloudflare Pages and move DNS to Cloudflare.
7. After cutover, remove old Netlify deploy secrets from GitHub if you no longer need rollback.

## Data Layer

The required D1 tables are defined in `cloudflare/d1/schema.sql`:

- `article_vibes`
- `contact_submissions`
- `newsletter_subscriptions`

The zero-cost version stores contact and newsletter submissions in D1. If you later want inbox notifications, add a separate Worker or third-party form delivery service after the cutover.

## Stakeholders / Integrations

- Google AdSense is already loaded in `src/layouts/Layout.astro`. Keeping the same domain means AdSense does not need a host-specific rewrite.
- `public/ads.txt` stays in place, which matters for AdSense verification.
- Google Analytics still works through `PUBLIC_GA_ID`.
- The article Q&A widget is now controlled by `PUBLIC_ENABLE_ASK` so it can stay hidden until `GROQ_API_KEY` is configured.
- GitHub Actions still handles content generation and social posting. Cloudflare should handle deployment from the pushed commits.

## Post-Cutover Checks

1. Open a post page and test `Ask`.
2. Click each vibe reaction once and confirm counts persist after reload.
3. Submit the contact form.
4. Submit the footer newsletter form.
5. Confirm `ads.txt`, `rss.xml`, and `sitemap-index.xml` resolve on the live domain.
