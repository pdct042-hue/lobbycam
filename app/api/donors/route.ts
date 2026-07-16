import { NextResponse } from "next/server";
import { getApiKey } from "@/lib/config";
import { fetchJson } from "@/lib/http";
import { opensecretsIdFor } from "@/lib/congressLegislators";

// OpenSecrets candIndustry (battle plan Task 6). Free key (200 calls/day) set
// as OPENSECRETS_API_KEY. Because of the daily cap, results are cached 24h.
// Blocked in the build sandbox; written against the documented shape.
//
// ?bioguide=C000127  (resolved to a CRP id via the roster crosswalk)
//   — or —
// ?cid=N00007836     (OpenSecrets CRP id directly)

const BASE = "https://www.opensecrets.org/api/";
const DEFAULT_CYCLE = "2026";

interface OSIndustry {
  "@attributes": { industry_name: string; indus: string; total: string };
}

export async function GET(request: Request) {
  const key = getApiKey("OPENSECRETS_API_KEY");
  const { searchParams } = new URL(request.url);
  const cycle = searchParams.get("cycle") ?? DEFAULT_CYCLE;
  let cid = searchParams.get("cid") ?? undefined;
  const bioguide = searchParams.get("bioguide") ?? undefined;

  if (!key) {
    return NextResponse.json({
      source: "demo",
      reason: "OPENSECRETS_API_KEY not set — showing demo donor data. Add the key in Railway to go live.",
      donors: [],
    });
  }

  try {
    if (!cid && bioguide) {
      cid = (await opensecretsIdFor(bioguide)) ?? undefined;
    }
    if (!cid) {
      return NextResponse.json({ error: "Provide ?cid= or a ?bioguide= that resolves to a CRP id" }, { status: 400 });
    }

    const url = `${BASE}?method=candIndustry&cid=${cid}&cycle=${cycle}&apikey=${key}&output=json`;
    const data = await fetchJson<{ response: { industries: { industry: OSIndustry[] } } }>(url, {
      revalidateSeconds: 86400,
    });

    const donors = (data.response?.industries?.industry ?? []).map((i) => ({
      industry: i["@attributes"].industry_name,
      code: i["@attributes"].indus,
      // OpenSecrets totals are whole dollars; keep as-is for display.
      amount: Number(i["@attributes"].total) || 0,
    }));

    return NextResponse.json({ source: "opensecrets", cid, cycle, donors });
  } catch (err) {
    return NextResponse.json({
      source: "demo",
      reason: err instanceof Error ? err.message : "OpenSecrets request failed",
      donors: [],
    });
  }
}
