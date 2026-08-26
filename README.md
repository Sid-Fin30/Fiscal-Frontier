# Fiscal Frontier

## What's new: Global Markets

A live-ish markets dashboard has been added: a scrolling ticker under the nav,
an expanded "Global Markets" section on the homepage grouped by region, and a
click-through detail view per index with a historical chart.

**Read this before deploying** — it explains why a few things work the way
they do, and what you still need to set up.

### Why this needs a backend (GitHub Pages alone isn't enough)

GitHub Pages only serves static files — it can't run server code or hide an
API key. The market cards must not call a data provider directly from the
browser (spec item 39: no exposed credentials, no hundreds of per-visitor
requests hitting your provider). So:

- `api/markets.js` and `api/history.js` are small serverless functions
  written in the Vercel Functions format. Deploy them on **Vercel** (free
  tier is fine) — point your domain/DNS at Vercel instead of GitHub Pages,
  or keep GitHub Pages for the static files and deploy just `/api` to Vercel
  and set `API_BASE` in `assets/markets.js` to that Vercel URL.
- Netlify Functions or a Cloudflare Worker would also work with light
  edits to the two files in `/api`.

### Data provider

The reference implementation calls **Twelve Data**. You'll need to:

1. Create an account and get an API key.
2. Set it as an environment variable named `MARKET_DATA_API_KEY` on your
   hosting platform (Vercel → Project Settings → Environment Variables).
   Never put it in the frontend code or commit it to GitHub.
3. Check which index symbols your specific Twelve Data plan is entitled to
   — free/low tiers often don't include every global index, and some
   indices are delayed rather than real-time depending on plan and
   exchange. Update `provider_symbol` and `delayed_minutes` in
   `config/indices.json` to match what you're actually entitled to. Do not
   guess — showing a wrong "Live" badge would violate the "accuracy over
   appearance" requirement this was built around.
4. If you'd rather use Nasdaq Data Link, Marketstack, Finnhub or Polygon
   instead, replace the `fetchFromTwelveData` function in `api/markets.js`
   and the equivalent one in `api/history.js` — the caching, normalization
   shape, and frontend code don't need to change.

### "Admin control" without touching code

`config/indices.json` is the single place that controls which indices
exist, their region grouping, ticker/homepage visibility, and display
order — edit that file (no HTML/CSS/JS changes needed) and both the
backend and frontend pick it up. This repo doesn't yet include an
authenticated web UI for editing that file remotely — building one (with
login, since this would be a public write endpoint otherwise) is a
reasonable next step once the rest of the site has user auth, which the
original spec also lists as a separate, larger piece of work.

### What's intentionally NOT here

- **WebSocket streaming.** Twelve Data's WebSocket tier is paid/enterprise
  for most global indices; the current implementation polls every 45
  seconds instead, which is disclosed to visitors via each card's
  "Live / delayed" badge and timestamp rather than pretending to be
  real-time streaming.
- **Fabricated or simulated prices.** If the provider call fails, cards
  show "Market data temporarily unavailable" — never a stale number
  without a timestamp, never a randomly generated one.

### Files added/changed for this feature

- `config/indices.json` — index list and admin-style settings
- `api/markets.js` — live quotes endpoint (deploy as a serverless function)
- `api/history.js` — historical chart data endpoint
- `assets/markets.js` — frontend polling, rendering, detail modal, chart
- `index.html` — ticker bar, Global Markets section, detail modal, Substack links
- `style.css` — styling for all of the above

---

## Earlier notes

Added previously:
- Founder photo at the top-right and About section
- Public email placeholders
- Public full-article sections linked from the Insights cards
- Public research pages for Equity Research, Portfolio Strategy and Quant/Backtesting
- Substack link (nav, homepage callout, footer): https://substack.com/@fiscalfrontier

Upload the `images` folder together with `index.html`, `style.css`, `assets/`
and `config/` (and deploy `/api` per the instructions above).
