# Turning on the live data feeds (non-coder guide)

LOBBY CAM works with **zero setup** — it runs in demo mode out of the box. To
replace demo data with real government data, you add a few free **API keys** as
"environment variables" in Railway. No coding. This guide walks you through it.

You can always see which feeds are live at **`lobby.cam/status`**.

---

## The short version

There are **three** keys to get, and they come from just **two** websites:

| Key (env variable name) | Get it from | What it turns on |
| --- | --- | --- |
| `CONGRESS_GOV_API_KEY` | api.data.gov | Real bills & floor schedule |
| `FEC_API_KEY` | api.data.gov (**same key works**) | Real campaign-finance filings |
| `OPENSECRETS_API_KEY` | opensecrets.org | Real donor-by-industry money |

Four other feeds (member roster, floor votes, federal contracts, district
lookup) need **no key at all** and are already live.

---

## Step 1 — Get the api.data.gov key (covers 2 of the 3)

1. Go to **https://api.data.gov/signup/**
2. Enter your name and email. Click **Sign Up**.
3. The key appears on screen **instantly** (also emailed to you). It's a long
   string of letters and numbers. Copy it.
4. This one key works for **both** `CONGRESS_GOV_API_KEY` and `FEC_API_KEY`.

## Step 2 — Get the OpenSecrets key

1. Go to **https://www.opensecrets.org/api/admin/index.php?function=signup**
2. Fill in the form. Approval is usually instant (sometimes a few hours).
3. They email you the key. Copy it.

> OpenSecrets' free tier allows 200 lookups per day. LOBBY CAM caches results
> for 24 hours so it stays well under that.

## Step 3 — Paste the keys into Railway

1. Open your project on **railway.app**.
2. Click the **lobbycam** service, then the **Variables** tab.
3. Click **New Variable** and add each of these (name on the left, your copied
   key on the right):
   - `CONGRESS_GOV_API_KEY` → your api.data.gov key
   - `FEC_API_KEY` → your api.data.gov key (same value)
   - `OPENSECRETS_API_KEY` → your OpenSecrets key
4. Railway redeploys automatically (about a minute).

## Step 4 — Confirm it worked

Visit **`lobby.cam/status`**. Each feed you added a key for should flip from
**○ Awaiting key** to **● Live**. Done.

---

## FAQ

**Do I have to add all three?** No. Add whichever you want; each is independent.
The rest stay in demo mode.

**Will the site break if a key is wrong or an API is down?** No. Any feed that
can't reach its source quietly falls back to demo data instead of erroring.

**Is any of this going to cost money?** None of these three keys cost anything.
(Paid pieces — live stock prices, auto-posting to X, SMS alerts — come much
later and are clearly optional.)

**What about the "red" data (lobbying activity, stock holdings)?** Those aren't
API keys — they need a bigger scraping/processing pipeline and a database. See
`PROGRESS.md`. They're deliberately deferred.
