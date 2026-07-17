import { NextResponse } from "next/server";
import { fetchDonorProfile } from "@/lib/donors";

// Donor money by industry — rebuilt on the FEC API after OpenSecrets retired
// its API (April 2025). The full resolution chain lives in lib/donors.ts and
// is shared with the member profile pages; this route keeps the JSON shape the
// homepage Money Board consumes.
//
// ?bioguide=C000127  (or ?candidate_id=S2TX00312  or ?committee_id=C00...)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bioguide = searchParams.get("bioguide") ?? undefined;
  const candidateId = searchParams.get("candidate_id") ?? undefined;
  const committeeId = searchParams.get("committee_id") ?? undefined;

  if (!bioguide && !candidateId && !committeeId) {
    return NextResponse.json(
      { error: "Provide ?committee_id=, ?candidate_id=, or a resolvable ?bioguide=" },
      { status: 400 }
    );
  }

  const result = await fetchDonorProfile({ bioguide, candidateId, committeeId });

  if (result.source === "unavailable") {
    return NextResponse.json({ source: "demo", reason: result.reason, donors: [] });
  }

  return NextResponse.json({
    source: "fec",
    committeeId: result.committeeId,
    donors: result.industries.map((i) => ({
      industry: i.industry,
      amount: i.amount,
      companies: i.companies,
    })),
    unclassifiedTotal: result.unclassifiedTotal,
    note: "Industries derived from FEC PAC filings via LOBBY CAM's curated industry map.",
  });
}
