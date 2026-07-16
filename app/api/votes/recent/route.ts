import { NextResponse } from "next/server";

// GovTrack API v2 — no auth required. Backs the "Recent Votes" archive with
// REAL recent Senate roll-call votes instead of fabricated findings. Returns
// vote metadata only (question, result, related bill, tallies) — no per-member
// conflict claims, which would require the donor/holdings pipeline we don't
// have yet.
//
// NOTE: this session's network egress blocks www.govtrack.us, so this is
// written against GovTrack's documented shape but not exercised end-to-end
// here; it fails closed to source:"mock" with an empty list so the UI shows an
// honest empty state rather than fabricated data.

const GOVTRACK_BASE = "https://www.govtrack.us/api/v2";
const FETCH_TIMEOUT_MS = 6000;
const LIMIT = 8;

interface GovTrackVote {
  id: number;
  chamber: string;
  created: string;
  question: string;
  result: string;
  related_bill?: { number?: string; title?: string; display_number?: string };
  total_plus?: number;
  total_minus?: number;
}

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${GOVTRACK_BASE}/vote?chamber=senate&sort=-created&limit=${LIMIT}`,
      {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) throw new Error(`GovTrack ${res.status}`);
    const data = (await res.json()) as { objects: GovTrackVote[] };
    const votes = (data.objects ?? []).map((v) => ({
      id: v.id,
      chamber: v.chamber,
      question: v.question,
      result: v.result,
      billNumber: v.related_bill?.display_number ?? v.related_bill?.number ?? null,
      billTitle: v.related_bill?.title ?? null,
      created: v.created,
      totalPlus: v.total_plus ?? null,
      totalMinus: v.total_minus ?? null,
    }));

    return NextResponse.json({ source: "govtrack", votes });
  } catch (err) {
    return NextResponse.json({
      source: "mock",
      error: err instanceof Error ? err.message : "Unknown error fetching GovTrack data",
      votes: [],
    });
  } finally {
    clearTimeout(timeout);
  }
}
