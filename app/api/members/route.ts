import { NextResponse } from "next/server";
import { fetchRoster } from "@/lib/congressLegislators";

// Live roster of current members (battle plan Task 3). No API key required.
// Optional filters: ?state=TX  ?chamber=senate
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state")?.toUpperCase();
  const chamber = searchParams.get("chamber")?.toLowerCase();

  try {
    let members = await fetchRoster();
    if (state) members = members.filter((m) => m.state === state);
    if (chamber === "senate" || chamber === "house") {
      members = members.filter((m) => m.chamber === chamber);
    }
    const limit = Number(searchParams.get("limit"));
    if (Number.isFinite(limit) && limit > 0) members = members.slice(0, limit);
    return NextResponse.json({
      source: "congress-legislators",
      count: members.length,
      members,
    });
  } catch (err) {
    return NextResponse.json(
      {
        source: "unavailable",
        error: err instanceof Error ? err.message : "Failed to load roster",
        count: 0,
        members: [],
      },
      { status: 200 }
    );
  }
}
