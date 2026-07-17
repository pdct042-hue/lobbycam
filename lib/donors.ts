import { getApiKey } from "@/lib/config";
import { fetchJson } from "@/lib/http";
import { fecCandidateIdFor } from "@/lib/congressLegislators";
import { aggregateByIndustry, type IndustryTotal } from "@/lib/industryMap";

// Shared donor-money resolver — the FEC chain behind both /api/donors and the
// member profile pages: bioguide -> FEC candidate id (roster crosswalk) ->
// principal committee id -> Schedule A committee-to-committee receipts (PAC
// money), classified by lib/industryMap. Figures are cycle-to-date totals;
// every fetch is cached 24h.

const BASE = "https://api.open.fec.gov/v1";

interface FecCommittee {
  committee_id: string;
  designation?: string; // "P" = principal campaign committee
}

interface FecReceipt {
  contributor_name?: string;
  contribution_receipt_amount?: number;
}

export interface DonorProfile {
  source: "fec";
  committeeId: string;
  industries: IndustryTotal[];
  /** PAC money we saw but could not attribute to an industry. */
  unclassifiedTotal: number;
}

export interface DonorUnavailable {
  source: "unavailable";
  reason: string;
}

export type DonorResult = DonorProfile | DonorUnavailable;

async function resolvePrincipalCommittee(candidateId: string, key: string): Promise<string | null> {
  const data = await fetchJson<{ results: FecCommittee[] }>(
    `${BASE}/candidate/${candidateId}/committees/?api_key=${key}&designation=P&per_page=5`,
    { revalidateSeconds: 86400 }
  );
  return data.results?.[0]?.committee_id ?? null;
}

export async function fetchDonorProfile(opts: {
  bioguide?: string;
  candidateId?: string;
  committeeId?: string;
}): Promise<DonorResult> {
  const key = getApiKey("FEC_API_KEY");
  if (!key) {
    return { source: "unavailable", reason: "FEC_API_KEY not set — donor data needs the free api.data.gov key." };
  }

  try {
    let committeeId = opts.committeeId;
    if (!committeeId) {
      let candId = opts.candidateId;
      if (!candId && opts.bioguide) candId = (await fecCandidateIdFor(opts.bioguide)) ?? undefined;
      if (!candId) {
        return { source: "unavailable", reason: "No FEC candidate id resolvable for this member." };
      }
      committeeId = (await resolvePrincipalCommittee(candId, key)) ?? undefined;
      if (!committeeId) {
        return { source: "unavailable", reason: `No principal committee found for candidate ${candId}.` };
      }
    }

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

    return { source: "fec", committeeId, industries, unclassifiedTotal };
  } catch (err) {
    return { source: "unavailable", reason: err instanceof Error ? err.message : "FEC request failed" };
  }
}
