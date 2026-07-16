import { NextResponse } from "next/server";
import { getApiKey } from "@/lib/config";
import { fetchJson } from "@/lib/http";

// Upcoming congressional activity (Congress.gov v3 committee-meeting). This is
// the closest free, structured signal for "what's coming up" — Congress does
// not publish upcoming floor roll-call votes as data, but committee hearings
// and markups ARE scheduled and dated. Backs the "This Week" schedule panel
// that replaces the floor video when no vote is live, and is the natural hook
// for future vote/hearing alerts (Telegram, etc.).
//
// The list endpoint returns only eventId/chamber, so we fetch each meeting's
// detail to get date/title/status. Bounded (LIST_LIMIT per chamber) and cached
// so we stay well under the api.data.gov rate limit. Needs CONGRESS_GOV_API_KEY;
// fails closed to source:"demo" with an empty list so the UI shows an honest
// empty state rather than fabricated events.
//
// Schema: github.com/LibraryOfCongress/api.congress.gov CommitteeMeetingEndpoint

const BASE = "https://api.congress.gov/v3";
const CONGRESS = 119; // 119th Congress (2025–2026)
const CHAMBERS = ["house", "senate"] as const;
const LIST_LIMIT = 15; // meetings per chamber to inspect
const OUTPUT_LIMIT = 10; // upcoming meetings returned

interface MeetingListItem {
  eventId: string;
  chamber: string;
}

interface MeetingCommittee {
  name?: string;
  systemCode?: string;
}

interface MeetingBill {
  type?: string;
  number?: string | number;
}

interface MeetingDetail {
  eventId?: string;
  congress?: number;
  type?: string;
  title?: string;
  meetingStatus?: string;
  date?: string;
  chamber?: string;
  committees?: MeetingCommittee[];
  location?: { room?: string; building?: string };
  relatedItems?: { bills?: MeetingBill[] };
}

export interface ScheduleItem {
  eventId: string;
  chamber: string;
  type: string | null;
  title: string | null;
  date: string | null;
  status: string | null;
  committee: string | null;
  billRef: string | null;
}

function normalize(cm: MeetingDetail, chamber: string): ScheduleItem {
  const committee = cm.committees?.[0]?.name ?? null;
  const b = cm.relatedItems?.bills?.[0];
  const billRef = b?.type && b?.number != null ? `${b.type} ${b.number}` : null;
  return {
    eventId: String(cm.eventId ?? ""),
    chamber: cm.chamber ?? chamber,
    type: cm.type ?? null,
    title: cm.title ?? null,
    date: cm.date ?? null,
    status: cm.meetingStatus ?? null,
    committee,
    billRef,
  };
}

async function fetchChamber(chamber: string, key: string): Promise<ScheduleItem[]> {
  const list = await fetchJson<{ committeeMeetings?: MeetingListItem[] }>(
    `${BASE}/committee-meeting/${CONGRESS}/${chamber}?format=json&limit=${LIST_LIMIT}&sort=updateDate+desc&api_key=${key}`,
    { revalidateSeconds: 1800 }
  );
  const items = list.committeeMeetings ?? [];
  const details = await Promise.all(
    items.map(async (it) => {
      try {
        const d = await fetchJson<{ committeeMeeting: MeetingDetail }>(
          `${BASE}/committee-meeting/${CONGRESS}/${chamber}/${it.eventId}?format=json&api_key=${key}`,
          { revalidateSeconds: 1800 }
        );
        return normalize(d.committeeMeeting, chamber);
      } catch {
        return null;
      }
    })
  );
  return details.filter((d): d is ScheduleItem => d != null);
}

export async function GET() {
  const key = getApiKey("CONGRESS_GOV_API_KEY");
  if (!key) {
    return NextResponse.json({
      source: "demo",
      reason: "CONGRESS_GOV_API_KEY not set — add it in Railway to show the live schedule.",
      meetings: [],
    });
  }

  try {
    const all = (await Promise.all(CHAMBERS.map((c) => fetchChamber(c, key)))).flat();

    // Keep only meetings that are still on the calendar and dated today or
    // later, so this reads as "upcoming" rather than a log of past hearings.
    const cutoff = Date.now() - 12 * 60 * 60 * 1000; // include today
    const upcoming = all
      .filter((m) => {
        const okStatus = !m.status || /scheduled|rescheduled/i.test(m.status);
        const t = m.date ? new Date(m.date).getTime() : NaN;
        return okStatus && Number.isFinite(t) && t >= cutoff;
      })
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
      .slice(0, OUTPUT_LIMIT);

    return NextResponse.json({ source: "congress.gov", meetings: upcoming });
  } catch (err) {
    return NextResponse.json({
      source: "demo",
      reason: err instanceof Error ? err.message : "Congress.gov schedule request failed",
      meetings: [],
    });
  }
}
