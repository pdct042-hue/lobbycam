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
| 20 | Frontend wired to live data | ✅ | **All fabricated demo constants removed from the homepage.** Votes use `/api/votes/live` (honest "no active vote" empty state instead of a simulated fallback). Lobby Wire repurposed into a **Defense Contract Wire** (`/api/contracts/top`, real USASpending totals). Archive repurposed into **Recent Senate Votes** (`/api/votes/recent`, real GovTrack roll-calls). Ticker generated only from real fetched data (hidden when none). Every zone shows a labeled empty state when its feed is unavailable — no fabricated names anywhere. |
| 27 | Dynamic OG / Twitter card tags | 🟡 | `generateMetadata` on member pages (text tags done; card **image** is red-tier Task 23). |
| 33 | SEO member profile pages | 🟡 | `/member/[slug]` now resolves against the **live roster** (real identity for any of the 537 members, rendered on demand) with real official-record links (Bioguide/GovTrack/FEC). Donors/holdings/vote-flags labeled "analysis in progress" — no fabricated figures. **TODO:** enrich with live FEC donor breakdown (already proven on the homepage). |
| 6/33 | "Today's Conflicts" real data | ✅ | `components/TodaysConflicts.tsx` shows real senators (roster) + real donor-by-industry (FEC PAC filings). **Queries a wider Senate slice (25), keeps only members with classified PAC money, ranks by total, shows top 8** — so the column reads as live conflicts, not a wall of empties. **Cards are clickable → member profile pages.** Conflict scores + holdings labeled "analysis in progress" (red tier). Honest "in progress" state when FEC unavailable. **Reliability lever:** coverage is bounded by `lib/industryMap.ts` (~70 PACs) — expand it to surface more members. |
| 13b | "This Week" congressional schedule | ✅ | New `/api/schedule` (Congress.gov committee-meeting) + `SchedulePanel`. The floor-media area now toggles **Live Feed ↔ This Week**: shows the live video when a roll-call vote is underway, and upcoming Senate/House committee hearings & markups when it isn't (so the site isn't dead between votes). Fails closed to an honest empty state. Natural hook for future vote/hearing alerts (Telegram). |
| 13 | Live floor feed | 🟡 | C-SPAN's 24/7 streams need a pay-TV login, so switched to FREE gov feeds: House = U.S. House Clerk YouTube (embeds inline), Senate = senate.gov floor webcast link. Always-visible "open live feed" fallback. Session detection not yet automated. |
| 24/29 | Vote-start alerts | 🟡 | Client-only scaffolding: "Alert me on votes" button requests browser-notification permission; a 60s poller fires a local notification when a real GovTrack vote is live. Works only while a tab is open. |

## Infrastructure

| # | Item | Status | Notes |
|---|------|--------|-------|
| 21 | Deploy to production | 🟡 | Railway + Porkbun (`lobby.cam`) — domain configured by owner. |
| 15 | Realtime push (SSE) | ⬜ | Currently client polls `/api/votes/live` on load; SSE not yet added. |
| 16 | Job scheduler | ⬜ | Not needed until keyed feeds write to a store (red tier). |
| 2 | Postgres schema | ⏸️ | Deferred with the Python backend to the red tier. |

---

## Suggested next steps

1. **Owner:** add the two free API keys in Railway (see `docs/ENV_SETUP.md`)
   to light up the FEC/Congress.gov feeds. Confirm at `/status`. The no-key
   feeds (GovTrack votes, USASpending contracts, roster) need only that the
   production host can reach the upstreams — verify they're live post-deploy
   (they fail closed to honest empty states, not fabricated data).
2. Enrich member profile pages with the live FEC donor breakdown (the homepage
   already does this via `/api/donors`).
3. When ready for the red tier: stand up Postgres on Railway and start the
   Python ETL backend for lobbying (#8/#9) and stock holdings (#10) — the
   prerequisite for real per-voter conflict flags and conflict scores.
