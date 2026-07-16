# Turning on the live data feeds (non-coder guide)

LOBBY CAM works with **zero setup** — it runs in demo mode out of the box. To
replace demo data with real government data, you add a couple of free **API
keys** as "environment variables" in Railway. No coding. This guide walks you
through it.

You can always see which feeds are live at **`lobby.cam/status`**.

---

## The short version

You need **one** free key, from **one** website (api.data.gov). That single key
powers **both** environment variables:

| Environment variable | Value | What it turns on |
| --- | --- | --- |
| `CONGRESS_GOV_API_KEY` | your api.data.gov key | Real bills & floor schedule |
| `FEC_API_KEY` | the **same** api.data.gov key | Real campaign filings **and** donor-money-by-industry |

Four other feeds (member roster, floor votes, federal contracts, district
lookup) need **no key at all** and are already live.

> **Why no OpenSecrets key anymore?** OpenSecrets retired its API in April 2025.
> We rebuilt "donor money by industry" on top of the FEC's own data by matching
> PAC filings against a curated industry list we maintain in the code
> (`lib/industryMap.ts`). So the FEC key now covers donor industries too — one
> fewer signup for you.

---

## Step 1 — Get the api.data.gov key

1. Go to **https://api.data.gov/signup/**
2. Enter your name and email. Click **Sign Up**.
3. The key appears on screen **instantly** (also emailed to you). Copy it.

## Step 2 — Paste it into Railway (twice)

1. Open your project on **railway.app**.
2. Click the **lobbycam** service, then the **Variables** tab.
3. Click **New Variable** and add both of these, using the **same** key value
   for each:
   - `CONGRESS_GOV_API_KEY` → your api.data.gov key
   - `FEC_API_KEY` → your api.data.gov key (identical value)
4. Railway redeploys automatically (about a minute).

## Step 3 — Confirm it worked

Visit **`lobby.cam/status`**. The Congress.gov and FEC-based feeds should flip
from **○ Awaiting key** to **● Live**. Done.

---

## FAQ

**Do I have to add both?** They use the same key, so add both — it's one value
pasted twice. Each variable is read independently.

**Will the site break if a key is wrong or an API is down?** No. Any feed that
can't reach its source quietly falls back to demo data instead of erroring.

**Is any of this going to cost money?** No. The api.data.gov key is free.
(Paid pieces — live stock prices, auto-posting to X, SMS alerts — come much
later and are clearly optional.)

**How complete is the donor-by-industry data?** It reliably catches the big
players (defense, pharma, energy, finance, insurance, tech) whose PACs are
named plainly in FEC filings. It is not as exhaustive as OpenSecrets' decades
of hand-coding — the long tail of small/individual donors isn't industry-tagged.
The industry list lives in `lib/industryMap.ts` and is easy to extend.

**What about the "red" data (lobbying activity, stock holdings)?** Those aren't
API keys — they need a bigger scraping/processing pipeline and a database. See
`PROGRESS.md`. They're deliberately deferred.
