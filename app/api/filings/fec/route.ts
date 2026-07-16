import { NextResponse } from "next/server";
import { getApiKey } from "@/lib/config";
import { fetchJson } from "@/lib/http";

// FEC API v1 (battle plan Task 7). Free key from api.data.gov set as
// FEC_API_KEY. Blocked in the build sandbox; written against the documented
// shape. Falls back to source:"demo" when the key is missing or upstream
// fails so the UI always renders.
//
// Returns recent Schedule A receipts (individual + PAC contributions) to a
// committee. ?committee_id=C00401224  [&min_amount=5000]
//
// Note: resolving a member to their principal campaign committee needs the
// /candidate/{id}/committees endpoint; that link-up is left for when the
// ticker is wired to real data. This route is the clean, documented building
// block for it.

const BASE = "https://api.open.fec.gov/v1";

interface FecReceipt {
  contributor_name?: string;
  contribution_receipt_amount?: number;
  contribution_receipt_date?: string;
  contributor_employer?: string;
}

export async function GET(request: Request) {
  const key = getApiKey("FEC_API_KEY");
  const { searchParams } = new URL(request.url);
  const committeeId = searchParams.get("committee_id");
  const minAmount = searchParams.get("min_amount") ?? "1000";

  if (!key) {
    return NextResponse.json({
      source: "demo",
      reason: "FEC_API_KEY not set — showing demo filing data. Add the key in Railway to go live.",
      receipts: [],
    });
  }
  if (!committeeId) {
    return NextResponse.json({ error: "Provide ?committee_id=" }, { status: 400 });
  }

  try {
    const url =
      `${BASE}/schedules/schedule_a/?api_key=${key}` +
      `&committee_id=${committeeId}&min_amount=${minAmount}` +
      `&sort=-contribution_receipt_date&per_page=20`;
    const data = await fetchJson<{ results: FecReceipt[] }>(url, { revalidateSeconds: 900 });

    const receipts = (data.results ?? []).map((r) => ({
      contributor: r.contributor_name ?? "Unknown",
      employer: r.contributor_employer ?? null,
      amount: r.contribution_receipt_amount ?? 0,
      date: r.contribution_receipt_date ?? null,
    }));

    return NextResponse.json({ source: "fec", committeeId, receipts });
  } catch (err) {
    return NextResponse.json({
      source: "demo",
      reason: err instanceof Error ? err.message : "FEC request failed",
      receipts: [],
    });
  }
}
