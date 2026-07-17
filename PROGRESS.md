# LOBBY CAM — Master Plan & Progress

**This is the single source of truth** for what LOBBY CAM is, what's built, and
what to build next. It merges the old progress tracker and the DEFCON level
roadmap into one followable plan. `lobbycambattleplan.md` remains the deep
archival reference (original task numbers in the tables map to it); this file is
the active plan.

**What it is:** a public-interest transparency dashboard that connects the money
to the votes in Congress — live floor votes (GovTrack), federal defense
contracts (USASpending), and FEC donor money by industry — all from public
records, **with no fabricated data ever**. Live at **[lobby.cam](https://lobby.cam)**.

**Legend:** ✅ done · 🟡 partial / scaffolded · ⬜ not started · ⏸️ deferred

---

## 1. How the site works: DEFCON threat levels

Congress rarely holds a recorded vote at any given moment, so the site doesn't
lead with a dead "no vote in progress" box. Instead the whole page has a
**posture that escalates with live floor activity** (model: `lib/level.ts`,
`deriveLevel` — highest active signal wins):

| Level | State | Trigger | The page becomes | Status |
|-------|-------|---------|------------------|--------|
| **3 · ROUTINE** | floor quiet (the default) | no vote, floor not in session | **Research mode** — PAC money, contract flows, donor→industry conflicts | ✅ working (this is home) |
| **2 · ELEVATED** | floor live, no vote | Congress in session / members speaking | **Live floor coverage** + conflict *chyrons* (who's talking, who paid them) | 🟡 scaffolded |
| **1 · CRITICAL** | recorded vote underway | a GovTrack roll-call is live | **Full spectacle** — play-by-play positions flagged against donors/holdings | 🟡 scaffolded |

- **Banner + meter:** `components/LevelBanner.tsx` (the 3·2·1 meter) is the
  primary orientation; the masthead pill echoes the level.
- **Modes:** `components/levels/{LiveVoteBroadcast,FloorSessionMode}.tsx` render
  the L1/L2 takeovers above the routine grid. L3 shows the grid alone.
- **Preview any level** without a live floor: append `?level=1|2|3` to the URL.
  Layout-only — it never fabricates vote or conflict data.

**Escalation signals** (`deriveLevel({ liveVote, floorInSession })`):

| Signal | Source | Status |
|--------|--------|--------|
| `liveVote` | `/api/votes/live` (GovTrack recorded roll-call) | ✅ wired → drives L1 |
| `floorInSession` | needs a "chamber in session / member speaking" feed | ⬜ **not wired** (hard-`null`) → L2 can't fire yet |

### Design rules (do not break)
- **Never fabricate to escalate.** Unknown signal stays unknown; we never fake an
  elevated/critical state. This is the whole ethos of the site.
- **Scaffolds must say they're scaffolds.** Every not-yet-built feature carries a
  visible `Scaffold` / "analysis in progress" label — never a fake figure.
- **Level 3 is home.** It must always be a complete, useful page on its own; the
  higher levels are additive takeovers, not the only reason to visit.

---

## 2. The plan (phased, in order)

### ▶ PHASE 1 — Build out Level 3 (research mode) · **DO THIS NEXT**

Level 3 is what every visitor sees when the floor is quiet (i.e. almost always).
Goal: make it a genuinely useful **"follow the money"** research tool, not just a
row of status cards. Tasks in recommended order:

1. **Expand donor coverage — `lib/industryMap.ts`** (⬜, highest leverage, lowest
   risk). Only ~70 PAC→industry mappings today, and that's the ceiling for both
   Today's Conflicts and member donor breakdowns. More mappings = more senators
   surface real money. *Done when:* Today's Conflicts shows a fuller, more varied
   set of senators and more member pages show donor data.
2. **Enrich member profile pages with live FEC donors** (⬜). `/member/[slug]`
   still shows "analysis in progress" for donors, but the homepage already pulls
   this via `/api/donors`. Reuse that call + the `RealCard` bar UI from
   `components/TodaysConflicts.tsx`. *Done when:* a member page shows the same
   real industry-PAC breakdown as the homepage.
3. **Verify `/api/schedule` end-to-end** (🟡). Built against Congress.gov's
   committee-meeting schema but never exercised (sandbox blocked the API).
   Confirm "This Week" populates on prod while Congress is in session; fix the
   JSON shape if it's empty in-session (empty during recess is correct).
4. **Add the connective "follow the money" tissue** (⬜) — the real research
   payoff that makes L3 more than cards. Pick the highest-value first:
   - **Donor → committee → contract links on member pages:** show a member's
     committee assignments beside their top donor industries and the federal
     contracts flowing to those industries. Committees from the roster /
     Congress.gov; contracts from USASpending; donors from FEC. *The join is the
     story.*
   - **Contract drill-down:** click a Defense Contract Wire card → recipient
     detail (award history, agencies) from USASpending.
   - **"Who funds industry X":** surface which members take the most from a given
     industry (inverts the donor data we already have).
5. **(Stretch) Dark-money surfacing** (⬜). Super-PAC / 501(c)(4) money is the
   headline layer. Start from FEC independent-expenditure data
   (`schedule_e` / independent-expenditures endpoints). Scope after 1–4 land.

**Rules for every Phase-1 change:** real data or an honest labeled empty state
(never fabricate); every figure links to its public source; keep it responsive
(`lc-grid`/`lc-shell`) and remember L3 is the default render.

### PHASE 2 — Turn on Level 2 (biggest UX unlock)
- **Wire `floorInSession`** (⬜): pick a floor-status source (House Clerk feed /
  Senate webcast / Congress.gov floor activity), add `/api/floor-status`, feed it
  into `deriveLevel`. This is what makes the site *escalate on its own* instead
  of only lighting up during a recorded vote.
- **Feed the conflict chyron real FEC data** (🟡): `FloorSessionMode` already
  renders a chyron; pass real donor items from `/api/donors` (the same data
  behind Today's Conflicts) via `chyronItems`.
- **Current-speaker card** (⬜): blocked on a speaker feed. No speaker named until
  it can be sourced.

### PHASE 3 — Level 1 spectacle (needs the red tier)
- **Play-by-play conflict flags** (⬜): per-position overlay ("voted YEA · took $X
  from the industry that wins if this passes"). Needs the red-tier donor +
  stock-holdings pipeline (Phase 4). Until then the scaffold label stands; the
  real YEA/NAY tally already streams.

### PHASE 4 — Red tier + platform (ongoing, deferred)
- **Red-tier data pipeline** (⏸️): Postgres + Python ETL for lobbying disclosures
  (LDA XML, #8/#9) and stock holdings (disclosure PDFs, #10). Prerequisite for
  real per-voter conflict flags and scores.
- **Alerts** (🟡→⬜): vote/hearing notifications (e.g. Telegram) on top of
  `/api/votes/live` + `/api/schedule`. Current "Alert me" button is browser-only,
  tab-must-be-open scaffolding.
- **Realtime** (⬜): replace on-load polling of `/api/votes/live` with SSE, and
  auto-refresh the level so the page escalates/de-escalates without a reload (the
  60s vote-alert poller can drive this).

---

## 3. Current state (what's built)

### Data sources
| # | Source | Tier | Status | Notes |
|---|--------|------|--------|-------|
| 3 | Member roster (congress-legislators) | 🟢 green | ✅ | `lib/congressLegislators.ts`, `/api/members`. 537 members + ID crosswalk. No key. Tested live. |
| 5 | Floor votes (GovTrack) | 🟢 green | ✅ | `/api/votes/live`. No key. Drives Level 1. |
| 12 | Federal contracts (USASpending) | 🟢 green | ✅ | `/api/contracts`, `/api/contracts/top`. No key. Defense Contract Wire. |
| 28 | District lookup (Census Geocoder) | 🟢 green | ✅ | `/api/geocode`. No key. "Find My District" widget. |
| 4 | Bills & floor schedule (Congress.gov) | 🟢 green | ✅ | `/api/bills/current`, `/api/schedule`. Needs `CONGRESS_GOV_API_KEY`. |
| 6 | Donor money by industry | 🟡 yellow | ✅ | `/api/donors`. OpenSecrets retired Apr 2025 → rebuilt on FEC PAC filings + curated `lib/industryMap.ts`. Needs `FEC_API_KEY`. Cached 24h. |
| 7 | Campaign filings (FEC) | 🟡 yellow | ✅ | `/api/filings/fec`. Needs `FEC_API_KEY`. |
| 8 | Lobbying disclosures (Senate LDA) | 🔴 red | ⏸️ | Messy XML + name resolution. Phase 4. |
| 10 | Stock holdings (disclosure PDFs) | 🔴 red | ⏸️ | Scanned-PDF scraping/OCR. Phase 4. |
| 11 | Live stock prices (Polygon) | 🔴 red | ⏸️ | Depends on #10. Paid for real-time. Phase 4. |

> Every keyed feed's live/demo state is visible at **`/status`**. Key setup:
> **`docs/ENV_SETUP.md`**. `CONGRESS_GOV_API_KEY` and `FEC_API_KEY` are the same
> free [api.data.gov](https://api.data.gov/signup/) value.

### Frontend / product
| # | Item | Status | Notes |
|---|------|--------|-------|
| L | DEFCON threat-level system | 🟡 | Model + banner + L3 live; L1/L2 scaffolded. See §1. |
| R | Responsive layout | ✅ | 3-col desktop → 2-col tablet → single-column mobile via `lc-grid`/`lc-shell` in `GlobalStyles`. Masthead wraps; `prefers-reduced-motion` honored. |
| 1 | Next.js app + mockup ported | ✅ | App Router, TS, Tailwind. |
| 20 | Frontend wired to live data | ✅ | No fabricated constants. Votes → `/api/votes/live` (honest empty state); Defense Contract Wire → `/api/contracts/top`; Recent Senate Votes → `/api/votes/recent`; ticker only from real data. Every zone has a labeled empty state. |
| 6/33 | "Today's Conflicts" real data | ✅ | `components/TodaysConflicts.tsx`: real senators + real donor-by-industry (FEC PAC). Queries 25, keeps members with classified PAC money, ranks, shows top 8. Cards link to member pages. Coverage bounded by `lib/industryMap.ts` (Phase 1.1). |
| 13b | "This Week" schedule | ✅ | `/api/schedule` (Congress.gov) + toggle with the floor feed. Fails closed. Verify live = Phase 1.3. |
| 13 | Live floor feed | 🟡 | Free gov feeds (House Clerk YouTube embed; Senate webcast link) — C-SPAN needs a pay-TV login. Session detection not automated (→ Phase 2). |
| 33 | SEO member profile pages | 🟡 | `/member/[slug]` resolves against the live roster with real record links (Bioguide/GovTrack/FEC). Donors/holdings/vote-flags labeled "in progress" → enrich in Phase 1.2. |
| 27 | Dynamic OG / Twitter tags | 🟡 | `generateMetadata` on member pages (text done; card image is red-tier). |
| 24/29 | Vote-start alerts | 🟡 | Browser-only scaffolding (tab must be open). Full alerts → Phase 4. |

### Infrastructure
| # | Item | Status | Notes |
|---|------|--------|-------|
| 21 | Deploy to production | ✅ | Live at `lobby.cam` (Railway + Porkbun). Both keys set in Railway; `/status` shows 7/7. **Deploys on push to the default branch `claude/lobbycam-setup-ac0adv`.** |
| 15 | Realtime push (SSE) | ⬜ | Phase 4. |
| 16 | Job scheduler | ⬜ | Not needed until keyed feeds write to a store (red tier). |
| 2 | Postgres schema | ⏸️ | Phase 4 (with the Python backend). |

---

## 4. Architecture decisions (deliberate deviations from the battle plan)

- **DEFCON threat levels drive the whole UI** (see §1) — the site escalates with
  floor activity instead of leading with a usually-empty vote box.
- **Single Next.js app, not two services.** The battle plan calls for a separate
  Python/FastAPI + PostgreSQL + Redis backend. For the free green/yellow tier,
  Next.js server routes + built-in fetch caching do the job with one Railway
  service and no database bill. The Python/Postgres backend is deferred to the
  red tier (Phase 4), which actually needs persistent storage + heavy processing.
- **No Redis yet.** Next.js `revalidate` caching covers current needs (FEC donors
  24h; schedule 30m).
- **Graceful degradation everywhere.** Every keyed feed falls back to a labeled
  empty/demo state when its key is missing or upstream is down — the site never
  breaks and never shows fake figures.

---

## 5. Reference

- **Deep archival plan:** `lobbycambattleplan.md` (original task numbers).
- **Code map:** `components/LobbyCam.tsx` (dashboard) · `lib/level.ts` +
  `components/LevelBanner.tsx` + `components/levels/*` (DEFCON system) ·
  `app/member/[slug]/page.tsx` (member pages) · `app/api/*` (data routes) ·
  `lib/industryMap.ts` (PAC→industry classifier) · `lib/congressLegislators.ts`
  (roster + ID crosswalk) · `app/status/page.tsx` (feed status).
- **Env / keys:** `docs/ENV_SETUP.md`. **Live feed status:** `/status`.
- **Deploy:** push the default branch `claude/lobbycam-setup-ac0adv` → Railway
  auto-builds. **Preview a level:** `?level=1|2|3`.
