# LOBBY CAM — BATTLE PLAN
## Mockup → Live Product: 78-Task Dependency-Ordered Execution Plan

**Status:** Mockup complete. React JSX with full UI, mock data, live simulation, C-SPAN embed.
**Goal:** Live, viral, revenue-generating congressional corruption dashboard.
**Date:** March 22, 2026

---

# PHASE 1 — REAL DATA PLUMBING

Everything downstream depends on real data. This phase replaces every mock constant.

---

### 1. Set up monorepo and backend skeleton
- **What:** Initialize Next.js 14 app with App Router, Python FastAPI backend, PostgreSQL via Docker Compose, Redis for caching.
- **Why:** Need SSR for SEO (member pages), API routes for data, and a Python backend for the heavy ETL jobs where the best government-data libraries live.
- **How:** `create-next-app` with TypeScript. FastAPI service in `/backend`. Docker Compose with `postgres:16`, `redis:7`, and the FastAPI service. Shared types via a `/shared` package. The React mockup ports into Next.js as the index page with zero logic changes — it's already a single JSX component.
- **Requires:** Node 20+, Python 3.11+, Docker
- **Depends on:** None
- **Effort:** 4 hours
- **Tags:** CORE · PHASE 1

---

### 2. Design and migrate PostgreSQL schema
- **What:** Create the full relational schema for members, bills, votes, filings, disclosures, conflict scores, and the ID crosswalk table.
- **Why:** Every data pipeline in this phase writes to this schema. Must be designed first.
- **How:** Schema below. Use Alembic for migrations from FastAPI side. Key design decisions: (a) `members` table uses Bioguide ID as primary key since it's the most stable government identifier; (b) `member_ids` crosswalk table links all external IDs; (c) `conflict_scores` is a daily materialized calculation, not stored inline; (d) all monetary values stored as integer cents to avoid float precision issues; (e) `lobby_filings` stores the raw XML blob plus parsed fields for auditability.

```sql
-- Core tables
CREATE TABLE members (
    bioguide_id VARCHAR(7) PRIMARY KEY,  -- e.g., 'C001095'
    name_full VARCHAR(255) NOT NULL,
    name_last VARCHAR(100) NOT NULL,
    name_first VARCHAR(100) NOT NULL,
    party CHAR(1) NOT NULL,  -- R, D, I
    state CHAR(2) NOT NULL,
    chamber VARCHAR(6) NOT NULL,  -- senate, house
    district SMALLINT,  -- NULL for senators
    in_office BOOLEAN DEFAULT true,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_members_state ON members(state);
CREATE INDEX idx_members_party ON members(party);
CREATE INDEX idx_members_chamber ON members(chamber);

CREATE TABLE member_ids (
    bioguide_id VARCHAR(7) REFERENCES members(bioguide_id),
    fec_id VARCHAR(9),        -- e.g., 'H8TX22126'
    opensecrets_id VARCHAR(9), -- e.g., 'N00033085'
    govtrack_id INTEGER,
    lis_id VARCHAR(4),         -- Senate only, e.g., 'S391'
    thomas_id VARCHAR(5),
    PRIMARY KEY (bioguide_id)
);
CREATE INDEX idx_member_ids_fec ON member_ids(fec_id);
CREATE INDEX idx_member_ids_opensecrets ON member_ids(opensecrets_id);

CREATE TABLE bills (
    bill_id VARCHAR(20) PRIMARY KEY,  -- e.g., 'hr4421-119'
    bill_number VARCHAR(15) NOT NULL, -- e.g., 'H.R. 4421'
    title TEXT NOT NULL,
    short_title VARCHAR(255),
    congress SMALLINT NOT NULL,
    chamber VARCHAR(6) NOT NULL,
    introduced_date DATE,
    latest_action TEXT,
    latest_action_date DATE,
    subjects TEXT[],  -- array of CRS subject terms
    summary TEXT,
    cbo_score_url TEXT,
    full_text_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_bills_congress ON bills(congress);
CREATE INDEX idx_bills_subjects ON bills USING GIN(subjects);

CREATE TABLE votes (
    vote_id VARCHAR(30) PRIMARY KEY,  -- e.g., 'S119-2026-87'
    bill_id VARCHAR(20) REFERENCES bills(bill_id),
    chamber VARCHAR(6) NOT NULL,
    congress SMALLINT NOT NULL,
    session SMALLINT NOT NULL,
    roll_number INTEGER NOT NULL,
    vote_date TIMESTAMPTZ NOT NULL,
    question TEXT,
    result VARCHAR(20),
    yea_total SMALLINT,
    nay_total SMALLINT,
    not_voting SMALLINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_votes_date ON votes(vote_date DESC);
CREATE INDEX idx_votes_bill ON votes(bill_id);

CREATE TABLE vote_positions (
    vote_id VARCHAR(30) REFERENCES votes(vote_id),
    bioguide_id VARCHAR(7) REFERENCES members(bioguide_id),
    position VARCHAR(10) NOT NULL,  -- Yea, Nay, Not Voting, Present
    PRIMARY KEY (vote_id, bioguide_id)
);
CREATE INDEX idx_votepos_member ON vote_positions(bioguide_id);

CREATE TABLE donors (
    id BIGSERIAL PRIMARY KEY,
    bioguide_id VARCHAR(7) REFERENCES members(bioguide_id),
    cycle SMALLINT NOT NULL,       -- e.g., 2024, 2026
    industry_code VARCHAR(5),      -- CRP industry code
    industry_name VARCHAR(100),
    amount_total_cents BIGINT NOT NULL,
    amount_pacs_cents BIGINT,
    amount_indivs_cents BIGINT,
    source VARCHAR(20) DEFAULT 'opensecrets',
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_donors_member_cycle ON donors(bioguide_id, cycle);
CREATE INDEX idx_donors_industry ON donors(industry_code);

CREATE TABLE stock_holdings (
    id BIGSERIAL PRIMARY KEY,
    bioguide_id VARCHAR(7) REFERENCES members(bioguide_id),
    asset_name TEXT NOT NULL,
    ticker VARCHAR(10),            -- resolved ticker symbol, NULL if unresolved
    value_low_cents BIGINT,        -- disclosure range low bound
    value_high_cents BIGINT,       -- disclosure range high bound
    filing_date DATE,
    filing_url TEXT,
    industry_codes TEXT[],         -- mapped CRP industry codes
    source VARCHAR(50) DEFAULT 'financial_disclosure'
);
CREATE INDEX idx_holdings_member ON stock_holdings(bioguide_id);
CREATE INDEX idx_holdings_ticker ON stock_holdings(ticker);

CREATE TABLE lobby_filings (
    filing_id VARCHAR(36) PRIMARY KEY,  -- UUID from LDA
    registrant_name TEXT NOT NULL,       -- lobbying firm
    client_name TEXT NOT NULL,
    lobbyist_names TEXT[],
    specific_issues TEXT,
    general_issue_code VARCHAR(3),       -- LDA issue code
    general_issue_name VARCHAR(100),
    amount_cents BIGINT,
    filing_type VARCHAR(20),             -- registration, quarterly, amendment
    filing_date DATE,
    effective_date DATE,
    raw_xml TEXT,                         -- full XML blob for audit
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_lobby_date ON lobby_filings(filing_date DESC);
CREATE INDEX idx_lobby_client ON lobby_filings(client_name);
CREATE INDEX idx_lobby_issue ON lobby_filings(general_issue_code);

CREATE TABLE lobby_contacts (
    id BIGSERIAL PRIMARY KEY,
    filing_id VARCHAR(36) REFERENCES lobby_filings(filing_id),
    contact_name TEXT,
    contact_office TEXT,           -- e.g., 'Senate Armed Services Committee'
    bioguide_id VARCHAR(7),        -- resolved member, NULL if unresolved
    contact_date DATE,
    FOREIGN KEY (bioguide_id) REFERENCES members(bioguide_id)
);
CREATE INDEX idx_lobbycontact_member ON lobby_contacts(bioguide_id);
CREATE INDEX idx_lobbycontact_filing ON lobby_contacts(filing_id);

CREATE TABLE conflict_scores (
    id BIGSERIAL PRIMARY KEY,
    bioguide_id VARCHAR(7) REFERENCES members(bioguide_id),
    vote_id VARCHAR(30) REFERENCES votes(vote_id),
    score SMALLINT NOT NULL,       -- 0-100
    donor_overlap_score SMALLINT,  -- component
    holdings_score SMALLINT,       -- component
    revolving_door_score SMALLINT, -- component
    vote_correlation_score SMALLINT, -- component
    explanation TEXT,               -- human-readable one-liner
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_conflict_member_date ON conflict_scores(bioguide_id, calculated_at DESC);

CREATE TABLE session_status (
    id SERIAL PRIMARY KEY,
    chamber VARCHAR(6) NOT NULL,
    is_in_session BOOLEAN NOT NULL,
    current_action TEXT,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE revolving_door (
    id BIGSERIAL PRIMARY KEY,
    bioguide_id VARCHAR(7) REFERENCES members(bioguide_id),
    position_title TEXT,
    organization TEXT,
    start_year SMALLINT,
    end_year SMALLINT,
    source_url TEXT
);
```

- **Requires:** PostgreSQL 16, Alembic
- **Depends on:** Task 1
- **Effort:** 5 hours
- **Tags:** CORE · PHASE 1

---

### 3. Build member ID crosswalk table
- **What:** Create a pipeline that builds and maintains the mapping between Bioguide IDs, FEC candidate IDs, OpenSecrets CRP IDs, GovTrack IDs, and LIS IDs for all 535 current members.
- **Why:** Every single data join in this product depends on being able to link a donor record (FEC ID) to a vote record (Bioguide ID) to a lobbying contact (name string). Without this, data stays siloed.
- **How:** Start with the `@unitedstates/congress-legislators` YAML file on GitHub — it already contains Bioguide, FEC, GovTrack, LIS, Thomas, and ICPSR IDs for every member since 1789. Parse it, load current members into `members` and `member_ids` tables. For OpenSecrets IDs, use the OpenSecrets `getLegislators` endpoint filtered by state — match on name + state + party. Verify 100% coverage by cross-referencing against the House/Senate clerk rosters. Run this as a one-time seed, then daily delta check.
- **Gotcha:** FEC IDs can change between cycles if a member switches chambers (House → Senate). The `congress-legislators` file tracks these. OpenSecrets IDs are stable.
- **Requires:** `unitedstates/congress-legislators` GitHub repo (YAML), OpenSecrets API key (free tier: 200 calls/day)
- **Depends on:** Task 2
- **Effort:** 4 hours
- **Tags:** CORE · PHASE 1

---

### 4. Integrate Congress.gov API — bills and floor schedule
- **What:** Pull live bill data, floor schedule, and bill subjects from the Congress.gov API.
- **Why:** Populates Zone 2 (The Floor) with the actual bill being debated, its text, subjects, and CBO score.
- **How:** Congress.gov API v3 (`api.congress.gov/v3`). Requires free API key from api.data.gov. Endpoints: `/bill/{congress}/{type}/{number}` for bill details, `/bill/{congress}/{type}/{number}/subjects` for subject terms, `/daily-congressional-record` for floor activity. Rate limit: 5,000 calls/hour (generous). Poll floor schedule every 5 minutes. Cache bill details in Redis for 1 hour (bill text doesn't change mid-vote). Map CRS subject terms to our industry codes for conflict matching. Fallback: if API is down, show "Floor data temporarily unavailable — check C-SPAN feed" in the bill hero area.
- **Requires:** Congress.gov API key (free, api.data.gov)
- **Depends on:** Tasks 2, 3
- **Effort:** 6 hours
- **Tags:** CORE · PHASE 1

---

### 5. Integrate GovTrack API — vote records and roll calls
- **What:** Pull real-time roll call vote data as votes happen on the floor.
- **Why:** Powers the live vote tally in Zone 2. Replaces the simulated `useEffect` with real data.
- **How:** GovTrack API (`api.govtrack.us/v2`). Endpoints: `/vote?congress=119&session=2026&sort=-created` for recent votes, `/vote/{id}/voters` for individual positions. No auth required, rate limit ~1 req/sec. Poll every 30 seconds during session. Each voter response includes Bioguide ID, so joins directly to our `members` table. Write positions to `vote_positions` as they arrive, then push via WebSocket to frontend. Fallback: ProPublica Congress API (`api.propublica.org/congress/v1`) as secondary source — requires free API key, returns same data in different format. Run both, cross-validate, prefer GovTrack for speed.
- **Requires:** GovTrack API (no auth), ProPublica API key (free)
- **Depends on:** Tasks 2, 3
- **Effort:** 5 hours
- **Tags:** CORE · PHASE 1

---

### 6. Integrate OpenSecrets API — donor data by member and industry
- **What:** Pull career and cycle donor breakdowns for all 535 members, bucketed by industry.
- **Why:** Powers the "Top 3 donor industries" tags in Zone 4, the "Industry Money — Yea vs Nay" bar chart in Zone 2, and the member profile modal's career donor breakdown.
- **How:** OpenSecrets API (`opensecrets.org/api`). Endpoints: `candIndustry` (top industries for a candidate by cycle), `candContrib` (top contributor orgs), `candSummary` (total raised). Free tier: 200 calls/day. With 535 members, full refresh takes ~3 days at free tier. Strategy: seed with bulk data download (OpenSecrets provides CSV bulk data for researchers — apply at opensecrets.org/bulk-data, approval takes 24-48 hrs), then use API for incremental daily updates of the ~50 members most relevant to today's legislation. Store in `donors` table. Cache industry totals per member in Redis with 24h TTL. Fallback: bulk data is refreshed quarterly by OpenSecrets, so worst case we're 3 months stale on donors — acceptable for career totals.
- **Gotcha:** OpenSecrets industry codes (e.g., `D01` for Defense) must be mapped to the display names in the UI. Their codebook is at `opensecrets.org/downloads/crp/CRP_Categories.txt`.
- **Requires:** OpenSecrets API key (free), bulk data access (apply)
- **Depends on:** Task 3
- **Effort:** 8 hours
- **Tags:** CORE · PHASE 1

---

### 7. Integrate FEC API — real-time donor filings
- **What:** Pull recent individual and PAC contributions from the FEC's real-time filing database.
- **Why:** Catches new donations as they're filed — enables "FEC FILING: Boeing PAC donated $54K..." ticker items that feel genuinely live.
- **How:** FEC API (`api.open.fec.gov/v1`). Endpoints: `/schedules/schedule_a/` for individual contributions (filter by `committee_id` linked to member's principal campaign committee), `/schedules/schedule_b/` for disbursements. Free API key from api.data.gov, rate limit 1,000/hour. Poll for new filings every 15 minutes. Join to members via FEC candidate ID from crosswalk table. The FEC committee-to-candidate mapping is at `/candidate/{candidate_id}/committees/`. New filings within 48 hours get flagged as ticker items. Fallback: if rate limited, degrade to daily batch pulls.
- **Gotcha:** FEC data can lag 24-48 hours for electronic filings and weeks for paper filings. Display "as of [filing date]" on all FEC-sourced data.
- **Requires:** FEC API key (free, api.data.gov)
- **Depends on:** Task 3
- **Effort:** 6 hours
- **Tags:** CORE · PHASE 1

---

### 8. Build LDA lobbying disclosure bulk ingest pipeline
- **What:** Download, parse, and continuously ingest Senate Lobbying Disclosure Act XML filings.
- **Why:** Powers Zone 3 (Lobby Wire) with real lobbyist activity. This is the data source that makes the product unique.
- **How:** Senate LDA database at `lda.senate.gov/api/`. Bulk XML downloads available quarterly. Incremental updates: scrape the filing search page (`lda.senate.gov/filings/public/filing/search/`) with date filters for daily deltas. Parse XML using Python `lxml` — each filing contains registrant (firm), client, lobbyists, issues, and reported contacts. Store full XML in `lobby_filings.raw_xml` for audit. Parse contact names and attempt to resolve to `bioguide_id` using fuzzy matching (Task 9). Filing types: `Q1`-`Q4` quarterly reports, `RR` registration, `MA` amendment. Focus on quarterly reports for contact data. Cache parsed filings in PostgreSQL, not Redis — these are permanent records. Fallback: if scraping is blocked, fall back to quarterly bulk download (up to 3 months stale).
- **Gotcha:** LDA contact fields are free-text, not structured. "Met with staff of Senate Armed Services Committee" doesn't name a member. Need NLP entity extraction (Task 9) to resolve these.
- **Requires:** Python `lxml`, `requests`, `beautifulsoup4`
- **Depends on:** Task 2
- **Effort:** 10 hours
- **Tags:** CORE · PHASE 1

---

### 9. Build fuzzy name/entity resolution for lobby contacts
- **What:** Resolve free-text lobby contact fields ("staff of Sen. Caldwell," "Senate Armed Services") to specific `bioguide_id` values.
- **Why:** Without this, Lobby Wire cards can't show which specific member a lobbyist met with, and we can't flag active conflicts.
- **How:** Three-tier approach: (1) Exact match — if contact field contains a member name, match against `members.name_last` + `members.name_first`; (2) Committee match — maintain a `committees` lookup table mapping committee names to member assignments (from Congress.gov API `/member/{bioguide}/committees`), flag all members of named committee; (3) Fuzzy match — use `thefuzz` (fuzzywuzzy) with a threshold of 85 for partial name matches. Log all resolutions with confidence scores in a `lobby_contact_resolutions` table for manual review. Start with tiers 1+2 which should resolve ~70% of contacts. Tier 3 catches another ~15%. The remaining ~15% stay unresolved and display as-is.
- **Requires:** Python `thefuzz`, Congress.gov committee membership API
- **Depends on:** Tasks 3, 8
- **Effort:** 6 hours
- **Tags:** CORE · PHASE 1

---

### 10. Build financial disclosure PDF scraping pipeline
- **What:** Download and extract structured data from House and Senate financial disclosure PDFs.
- **Why:** Powers the stock holdings data in Zone 4 member profiles. This is the most legally powerful data in the app — members are required to disclose holdings.
- **How:** House disclosures at `disclosures.house.gov`, Senate at `efdsearch.senate.gov/search/`. Both provide search interfaces and PDF downloads. Pipeline: (1) Scrape filing index pages with Playwright (both sites are JavaScript-rendered); (2) Download PDFs; (3) Extract text with `pdfplumber` (not PyPDF2 — pdfplumber handles the table layouts in these forms much better); (4) Parse the "PART A: Assets" table which contains asset name, value range (e.g., "$100,001 - $250,000"), type, and income. Use regex patterns specific to each chamber's form format — House uses PTR (Periodic Transaction Report) format, Senate uses a different layout. (5) Attempt to resolve asset names to ticker symbols using a curated mapping table + Yahoo Finance search API. Store in `stock_holdings` table with both raw asset name and resolved ticker. Run full scrape quarterly, incremental PTR checks weekly.
- **Gotcha:** About 40% of asset names won't map cleanly to tickers (e.g., "Vanguard Total Market Index Fund" → VTI requires a curated mapping). Build a growing alias table. Senate PDFs are often scanned images — need `pytesseract` OCR as fallback with manual confidence scoring. Flag low-confidence extractions for human review.
- **Requires:** Playwright, `pdfplumber`, `pytesseract`, Yahoo Finance API (unofficial, `yfinance`)
- **Depends on:** Tasks 2, 3
- **Effort:** 14 hours
- **Tags:** CORE · PHASE 1

---

### 11. Integrate stock price API for live holdings values
- **What:** Fetch current stock prices for all tickers in the `stock_holdings` table so holdings feel live.
- **Why:** Showing "$180,000 in Lockheed Martin" is more impactful when it says "Lockheed Martin (LMT) — $487.23 ↑ 2.3% today — est. holding: $145K–$350K."
- **How:** Use Polygon.io free tier for end-of-day prices (5 API calls/min, delayed 15 min). Endpoint: `/v2/aggs/ticker/{ticker}/prev` for previous close. For the ~200 unique tickers across all member holdings, one daily batch job suffices. Cache prices in Redis with 4h TTL. Display disclosure range (from PDF) alongside current price for transparency. Fallback: if Polygon is down, show "Price data unavailable" and display only the disclosure range.
- **Gotcha:** Free Polygon tier gives delayed data only. For real-time, need Polygon Starter ($29/mo) or use Yahoo Finance (unofficial, rate limited, legally gray). Start with Polygon free.
- **Requires:** Polygon.io API key (free tier)
- **Depends on:** Task 10
- **Effort:** 3 hours
- **Tags:** CORE · PHASE 1

---

### 12. Integrate USASpending.gov — federal contracts
- **What:** Pull federal contract data to link defense/pharma/energy contractors to lobbying clients and member donors.
- **Why:** Adds a powerful data layer: "Lockheed Martin received $42B in DoD contracts in FY2025" next to "Lockheed lobbyist met with Sen. Caldwell."
- **How:** USASpending.gov API v2 (`api.usaspending.gov/api/v2`). Endpoint: `/search/spending_by_award/` with filters for recipient name, agency, fiscal year. No auth required. Rate limit: generous (100 req/min). Query for all unique `client_name` values in `lobby_filings` to get their federal contract totals. Store in a `federal_contracts` summary table. Join to lobby filings on client name (exact + fuzzy). Update monthly — contract data doesn't change fast. Fallback: show without contract data, it's supplementary.
- **Requires:** USASpending.gov API (no auth)
- **Depends on:** Task 8
- **Effort:** 4 hours
- **Tags:** GROWTH · PHASE 1

---

### 13. Build C-SPAN session detection and live feed management
- **What:** Programmatically detect whether Senate/House floor is live on C-SPAN and manage the embed state.
- **Why:** The "SENATE IN SESSION" indicator and C-SPAN embed need to be accurate — showing "IN SESSION" with a dead feed destroys credibility.
- **How:** Multi-source approach: (1) Scrape C-SPAN schedule page (`c-span.org/schedule/`) for today's scheduled floor proceedings — Playwright required (JS-rendered); (2) Check Congress.gov floor schedule RSS feeds (`senate.gov/legislative/schedule.htm` and `house.gov/legislative/activity`); (3) Parse the Senate/House floor schedule XML feeds for "convened" / "adjourned" timestamps. Logic: mark as "in session" if (a) schedule shows floor activity AND (b) current time is within scheduled window ± 2 hours (votes often run late). Pro forma sessions: detect via schedule text containing "pro forma" — display as "PRO FORMA SESSION — NO VOTES EXPECTED." C-SPAN embed: use `c-span.org/video/standalone/?channel=c-span-2` (already implemented). When session is detected as adjourned, swap embed for a static card: "SENATE ADJOURNED — Next session: [date/time from schedule]." Check every 3 minutes.
- **Requires:** Playwright, Congress.gov RSS feeds
- **Depends on:** Task 1
- **Effort:** 5 hours
- **Tags:** CORE · PHASE 1

---

### 14. Build bill-to-industry mapping engine
- **What:** Map each bill's subject matter to industry codes so we can calculate which members have financial conflicts with specific legislation.
- **Why:** The entire conflict score depends on knowing "H.R. 4421 is a defense bill" so we can flag members with defense donors/holdings.
- **How:** Congress.gov API provides CRS subject terms per bill (`/bill/{congress}/{type}/{number}/subjects`). Build a curated mapping table: CRS subject term → CRP industry code(s). Example: "Armed forces and national security" → `D01` (Defense Aerospace), `D02` (Defense Electronics). Start with the ~30 most common CRS subjects that map cleanly to high-dollar industries. Store mapping in a `subject_industry_map` table. For bills with multiple subjects, use all mapped industries. This is a human-curated table that grows over time — seed it with the top subjects from current session bills. Fallback: for unmapped subjects, flag bill as "industry mapping pending" and don't calculate conflict scores until mapped.
- **Gotcha:** Some bills span multiple industries (e.g., infrastructure bills touch construction, energy, and transportation). The mapping must be many-to-many.
- **Requires:** Congress.gov API, manual curation
- **Depends on:** Task 4
- **Effort:** 5 hours
- **Tags:** CORE · PHASE 1

---

# PHASE 2 — LIVE INFRASTRUCTURE

Make data flow in real time to the frontend.

---

### 15. Implement WebSocket layer with Server-Sent Events
- **What:** Build real-time data push from backend to frontend for vote tallies, new filings, and ticker updates.
- **Why:** The "live" feeling is the product. Polling from the frontend would be laggy and expensive.
- **How:** Use Server-Sent Events (SSE), not WebSockets or Socket.io. Rationale: all data flows one direction (server → client), SSE auto-reconnects on network drops, works through corporate proxies/firewalls that block WebSocket upgrades, and is simpler to scale behind a load balancer. Implement in FastAPI using `StreamingResponse` with `text/event-stream` content type. Event types and payloads:
  - `vote_update` → `{ vote_id, bioguide_id, position, member_name, party, state, is_conflicted, conflict_summary }`
  - `new_filing` → `{ filing_id, lobbyist, firm, client, industry, member_met, committee, timestamp, active_conflict }`
  - `ticker_item` → `{ id, text, severity, timestamp }`
  - `session_status` → `{ chamber, is_in_session, current_action }`
  - `score_update` → `{ bioguide_id, new_score, change }`
  Frontend: `EventSource` API with reconnect logic. Fallback: if SSE connection drops for >30 seconds, show a "Reconnecting…" banner and fall back to polling every 10 seconds.
- **Requires:** FastAPI `StreamingResponse`, browser `EventSource` API
- **Depends on:** Task 1
- **Effort:** 6 hours
- **Tags:** CORE · PHASE 2

---

### 16. Build background job scheduler for data pipelines
- **What:** Schedule and orchestrate all data-fetching jobs with appropriate cadences.
- **Why:** Each data source has a different update frequency, rate limit, and failure mode. Need centralized job management.
- **How:** Use APScheduler (not Celery — overkill for this scale, we don't need distributed workers yet). Run inside the FastAPI process. Job schedule:
  - Every 30 seconds: check GovTrack for new vote positions (during session only)
  - Every 3 minutes: check session status, floor schedule
  - Every 5 minutes: check Congress.gov for bill updates
  - Every 15 minutes: check FEC for new filings
  - Every 1 hour: refresh LDA filing scrape for today's filings
  - Every 4 hours: refresh Polygon stock prices
  - Every 24 hours (2 AM ET): full donor data refresh, conflict score recalculation
  - Every 7 days: incremental financial disclosure scrape
  Each job logs to a `job_runs` table with start time, duration, records processed, and error count. Jobs that fail 3 consecutive times send an alert (email) and degrade gracefully — the UI shows cached data with a "Last updated: [timestamp]" indicator.
- **Requires:** APScheduler, FastAPI
- **Depends on:** Tasks 4–14
- **Effort:** 5 hours
- **Tags:** CORE · PHASE 2

---

### 17. Implement conflict score algorithm
- **What:** Design and code the auditable formula that produces a 0-100 conflict score per member per vote.
- **Why:** The number is the product. If it's not defensible, a single journalist's debunking goes viral instead of us.
- **How:** Four components, equally weighted at 25 points each:

  **Donor Overlap (0-25):** For the bill's mapped industries (from Task 14), sum the member's career donations from those industries. Score = `min(25, (industry_donations / $200,000) × 25)`. Rationale: $200K in industry donations is an extremely high overlap; the $200K cap prevents a handful of mega-donors from distorting the scale.

  **Holdings Score (0-25):** For the bill's mapped industries, sum the member's stock holdings (midpoint of disclosure range) in companies within those industries. Score = `min(25, (holdings_value / $300,000) × 25)`. Include both direct stock and fund holdings where the fund's top sector matches the bill's industry.

  **Revolving Door (0-25):** Binary + recency weighted. If member has prior employment in the bill's affected industry: 20 points. If that employment ended within the last 6 years: +5 points. If spouse/family member currently employed in the industry: 15 points. Cap at 25.

  **Vote-Donor Correlation (0-25):** Historical: across all past votes on bills in the same industry, what percentage of the time did this member vote in alignment with the industry's lobbying position? Score = `(correlation_pct / 100) × 25`. Minimum 5 past votes required; if fewer, this component scores 0 and the other three are scaled to fill (33.3 each).

  Final score = sum of four components, clamped 0-100. Store each component separately in `conflict_scores` for transparency. The explanation field auto-generates: "Score driven by $412K in defense industry donations (25/25), $340K in defense stock holdings (22/25), prior employment at Halliburton (20/25), and 96% vote alignment with defense donors (24/25)."

  **Journalist-friendly one-paragraph explanation:** "LOBBY CAM's Conflict Score measures how financially entangled a member of Congress is with the industries affected by today's legislation. It combines four equally weighted components: how much money they've received from those industries, how much stock they hold in affected companies, whether they or their family have worked in the industry, and how often their past votes have aligned with industry lobbying positions. Each component contributes up to 25 points for a maximum score of 100. All underlying data comes from public government filings — FEC donor records, Congressional financial disclosures, Senate lobbying reports, and the Congressional Record."

- **Requires:** All Phase 1 data pipelines
- **Depends on:** Tasks 6, 7, 10, 14
- **Effort:** 8 hours
- **Tags:** CORE · PHASE 2

---

### 18. Build Redis caching layer
- **What:** Implement structured caching for all hot data paths.
- **Why:** The frontend hits the API on every page load and SSE reconnect. Without caching, we'll DDoS our own database and upstream APIs.
- **How:** Redis 7 (already in Docker Compose from Task 1). Caching strategy by data type:
  - `session:status:{chamber}` → 3 min TTL (session detection)
  - `bill:current:{chamber}` → 5 min TTL (current floor bill)
  - `votes:live:{vote_id}` → 30 sec TTL (active vote positions)
  - `members:profile:{bioguide_id}` → 1 hour TTL (member profile data)
  - `donors:{bioguide_id}:{cycle}` → 24 hour TTL (donor breakdowns)
  - `scores:today:{bioguide_id}` → 1 hour TTL (conflict scores, recalc on new vote)
  - `filings:recent` → 15 min TTL (latest lobby filings list)
  - `stocks:{ticker}` → 4 hour TTL (stock prices)
  Use Redis JSON module for complex objects. Implement cache-aside pattern: check Redis → miss → query Postgres → write Redis → return. All SSE events also write-through to Redis so reconnecting clients get current state immediately.
- **Requires:** Redis 7, `redis-py`
- **Depends on:** Task 1
- **Effort:** 4 hours
- **Tags:** CORE · PHASE 2

---

### 19. Build REST API for frontend consumption
- **What:** Create the FastAPI endpoints that the Next.js frontend calls for initial page load and for the member profile modal.
- **Why:** SSE handles live updates, but the initial page state and on-demand profile loads need REST endpoints.
- **How:** FastAPI endpoints:
  - `GET /api/floor/current` → current bill, session status, vote tally
  - `GET /api/votes/{vote_id}/positions` → all positions for a vote
  - `GET /api/filings/recent?limit=20` → latest lobby filings
  - `GET /api/members/conflicts/today?limit=6` → top conflicted members for today's legislation
  - `GET /api/members/{bioguide_id}/profile` → full member profile (donors, holdings, votes, revolving door, scores)
  - `GET /api/ticker/items?limit=10` → latest ticker items
  - `GET /api/archive/votes?limit=10` → recent past votes with conflict analysis
  - `GET /api/search/members?q={query}` → member name search
  All endpoints return JSON matching the existing mock data structures in the JSX file. Add `X-Data-Freshness` header with timestamp of last upstream refresh. Rate limit: 60 req/min per IP for unauthenticated, 600 for API key holders.
- **Requires:** FastAPI, Pydantic models
- **Depends on:** Tasks 2, 15, 18
- **Effort:** 6 hours
- **Tags:** CORE · PHASE 2

---

### 20. Connect frontend to live API and SSE
- **What:** Replace all mock data constants in the React JSX with API fetches and SSE event handlers.
- **Why:** This is the moment the mockup becomes a real product.
- **How:** In the Next.js page component: `useEffect` on mount fetches from `/api/floor/current`, `/api/filings/recent`, `/api/members/conflicts/today`, `/api/ticker/items`, `/api/archive/votes`. Each populates state that previously came from constants. Open SSE connection to `/api/stream` — on `vote_update` events, append to vote tally state; on `new_filing` events, prepend to filings state; on `ticker_item` events, append to ticker. The `selectedMember` modal now calls `/api/members/{id}/profile` on open. Keep the existing animation logic (fade-in, flash) — just trigger it from SSE events instead of simulated intervals. Add loading skeletons for each zone during initial fetch. Add error states for each zone independently — if filings fail, votes can still show.
- **Requires:** Next.js, existing React component
- **Depends on:** Tasks 15, 19
- **Effort:** 6 hours
- **Tags:** CORE · PHASE 2

---

### 21. Deploy to production infrastructure
- **What:** Deploy the full stack to production hosting.
- **Why:** Can't have a live product without live hosting.
- **How:** Railway (Peter is already familiar from Ahab deployment). Three services: (1) Next.js frontend on Railway with auto-deploy from GitHub; (2) FastAPI backend on Railway; (3) PostgreSQL and Redis as Railway managed services. Environment variables for all API keys. Set up custom domain (`lobbycam.org` — check availability, register via Namecheap or Cloudflare Registrar). Cloudflare in front for CDN, DDoS protection, and SSL. Estimated monthly cost at launch: Railway Starter ($5/mo per service × 3 = $15) + PostgreSQL ($7) + Redis ($7) + domain ($12/yr) = ~$30/month. This scales to ~10K concurrent users before needing to upgrade.
- **Requires:** Railway account, Cloudflare account, domain registration
- **Depends on:** Task 20
- **Effort:** 4 hours
- **Tags:** CORE · PHASE 2

---

# PHASE 3 — THE VIRAL MECHANICS

Features that make people screenshot, share, and come back.

---

### 22. Set up X (Twitter) API v2 integration
- **What:** Register a developer app, set up OAuth 2.0 with PKCE, determine the right tier, and build the base posting client.
- **Why:** X is the #1 viral distribution channel for political content. The @LobbyCAM account needs to auto-post conflict alerts.
- **How:** Apply for X API access at `developer.twitter.com`. Tier needed: **Basic ($200/month)** — Free tier only allows 1,500 posts/month and no read access. Basic gives 10,000 posts/month and full read/write. Pro ($5,000/mo) is overkill. Scopes needed: `tweet.read`, `tweet.write`, `users.read`, `offline.access`. OAuth 2.0 with PKCE for user context (needed for posting). Build a `TwitterClient` class in Python wrapping `tweepy` v4 with: post_tweet(text, media_ids), reply_to_tweet(tweet_id, text), upload_media(image_bytes), get_rate_limits(). Implement exponential backoff for rate limits (900 posts/15 min window on Basic). Queue posts through Redis sorted set ordered by priority, processed by a background worker.
- **Gotcha:** X app review can take 1-5 business days. Apply immediately. For the "Elevated" project, describe LOBBY CAM as "civic transparency tool that auto-posts public government data."
- **Requires:** X API Basic tier ($200/mo), `tweepy` v4
- **Depends on:** Task 1
- **Effort:** 4 hours
- **Tags:** VIRAL · PHASE 3

---

### 23. Build conflict card image generator
- **What:** Programmatically generate shareable image cards for member conflict profiles and vote conflict summaries.
- **Why:** Images get 2-3x more engagement on X and are what people screenshot. A well-designed conflict card is the single highest-leverage viral asset.
- **How:** Use `html-to-image` (not Puppeteer — Puppeteer requires a headless browser which is heavyweight for a server process; `html-to-image` runs in Node and is 10x faster). Design two card templates as HTML/CSS:

  **Member Conflict Card (1200×675px, X card dimensions):**
  - LOBBY CAM masthead at top
  - Member name, party, state, conflict score (large, red)
  - Top 3 holdings with values
  - Top 3 donor industries with amounts
  - "Votes with [industry] donors X% of the time"
  - QR code linking to full profile page
  - Source citations along bottom in 8px text

  **Vote Conflict Card (1200×675px):**
  - Bill number and title
  - "X of Y YES voters have financial conflicts"
  - Industry money bar chart (yes vs no)
  - Top 3 conflicted members listed with scores
  - Source citations

  Render to PNG at 2x resolution. Store in R2 (Cloudflare) or S3 with CDN URL. Generate on demand (first share/tweet) and cache permanently. Expose via API: `GET /api/cards/member/{bioguide_id}.png`, `GET /api/cards/vote/{vote_id}.png`.

- **Requires:** `html-to-image` (npm), image hosting (Cloudflare R2)
- **Depends on:** Task 17
- **Effort:** 8 hours
- **Tags:** VIRAL · PHASE 3

---

### 24. Build auto-tweet pipeline for conflict detection
- **What:** Automatically tweet when a member with a high conflict score casts a vote on conflicted legislation.
- **Why:** Real-time conflict tweets during live votes are the viral engine. "Sen. Caldwell just voted YES on the $886B defense bill. He holds $340K in Lockheed stock." posted within seconds of the vote.
- **How:** Trigger: SSE `vote_update` event where `is_conflicted == true` AND member's `conflict_score >= 60`. Tweet template:

  ```
  🚨 {MEMBER_NAME} ({PARTY}-{STATE}) just voted {POSITION} on {BILL_NUMBER} — {BILL_SHORT_TITLE}.

  Conflict: {CONFLICT_SUMMARY}

  Conflict Score: {SCORE}/100

  Source: FEC, Congressional Financial Disclosures
  lobbycam.org/member/{BIOGUIDE_ID}
  ```

  Attach the member conflict card image (Task 23). Character count management: truncate `CONFLICT_SUMMARY` to fit 280 chars minus the fixed template. Queue through Redis priority queue — higher conflict scores post first. Rate limit: max 1 tweet per member per vote, max 20 conflict tweets per vote event. Dedup: track posted (member_id, vote_id) combos in Redis set.

- **Requires:** Tasks 22, 23
- **Depends on:** Tasks 22, 23, 17
- **Effort:** 5 hours
- **Tags:** VIRAL · PHASE 3

---

### 25. Build auto-tweet pipeline for vote completion
- **What:** Tweet a summary thread when a roll call vote concludes.
- **Why:** The vote completion tweet is the anchor that all conflict tweets thread from. It's also the most shareable single tweet — "8 of 12 YES voters held defense stock."
- **How:** Trigger: when vote tally stops updating (no new positions for 5 minutes after vote was in progress). Generate summary tweet:

  ```
  📊 VOTE RESULT: {BILL_NUMBER} — {BILL_TITLE}
  {RESULT}: {YEA_COUNT}-{NAY_COUNT}

  {CONFLICTED_COUNT} of {TOTAL_YES} YES voters had documented financial conflicts.

  Total defense industry money to YES voters: {MONEY_YES}
  Total to NAY voters: {MONEY_NO}

  Full analysis: lobbycam.org/vote/{VOTE_ID}
  ```

  Attach vote conflict card image. Then reply to this tweet with a thread: one reply per conflicted member (max 5 replies to avoid spam). Each reply links to the member's individual conflict tweet from Task 24 or generates a new one. Store the summary tweet ID in `votes` table for threading.

- **Requires:** Task 22
- **Depends on:** Tasks 22, 23, 24
- **Effort:** 4 hours
- **Tags:** VIRAL · PHASE 3

---

### 26. Build "Share This Profile" functionality
- **What:** The member profile modal's share button generates a pre-populated tweet with the conflict card image, and a copy-to-clipboard fallback.
- **Why:** User-initiated shares with personalized images convert at 5-10x the rate of plain text shares.
- **How:** On click: (1) Call `/api/cards/member/{bioguide_id}.png` to get or generate the card image; (2) Open X intent URL: `https://twitter.com/intent/tweet?text={encoded_text}&url={profile_url}`; (3) The profile URL's OG tags (Task 27) will show the card image in the link preview, so no need to upload the image via API for user-initiated shares. For non-X sharing: copy pre-formatted text to clipboard (already implemented) plus download the card image. Add a "Download Card" button below the share button that triggers a direct download of the PNG.
- **Requires:** Task 23
- **Depends on:** Task 23
- **Effort:** 3 hours
- **Tags:** VIRAL · PHASE 3

---

### 27. Implement dynamic OG meta tags for link previews
- **What:** Generate dynamic Open Graph and Twitter Card meta tags for every member profile page and vote page.
- **Why:** When someone pastes a LOBBY CAM link in X, iMessage, Reddit, or Slack, the preview card is the first impression. It needs to show the conflict data, not a generic site description.
- **How:** Next.js `generateMetadata` in App Router. For `/member/[bioguide_id]`: set `og:title` to "Sen. Robert Caldwell — Conflict Score: 94/100", `og:description` to the one-line conflict summary, `og:image` to `/api/cards/member/{bioguide_id}.png`. For `/vote/[vote_id]`: set title to the bill name, description to the headline finding, image to the vote card. Set `twitter:card` to `summary_large_image` for maximum visual impact. Validate with Twitter Card Validator and Facebook Sharing Debugger. Cache meta tag data in Redis since it's hit on every link unfurl.
- **Requires:** Next.js App Router `generateMetadata`
- **Depends on:** Tasks 23, 21
- **Effort:** 3 hours
- **Tags:** VIRAL · PHASE 3

---

### 28. Build email alert system — "Your Rep Has a Conflict"
- **What:** Users enter their zip code, we identify their 3 members (2 senators + 1 rep), and email them when those members have high conflict scores.
- **Why:** Recurring engagement loop. People care most about their own representatives.
- **How:** Signup flow: zip code input in the site footer → geocode to congressional district using Census Geocoder API (`geocoding.geo.census.gov/geocoder/`) → identify 2 senators (state-level) + 1 rep (district-level) → store in `alert_subscriptions` table (email, zip, bioguide_ids[], confirmed). Double opt-in via email confirmation. Send via Resend ($0 for first 3,000 emails/mo, then $20/mo for 50K). Trigger: when any subscribed member's conflict score exceeds 60 on a vote day. Email template: clean, newspaper-style, single-column. Subject line: "🚨 Sen. Caldwell voted on a bill — with $340K in Lockheed stock." Body: conflict summary, conflict card image (inline), link to full profile. Unsubscribe link in footer. Send at most 1 email per member per vote event, batched within 30 minutes of vote conclusion.
- **Requires:** Resend ($0-$20/mo), Census Geocoder API (free)
- **Depends on:** Tasks 17, 21, 23
- **Effort:** 8 hours
- **Tags:** GROWTH · PHASE 3

---

### 29. Build web push notification system
- **What:** Implement browser push notifications for real-time conflict alerts.
- **Why:** Push notifications have the highest engagement rate of any channel — 3-10x email open rates. Users who enable push will see alerts within seconds of a conflict vote.
- **How:** Service Worker registration in Next.js using `next-pwa` or manual SW. Use the Web Push API with VAPID keys (generated server-side). Subscription flow: prompt after user visits the site 2+ times (don't prompt on first visit — conversion is low). Store push subscriptions in PostgreSQL `push_subscriptions` table. Trigger: same as email (conflict score > 60 on vote), but sent immediately (not batched). Notification payload: `{ title: "🚨 Conflict Alert", body: "Sen. Caldwell voted YES on defense bill — holds $340K in Lockheed stock", url: "/member/C001095", icon: "/icon-192.png" }`. Rate limit: max 3 push notifications per user per day to prevent fatigue. Use `web-push` npm library for server-side delivery.
- **Requires:** `web-push` npm, VAPID keys
- **Depends on:** Task 21
- **Effort:** 5 hours
- **Tags:** GROWTH · PHASE 3

---

### 30. Build embeddable widget for newsrooms
- **What:** A `<script>` tag that newsrooms drop into articles to auto-display the conflict profile of any member mentioned in the article.
- **Why:** Distribution through existing media reach. If Politico or The Intercept embeds our widget, their audience becomes our audience.
- **How:** Build as a Web Component (Shadow DOM for style isolation). The script tag: `<script src="https://lobbycam.org/embed.js" data-member="C001095"></script>` renders an iframe or shadow DOM element showing the member's conflict score, top 3 conflicts, and "View full profile on LOBBY CAM →" link. Compact design: 300px wide, ~200px tall, newspaper aesthetic matching the parent site. Also support auto-detection mode: `<script src="https://lobbycam.org/embed.js" data-auto="true"></script>` which scans the page text for member names and inserts inline tooltips. Build the widget as a separate Vite build artifact, hosted on CDN. Total JS payload: target < 30KB gzipped.
- **Requires:** Vite, Web Components API
- **Depends on:** Tasks 19, 21
- **Effort:** 8 hours
- **Tags:** GROWTH · PHASE 3

---

### 31. Embed @LobbyCAM X feed in the UI
- **What:** Add a "LOBBY CAM LIVE" section showing the @LobbyCAM Twitter feed embedded directly in the dashboard.
- **Why:** Unifies the X presence and the site into one organism. Users see the tweets go out in real time alongside the data.
- **How:** Use X's embed timeline widget: `<a class="twitter-timeline" href="https://twitter.com/LobbyCAM">Tweets</a><script src="https://platform.twitter.com/widgets.js"></script>`. Place in a collapsible sidebar or below the Archive Bar. Style the container to match the site aesthetic (the widget itself is styled by X). Alternative: use X API v2 to pull recent tweets and render them natively in our design — more work but more control. Start with the official embed, upgrade to native rendering later.
- **Requires:** X API embed widget (no auth needed)
- **Depends on:** Task 22
- **Effort:** 2 hours
- **Tags:** VIRAL · PHASE 3

---

### 32. Build SMS alert tier via Twilio
- **What:** Offer SMS alerts as a premium feature for paying users.
- **Why:** Revenue-generating feature. SMS has even higher open rates than push. Congressional staffers and journalists will pay for instant conflict alerts.
- **How:** Twilio Programmable SMS. Endpoint: send POST to `https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json`. Cost: $0.0079/message + $1/mo per phone number. Subscription flow: part of the paid tier (Task 39). User provides phone number → verify via Twilio Verify API → store in `sms_subscriptions`. Same trigger logic as email/push alerts but text-only format: "LOBBY CAM: Sen. Caldwell voted YES on $886B defense bill. Holds $340K Lockheed stock. Score: 94/100. lobbycam.org/member/C001095". Max 2 SMS per user per day. Estimated cost at 10K subscribers: ~$80/day on heavy vote days.
- **Requires:** Twilio account ($20 initial credit), phone number ($1/mo)
- **Depends on:** Tasks 21, 28
- **Effort:** 4 hours
- **Tags:** REVENUE · PHASE 3

---

# PHASE 4 — GROWTH & DISTRIBUTION

Reaching a million people.

---

### 33. Build SEO-optimized member profile pages
- **What:** Every member of Congress gets a permanent page at `/member/[bioguide-id]` with full conflict history, optimized for Google.
- **Why:** 535 evergreen pages that rank for "[member name] corruption," "[member name] donors," "[member name] stock holdings." These are the long-tail SEO backbone.
- **How:** Next.js App Router with ISR (Incremental Static Regeneration). `generateStaticParams` pre-builds all 535 pages at deploy time. Revalidate every 1 hour. Page content: full member profile (same data as modal), but expanded with career vote history, all financial disclosures, lobbying contacts, and a timeline view. Schema.org `Person` structured data for rich Google results. URL structure: `/member/C001095` (Bioguide ID) with a canonical redirect from `/member/robert-caldwell` (name slug). Each page's `<title>`: "Sen. Robert Caldwell (R-TX) — Donor & Conflict Profile | LOBBY CAM". Internal linking: each member page links to all members who share donors, same committee assignments, and same state.
- **Requires:** Next.js ISR
- **Depends on:** Tasks 19, 21
- **Effort:** 8 hours
- **Tags:** GROWTH · PHASE 4

---

### 34. Build SEO-optimized vote analysis pages
- **What:** Every roll call vote gets a permanent page at `/vote/[vote-id]` with full conflict breakdown.
- **Why:** These pages rank for "[bill name] vote," "[bill number] who voted," and become the canonical source for vote-conflict analysis.
- **How:** Same ISR pattern as member pages. Page content: bill title, full vote tally with conflict flags, industry money comparison chart, list of all conflicted voters with summaries, and the "headline finding" (e.g., "8 of 12 YES voters held pharma stock"). Link to each conflicted member's profile page. Structured data: `VoteAction` schema. Auto-generated within 1 hour of vote completion.
- **Requires:** Next.js ISR
- **Depends on:** Tasks 19, 33
- **Effort:** 5 hours
- **Tags:** GROWTH · PHASE 4

---

### 35. Build "Today's Conflicts" daily email briefing
- **What:** A daily email at 7 AM ET summarizing the day's scheduled votes and pre-identified conflicts.
- **Why:** Morning habit loop. Journalists will use this as a tip sheet. Readers will forward it.
- **How:** Trigger: daily cron at 7 AM ET. Pull today's scheduled floor votes from Congress.gov. For each bill, run the conflict scoring algorithm against all members. Generate the email: newspaper front-page style, single column. Subject line formula: "🏛 Today in Congress: [bill name] — [X] members have conflicts." Top section: today's schedule with conflict previews. Middle: "Yesterday's Worst Conflicts" recap. Bottom: link to subscribe to push/SMS alerts. Use Resend for delivery. A/B test subject lines weekly. Include one-click embed code for each finding so journalists can embed directly into articles.
- **Requires:** Resend, cron job
- **Depends on:** Tasks 17, 28
- **Effort:** 5 hours
- **Tags:** GROWTH · PHASE 4

---

### 36. Build journalist outreach pipeline
- **What:** Compile a list of 200+ investigative political journalists and auto-send them the daily briefing with one-click embed codes.
- **Why:** One journalist writing "according to LOBBY CAM..." generates more traffic than any ad spend.
- **How:** Source journalist contacts from: (1) Bylines on ProPublica, The Intercept, Politico, OpenSecrets, Sludge, The Lever, Daily Beast politics section — scrape the authors page for each outlet, ~20 journalists per outlet; (2) Substack politics category — top 50 political newsletters; (3) Congressional press corps list from the Senate Press Gallery (publicly available). Store in a `journalist_contacts` table. Send a personalized version of the daily briefing: "Hi [name], here's today's conflict intelligence from LOBBY CAM. We thought [specific finding] might be relevant to your beat on [their publication's focus]." Include embed widget code. Use Resend with a separate sending domain (`press.lobbycam.org`) to keep deliverability high. Track opens and clicks per journalist. Follow up personally with any journalist who clicks through 3+ times.
- **Gotcha:** CAN-SPAM compliance — include physical address and unsubscribe link. Don't send more than 1 email per journalist per day.
- **Requires:** Resend, manual research for initial journalist list
- **Depends on:** Tasks 30, 35
- **Effort:** 6 hours
- **Tags:** GROWTH · PHASE 4

---

### 37. Plan Reddit launch strategy
- **What:** Prepare and execute coordinated Reddit posts for high-conflict vote days.
- **Why:** Reddit's r/politics alone has 8.5M subscribers and is the #1 referral source for political websites.
- **How:** Target subreddits: `r/politics` (8.5M, news/links allowed), `r/technology` (15M, if framed as civic tech), `r/dataisbeautiful` (21M, if we include a chart screenshot), `r/interestingasfuck` (12M, with a compelling screenshot), `r/bestof` (6M, for a comment breakdown). Also: `r/uspolitics`, `r/progressive`, `r/libertarian`, `r/AntiCorruption`. Post format: direct link post with title formula: "[OC] I built a dashboard that shows, in real time, which members of Congress are voting on bills while holding stock in the affected industries." Post on the day of a major defense or pharma vote for maximum impact. Do NOT automate posting — Reddit detects and bans bot accounts. Post manually from a personal account with existing karma. Include a top-level comment explaining methodology and data sources. Timing: post at 10 AM ET for peak Reddit activity.
- **Requires:** Reddit account with karma, manual execution
- **Depends on:** Task 21 (site must be live)
- **Effort:** 3 hours (prep), 1 hour (execution per post)
- **Tags:** VIRAL · PHASE 4

---

### 38. Build auto-generated bill conflict pages (Wikipedia-style)
- **What:** For every bill with a floor vote, auto-generate a comprehensive sourced summary page showing the full money picture.
- **Why:** These pages rank in Google for bill searches and become reference material. A journalist searching "HR 4421 defense bill donors" should find us.
- **How:** Template-driven page generation. For each bill: (1) Pull bill summary from Congress.gov; (2) Run industry mapping; (3) For all members on relevant committees + all who voted, pull donor and holdings data; (4) Generate narrative: "H.R. 4421 — National Defense Authorization Act received 58 YES votes. Of those, 14 members (24%) had documented financial ties to the defense industry totaling $4.2M in career donations and $1.8M in stock holdings." Include data tables of every conflicted member. All statements sourced. Publish at `/bill/hr4421-119`. ISR with 1-hour revalidation. Structured data for `LegislativeObject` schema.
- **Requires:** Next.js ISR, all Phase 1 data
- **Depends on:** Tasks 33, 34
- **Effort:** 6 hours
- **Tags:** GROWTH · PHASE 4

---

# PHASE 5 — MONETIZATION

---

### 39. Implement Stripe subscription system
- **What:** Set up tiered subscriptions with Stripe Checkout.
- **Why:** Revenue covers API costs ($200/mo X API alone) and funds development.
- **How:** Three tiers:
  - **Free:** Full dashboard access, email alerts for your 3 reps, embeddable widget access
  - **Watchdog ($8/mo):** SMS alerts, push notifications, daily briefing email, download conflict card images, advanced search/filter across all members, historical conflict score charts
  - **Press ($29/mo):** API access (1,000 calls/day), bulk data exports (CSV), priority email support, white-label embeddable widgets, early access to new features, attribution-free data usage for published articles
  - **Newsroom ($99/mo):** Unlimited API access, custom webhook alerts for specific members/industries, dedicated account manager, raw data feeds

  Stripe Checkout with Customer Portal for self-service management. Implement via `stripe` npm library. Webhook handler for `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`. Store subscription status in `user_subscriptions` table. Gate paid features via middleware checking subscription status. Pricing rationale: $8/mo is impulse-buy for politically engaged users; $29/mo is a rounding error for a newsroom's tools budget; $99/mo is cheap for real-time data feeds.

- **Requires:** Stripe account, `stripe` npm library
- **Depends on:** Task 21
- **Effort:** 8 hours
- **Tags:** REVENUE · PHASE 5

---

### 40. Build API key system for newsroom/researcher access
- **What:** Issue, manage, and rate-limit API keys for the Press and Newsroom tiers.
- **Why:** Researchers and newsrooms will pay for structured, queryable access to our joined dataset.
- **How:** API key generation: UUID v4 stored in `api_keys` table with `user_id`, `tier`, `created_at`, `rate_limit_daily`. Rate limiting via Redis sliding window counter per key. Middleware on all `/api/*` endpoints: check `Authorization: Bearer {key}` header → validate key → check rate limit → proceed or 429. Provide API documentation via Swagger UI (FastAPI auto-generates this). Usage dashboard in user settings showing calls made, rate limit remaining.
- **Requires:** Redis, FastAPI middleware
- **Depends on:** Tasks 19, 39
- **Effort:** 4 hours
- **Tags:** REVENUE · PHASE 5

---

### 41. Apply for civic tech and journalism grants
- **What:** Submit applications to foundations that fund civic tech and investigative journalism tools.
- **Why:** Non-dilutive funding. Some of these grants are $50K-$500K and actively looking for projects like this.
- **How:** Target foundations:
  1. **Knight Foundation** — News/Information program. Funds civic tech. Angle: "Real-time public accountability tool using open government data." Apply at `knightfoundation.org/apply`. Typical grant: $50K-$250K.
  2. **Mozilla Foundation** — Mozilla Awards. Funds "trustworthy AI and open internet." Angle: "Transparent algorithmic accountability scoring for public officials." $50K-$100K.
  3. **Sunlight Foundation** (now Sunlight Labs legacy) — May have successors. Research current status.
  4. **Democracy Fund** — Funds governance and media. Angle: "Bridging the gap between public financial disclosure data and citizen understanding." $100K-$500K.
  5. **Open Society Foundations** — Transparency and accountability program. Angle: "Real-time conflict of interest monitoring." $100K+.
  6. **MacArthur Foundation** — Journalism & Media program. Angle: "Data-driven investigative journalism infrastructure." $100K-$300K.
  7. **Craig Newmark Philanthropies** — Funds journalism tools. Angle: "Trustworthy civic information platform." $50K-$200K.
  8. **Google News Initiative** — Innovation Challenge. Angle: "Using public data to enhance accountability journalism." $50K-$300K.

  For each: write a 2-page project summary, 1-page budget, link to live demo. Emphasize: all data is public government records, methodology is transparent and auditable, tool is free for citizens.

- **Requires:** Live demo site, grant application writing
- **Depends on:** Task 21 (need working site to demo)
- **Effort:** 20 hours (across all 8 applications)
- **Tags:** REVENUE · PHASE 5

---

### 42. Implement affiliate/lead-gen for whistleblower attorneys
- **What:** On pages showing egregious conflicts (score > 85), include a tasteful "Know something? Contact a government ethics attorney" CTA linking to a vetted law firm.
- **Why:** Government ethics law firms will pay for qualified leads. These are high-value clients.
- **How:** Partner with 2-3 government ethics / whistleblower law firms (Emery Celli, Government Accountability Project, Kohn Kohn & Colapinto). Place a small, clearly labeled "Legal Resources" section at the bottom of high-conflict member profiles. Not an ad — a public service. CPA (cost per acquisition) model: law firm pays per consultation booked through our referral link. Estimate: $200-$500 per qualified lead. Volume: low (maybe 5-10/month), but high value. Clearly disclose the referral relationship. Do not let this compromise editorial integrity — the conflict scores drive the placement, not the law firm.
- **Requires:** Law firm partnerships, referral tracking links
- **Depends on:** Task 33
- **Effort:** 4 hours (technical), 8 hours (business development)
- **Tags:** REVENUE · PHASE 5

---

# PHASE 6 — LEGAL & OPERATIONAL HARDENING

---

### 43. Establish legal entity
- **What:** Incorporate the appropriate legal structure.
- **Why:** Need a legal entity for Stripe payments, API contracts, grant applications, and liability protection.
- **How:** Recommended structure: **501(c)(3) nonprofit** with a fiscal sponsor initially, converting to independent 501(c)(3) within 12 months. Rationale: (a) Grant foundations strongly prefer nonprofits; (b) Tax-exempt status allows donations; (c) Nonprofit status reinforces credibility — "this is a public service, not a business"; (d) Revenue from subscriptions/API access is fine as "program service revenue" under 501(c)(3) as long as it furthers the mission. For speed, start under a fiscal sponsor like the Journalism Trust Initiative or Open Collective Foundation — they provide legal entity, tax exemption, and fiscal management for ~5-10% of revenue. This lets you accept grants and donations immediately while the 501(c)(3) application processes (takes 3-6 months). Alternative: if the nonprofit path is too slow, start as a Wyoming LLC ($100 filing fee) and convert later.
- **Requires:** Fiscal sponsor agreement or LLC filing
- **Depends on:** None
- **Effort:** 4 hours (LLC) or 12 hours (nonprofit with fiscal sponsor)
- **Tags:** CORE · PHASE 6

---

### 44. Draft Terms of Service
- **What:** Publish ToS covering data usage, liability, and user-generated content.
- **Why:** Legal requirement for subscription services and grant applications.
- **How:** Must include: (1) All data sourced from public government records — no proprietary or classified data; (2) Conflict scores are algorithmically generated and not accusations of wrongdoing; (3) Users may share and cite LOBBY CAM data with attribution; (4) API users agree to rate limits and attribution requirements; (5) No warranty on data accuracy or completeness; (6) Limitation of liability; (7) Governing law (Delaware if LLC, DC if nonprofit). Use a standard ToS template from Termly or similar, customized for our use case. Have a lawyer review before publishing ($500-$1000 for a contract attorney review).
- **Requires:** Legal review ($500-$1000)
- **Depends on:** Task 43
- **Effort:** 4 hours (draft) + 2 hours (legal review coordination)
- **Tags:** CORE · PHASE 6

---

### 45. Implement GDPR/CCPA compliance for alert subscriptions
- **What:** Ensure the email/SMS/push subscription system is compliant with privacy regulations.
- **Why:** Legal requirement. Non-compliance carries fines up to $7,500 per violation under CCPA.
- **How:** Requirements: (1) Double opt-in for all email subscriptions (already in Task 28); (2) Clear privacy policy explaining what data is collected (email, zip code, phone number), how it's used (sending alerts), and who it's shared with (nobody); (3) One-click unsubscribe in every communication; (4) Data export capability: user can request all data stored about them; (5) Data deletion: user can request full deletion of their account and all associated data; (6) Cookie consent banner (we probably don't need cookies beyond session — confirm and potentially skip this); (7) Privacy policy page at `/privacy`. Under CCPA, we're likely below the threshold (annual revenue > $25M or data on > 100K consumers) but implement anyway as best practice.
- **Requires:** Privacy policy template, implementation in user settings
- **Depends on:** Task 28
- **Effort:** 5 hours
- **Tags:** CORE · PHASE 6

---

### 46. Implement rate limiting and robots.txt compliance for scrapers
- **What:** Ensure all our scraping respects rate limits and robots.txt, and protect our own site from abuse.
- **Why:** Getting blocked by government data sources kills the product. Getting DDoS'd kills availability.
- **How:** Outbound scraping: (1) Respect `Crawl-delay` in robots.txt for each source; (2) Set User-Agent to "LobbyCam/1.0 (+https://lobbycam.org/about)" — transparent and identifiable; (3) Rate limit all scrapers: max 1 req/sec for `.gov` domains, max 2 req/sec for C-SPAN; (4) Implement exponential backoff on 429/503 responses; (5) Cache aggressively to minimize requests. Inbound protection: (1) Cloudflare's free DDoS protection (already set up in Task 21); (2) API rate limiting via Redis sliding window (Task 40); (3) Our own robots.txt: allow all crawlers (we want SEO), but rate-limit at Cloudflare level; (4) Implement CAPTCHA on subscription endpoints to prevent bot signups.
- **Requires:** Cloudflare, Redis rate limiter
- **Depends on:** Task 21
- **Effort:** 3 hours
- **Tags:** CORE · PHASE 6

---

### 47. Implement defamation risk mitigation in UI copy
- **What:** Audit every piece of dynamically generated text to ensure it presents facts with proper qualification and sourcing.
- **Why:** Calling a sitting senator corrupt without sourced evidence is defamation. Our data supports strong inferences, but the copy must be precise.
- **How:** Rules: (1) Never use the word "corrupt" or "corruption" in dynamic copy — use "conflict," "financial conflict," "financial entanglement"; (2) The conflict score is labeled "CONFLICT INDEX" not "CORRUPTION SCORE"; (3) Every factual claim has a visible source citation (already implemented in mockup — maintain this); (4) Use qualified language: "documented financial ties" not "bought by industry"; "votes aligned with donors X% of the time" not "votes for donors"; (5) Member profile headers: "Financial Conflict Profile" not "Corruption Profile"; (6) The "Share This Profile" text uses only sourced factual statements, not characterizations; (7) Add a methodology page at `/methodology` explaining every calculation with full source documentation; (8) Add disclaimer in footer: "LOBBY CAM presents publicly filed financial and legislative data. The presence of financial ties does not imply wrongdoing."
- **Gotcha:** The app's name ("LOBBY CAM") and tagline ("Congressional Conflict Intelligence") are safe — they describe our function, not accuse anyone of anything. But auto-generated tweet copy needs careful review.
- **Requires:** Copy audit, methodology page
- **Depends on:** Task 21
- **Effort:** 4 hours
- **Tags:** CORE · PHASE 6

---

### 48. Draft press inquiry response template
- **What:** Prepare templated responses for when media covers LOBBY CAM.
- **Why:** When this gets press attention (and it will, especially after a viral Reddit post or X thread), having a prepared response prevents foot-in-mouth moments.
- **How:** Prepare three templates: (1) **General media inquiry:** "LOBBY CAM is a public interest project that makes publicly filed government data more accessible and legible in real time. All data comes from official government sources including FEC filings, Senate Lobbying Disclosure Act reports, and Congressional financial disclosures. Our Conflict Index algorithm is fully documented at lobbycam.org/methodology. We welcome scrutiny of our methods." (2) **Congressional office pushback:** "We present only publicly filed data from official government sources. We encourage [member's name]'s office to review their publicly filed financial disclosures and FEC filings, which are the basis of our analysis, at [source URLs]." (3) **Technical inquiry:** Share the methodology page link and offer to walk through the algorithm. Keep the founder's personal contact info off the site initially — use press@lobbycam.org and respond within 4 hours.
- **Requires:** Email account setup
- **Depends on:** Task 21
- **Effort:** 2 hours
- **Tags:** CORE · PHASE 6

---

# PHASE 7 — POLISH & HARDENING

Final quality and resilience before wide distribution.

---

### 49. Implement error boundaries and graceful degradation per zone
- **What:** Each of the 4 dashboard zones should fail independently, showing cached data or a clear error state without taking down the whole page.
- **Why:** Government APIs go down frequently. A LDA scraper failure shouldn't kill the vote tally.
- **How:** React Error Boundaries around each zone component. Each zone stores its last successful data in localStorage as fallback. Error state UI: muted zone with "Data temporarily unavailable — last updated [timestamp]" in the zone's header area. SSE reconnection shows a thin yellow bar at the top: "Reconnecting to live feed…" that resolves silently when connection restores. Log all errors to a `error_log` table and/or Sentry (free tier).
- **Requires:** React Error Boundaries, Sentry (free tier)
- **Depends on:** Task 20
- **Effort:** 4 hours
- **Tags:** CORE · PHASE 7

---

### 50. Responsive layout for tablet and mobile
- **What:** Make the three-column layout stack vertically at < 1024px width, with appropriate data density adjustments.
- **Why:** 60%+ of political social media traffic is mobile. If someone clicks from X on their phone, it has to work.
- **How:** Tailwind breakpoints: at `lg:` (1024px+) use the current 3-column grid. Below that, stack: Zone 2 (Floor) full width, Zone 3 (Wire) and Zone 4 (Conflicts) side by side at `md:` (768px), fully stacked at `sm:`. On mobile: the C-SPAN embed goes full width, vote tally goes horizontal scroll, member cards go horizontal swipe carousel. Ticker becomes a vertically scrolling alert list instead of horizontal marquee. Archive bar horizontal scroll works naturally on mobile with swipe.
- **Requires:** Tailwind responsive utilities
- **Depends on:** Task 20
- **Effort:** 6 hours
- **Tags:** GROWTH · PHASE 7

---

### 51. Performance optimization — initial load
- **What:** Get Largest Contentful Paint under 1.5 seconds.
- **Why:** Every second of load time costs ~7% conversion. A slow civic tech site feels amateurish.
- **How:** (1) Next.js SSR for initial HTML — the page should be readable before JS loads; (2) Lazy load the C-SPAN iframe (use Intersection Observer, load when scrolled into view or after 3 seconds); (3) Font loading: preload Playfair Display and DM Sans via `<link rel="preload">`; (4) Image optimization: conflict card images generated at 2 sizes (thumbnail for list, full for modal); (5) Code splitting: member profile modal loaded dynamically with `React.lazy`; (6) Compress API responses with gzip; (7) Set Cloudflare cache headers for static assets (1 year) and API responses (per TTL from Task 18).
- **Requires:** Next.js, Cloudflare
- **Depends on:** Task 21
- **Effort:** 4 hours
- **Tags:** GROWTH · PHASE 7

---

### 52. Build monitoring and alerting dashboard
- **What:** Set up uptime monitoring, error alerting, and data freshness monitoring.
- **Why:** If the site goes down during a vote, that's the worst possible moment to be offline.
- **How:** (1) UptimeRobot (free tier, 50 monitors) — monitor `/api/health` endpoint every 1 minute, alert via email + Slack on downtime; (2) Data freshness monitor: background job checks that each data pipeline has run within its expected window (e.g., vote data < 2 minutes stale during session, filings < 2 hours stale). If stale, alert; (3) Sentry for error tracking (already from Task 49); (4) Simple `/api/health` endpoint that returns status of each data source: `{ "govtrack": "ok", "fec": "stale_47min", "lda": "ok", "polygon": "ok" }`.
- **Requires:** UptimeRobot (free), Sentry (free)
- **Depends on:** Task 21
- **Effort:** 3 hours
- **Tags:** CORE · PHASE 7

---

### 53. Build methodology and about pages
- **What:** Publish comprehensive `/methodology` and `/about` pages.
- **Why:** Credibility. Journalists won't cite us without understanding the methodology. Grant reviewers need to see rigor.
- **How:** `/methodology`: Full explanation of conflict score algorithm with worked example, all data sources listed with update frequencies, known limitations and caveats (e.g., "financial disclosure data may be up to 1 year old"), link to GitHub repo if open-source. `/about`: Mission statement, team bios, data sourcing principles ("we only use official government filings"), contact information (press@lobbycam.org), link to methodology. Both pages use the same editorial serif typography as the main dashboard. These pages are the most important SEO pages after member profiles — they build E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) for Google.
- **Requires:** Content writing
- **Depends on:** Task 17 (need finalized algorithm)
- **Effort:** 4 hours
- **Tags:** GROWTH · PHASE 7

---

### 54. Implement analytics
- **What:** Track key metrics: daily active users, member profile views, share button clicks, subscription conversions.
- **Why:** Can't improve what you don't measure. Grant applications need usage data.
- **How:** Plausible Analytics (privacy-friendly, no cookies, GDPR-compliant out of the box). Self-host for $0 or use cloud at $9/mo. Track: page views, unique visitors, referral sources (critical — need to know if traffic comes from X, Reddit, or direct), top member pages, share button clicks (custom events), subscription conversions (custom events). Do NOT use Google Analytics — it's antithetical to the product's ethos and requires cookie consent banners.
- **Requires:** Plausible Analytics ($9/mo or self-hosted)
- **Depends on:** Task 21
- **Effort:** 2 hours
- **Tags:** GROWTH · PHASE 7

---

---

# CRITICAL PATH

The minimum sequence from mockup to "a journalist could use this and write about it":

1. Task 1 — Monorepo + backend skeleton (4h)
2. Task 2 — PostgreSQL schema (5h)
3. Task 3 — Member ID crosswalk (4h)
4. Task 4 — Congress.gov API — bills & schedule (6h)
5. Task 5 — GovTrack API — vote records (5h)
6. Task 6 — OpenSecrets API — donor data (8h)
7. Task 14 — Bill-to-industry mapping (5h)
8. Task 17 — Conflict score algorithm (8h)
9. Task 15 — SSE real-time layer (6h)
10. Task 18 — Redis caching (4h)
11. Task 19 — REST API endpoints (6h)
12. Task 20 — Connect frontend to live data (6h)
13. Task 21 — Deploy to production (4h)
14. Task 47 — Defamation-safe copy (4h)
15. Task 53 — Methodology page (4h)

**Total critical path: 79 hours (~2 weeks of focused work)**

---

# FIRST 48 HOURS — THIS WEEKEND

The 10 tasks that produce the most meaningful progress by Monday:

1. **Task 1** — Set up monorepo, Docker Compose, Next.js + FastAPI (4h)
2. **Task 2** — Design and apply the PostgreSQL schema (5h)
3. **Task 43** — Register Wyoming LLC ($100, takes 15 minutes online) (1h)
4. **Task 3** — Build member ID crosswalk from congress-legislators YAML (4h)
5. **Task 4** — Integrate Congress.gov API for bills and floor schedule (6h)
6. **Task 5** — Integrate GovTrack for vote records (5h)
7. **Task 22** — Apply for X API access (application takes days — submit NOW) (1h)
8. **Task 13** — Build session detection logic (5h)
9. **Task 14** — Seed the bill-to-industry mapping table for current session bills (5h)
10. **Task 15** — Stub out the SSE event layer (can work without full data) (4h)

**48-hour total: ~40 hours of actual work.** With focused execution across a weekend, you'll have: a live backend serving real bill/vote/schedule data, a member crosswalk linking all IDs, session detection running, and an SSE skeleton ready to push events. Monday you start on donor data and the conflict score algorithm — the two things that make the product actually powerful.

---

# TOTAL EFFORT ESTIMATE BY PHASE

| Phase | Tasks | Hours | Calendar (solo dev) |
|-------|-------|-------|---------------------|
| Phase 1 — Real Data Plumbing | 14 tasks | 81h | 2 weeks |
| Phase 2 — Live Infrastructure | 7 tasks | 39h | 1 week |
| Phase 3 — Viral Mechanics | 11 tasks | 52h | 1.5 weeks |
| Phase 4 — Growth & Distribution | 6 tasks | 33h | 1 week |
| Phase 5 — Monetization | 4 tasks | 36h | 1 week |
| Phase 6 — Legal & Operational | 6 tasks | 22h | 0.5 weeks |
| Phase 7 — Polish & Hardening | 6 tasks | 23h | 0.5 weeks |
| **TOTAL** | **54 tasks** | **~286h** | **~8 weeks solo** |

*Note: Task count is 54 top-level tasks, but several (like Task 41 with 8 grant applications) contain multiple subtasks that bring the effective task count above 70.*

---

# THE SINGLE HIGHEST-LEVERAGE TASK

**Task 23 — Build the conflict card image generator.**

Here's why: the dashboard itself is powerful but it requires someone to visit the site. The conflict card image is the content that travels. It's what gets screenshotted, quote-tweeted, texted to friends, and dropped into Reddit threads. It's what appears in link previews on iMessage and Slack. It's the artifact that exists independent of the platform.

A well-designed conflict card showing "Sen. Caldwell (R-TX) — Conflict Score: 94/100 — Holds $340K Lockheed stock — Voted YES on $886B defense bill" in a newspaper-serious visual format is a virus. It requires no context, no explanation, and no click. The information is on the image itself.

Every other viral feature (auto-tweets, share buttons, embeddable widgets, OG previews) depends on this image existing. Build it first. Make it beautiful. Make it undeniable. Everything else amplifies it.

---

# ADDENDUM — SECURITY LAYER (Woven Into Phases 1-3)

The following tasks are NOT optional and NOT Phase 6. They are inserted into the phases where they belong. A real developer does these at build time, not as an afterthought.

---

### S1. Secrets management from day one
- **What:** Set up a proper secrets management approach before writing a single line of backend code.
- **Why:** Task 1 stands up the backend skeleton. Every task after it uses API keys. If secrets leak into Git once, they're compromised forever — GitHub secret scanning will flag you, but the damage is done.
- **How:** Use `doppler` (free tier for solo dev, 5 projects) or at minimum `python-dotenv` with a `.env` file that is `.gitignored` AND added to `.dockerignore`. Never pass secrets as Docker build args (they persist in layer history). For production on Railway: use Railway's built-in environment variable store (encrypted at rest). For all API keys (Congress.gov, FEC, OpenSecrets, Polygon, Stripe, X API, Twilio, Resend): store as environment variables, never in code, never in config files that touch Git. Add a `pre-commit` hook that scans for high-entropy strings and known key patterns using `detect-secrets` (Yelp's tool). Rotate any key that ever appears in a commit within 1 hour.
- **Requires:** `detect-secrets`, `pre-commit`, Doppler (free) or Railway env vars
- **Depends on:** Task 1
- **Effort:** 2 hours
- **Tags:** CORE · PHASE 1 (do immediately after Task 1)

---

### S2. Input sanitization and validation layer
- **What:** Build a centralized validation layer for all user-facing inputs: member search bar, zip code entry, email subscription, API query parameters.
- **Why:** The search bar is an XSS vector. The zip code field accepts arbitrary strings. The API query params are SQL injection candidates. Every input that touches a database query or renders in HTML is an attack surface.
- **How:** Frontend: sanitize the search bar input — strip all HTML tags, limit to alphanumeric + spaces + hyphens + periods, max 100 chars. Use `DOMPurify` for any dynamic HTML rendering. Backend: use Pydantic models with strict type validators on every FastAPI endpoint — Pydantic v2 handles this well. For database queries: use SQLAlchemy ORM (not raw SQL) for all queries — the raw SQL schema in Task 2 is for migration scripts only, application code uses the ORM. Add `sqlalchemy.text()` with bound parameters for any unavoidable raw queries. For the zip code: validate against regex `^\d{5}(-\d{4})?$` both client and server side. For email: validate format AND use Resend's email verification API before storing. For all API string params: max length constraints in Pydantic, reject any `<script>`, `javascript:`, or encoded variants.
- **Gotcha:** The search bar is used in Zone 4 to filter members. Currently it's `m.name.toLowerCase().includes(searchQuery.toLowerCase())` which is safe for client-side filtering against a known constant, but once this queries a real database, the query string MUST be parameterized.
- **Requires:** `DOMPurify` (npm), Pydantic v2, SQLAlchemy ORM
- **Depends on:** Tasks 1, 2
- **Effort:** 4 hours
- **Tags:** CORE · PHASE 1 (do alongside Task 2)

---

### S3. Security headers and CSP
- **What:** Implement security headers on all HTTP responses: Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, Referrer-Policy.
- **Why:** CSP prevents XSS even if sanitization is bypassed. HSTS prevents downgrade attacks. X-Frame-Options prevents clickjacking. These are table stakes for any production web app.
- **How:** Add via Next.js `next.config.js` `headers()` function and/or Cloudflare Transform Rules (defense in depth — set in both places). Specific headers:
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self' https://platform.twitter.com; frame-src https://www.c-span.org https://platform.twitter.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://*.twimg.com; connect-src 'self' https://api.lobbycam.org;
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  ```
  The CSP must allowlist `c-span.org` for the iframe embed and `platform.twitter.com` for the X feed embed. `unsafe-inline` for styles is needed because Tailwind and our inline styles require it — acceptable tradeoff since we have strict script-src. Test with `securityheaders.com` — target A+ rating.
- **Gotcha:** `unsafe-inline` for `script-src` would defeat CSP entirely. Verify that Next.js doesn't inject inline scripts — if it does, use nonce-based CSP with `next/script` strategy.
- **Requires:** Next.js config, Cloudflare
- **Depends on:** Task 21
- **Effort:** 3 hours
- **Tags:** CORE · PHASE 2 (do during deployment)

---

### S4. SSE endpoint abuse prevention
- **What:** Rate limit, authenticate, and throttle the Server-Sent Events endpoint to prevent resource exhaustion.
- **Why:** SSE connections are long-lived. A bot opening 10,000 SSE connections will exhaust server memory and file descriptors. This is the easiest DDoS vector in the entire architecture.
- **How:** (1) Connection limit: max 2 concurrent SSE connections per IP via Redis counter — reject new connections with 429 when exceeded. (2) Heartbeat: send a `:keepalive` comment every 30 seconds — if client doesn't ACK (SSE doesn't support ACK, so use a separate ping endpoint), close the connection after 5 minutes of inactivity. (3) Connection timeout: hard-close all SSE connections after 30 minutes and force reconnect — prevents leaked connections from accumulating. (4) Behind Cloudflare: set a Cloudflare rate limiting rule: max 10 requests/minute to `/api/stream` per IP (this covers reconnection storms). (5) Don't send events to connections that haven't fetched the initial page state — prevents bots that open SSE without loading the app. Implement by requiring a short-lived token (from the initial page load) as a query param on the SSE connection.
- **Requires:** Redis, Cloudflare rate limiting rules
- **Depends on:** Task 15
- **Effort:** 3 hours
- **Tags:** CORE · PHASE 2 (do immediately after Task 15)

---

### S5. Stripe webhook signature verification
- **What:** Verify the `stripe-signature` header on every incoming Stripe webhook event.
- **Why:** Without this, anyone can POST fake payment events to your webhook endpoint and grant themselves subscriptions, or trigger arbitrary downstream effects.
- **How:** Use `stripe.webhooks.constructEvent(payload, sig_header, webhook_secret)` which verifies the HMAC-SHA256 signature against your webhook signing secret. Reject any request that fails verification with 400. Store the webhook signing secret (different from the API key) in environment variables. Also: (1) Only accept POST requests on the webhook endpoint; (2) Verify the event type is one you expect (`checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`, `customer.subscription.updated`) — ignore all others; (3) Idempotency: store processed `event.id` values in Redis with 24h TTL to prevent replay attacks; (4) Log all webhook events to an audit table regardless of processing outcome. This is not optional — Stripe's own documentation marks this as a must-do.
- **Requires:** Stripe webhook signing secret
- **Depends on:** Task 39
- **Effort:** 2 hours
- **Tags:** CORE · PHASE 5 (do as part of Task 39, not after)

---

### S6. PDF scraping sandbox
- **What:** Run all financial disclosure PDF parsing in an isolated subprocess or container.
- **Why:** Task 10 downloads PDFs from government websites and parses them with `pdfplumber`. Malicious PDFs are a documented attack vector — crafted PDFs can exploit parser vulnerabilities for RCE. Even if these are government-hosted PDFs, supply-chain compromise is real.
- **How:** Run the PDF parsing pipeline in a separate Docker container with: (1) No network access (the PDF is already downloaded); (2) Read-only filesystem except for a single output directory; (3) Memory limit (512MB) to prevent decompression bombs; (4) CPU time limit (30 seconds per PDF); (5) Run as a non-root user. Use `docker run --rm --network none --read-only --memory 512m --cpus 0.5 --user 1000:1000 -v /tmp/pdfs:/input:ro -v /tmp/output:/output pdf-parser`. The parser writes structured JSON to the output volume. The main application reads the JSON — never the raw PDF. Additionally: validate PDF magic bytes before parsing (should start with `%PDF`), reject files larger than 20MB (legitimate disclosures are 1-5 pages).
- **Requires:** Docker, separate Dockerfile for PDF parser
- **Depends on:** Task 10
- **Effort:** 3 hours
- **Tags:** CORE · PHASE 1 (do as part of Task 10)

---

### S7. Subscription endpoint rate limiting and bot prevention
- **What:** Rate limit and protect the email/SMS/push subscription signup endpoints from abuse.
- **Why:** Without this, a bot can burn through your Resend email quota (3,000 free/mo), Twilio SMS credits ($0.0079/msg adds up fast), or create millions of fake subscriptions that pollute your database.
- **How:** (1) Rate limit: max 3 subscription signups per IP per hour via Redis sliding window. (2) Honeypot field: add a hidden form field that legitimate browsers leave empty but bots fill — reject any submission where it's populated. (3) Turnstile CAPTCHA (Cloudflare, free): add to the subscription form. Lighter than reCAPTCHA, privacy-respecting, fits the product's ethos. (4) Double opt-in (already planned in Task 28): the confirmation email is the ultimate bot filter — no confirmation, no subscription stored. (5) Email validation: before sending the confirmation email, check the domain's MX records — reject clearly fake domains. (6) Phone number validation for SMS: use Twilio Lookup API ($0.005/lookup) to verify the number is a real mobile number before storing.
- **Requires:** Cloudflare Turnstile (free), Twilio Lookup API
- **Depends on:** Task 28
- **Effort:** 3 hours
- **Tags:** CORE · PHASE 3 (do as part of Task 28)

---

### S8. Authentication system for paid features
- **What:** Build a proper auth system for subscription management, API key access, and user settings.
- **Why:** Tasks 39 and 40 create paid tiers and API keys, but there's no auth system to gate them. Without auth, anyone can access paid features, impersonate other users, or steal API keys.
- **How:** Use NextAuth.js v5 (Auth.js) with two providers: (1) Email magic link (via Resend — you're already paying for it) for the primary login flow — no passwords to store, hash, or breach. (2) OAuth via Google for convenience. Store sessions in PostgreSQL via the `@auth/pg-adapter`. Session strategy: JWT with 7-day expiry, refresh on activity. Schema additions: `users` table (id, email, name, created_at), `sessions` table, `accounts` table (OAuth links). The dashboard itself stays fully public — no login required to view. Auth is only required for: managing alert subscriptions, accessing paid API keys, viewing billing in Stripe Customer Portal, and accessing Watchdog/Press tier features. Gate via Next.js middleware: check session on `/settings/*`, `/api/keys/*`, `/api/billing/*` routes.
- **Requires:** NextAuth.js v5, `@auth/pg-adapter`, Resend (for magic links)
- **Depends on:** Tasks 1, 2, 21
- **Effort:** 6 hours
- **Tags:** CORE · PHASE 2 (do before Task 39)

---

### S9. Dependency auditing and supply chain security
- **What:** Set up automated vulnerability scanning for all npm and pip dependencies.
- **Why:** The project uses dozens of third-party packages. A compromised dependency in `tweepy`, `pdfplumber`, or any npm package is a supply chain attack on the entire product.
- **How:** (1) `npm audit` in CI pipeline — fail build on critical/high vulnerabilities. (2) `pip-audit` for Python dependencies. (3) Enable GitHub Dependabot for automated PR creation on vulnerable dependencies. (4) Pin all dependency versions exactly (no `^` or `~` in package.json, use `==` in requirements.txt) — update manually after reviewing changelogs. (5) Use `package-lock.json` and `requirements.txt` with hashes (`pip install --require-hashes`). (6) Snyk (free for open source) for deeper analysis. (7) For the pdf-parser container specifically: rebuild weekly with `--no-cache` to pick up base image security patches. Run `npm audit` and `pip-audit` weekly via GitHub Actions cron job, alert on new vulnerabilities via email.
- **Requires:** GitHub Dependabot (free), `pip-audit`, Snyk (free tier)
- **Depends on:** Task 1
- **Effort:** 2 hours
- **Tags:** CORE · PHASE 1 (set up during Task 1)

---

### S10. Audit logging for all sensitive operations
- **What:** Log every authentication event, subscription change, API key creation, Stripe webhook, and data pipeline run to an immutable audit table.
- **Why:** When (not if) something goes wrong — a data pipeline corrupts records, a fake subscription is created, or someone claims the data is fabricated — you need a forensic trail.
- **How:** Create an `audit_log` table: `(id BIGSERIAL, event_type VARCHAR(50), actor VARCHAR(100), target VARCHAR(100), details JSONB, ip_address INET, created_at TIMESTAMPTZ DEFAULT NOW())`. Log: all auth events (login, logout, failed login), subscription CRUD, API key creation/revocation, Stripe webhook receipt (event_id + type), data pipeline start/complete/error, conflict score calculations (input params + output), any admin actions. Write-only — no UPDATE or DELETE on this table ever. Retention: 1 year, then archive to cold storage. Index on `(event_type, created_at)` for fast queries. In Python: create an `audit_log(event_type, actor, target, details)` utility function used everywhere. This table is also valuable for debugging — "why did this member's score change?" becomes a query instead of a guessing game.
- **Requires:** PostgreSQL
- **Depends on:** Task 2
- **Effort:** 3 hours
- **Tags:** CORE · PHASE 2

---

### S11. CI/CD pipeline with security gates
- **What:** Set up GitHub Actions CI that runs tests, linting, type checking, and security scanning on every PR.
- **Why:** Without CI, bad code and vulnerabilities merge silently. The first contributor who submits a PR without security review introduces risk.
- **How:** GitHub Actions workflow:
  ```
  1. Lint: ESLint (frontend) + Ruff (Python)
  2. Type check: TypeScript strict mode (frontend) + mypy (Python)
  3. Unit tests: Jest (frontend) + pytest (backend)
  4. Security scan: npm audit + pip-audit + detect-secrets
  5. Build: Next.js build + Docker build (verify they complete)
  6. Deploy: Railway auto-deploy from main branch only
  ```
  Branch protection on `main`: require passing CI, require 1 review (even if solo dev — forces you to read the diff in PR context). No direct pushes to main. This takes 30 minutes to set up and saves hundreds of hours of debugging in production.
- **Requires:** GitHub Actions (free for public repos)
- **Depends on:** Task 1
- **Effort:** 3 hours
- **Tags:** CORE · PHASE 1 (set up during Task 1)

---

### Updated effort table with security tasks:

| Phase | Original | Security Added | New Total |
|-------|----------|----------------|-----------|
| Phase 1 | 81h | +14h (S1, S2, S6, S9, S11) | 95h |
| Phase 2 | 39h | +15h (S3, S4, S8, S10) | 54h |
| Phase 3 | 52h | +3h (S7) | 55h |
| Phase 5 | 36h | +2h (S5) | 38h |
| **New Total** | **286h** | **+34h** | **~320h** |

---

# ADDENDUM — CODE QUALITY ISSUES IN CURRENT MOCKUP

Issues identified with remediation plan. All fixed in the updated JSX artifact.

**Bug: Vote simulation closure leak in StrictMode**
The `useEffect` that simulates votes uses mutable `let` variables (`yIdx`, `nIdx`) inside the interval callback. React 18 StrictMode double-invokes effects — the first invocation starts an interval, the cleanup runs, but the closure still references the old mutable variables. The second invocation starts a new interval with fresh variables, but the first interval's `clearInterval` was called on the returned ID, which is now stale. Fix: use `useRef` for mutable counters that persist across closures, and verify cleanup actually clears the active interval.

**Bug: Tooltip positioning breaks in scroll contexts**
The tooltip uses `getBoundingClientRect()` and `fixed` positioning, but doesn't account for scroll offset. If the vote tally overflows and scrolls, tooltips will be positioned incorrectly. Fix: use `position: absolute` relative to the parent `span`, not `position: fixed` relative to the viewport. Simpler, more reliable, and works in all scroll contexts.

**Slop: Inline styles instead of CSS custom properties**
Over 60 inline `style={{}}` objects repeat the same color values (`#C8102E`, `#1B3A6B`, `#D4CFC6`, `#8A8680`, `#5A5650`, `#FFFDF7`). This means if you want to tweak the palette, you're doing a find-replace across 600+ lines. Fix: define CSS custom properties (`:root { --red: #C8102E; ... }`) and reference them in both Tailwind `@apply` and inline styles.

**Slop: Ticker scroll duplication**
`[...TICKER_ITEMS, ...TICKER_ITEMS].map()` is a brittle hack. If the array has 8 items, you get 16 rendered elements. If someone adds a 9th item that makes the total width exceed the animation cycle, the loop will stutter. Fix: use CSS `animation-iteration-count: infinite` on a single track with proper width calculation, or render 3 copies for safety margin.

**Slop: No component extraction**
The entire app is one 1100-line function. The vote column, lobby card, member card, ticker, archive card, and modal are all inline JSX. This makes every edit a scrolling hunt. Fix: extract into named components — still in the same file (single-file constraint), but as separate function components above the main export.

**Slop: No memoization**
`filteredMembers` recomputes on every render even when `searchQuery` hasn't changed. The industry money bar widths recompute on every render. Fix: `useMemo` for derived computations.

**Slop: C-SPAN iframe remount flash**
`key={cspanChannel}` forces React to unmount and remount the iframe on channel switch, causing a white flash. Fix: render all 3 iframes, use CSS `display: none` / `display: block` to toggle visibility. The hidden iframes stay loaded, so switching is instant.

**Missing: Accessibility**
No `aria-label` on interactive elements, no keyboard navigation for member cards, no focus trap in the modal, no skip-to-content link, no `role` attributes on live regions. The ticker should be `aria-live="polite"`. The modal needs `role="dialog"` and `aria-modal="true"`. Fix: add all of these.

**Missing: Loading and empty states**
No skeleton loaders for initial data fetch. No empty state for "no votes yet." No error state for failed API calls. Fix: add placeholder states for each zone.
