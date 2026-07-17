# LOBBY CAM

Real-time congressional transparency dashboard. Next.js 16 (App Router) + TypeScript + Tailwind, deployed as a single service on Railway. **Live at [lobby.cam](https://lobby.cam).**

Shows live Senate floor votes, real federal defense-contract totals, FEC donor money by industry, and the upcoming committee schedule — all from public government records. See `lobbycambattleplan.md` for the roadmap and `PROGRESS.md` for what's actually built.

## No fabricated data

Every zone renders real data or an honest, labeled empty state — there are no
placeholder senators or invented figures. Feeds that need a free API key
degrade to an "awaiting data" state, not fake data. Which feeds are live is
always visible at **`/status`**; key setup is in **`docs/ENV_SETUP.md`**.

## Threat levels (DEFCON model)

Congress rarely holds a recorded vote at any given moment, so the site doesn't
lead with a dead "no vote" box. Instead the whole page has a **threat level** that
escalates with live floor activity:

- **Level 3 · Routine** — the floor is quiet (default). Research mode: PAC money,
  contract flows, donor conflicts.
- **Level 2 · Elevated** — floor is in session. Live coverage + conflict chyrons
  (who's talking, and who paid them).
- **Level 1 · Critical** — a recorded vote is underway. Full play-by-play spectacle.

Level 3 is the working dashboard today; Levels 1 & 2 are scaffolded (real frames,
honestly-labeled placeholders for the not-yet-built spectacle features). Preview
any level with `?level=1|2|3`. Model in `lib/level.ts`; full roadmap and the
current build plan in **`PROGRESS.md`**.

## Data feeds

**No key required (live now):**

- `GET /api/members` — all 537 current members + Bioguide/FEC/OpenSecrets/GovTrack ID crosswalk, from [@unitedstates/congress-legislators](https://github.com/unitedstates/congress-legislators). The backbone for every join.
- `GET /api/votes/live` — latest Senate roll call + voter positions from [GovTrack](https://www.govtrack.us/developers/api).
- `GET /api/contracts?recipient=<name>` — federal contract totals from [USASpending.gov](https://api.usaspending.gov/docs/endpoints).
- `GET /api/contracts/top` — real FY2026 contract totals for major defense primes (Defense Contract Wire).
- `GET /api/votes/recent` — recent Senate roll-call votes from GovTrack (Recent Votes archive).
- `GET /api/geocode?zip=<zip>` — ZIP → congressional district via the [Census Geocoder](https://geocoding.geo.census.gov/geocoder/).

**Free key required (fall back to demo until the key is set):**

- `GET /api/bills/current` — bills & floor activity from Congress.gov (`CONGRESS_GOV_API_KEY`).
- `GET /api/donors?bioguide=<id>` — donor breakdown by industry, derived from FEC PAC filings + curated `lib/industryMap.ts` (`FEC_API_KEY`), cached 24h. Replaces the retired OpenSecrets API.
- `GET /api/filings/fec?committee_id=<id>` — recent raw contributions from the FEC (`FEC_API_KEY`).
- `GET /api/schedule` — upcoming Senate/House committee hearings & markups from Congress.gov (`CONGRESS_GOV_API_KEY`); backs the "This Week" panel.

> `CONGRESS_GOV_API_KEY` and `FEC_API_KEY` are both a single free
> [api.data.gov](https://api.data.gov/signup/) key — sign up once, use the same
> value for both.

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
- `lib/level.ts` / `components/LevelBanner.tsx` / `components/levels/*` — the DEFCON threat-level system (roadmap in `PROGRESS.md`)
- `app/member/[slug]/page.tsx` — SEO member profile pages
- `app/status/page.tsx` — data-feed status
- `app/api/*` — the data routes above
- `lib/data.ts` — shared types + static config (feed URLs, helpers); no fabricated data
- `lib/industryMap.ts` — curated PAC→industry classifier (coverage lever for donor data)
- `lib/config.ts` — data-source registry + env-key gating
- `lib/congressLegislators.ts` — roster loader + ID crosswalk
- `lib/http.ts` — shared timeout/caching fetch helper
- `docs/ENV_SETUP.md` — non-coder guide to getting API keys into Railway
- `PROGRESS.md` — **the master plan & progress tracker** (single source of truth: DEFCON levels, current state, phased build plan)
- `lobbycambattleplan.md` — deep archival plan (original task numbers)
