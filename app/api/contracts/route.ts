import { NextResponse } from "next/server";

// USASpending.gov API v2 — no auth required. See lobbycambattleplan.md Task 12.
// NOTE: this session's network egress policy blocks api.usaspending.gov, so
// this route is written against USASpending's documented API shape but could
// not be exercised end-to-end here. It fails closed to a null total so
// FilingCard just omits the contract badge; verify once deployed somewhere
// with normal internet access.

const USASPENDING_BASE = "https://api.usaspending.gov/api/v2";
const FETCH_TIMEOUT_MS = 6000;
const CURRENT_FISCAL_YEAR_START = "2025-10-01";
const CURRENT_FISCAL_YEAR_END = "2026-09-30";

interface SpendingByAwardResult {
  "Award Amount": number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recipient = searchParams.get("recipient")?.trim();
  if (!recipient) {
    return NextResponse.json({ error: "Missing required 'recipient' query param" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${USASPENDING_BASE}/search/spending_by_award/`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
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
    const totalCents = (data.results ?? []).reduce((sum, r) => sum + (r["Award Amount"] ?? 0), 0);

    return NextResponse.json({
      source: "usaspending",
      recipient,
      fiscalYear: "FY2026",
      totalAmount: totalCents,
      awardCount: data.results?.length ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      {
        source: "mock",
        error: err instanceof Error ? err.message : "Unknown error fetching USASpending data",
        recipient,
        totalAmount: null,
        awardCount: 0,
      },
      { status: 200 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
