import { NextResponse } from "next/server";
import { getApiKey } from "@/lib/config";
import { fetchJson } from "@/lib/http";
import { fecCandidateIdFor } from "@/lib/congressLegislators";
import { aggregateByIndustry } from "@/lib/industryMap";

// Donor money by industry — rebuilt on the FEC API after OpenSecrets retired
// its API (April 2025). We pull a member's PAC contributions from FEC Schedule
// A and classify each contributor against our curated industry map
// (lib/industryMap.ts). Uses the same FEC_API_KEY as /api/filings/fec.
//
// Chain: bioguide -> FEC candidate id (roster crosswalk) -> principal
// committee id (FEC) -> Schedule A committee-to-committee receipts (PAC money).
// Cached 24h. Blocked in the build sandbox, so written against the documented
// FEC shapes; falls back to source:"demo" so the UI always renders.
//
// ?bioguide=C000127  (or ?candidate_id=S2TX00312  or ?committee_id=C00...)

const BASE = "https://api.open.fec.gov/v1";

interface FecCommittee {
  committee_id: string;
  designation?: string; // "P" = principal campaign committee
}

interface FecReceipt {
  contributor_name?: string;
  contribution_receipt_amount?: number;
}

async function resolvePrincipalCommittee(candidateId: string, key: string): Promise<string | null> {
  const data = await fetchJson<{ results: FecCommittee[] }>(
    `${BASE}/candidate/${candidateId}/committees/?api_key=${key}&designation=P&per_page=5`,
    { revalidateSeconds: 86400 }
  );
  return data.results?.[0]?.committee_id ?? null;
}

export async function GET(request: Request) {
  const key = getApiKey("FEC_API_KEY");
  const { searchParams } = new URL(request.url);
  const bioguide = searchParams.get("bioguide") ?? undefined;
  const candidateId = searchParams.get("candidate_id") ?? undefined;
  let committeeId = searchParams.get("committee_id") ?? undefined;

  if (!key) {
    return NextResponse.json({
      source: "demo",
      reason: "FEC_API_KEY not set — showing demo donor data. Add the key in Railway to go live.",
      donors: [],
    });
  }

  try {
    // Resolve down to a committee id if we were given a member/candidate.
    if (!committeeId) {
      let candId = candidateId;
      if (!candId && bioguide) candId = (await fecCandidateIdFor(bioguide)) ?? undefined;
      if (!candId) {
        return NextResponse.json(
          { error: "Provide ?committee_id=, ?candidate_id=, or a resolvable ?bioguide=" },
          { status: 400 }
        );
      }
      committeeId = (await resolvePrincipalCommittee(candId, key)) ?? undefined;
      if (!committeeId) {
        return NextResponse.json({
          source: "demo",
          reason: `No principal committee found for candidate ${candId}`,
          donors: [],
        });
      }
    }

    // PAC (committee-to-committee) receipts — contributor_type=committee.
    const receipts = await fetchJson<{ results: FecReceipt[] }>(
      `${BASE}/schedules/schedule_a/?api_key=${key}` +
        `&committee_id=${committeeId}&contributor_type=committee` +
        `&sort=-contribution_receipt_amount&per_page=100`,
      { revalidateSeconds: 86400 }
    );

    const { industries, unclassifiedTotal } = aggregateByIndustry(
      (receipts.results ?? []).map((r) => ({
        name: r.contributor_name ?? "",
        amount: r.contribution_receipt_amount ?? 0,
      }))
    );

    return NextResponse.json({
      source: "fec",
      committeeId,
      donors: industries.map((i) => ({
        industry: i.industry,
        amount: i.amount,
        companies: i.companies,
      })),
      unclassifiedTotal,
      note: "Industries derived from FEC PAC filings via LOBBY CAM's curated industry map.",
    });
  } catch (err) {
    return NextResponse.json({
      source: "demo",
      reason: err instanceof Error ? err.message : "FEC request failed",
      donors: [],
    });
  }
}
