import { NextResponse } from "next/server";
import { getApiKey } from "@/lib/config";
import { fetchJson } from "@/lib/http";

// Congress.gov API v3 (battle plan Task 4). Free key from api.data.gov, set as
// CONGRESS_GOV_API_KEY. Blocked in the build sandbox, so written against the
// documented shape; verify once deployed. Falls back to source:"demo" when the
// key is missing or the upstream is unavailable so the UI always renders.
//
// ?number=hr4421-119 fetches one bill; otherwise returns recent activity.

const BASE = "https://api.congress.gov/v3";
const DEMO_CONGRESS = 119;

interface CongressBill {
  number: string;
  type: string;
  title: string;
  congress: number;
  latestAction?: { actionDate: string; text: string };
  updateDate?: string;
}

function normalize(b: CongressBill) {
  return {
    billNumber: `${b.type} ${b.number}`,
    billId: `${b.type?.toLowerCase()}${b.number}-${b.congress}`,
    title: b.title,
    congress: b.congress,
    latestAction: b.latestAction?.text ?? null,
    latestActionDate: b.latestAction?.actionDate ?? null,
    updateDate: b.updateDate ?? null,
  };
}

export async function GET(request: Request) {
  const key = getApiKey("CONGRESS_GOV_API_KEY");
  const { searchParams } = new URL(request.url);
  const specific = searchParams.get("number"); // e.g. "hr4421-119"

  if (!key) {
    return NextResponse.json({
      source: "demo",
      reason: "CONGRESS_GOV_API_KEY not set — showing demo bill data. Add the key in Railway to go live.",
      bills: [],
    });
  }

  try {
    if (specific) {
      const m = specific.match(/^([a-z]+)(\d+)-(\d+)$/i);
      if (!m) return NextResponse.json({ error: "Bad bill id, expected e.g. hr4421-119" }, { status: 400 });
      const [, type, number, congress] = m;
      const data = await fetchJson<{ bill: CongressBill }>(
        `${BASE}/bill/${congress}/${type.toLowerCase()}/${number}?format=json&api_key=${key}`,
        { revalidateSeconds: 3600 }
      );
      return NextResponse.json({ source: "congress.gov", bill: normalize(data.bill) });
    }

    const data = await fetchJson<{ bills: CongressBill[] }>(
      `${BASE}/bill/${DEMO_CONGRESS}?format=json&limit=15&sort=updateDate+desc&api_key=${key}`,
      { revalidateSeconds: 300 }
    );
    return NextResponse.json({
      source: "congress.gov",
      bills: (data.bills ?? []).map(normalize),
    });
  } catch (err) {
    return NextResponse.json({
      source: "demo",
      reason: err instanceof Error ? err.message : "Congress.gov request failed",
      bills: [],
    });
  }
}
