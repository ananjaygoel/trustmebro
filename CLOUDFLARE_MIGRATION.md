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

1. Create a Cloudflare Pages project connected to `ananjaygoel/trustmebro`.
2. Use:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_OPTIONS=--max-old-space-size=4096`
3. Create a D1 database and apply `cloudflare/d1/schema.sql`.
4. Bind that D1 database to the Pages project as `DB`.
5. Add runtime/environment variables:
   - `GROQ_API_KEY`
   - `PUBLIC_GA_ID`
   - `CONTACT_TO_EMAIL`
   - `NEWSLETTER_TO_EMAIL`
   - Optional: `CONTACT_FROM_EMAIL`
6. Configure Cloudflare Email Routing / Send Email and bind it as `NOTIFICATIONS_EMAIL` if you want contact and newsletter notifications delivered to inbox automatically.
7. Add `trustmebro.pro` as a custom domain in Cloudflare Pages and move DNS to Cloudflare.
8. After cutover, remove old Netlify deploy secrets from GitHub if you no longer need rollback.

## Data Layer

The required D1 tables are defined in `cloudflare/d1/schema.sql`:

- `article_vibes`
- `contact_submissions`
- `newsletter_subscriptions`

## Stakeholders / Integrations

- Google AdSense is already loaded in `src/layouts/Layout.astro`. Keeping the same domain means AdSense does not need a host-specific rewrite.
- `public/ads.txt` stays in place, which matters for AdSense verification.
- Google Analytics still works through `PUBLIC_GA_ID`.
- GitHub Actions still handles content generation and social posting. Cloudflare should handle deployment from the pushed commits.

## Post-Cutover Checks

1. Open a post page and test `Ask`.
2. Click each vibe reaction once and confirm counts persist after reload.
3. Submit the contact form.
4. Submit the footer newsletter form.
5. Confirm `ads.txt`, `rss.xml`, and `sitemap-index.xml` resolve on the live domain.
