import { NextResponse } from "next/server";

// USASpending.gov API v2 — no auth required. Repurposes the "Lobby Wire" zone
// into a real "Defense Contract Wire": instead of fabricated lobbyist meetings,
// we show REAL federal contract totals for major defense primes.
//
// Each recipient is one POST to spending_by_award (same shape as
// /api/contracts). We fan out over a curated list and return the totals sorted
// high→low. NOTE: this session's network egress blocks api.usaspending.gov, so
// this is written against USASpending's documented shape but not exercised
// end-to-end here; it fails closed to source:"mock" with an empty list so the
// UI shows an honest empty state rather than fabricated data.

const USASPENDING_BASE = "https://api.usaspending.gov/api/v2";
const FETCH_TIMEOUT_MS = 6000;
const CURRENT_FISCAL_YEAR_START = "2025-10-01";
const CURRENT_FISCAL_YEAR_END = "2026-09-30";

// Curated list of major, unambiguous defense prime contractors. These are
// public companies whose federal contract totals are a matter of public record
// — no inference about any individual is made here.
const DEFENSE_RECIPIENTS = [
  "Lockheed Martin",
  "RTX Corporation",
  "Boeing",
  "General Dynamics",
  "Northrop Grumman",
  "L3Harris Technologies",
  "BAE Systems",
  "Huntington Ingalls Industries",
];

interface SpendingByAwardResult {
  "Award Amount": number;
}

interface RecipientTotal {
  recipient: string;
  totalAmount: number;
  awardCount: number;
}

async function fetchRecipientTotal(recipient: string): Promise<RecipientTotal | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${USASPENDING_BASE}/search/spending_by_award/`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      next: { revalidate: 3600 },
      body: JSON.stringify({
        filters: {
          recipient_search_text: [recipient],
          time_period: [{ start_date: CURRENT_FISCAL_YEAR_START, end_date: CURRENT_FISCAL_YEAR_END }],
          award_type_codes: ["A", "B", "C", "D"], // contracts
        },
        fields: ["Award ID", "Recipient Name", "Award Amount"],
        sort: "Award Amount",
        order: "desc",
        limit: 25,
        page: 1,
      }),
    });
    if (!res.ok) throw new Error(`USASpending ${res.status}`);
    const data = (await res.json()) as { results: SpendingByAwardResult[] };
    const total = (data.results ?? []).reduce((sum, r) => sum + (r["Award Amount"] ?? 0), 0);
    return { recipient, totalAmount: total, awardCount: data.results?.length ?? 0 };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const settled = await Promise.all(DEFENSE_RECIPIENTS.map(fetchRecipientTotal));
  const recipients = settled
    .filter((r): r is RecipientTotal => r != null && r.totalAmount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount);

  if (recipients.length === 0) {
    return NextResponse.json({
      source: "mock",
      reason: "USASpending unavailable — no live contract data. Verify once deployed with normal internet access.",
      fiscalYear: "FY2026",
      recipients: [],
    });
  }

  return NextResponse.json({
    source: "usaspending",
    fiscalYear: "FY2026",
    recipients,
  });
}
