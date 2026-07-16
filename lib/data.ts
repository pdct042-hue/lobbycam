// Shared types + presentation helpers + static, non-fabricated config.
//
// This file used to carry large hand-written arrays of demo senators, fake
// lobbyist filings, and invented conflict findings. Those have been removed:
// LOBBY CAM now renders only real data (GovTrack votes, USASpending contracts,
// FEC donor money) or an honest "in progress" state. Nothing here fabricates a
// claim about a named individual.

// Per-member vote position, returned live by /api/votes/live (GovTrack).
export interface Voter {
  name: string;
  party: "R" | "D" | "I";
  state: string;
  // Real conflict flags require the donor/holdings pipeline (red tier), which
  // isn't wired up yet — so this is always false for now and no fabricated
  // conflict string is ever attached.
  conflicted: boolean;
  conflict?: string;
}

export interface CspanChannel {
  id: string;
  label: string;
  /** Best-effort embeddable stream URL. */
  embedUrl: string;
  /** Canonical page to open in a new tab (always works). */
  watchUrl: string;
}

// FREE, login-free floor feeds. C-SPAN's 24/7 network streams require a
// pay-TV provider login, so we use the government's own free public feeds
// instead:
//  - House: the U.S. House Clerk streams the floor live on YouTube, which
//    embeds inline reliably (shows "offline" gracefully when not in session).
//  - Senate: there's no equally-clean free embeddable Senate video, so we
//    link to the Senate's official floor webcast (free, no login) and rely on
//    the always-visible "open live feed" fallback.
const HOUSE_CLERK_YT_CHANNEL = "UCqU8qiVHYmLsF0JIMByCTvw"; // youtube.com/USHouseClerk

export const CSPAN_CHANNELS: CspanChannel[] = [
  {
    id: "house",
    label: "House Floor",
    embedUrl: `https://www.youtube.com/embed/live_stream?channel=${HOUSE_CLERK_YT_CHANNEL}&autoplay=0`,
    watchUrl: "https://live.house.gov/",
  },
  {
    id: "senate",
    label: "Senate Floor",
    embedUrl: "https://www.senate.gov/legislative/floor_activity_pail.htm",
    watchUrl: "https://www.senate.gov/legislative/floor_activity_pail.htm",
  },
];

export const INDUSTRY_COLORS: Record<string, string> = {
  DEFENSE: "var(--blue)",
  PHARMA: "#6B4226",
  ENERGY: "#4A6741",
  FINANCE: "#5C4B8A",
  INSURANCE: "#7A5C3E",
  TECH: "#3D6B7A",
};

export function formatMoney(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function partyLabel(p: string): string {
  return p === "R" ? "Republican" : p === "D" ? "Democrat" : "Independent";
}

// URL-friendly slug for a member name, e.g. "Robert Caldwell" -> "robert-caldwell".
// Member profile pages resolve this back against the live roster.
export function slugifyName(name: string): string {
  return name
    .replace(/^(Sen\.|Rep\.)\s+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
