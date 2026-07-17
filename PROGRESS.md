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
| **3 · ROUTINE** | floor quiet (the default) | no vote, floor not in session | **Research mode** — conflicts lead, any member one search away, one quiet-floor strip | ✅ working (this is home) |
| **2 · ELEVATED** | floor live, no vote | Congress in session / members speaking | **Live floor coverage** + member search at hand + *chyrons*: committee meetings of the day, donor money, House speaker (House only — no Senate speaker ID) | 🟡 scaffolded |
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

0. **L3 declutter — lead with the dirt** (✅ done). Research mode is now built
   around what an investigating visitor actually wants:
   - **The Money Board is the lead column** (real FEC PAC money, ranked).
   - **"Investigate a Member"** (`components/MemberSearch.tsx`): search the live
     roster — every current member, both chambers — by name or state and jump
     straight to their file at `/member/[slug]`. The ZIP → district lookup moved
     up next to it (out of the footer).
   - **One "No active votes" strip** replaced the three dead vote zones (the big
     "no vote in progress" card, the empty YEA/NAY columns, the per-voter
     scaffold box). The full vote machinery renders *only* during a live
     roll-call — quiet L3 never shows a zero.
   - **Defense Contract Wire demoted** below the fold to a horizontal wire under
     Recent Votes — background context, not the lead story.
   - **Browser-only "Alert me" scaffold removed** (button + 60s poller +
     `lib/voteAlert.ts`). A tab-must-be-open notification wasn't a real alert;
     alerts return server-side in Phase 4.
1. **Expand donor coverage — `lib/industryMap.ts`** (✅ done). The classifier
   grew from ~70 rules / 8 industries to **~640 rules / 17 industries** — added
   Labor (union PACs), Health (providers, distinct from Pharma), Real Estate
   (the Realtors are the single biggest PAC), Transport, Construction,
   Manufacturing, Retail, Media, and Law, plus much deeper coverage of the
   original eight. Scope rule (documented in the file): industry/business/labor
   money only — party committees, leadership PACs, and ideological PACs stay
   deliberately unclassified so Money Board rankings and the Conflict Index
   measure industry conflicts, not party support. First-match-wins ordering
   hazards are grouped and commented at the top of the rule list (e.g.
   "occiDENTAL", "petROCHEmical", "corTEVA", "MOSAIC"⊃"SAIC"); every industry
   now has an entry in `INDUSTRY_COLORS` (`lib/data.ts`).
2. **Enrich member profile pages with live FEC donors** (✅ done). The FEC
   resolution chain moved to `lib/donors.ts` (shared by `/api/donors` and the
   member pages). `/member/[slug]` now shows, from real cycle-to-date FEC data:
   - **"The Numbers"** stat row: classified industry PAC money, top industry +
     share, industry count, concentration (HHI).
   - **Industry PAC money breakdown** with per-industry bars and the named PACs
     behind each figure, plus the unclassified remainder (honestly labeled).
   - **Conflict Index v0** (`lib/conflictScore.ts`): five defined inputs —
     money volume + money concentration are LIVE (computed from FEC),
     contract-overlap / holdings / lobbying are PENDING with their blocking
     pipeline named. Headline score is the mean of live inputs, labeled
     "provisional · 2 of 5 inputs · money only" everywhere. When a pending
     pipeline lands, add its input in `lib/conflictScore.ts` and every member
     page updates.
   When FEC data can't be resolved the page shows a labeled empty state — no
   invented figures.
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
- **Wire `floorInSession`** (⬜): the L2 trigger is `deriveLevel({ floorInSession })`
  — currently hard-`null` because no feed is wired. Best source: the **House
  Clerk's live Floor Summary XML** (`clerk.house.gov/floorsummary/floor-download.aspx`)
  — free, no key, updates through the legislative day, and includes an explicit
  in-session signal. Senate: the daily floor schedule + `floor_activity` pages
  (coarser). Add `/api/floor-status` that parses these and feed it into
  `deriveLevel`. This is what makes the site *escalate on its own* instead of
  only lighting up during a recorded vote.
- **Speaker chyron — House only** (⬜): the same Clerk Floor Summary XML names
  members as they're recognized on the floor ("Mr. SMITH of Texas asked...") in
  near-real-time floor actions. Plan: parse the latest floor action → extract
  the member name → resolve against the roster (`lib/congressLegislators.ts`) →
  pull their money via `lib/donors.ts` → render name + top donor industries in
  the `FloorSessionMode` chyron. No speaker is ever named from guesswork.
- **Senate speaker ID: ❌ DROPPED (decided 2026-07).** There's no free
  structured "now speaking" feed for the Senate, and we are NOT doing
  caption/speech-to-text diarization on the webcast. Do not resurrect this.
- **Committee-meeting chyron — the Senate's L2 centerpiece instead** (⬜): when
  the floor is in session, run a **big chyron of the day's committee hearings
  and markups** (already sourced by `/api/schedule`, Congress.gov): committee
  name, topic, bill refs, time. That's where the money actually moves while the
  chamber talks. Render it prominently in `FloorSessionMode` above the donor
  chyron.
- **L2 layout: search + live feed side by side** (⬜): when the Senate is in
  session, dock the "Investigate a Member" search (`components/MemberSearch.tsx`)
  right next to the live floor feed — watch the floor, look up whoever matters,
  one glance apart. `FloorSessionMode` takes the feed + search; the research
  grid stays below.
- **Feed the conflict chyron real FEC data** (🟡): `FloorSessionMode` already
  renders a chyron; pass real donor items from `/api/donors` (the same data
  behind The Money Board) via `chyronItems`.

### PHASE 3 — Level 1 spectacle (needs the red tier)
- **Play-by-play conflict flags** (⬜): per-position overlay ("voted YEA · took $X
  from the industry that wins if this passes"). Needs the red-tier donor +
  stock-holdings pipeline (Phase 4). Until then the scaffold label stands; the
  real YEA/NAY tally already streams.

### PHASE 4 — Red tier + platform (ongoing, deferred)
- **Red-tier data pipeline** (⏸️): Postgres + Python ETL for lobbying disclosures
  (LDA XML, #8/#9) and stock holdings (disclosure PDFs, #10). Prerequisite for
  real per-voter conflict flags and scores.
- **Alerts** (⬜): vote/hearing notifications (e.g. Telegram, email) on top of
  `/api/votes/live` + `/api/schedule`. The old browser-only "Alert me" scaffold
  was removed from the UI in the L3 declutter — build this server-side or not at
  all.
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
| 20 | Frontend wired to live data | ✅ | No fabricated constants. Vote machinery renders only during a live roll-call (quiet floor = one "No active votes" strip); Defense Contract Wire → `/api/contracts/top` (below the fold); Recent Senate Votes → `/api/votes/recent`; ticker only from real data. Every zone has a labeled empty state. |
| — | "Investigate a Member" search | ✅ | `components/MemberSearch.tsx`: live-roster search (name / state code) → `/member/[slug]`. ZIP district lookup sits beside it. |
| 6/33 | "The Money Board" real data | ✅ | `components/MoneyBoard.tsx`: real senators + real donor-by-industry (FEC PAC). Queries 25, keeps members with classified PAC money, ranks, shows top 8. Cards link to member pages. Coverage now backed by ~640-rule / 17-industry `lib/industryMap.ts` (Phase 1.1 ✅). |
| 13b | "This Week" schedule | ✅ | `/api/schedule` (Congress.gov) + toggle with the floor feed. Fails closed. Verify live = Phase 1.3. |
| 13 | Live floor feed | 🟡 | Free gov feeds (House Clerk YouTube embed; Senate webcast link) — C-SPAN needs a pay-TV login. Session detection not automated (→ Phase 2). |
| 33 | SEO member profile pages | 🟡 | `/member/[slug]`: live roster identity + record links, real FEC donor breakdown w/ named PACs, "The Numbers" stat row, and Conflict Index v0 (`lib/conflictScore.ts`, money inputs live, 3 inputs pending). Holdings/vote-flags still labeled "in progress" (red tier). |
| 27 | Dynamic OG / Twitter tags | 🟡 | `generateMetadata` on member pages (text done; card image is red-tier). |
| 24/29 | Vote-start alerts | ⬜ | Browser-only scaffold removed in the L3 declutter (a tab-must-be-open notification wasn't a real alert). Real server-side alerts → Phase 4. |

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
  `components/MemberSearch.tsx` (member investigation search) ·
  `app/member/[slug]/page.tsx` (member pages) · `app/api/*` (data routes) ·
  `lib/industryMap.ts` (PAC→industry classifier) · `lib/congressLegislators.ts`
  (roster + ID crosswalk) · `app/status/page.tsx` (feed status).
- **Env / keys:** `docs/ENV_SETUP.md`. **Live feed status:** `/status`.
- **Deploy:** push the default branch `claude/lobbycam-setup-ac0adv` → Railway
  auto-builds. **Preview a level:** `?level=1|2|3`.
