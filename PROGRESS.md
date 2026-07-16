# LOBBY CAM — Build Progress

Living tracker mapping the battle plan (`lobbycambattleplan.md`) to what's
actually built. Updated as work lands.

**Legend:** ✅ done · 🟡 partial · ⬜ not started · ⏸️ deliberately deferred

---

## Architecture decisions (deviations from the plan, on purpose)

- **Single Next.js app, not two services.** The plan calls for a separate
  Python/FastAPI backend + PostgreSQL + Redis. For the free "green/yellow" data
  tier, Next.js server routes with built-in fetch caching do the job with one
  Railway service and **no database bill**. The Python/Postgres backend is
  deferred to the "red" tier (lobbying XML + disclosure-PDF scraping), which
  actually needs persistent storage and heavy processing.
- **No Redis yet.** Next.js `revalidate` caching covers current needs
  (e.g. OpenSecrets cached 24h to respect its 200/day cap).
- **Graceful degradation everywhere.** Every keyed feed falls back to demo data
  when its key is missing or its upstream is down, so the site never breaks.

---

## Data sources (Phase 1)

| # | Source | Tier | Status | Notes |
|---|--------|------|--------|-------|
| 3 | Member roster (congress-legislators) | 🟢 green | ✅ | `lib/congressLegislators.ts`, `/api/members`. 537 members + ID crosswalk. No key. **Tested live.** |
| 5 | Floor votes (GovTrack) | 🟢 green | ✅ | `/api/votes/live`. No key. Falls back to demo vote. |
| 12 | Federal contracts (USASpending) | 🟢 green | ✅ | `/api/contracts`. No key. Badges on Lobby Wire cards. |
| 28 | District lookup (Census Geocoder) | 🟢 green | ✅ | `/api/geocode`. No key. "Find My District" widget. |
| 4 | Bills & floor schedule (Congress.gov) | 🟢 green | ✅ | `/api/bills/current`. Needs `CONGRESS_GOV_API_KEY`. |
| 6 | Donor money by industry | 🟡 yellow | ✅ | `/api/donors`. **OpenSecrets API retired Apr 2025** — rebuilt on FEC PAC filings + curated `lib/industryMap.ts`. Needs `FEC_API_KEY`. Cached 24h. |
| 7 | Campaign filings (FEC) | 🟡 yellow | ✅ | `/api/filings/fec`. Needs `FEC_API_KEY`. |
| 8 | Lobbying disclosures (Senate LDA) | 🔴 red | ⏸️ | Messy XML + name resolution. Deferred. |
| 10 | Stock holdings (disclosure PDFs) | 🔴 red | ⏸️ | Scanned-PDF scraping/OCR. Deferred. |
| 11 | Live stock prices (Polygon) | 🔴 red | ⏸️ | Depends on #10. Paid for real-time. Deferred. |

> Every keyed feed's live/demo state is visible at **`/status`**. Setup guide:
> **`docs/ENV_SETUP.md`**.

## Frontend / product

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Next.js app + mockup ported | ✅ | App Router, TS, Tailwind. Single component ported 1:1. |
| 20 | Frontend wired to live vote API | 🟡 | Votes use `/api/votes/live` with demo fallback + a Live/Demo badge. Other zones still demo pending keys. |
| 27 | Dynamic OG / Twitter card tags | 🟡 | `generateMetadata` on member pages (text tags done; card **image** is red-tier Task 23). |
| 33 | SEO member profile pages | 🟡 | `/member/[slug]` statically pre-rendered for the featured members. Scales to all 537 once profiles read from the roster. |

## Infrastructure

| # | Item | Status | Notes |
|---|------|--------|-------|
| 21 | Deploy to production | 🟡 | Railway + Porkbun (`lobby.cam`) — domain configured by owner. |
| 15 | Realtime push (SSE) | ⬜ | Currently client polls `/api/votes/live` on load; SSE not yet added. |
| 16 | Job scheduler | ⬜ | Not needed until keyed feeds write to a store (red tier). |
| 2 | Postgres schema | ⏸️ | Deferred with the Python backend to the red tier. |

---

## Suggested next steps

1. **Owner:** add the three free API keys in Railway (see `docs/ENV_SETUP.md`)
   to turn the green/yellow feeds live. Confirm at `/status`.
2. Wire real Congress.gov bill + OpenSecrets donor data into the homepage zones
   (routes exist; UI still reads demo constants for those).
3. When ready for the red tier: stand up Postgres on Railway and start the
   Python ETL backend for lobbying (#8/#9) and stock holdings (#10).
