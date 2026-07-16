# LOBBY CAM

Real-time congressional conflict-of-interest dashboard. Next.js 14 (App Router) + TypeScript + Tailwind.

Tracks a live floor vote, incoming lobbying disclosure filings, and per-member financial conflict scores — all sourced from public government filings. See `lobbycambattleplan.md` (uploaded separately) for the full 78-task roadmap from mockup to production.

## Status

This is the Phase 1 scaffold: the original React mockup ported into a real Next.js app, plus three no-auth-required live data integrations:

- `GET /api/votes/live` — latest Senate roll call + voter positions from [GovTrack](https://www.govtrack.us/developers/api). Falls back to a simulated demo vote if unavailable.
- `GET /api/contracts?recipient=<name>` — federal contract totals from [USASpending.gov](https://api.usaspending.gov/docs/endpoints), shown as a badge on Lobby Wire filing cards.
- `GET /api/geocode?zip=<zip>` — ZIP → congressional district via the [Census Geocoder](https://geocoding.geo.census.gov/geocoder/) (footer "Find My District" widget).

Everything else on the page (donor breakdowns, stock holdings, lobbying filings, conflict scores) is still mock data — those need the paid/keyed data pipelines described in the battle plan (OpenSecrets, FEC, Senate LDA bulk ingest, financial disclosure PDF scraping) plus a Postgres-backed conflict score calculation, none of which are wired up yet.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project layout

- `app/page.tsx` — renders the `LobbyCam` component
- `components/LobbyCam.tsx` — the full dashboard UI
- `lib/data.ts` — mock data + shared types (mirrors the shape real API responses will use)
- `app/api/*/route.ts` — the live data integrations described above
