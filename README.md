# LOBBY CAM

Real-time congressional conflict-of-interest dashboard. Next.js 14 (App Router) + TypeScript + Tailwind, deployed as a single service on Railway.

Tracks a live floor vote, incoming lobbying disclosure filings, and per-member financial conflict scores — sourced from public government filings. See `lobbycambattleplan.md` for the full roadmap and `PROGRESS.md` for what's actually built.

## Runs with zero setup

The site works out of the box in **demo mode**. Real government data turns on
per-feed as you add free API keys — see **`docs/ENV_SETUP.md`**. Which feeds are
live is always visible at **`/status`**.

## Data feeds

**No key required (live now):**

- `GET /api/members` — all 537 current members + Bioguide/FEC/OpenSecrets/GovTrack ID crosswalk, from [@unitedstates/congress-legislators](https://github.com/unitedstates/congress-legislators). The backbone for every join.
- `GET /api/votes/live` — latest Senate roll call + voter positions from [GovTrack](https://www.govtrack.us/developers/api).
- `GET /api/contracts?recipient=<name>` — federal contract totals from [USASpending.gov](https://api.usaspending.gov/docs/endpoints).
- `GET /api/geocode?zip=<zip>` — ZIP → congressional district via the [Census Geocoder](https://geocoding.geo.census.gov/geocoder/).

**Free key required (fall back to demo until the key is set):**

- `GET /api/bills/current` — bills & floor activity from Congress.gov (`CONGRESS_GOV_API_KEY`).
- `GET /api/donors?bioguide=<id>` — donor breakdown by industry from OpenSecrets (`OPENSECRETS_API_KEY`), cached 24h.
- `GET /api/filings/fec?committee_id=<id>` — recent contributions from the FEC (`FEC_API_KEY`).

**Status:**

- `GET /api/status` / `GET /status` — which feeds are configured.

## Architecture note

This is intentionally a **single Next.js app**, not the battle plan's separate
Python/Postgres/Redis backend. For the free data tier, Next.js server routes +
built-in caching cover it with one Railway service and no database. The
Python + Postgres backend is deferred to the heavy "red" data (lobbying XML and
financial-disclosure PDF scraping). Rationale is tracked in `PROGRESS.md`.

## Getting Started (local dev)

```bash
npm install
npm run dev            # http://localhost:3000
cp .env.example .env.local   # optional: add API keys to test live feeds
```

## Project layout

- `app/page.tsx` / `components/LobbyCam.tsx` — the dashboard UI
- `app/member/[slug]/page.tsx` — SEO member profile pages
- `app/status/page.tsx` — data-feed status
- `app/api/*` — the data routes above
- `lib/data.ts` — demo data + shared types (mirrors real response shapes)
- `lib/config.ts` — data-source registry + env-key gating
- `lib/congressLegislators.ts` — roster loader + ID crosswalk
- `lib/http.ts` — shared timeout/caching fetch helper
- `docs/ENV_SETUP.md` — non-coder guide to getting API keys into Railway
- `PROGRESS.md` — battle-plan progress tracker
