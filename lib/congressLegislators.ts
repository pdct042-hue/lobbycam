import { load as yamlLoad } from "js-yaml";
import { fetchText } from "./http";

// Loads the @unitedstates/congress-legislators roster — the free, no-key
// backbone that links every external ID together (battle plan Task 3).
// The project publishes YAML (the JSON export was retired), so we parse YAML.

const ROSTER_URL =
  "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml";

export interface RosterMember {
  bioguide: string;
  nameFull: string;
  nameFirst: string;
  nameLast: string;
  party: "R" | "D" | "I";
  state: string;
  chamber: "senate" | "house";
  district: number | null;
  ids: {
    fec: string[];
    opensecrets: string | null;
    govtrack: number | null;
    lis: string | null;
  };
}

interface RawLegislator {
  name: { first: string; last: string; official_full?: string };
  id: {
    bioguide: string;
    fec?: string[];
    opensecrets?: string;
    govtrack?: number;
    lis?: string;
  };
  terms: Array<{ type: "sen" | "rep"; state: string; party?: string; district?: number }>;
}

function partyCode(party: string | undefined): "R" | "D" | "I" {
  if (party === "Republican") return "R";
  if (party === "Democrat") return "D";
  return "I";
}

// Cache the parsed roster in module memory for the life of the server
// process; fetchText itself also applies a 24h Next.js revalidate, so a cold
// process re-fetch is at most daily.
let cache: { at: number; members: RosterMember[] } | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export async function fetchRoster(): Promise<RosterMember[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.members;

  const text = await fetchText(ROSTER_URL, { revalidateSeconds: 86400, timeoutMs: 20000 });
  const raw = yamlLoad(text) as RawLegislator[];

  const members: RosterMember[] = raw.map((m) => {
    const term = m.terms[m.terms.length - 1];
    return {
      bioguide: m.id.bioguide,
      nameFull: m.name.official_full ?? `${m.name.first} ${m.name.last}`,
      nameFirst: m.name.first,
      nameLast: m.name.last,
      party: partyCode(term.party),
      state: term.state,
      chamber: term.type === "sen" ? "senate" : "house",
      district: term.type === "rep" ? term.district ?? null : null,
      ids: {
        fec: m.id.fec ?? [],
        opensecrets: m.id.opensecrets ?? null,
        govtrack: m.id.govtrack ?? null,
        lis: m.id.lis ?? null,
      },
    };
  });

  cache = { at: Date.now(), members };
  return members;
}

/** Resolve a Bioguide ID to its OpenSecrets CRP ID via the crosswalk. */
export async function opensecretsIdFor(bioguide: string): Promise<string | null> {
  const roster = await fetchRoster();
  return roster.find((m) => m.bioguide === bioguide)?.ids.opensecrets ?? null;
}
