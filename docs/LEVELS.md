# LOBBY CAM — Threat Levels (DEFCON model)

The site has one job that changes with the moment: **most of the time Congress
isn't voting**, so LOBBY CAM shouldn't lead with a dead "no vote in progress"
box. Instead the whole page has a posture — a DEFCON-style **threat level** — that
escalates with live floor activity. It's a research tool when the floor is quiet
and a live broadcast when it heats up.

**Legend:** ✅ built · 🟡 scaffolded (frame real, feature stubbed + honestly
labeled) · ⬜ not started

---

## The three levels

| Level | State | Trigger | What the page becomes |
|-------|-------|---------|-----------------------|
| **3 · ROUTINE** | The floor is quiet | No recorded vote, floor not in session (the default) | **Research mode.** PAC funding, contract flows, donor→industry conflicts, dark-money digging. The current three-column dashboard. |
| **2 · ELEVATED** | Floor is live, no vote | Congress in session / members speaking | **Live floor coverage.** Who's holding the floor + conflict *chyrons* (TV lower-thirds): who's talking, and who paid them. |
| **1 · CRITICAL** | Recorded vote underway | A GovTrack roll-call is live | **Full spectacle.** Play-by-play of positions as they land, each flagged against the member's donors and holdings. |

Highest active signal wins (see `deriveLevel` in `lib/level.ts`).

---

## Architecture (built ✅)

- **`lib/level.ts`** — the model. `AlertLevel` (1|2|3), per-level metadata
  (`LEVELS`), `deriveLevel(signals)`, and `parseLevelOverride` for previews.
- **`components/LevelBanner.tsx`** — the DEFCON meter (3·2·1) + headline + blurb.
  Primary orientation; themes to the active level's color.
- **`components/LobbyCam.tsx`** — computes the level from live signals, renders
  the banner, and swaps in the active mode's full-width takeover above the grid.
- **Masthead status pill** reflects the level (e.g. `LEVEL 3 · ROUTINE`).
- **Preview:** append `?level=1`, `?level=2`, or `?level=3` to preview any mode
  without a live floor. Layout-only — it never fabricates vote or conflict data.

### The signals that drive escalation

`deriveLevel({ liveVote, floorInSession })`:

| Signal | Source | Status |
|--------|--------|--------|
| `liveVote` | `/api/votes/live` (GovTrack) — a recorded roll-call is live | ✅ wired |
| `floorInSession` | **needs a feed** — "chamber is in session / a member is speaking" | ⬜ **not wired** — currently hard-`null` (unknown). We never claim the floor is live when unsure. |

Wiring `floorInSession` is the **single highest-leverage next step** — it's what
turns Level 2 on. Candidate sources: House Clerk live feed state, Senate floor
webcast status, C-SPAN "on now" data, or the Congress.gov floor-activity feed.

---

## Per-level build status

### Level 3 · ROUTINE — ✅ working today
This is the existing dashboard, now correctly framed as the *default research
mode* rather than an apology for no vote.
- ✅ Defense Contract Wire (USASpending), Today's Conflicts (FEC PAC money),
  Recent Senate Votes (GovTrack), This Week schedule (Congress.gov).
- ⬜ **Dark-money / donor-network research** — deeper digging (super-PAC and
  501(c)(4) flows, donor→contract→committee links) is the growth area for L3.

### Level 2 · ELEVATED — 🟡 scaffolded
`components/levels/FloorSessionMode.tsx`
- ✅ Full-width mode frame + `● FLOOR IN SESSION` treatment.
- ✅ `ConflictChyron` renderer (TV lower-third ticker). Pass real items via the
  `chyronItems` prop.
- 🟡 **Chyron data** — feed it live FEC donor money (already available from
  `/api/donors`, the same data behind Today's Conflicts). Currently `[]` →
  honest placeholder.
- ⬜ **"Who's speaking now" card** — blocked on the `floorInSession` + current-
  speaker feed above. No speaker is named until it can be sourced.

### Level 1 · CRITICAL — 🟡 scaffolded
`components/levels/LiveVoteBroadcast.tsx`
- ✅ Full-width broadcast takeover + live-vote headline (real GovTrack meta).
- ✅ Real YEA/NAY tally continues to stream in the grid below.
- ⬜ **Play-by-play conflict flags** — per-position overlay ("voted YEA · took
  $X from the industry that wins if this passes"). Needs the **red-tier** donor
  + stock-holdings pipeline (see `PROGRESS.md`). Until then, no conflict is
  asserted against any named member — labeled as a scaffold in the UI.

---

## TODO (in priority order)

1. **Wire `floorInSession`** so Level 2 can actually trigger. Pick a floor-status
   source, add `/api/floor-status`, feed it into `deriveLevel`. *(Unlocks L2.)*
2. **Feed the conflict chyron** real FEC donor data from `/api/donors`. *(Makes
   L2 substantive with data we already have.)*
3. **Current-speaker card** for L2 once a speaker feed exists.
4. **Red-tier pipeline** (donors + stock holdings, persistent store) — the
   prerequisite for L1 play-by-play conflict flags. Tracked in `PROGRESS.md`.
5. **Deepen L3 research** — dark-money and donor-network exploration tools.
6. **Auto-refresh the level** — poll `/api/votes/live` (and floor status) so the
   page escalates/de-escalates without a reload. Today the level is set on load;
   the vote-alert poller already runs on a 60s interval and can drive this.

---

## Design rules (do not break)

- **Never fabricate to escalate.** An unknown signal stays unknown; we do not
  fake an "elevated" or "critical" state. This is the whole ethos of the site.
- **Scaffolds must say they're scaffolds.** Every not-yet-built spectacle feature
  carries a visible `Scaffold` / "analysis in progress" label, never a fake figure.
- **Level 3 is home.** It must always be a complete, useful page on its own — the
  higher levels are additive takeovers, not the only reason to visit.
