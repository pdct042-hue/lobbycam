import { NextResponse } from "next/server";
import type { Voter } from "@/lib/data";

// GovTrack API v2 — no auth required. See lobbycambattleplan.md Task 5.
// NOTE: this session's network egress policy blocks www.govtrack.us, so this
// route has been written against GovTrack's documented API shape but could
// not be exercised end-to-end here. It fails closed to "source: mock" so the
// UI always has data to render; verify against the live API once deployed
// somewhere with normal internet access.

const GOVTRACK_BASE = "https://www.govtrack.us/api/v2";
const FETCH_TIMEOUT_MS = 6000;

interface GovTrackPerson {
  name: string;
  state: string;
  party: string;
  bioguideid?: string;
}

interface GovTrackVoteVoter {
  person: GovTrackPerson;
  option: { key: string; value: string };
}

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

function partyCode(party: string): Voter["party"] {
  if (party.startsWith("R")) return "R";
  if (party.startsWith("D")) return "D";
  return "I";
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`GovTrack ${res.status} for ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  try {
    const voteList = await fetchJson<{ objects: GovTrackVote[] }>(
      `${GOVTRACK_BASE}/vote?chamber=senate&sort=-created&limit=1`
    );
    const vote = voteList.objects?.[0];
    if (!vote) throw new Error("No recent Senate votes returned");

    const voters = await fetchJson<{ objects: GovTrackVoteVoter[] }>(
      `${GOVTRACK_BASE}/vote_voter?vote=${vote.id}&limit=600`
    );

    const yes: Voter[] = [];
    const no: Voter[] = [];
    for (const v of voters.objects ?? []) {
      const voter: Voter = {
        name: v.person.name,
        party: partyCode(v.person.party),
        state: v.person.state,
        // Real conflict flags require the donor/holdings pipeline (Tasks 6, 10, 17),
        // which isn't wired up yet — GovTrack alone can't tell us this.
        conflicted: false,
      };
      if (v.option.value === "Yes") yes.push(voter);
      else if (v.option.value === "No") no.push(voter);
    }

    return NextResponse.json({
      source: "govtrack",
      vote: {
        id: vote.id,
        chamber: vote.chamber,
        question: vote.question,
        result: vote.result,
        billNumber: vote.related_bill?.display_number ?? vote.related_bill?.number ?? null,
        billTitle: vote.related_bill?.title ?? null,
        created: vote.created,
      },
      yes,
      no,
    });
  } catch (err) {
    return NextResponse.json(
      {
        source: "mock",
        error: err instanceof Error ? err.message : "Unknown error fetching GovTrack data",
        vote: null,
        yes: [],
        no: [],
      },
      { status: 200 }
    );
  }
}
