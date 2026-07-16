// Registry of every external data source and whether it's configured.
//
// Design note: LOBBY CAM runs as a single Next.js app (not the battle plan's
// separate Python + Postgres backend). For the "green/yellow" data tier —
// sources that are free and either need no key or a free API key — Next.js
// server routes with built-in fetch caching are enough and keep the deploy to
// one Railway service with no database bill. The Python/Postgres ETL backend
// is deferred until the "red" tier (lobbying XML + financial-disclosure PDF
// scraping), which genuinely needs persistent storage and heavy processing.
//
// Every keyed source degrades gracefully to demo/mock data when its key is
// absent, so the site works before any keys are added and each feed "lights
// up" independently once its env var is set in Railway.

export type SourceTier = "green" | "yellow" | "red";

export interface DataSource {
  id: string;
  label: string;
  tier: SourceTier;
  /** Env var holding the API key, or null when the source needs no key. */
  envKey: string | null;
  needsKey: boolean;
  description: string;
  docsUrl: string;
  /** Where to get the (free) key, for the setup guide. */
  keyUrl?: string;
}

export const DATA_SOURCES: DataSource[] = [
  {
    id: "congress_roster",
    label: "Member Roster (congress-legislators)",
    tier: "green",
    envKey: null,
    needsKey: false,
    description: "All 537 current members with the Bioguide/FEC/OpenSecrets/GovTrack ID crosswalk. The backbone every other join depends on.",
    docsUrl: "https://github.com/unitedstates/congress-legislators",
  },
  {
    id: "govtrack",
    label: "Floor Votes (GovTrack)",
    tier: "green",
    envKey: null,
    needsKey: false,
    description: "Live Senate roll-call votes and per-member positions.",
    docsUrl: "https://www.govtrack.us/developers/api",
  },
  {
    id: "usaspending",
    label: "Federal Contracts (USASpending.gov)",
    tier: "green",
    envKey: null,
    needsKey: false,
    description: "Federal contract totals per recipient, shown on Lobby Wire cards.",
    docsUrl: "https://api.usaspending.gov/docs/endpoints",
  },
  {
    id: "census",
    label: "District Lookup (Census Geocoder)",
    tier: "green",
    envKey: null,
    needsKey: false,
    description: "Maps a ZIP to a congressional district for the alerts widget.",
    docsUrl: "https://geocoding.geo.census.gov/geocoder/",
  },
  {
    id: "congress_gov",
    label: "Bills & Floor Schedule (Congress.gov)",
    tier: "green",
    envKey: "CONGRESS_GOV_API_KEY",
    needsKey: true,
    description: "Live bill details, subjects, and recent legislative activity.",
    docsUrl: "https://api.congress.gov/",
    keyUrl: "https://api.data.gov/signup/",
  },
  {
    id: "opensecrets",
    label: "Donor Money (OpenSecrets)",
    tier: "yellow",
    envKey: "OPENSECRETS_API_KEY",
    needsKey: true,
    description: "Career donor breakdown by industry per member. Free tier is 200 calls/day, so results are cached for 24h.",
    docsUrl: "https://www.opensecrets.org/open-data/api",
    keyUrl: "https://www.opensecrets.org/api/admin/index.php?function=signup",
  },
  {
    id: "fec",
    label: "Campaign Filings (FEC)",
    tier: "yellow",
    envKey: "FEC_API_KEY",
    needsKey: true,
    description: "Recent individual and PAC contributions from FEC filings.",
    docsUrl: "https://api.open.fec.gov/developers/",
    keyUrl: "https://api.data.gov/signup/",
  },
];

export function getApiKey(envKey: string): string | undefined {
  const v = process.env[envKey];
  return v && v.trim() ? v.trim() : undefined;
}

export interface SourceStatus extends DataSource {
  configured: boolean;
}

/** Whether each source is ready: no-key sources are always "configured";
 *  keyed sources are configured only when their env var is set. */
export function getSourceStatuses(): SourceStatus[] {
  return DATA_SOURCES.map((s) => ({
    ...s,
    configured: s.envKey ? Boolean(getApiKey(s.envKey)) : true,
  }));
}
