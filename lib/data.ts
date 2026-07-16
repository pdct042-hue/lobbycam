// Mock data — mirrors the shape real API responses will use once the
// Phase 1 data pipelines (GovTrack, USASpending, OpenSecrets, LDA) are live.
// See lobbycambattleplan.md for the full data-sourcing plan.

export interface Voter {
  name: string;
  party: "R" | "D" | "I";
  state: string;
  conflicted: boolean;
  conflict?: string;
}

export interface Donor {
  industry: string;
  amount: number;
}

export interface StockHolding {
  company: string;
  value: string;
  committee: string;
}

export interface VoteHistoryEntry {
  bill: string;
  vote: "YES" | "NO";
  conflict: boolean;
  date: string;
}

export interface Member {
  id: number;
  name: string;
  party: "R" | "D" | "I";
  state: string;
  conflictScore: number;
  donors: Donor[];
  stockHoldings: StockHolding[];
  voteHistory: VoteHistoryEntry[];
  revolvingDoor: string[];
  correlation: string;
  shareText: string;
}

export interface Filing {
  id: number;
  lobbyist: string;
  firm: string;
  client: string;
  industry: string;
  memberMet: string;
  committee: string;
  timestamp: string;
  activeConflict: boolean;
}

export interface TickerItem {
  id: number;
  text: string;
  severity: "high" | "medium" | "low";
}

export interface PastVote {
  bill: string;
  title: string;
  date: string;
  conflictedVotes: number;
  totalVotes: number;
  finding: string;
}

export interface CspanChannel {
  id: string;
  label: string;
  /** Best-effort embeddable stream URL. */
  embedUrl: string;
  /** Canonical C-SPAN page to open in a new tab (always works). */
  watchUrl: string;
}

export const CURRENT_SESSION = {
  chamber: "Senate",
  billNumber: "H.R. 4421",
  billTitle: "National Defense Authorization Act",
  billSubtitle: "FY2026 Appropriations — $886 Billion",
  status: "FLOOR VOTE — IN PROGRESS",
  explanation:
    "This bill authorizes $886 billion in defense spending for fiscal year 2026, including $30.7B for military construction, $9.1B in aid to allied nations, and procurement contracts for next-generation weapons systems. It directly affects the stock prices and revenue of every major defense contractor.",
  industryMoneyYes: 14_820_000,
  industryMoneyNo: 3_210_000,
  scheduledTime: "2:30 PM ET",
};

export const ALL_VOTERS: { yes: Voter[]; no: Voter[] } = {
  yes: [
    { name: "R. Caldwell", party: "R", state: "TX", conflicted: true, conflict: "Holds $340K in Lockheed Martin stock; sits on Armed Services Committee" },
    { name: "M. Whitfield", party: "D", state: "VA", conflicted: true, conflict: "Top donor: Northrop Grumman ($87K career); votes with defense donors 91%" },
    { name: "J. Hargrove", party: "R", state: "AL", conflicted: false },
    { name: "T. Nakamura", party: "D", state: "HI", conflicted: false },
    { name: "S. Brennan", party: "R", state: "GA", conflicted: true, conflict: "Spouse employed by Raytheon Technologies as VP of Gov't Relations since 2021" },
    { name: "D. McAllister", party: "R", state: "OH", conflicted: false },
    { name: "P. Vasquez", party: "D", state: "NM", conflicted: false },
    { name: "C. Lindgren", party: "R", state: "NE", conflicted: true, conflict: "$220K in Boeing stock; received $54K from BAE Systems PAC in 2024" },
    { name: "A. Washington", party: "D", state: "MD", conflicted: false },
    { name: "K. O'Brien", party: "R", state: "PA", conflicted: true, conflict: "Former Lockheed lobbyist (2014-2019); $180K defense holdings" },
    { name: "F. Dominguez", party: "D", state: "AZ", conflicted: false },
    { name: "L. Chen", party: "R", state: "FL", conflicted: false },
    { name: "W. Patterson", party: "R", state: "SC", conflicted: true, conflict: "General Dynamics PAC top career donor at $112K" },
    { name: "B. Kowalski", party: "D", state: "MI", conflicted: false },
    { name: "H. Ramirez", party: "D", state: "CA", conflicted: false },
  ],
  no: [
    { name: "E. Morano", party: "D", state: "VT", conflicted: false },
    { name: "N. Okafor", party: "D", state: "IL", conflicted: false },
    { name: "G. Albrecht", party: "R", state: "MT", conflicted: true, conflict: "Voted against but holds $90K in L3Harris stock through family trust" },
    { name: "R. Delacroix", party: "D", state: "LA", conflicted: false },
    { name: "I. Petrov", party: "I", state: "ME", conflicted: false },
    { name: "J. Sato", party: "D", state: "OR", conflicted: false },
    { name: "V. Oduya", party: "D", state: "GA", conflicted: false },
    { name: "M. Flanagan", party: "D", state: "CT", conflicted: false },
  ],
};

export const MEMBERS: Member[] = [
  {
    id: 1, name: "Sen. Robert Caldwell", party: "R", state: "TX", conflictScore: 94,
    donors: [
      { industry: "Defense", amount: 412000 },
      { industry: "Oil & Gas", amount: 287000 },
      { industry: "Finance", amount: 198000 },
    ],
    stockHoldings: [
      { company: "Lockheed Martin", value: "$340,000", committee: "Armed Services" },
      { company: "ExxonMobil", value: "$215,000", committee: "Energy & Commerce" },
      { company: "Raytheon Technologies", value: "$180,000", committee: "Armed Services" },
    ],
    voteHistory: [
      { bill: "H.R. 4421 — Defense Auth.", vote: "YES", conflict: true, date: "Today" },
      { bill: "S. 2201 — Energy Subsidy Reform", vote: "YES", conflict: true, date: "Mar 18" },
      { bill: "S. 1847 — Insulin Price Cap", vote: "NO", conflict: true, date: "Mar 12" },
      { bill: "H.R. 3390 — VA Funding", vote: "YES", conflict: false, date: "Mar 5" },
      { bill: "S. 992 — Banking Regulation", vote: "NO", conflict: true, date: "Feb 28" },
    ],
    revolvingDoor: [
      "Chief Lobbyist, American Petroleum Institute (2008–2014)",
      "VP of Government Affairs, Halliburton (2004–2008)",
    ],
    correlation: "Votes with defense industry donors 96% of the time",
    shareText: "Sen. Robert Caldwell (R-TX) has a 94/100 conflict score today. Holds $340K in Lockheed stock while voting YES on $886B defense bill. Source: LOBBY CAM",
  },
  {
    id: 2, name: "Sen. Karen O'Brien", party: "R", state: "PA", conflictScore: 89,
    donors: [
      { industry: "Defense", amount: 334000 },
      { industry: "Pharma", amount: 221000 },
      { industry: "Insurance", amount: 176000 },
    ],
    stockHoldings: [
      { company: "General Dynamics", value: "$180,000", committee: "Armed Services" },
      { company: "Pfizer", value: "$95,000", committee: "HELP Committee" },
    ],
    voteHistory: [
      { bill: "H.R. 4421 — Defense Auth.", vote: "YES", conflict: true, date: "Today" },
      { bill: "S. 1847 — Insulin Price Cap", vote: "NO", conflict: true, date: "Mar 12" },
      { bill: "S. 1102 — Drug Import Act", vote: "NO", conflict: true, date: "Mar 1" },
    ],
    revolvingDoor: ["Registered Lobbyist, Lockheed Martin (2014–2019)"],
    correlation: "Votes with defense donors 91% of the time",
    shareText: "Sen. Karen O'Brien (R-PA): Former Lockheed lobbyist now voting YES on defense bills. Conflict score: 89/100.",
  },
  {
    id: 3, name: "Sen. Margaret Whitfield", party: "D", state: "VA", conflictScore: 82,
    donors: [
      { industry: "Defense", amount: 298000 },
      { industry: "Tech", amount: 245000 },
      { industry: "Finance", amount: 156000 },
    ],
    stockHoldings: [
      { company: "Northrop Grumman", value: "$260,000", committee: "Intelligence" },
      { company: "Microsoft", value: "$120,000", committee: "Commerce" },
    ],
    voteHistory: [
      { bill: "H.R. 4421 — Defense Auth.", vote: "YES", conflict: true, date: "Today" },
      { bill: "S. 3010 — AI Regulation", vote: "NO", conflict: true, date: "Mar 15" },
    ],
    revolvingDoor: [],
    correlation: "Votes with defense donors 91% of the time",
    shareText: "Sen. Margaret Whitfield (D-VA): Holds $260K Northrop Grumman stock. Votes with defense donors 91%. Conflict score: 82.",
  },
  {
    id: 4, name: "Sen. Scott Brennan", party: "R", state: "GA", conflictScore: 78,
    donors: [
      { industry: "Defense", amount: 189000 },
      { industry: "Agriculture", amount: 167000 },
      { industry: "Pharma", amount: 143000 },
    ],
    stockHoldings: [
      { company: "Raytheon Technologies", value: "$150,000", committee: "Armed Services" },
    ],
    voteHistory: [
      { bill: "H.R. 4421 — Defense Auth.", vote: "YES", conflict: true, date: "Today" },
    ],
    revolvingDoor: ["Spouse: VP of Gov't Relations, Raytheon Technologies (2021–present)"],
    correlation: "Votes with pharma donors 87% of the time",
    shareText: "Sen. Scott Brennan (R-GA): Spouse works at Raytheon while he votes on defense spending. Conflict score: 78.",
  },
  {
    id: 5, name: "Sen. Carl Lindgren", party: "R", state: "NE", conflictScore: 73,
    donors: [
      { industry: "Defense", amount: 221000 },
      { industry: "Agriculture", amount: 198000 },
      { industry: "Energy", amount: 134000 },
    ],
    stockHoldings: [
      { company: "Boeing", value: "$220,000", committee: "Armed Services" },
      { company: "BAE Systems", value: "$85,000", committee: "Armed Services" },
    ],
    voteHistory: [
      { bill: "H.R. 4421 — Defense Auth.", vote: "YES", conflict: true, date: "Today" },
    ],
    revolvingDoor: [],
    correlation: "Votes with defense donors 84% of the time",
    shareText: "Sen. Carl Lindgren (R-NE): $220K Boeing stock + $54K from BAE PAC. Conflict score: 73.",
  },
  {
    id: 6, name: "Sen. William Patterson", party: "R", state: "SC", conflictScore: 67,
    donors: [
      { industry: "Defense", amount: 276000 },
      { industry: "Finance", amount: 134000 },
      { industry: "Real Estate", amount: 98000 },
    ],
    stockHoldings: [
      { company: "General Dynamics", value: "$95,000", committee: "Appropriations" },
    ],
    voteHistory: [
      { bill: "H.R. 4421 — Defense Auth.", vote: "YES", conflict: true, date: "Today" },
    ],
    revolvingDoor: ["Legislative Director, Senate Appropriations Cmte (2006–2012)"],
    correlation: "Votes with defense donors 79% of the time",
    shareText: "Sen. William Patterson (R-SC): General Dynamics is career top donor at $112K. Conflict score: 67.",
  },
];

export const LOBBY_FILINGS_DATA: Filing[] = [
  { id: 1, lobbyist: "David Thornton", firm: "Capitol Strategy Group", client: "Lockheed Martin", industry: "DEFENSE", memberMet: "Sen. R. Caldwell (R-TX)", committee: "Armed Services", timestamp: "2:14 PM ET", activeConflict: true },
  { id: 2, lobbyist: "Rachel Stein", firm: "Akin Gump Strauss", client: "PhRMA", industry: "PHARMA", memberMet: "Sen. K. O'Brien (R-PA)", committee: "HELP Committee", timestamp: "1:58 PM ET", activeConflict: true },
  { id: 3, lobbyist: "Marcus Webb", firm: "Invariant LLC", client: "Koch Industries", industry: "ENERGY", memberMet: "Rep. J. Hargrove (R-AL)", committee: "Energy & Commerce", timestamp: "1:41 PM ET", activeConflict: false },
  { id: 4, lobbyist: "Jennifer Liu", firm: "Brownstein Hyatt", client: "Boeing", industry: "DEFENSE", memberMet: "Sen. C. Lindgren (R-NE)", committee: "Armed Services", timestamp: "1:22 PM ET", activeConflict: true },
  { id: 5, lobbyist: "Thomas Reeves", firm: "Holland & Knight", client: "Goldman Sachs", industry: "FINANCE", memberMet: "Sen. D. McAllister (R-OH)", committee: "Banking", timestamp: "12:55 PM ET", activeConflict: false },
  { id: 6, lobbyist: "Sarah Blackwell", firm: "Squire Patton Boggs", client: "Raytheon Technologies", industry: "DEFENSE", memberMet: "Sen. S. Brennan (R-GA)", committee: "Armed Services", timestamp: "12:38 PM ET", activeConflict: true },
  { id: 7, lobbyist: "Andrew Kim", firm: "Cornerstone Gov't Affairs", client: "Pfizer", industry: "PHARMA", memberMet: "Sen. M. Whitfield (D-VA)", committee: "HELP Committee", timestamp: "12:15 PM ET", activeConflict: false },
  { id: 8, lobbyist: "Laura Medina", firm: "BGR Group", client: "Northrop Grumman", industry: "DEFENSE", memberMet: "Sen. W. Patterson (R-SC)", committee: "Appropriations", timestamp: "11:47 AM ET", activeConflict: true },
  { id: 9, lobbyist: "Charles Novak", firm: "Cassidy & Associates", client: "American Petroleum Institute", industry: "ENERGY", memberMet: "Rep. F. Dominguez (D-AZ)", committee: "Natural Resources", timestamp: "11:20 AM ET", activeConflict: false },
  { id: 10, lobbyist: "Diana Foster", firm: "Peck Madigan Jones", client: "UnitedHealth Group", industry: "INSURANCE", memberMet: "Sen. E. Morano (D-VT)", committee: "Finance", timestamp: "10:55 AM ET", activeConflict: false },
];

export const EXTRA_FILINGS: Filing[] = [
  { id: 11, lobbyist: "Robert Kwon", firm: "Tarplin, Downs & Young", client: "General Dynamics", industry: "DEFENSE", memberMet: "Sen. R. Caldwell (R-TX)", committee: "Armed Services", timestamp: "Just now", activeConflict: true },
  { id: 12, lobbyist: "Patricia Dunn", firm: "Fierce Gov't Relations", client: "Merck & Co.", industry: "PHARMA", memberMet: "Sen. K. O'Brien (R-PA)", committee: "HELP Committee", timestamp: "Just now", activeConflict: true },
  { id: 13, lobbyist: "James Okonkwo", firm: "Capitol Counsel", client: "Chevron", industry: "ENERGY", memberMet: "Rep. T. Nakamura (D-HI)", committee: "Energy & Commerce", timestamp: "Just now", activeConflict: false },
  { id: 14, lobbyist: "Emily Strauss", firm: "Van Scoyoc Associates", client: "L3Harris Technologies", industry: "DEFENSE", memberMet: "Sen. S. Brennan (R-GA)", committee: "Armed Services", timestamp: "Just now", activeConflict: true },
];

export const TICKER_ITEMS: TickerItem[] = [
  { id: 1, text: "⚠ SEN. CALDWELL VOTING ON DEFENSE BILL — HOLDS $340K LOCKHEED STOCK", severity: "high" },
  { id: 2, text: "⚠ 14 DEFENSE LOBBYISTS FILED ACTIVITY REPORTS IN LAST 48 HOURS", severity: "high" },
  { id: 3, text: "● SENATE VOTE IN PROGRESS: H.R. 4421 DEFENSE APPROPRIATIONS — $886B", severity: "medium" },
  { id: 4, text: "⚠ SEN. O'BRIEN (R-PA) — FORMER LOCKHEED LOBBYIST — VOTING YES ON DEFENSE BILL", severity: "high" },
  { id: 5, text: "● LOBBY WIRE: RAYTHEON LOBBYIST MET WITH SEN. BRENNAN 90 MIN BEFORE VOTE", severity: "high" },
  { id: 6, text: "● 6 OF 15 YES VOTERS HOLD DEFENSE CONTRACTOR STOCK — EXPOSED TOTAL: $1.27M", severity: "high" },
  { id: 7, text: "⚠ FEC FILING: BOEING PAC DONATED $54K TO SEN. LINDGREN IN Q4 2025", severity: "medium" },
  { id: 8, text: "● HOUSE SCHEDULE: PHARMA PRICING BILL H.R. 5580 — COMMITTEE MARKUP TOMORROW 10AM", severity: "low" },
];

export const PAST_VOTES: PastVote[] = [
  { bill: "S. 2201", title: "Energy Subsidy Reform Act", date: "Mar 18, 2026", conflictedVotes: 11, totalVotes: 54, finding: "11 of 54 YES voters received oil & gas PAC money in 2025" },
  { bill: "S. 1847", title: "Insulin Price Cap Act", date: "Mar 12, 2026", conflictedVotes: 8, totalVotes: 42, finding: "8 of 42 NO voters held pharma stock totaling $2.1M" },
  { bill: "S. 3010", title: "AI Transparency Act", date: "Mar 15, 2026", conflictedVotes: 6, totalVotes: 38, finding: "6 NO voters received $1.4M combined from Big Tech PACs" },
  { bill: "S. 992", title: "Banking Regulation Rollback", date: "Feb 28, 2026", conflictedVotes: 14, totalVotes: 51, finding: "14 of 51 YES voters are top recipients of Wall Street donations" },
  { bill: "H.R. 3390", title: "VA Healthcare Expansion", date: "Mar 5, 2026", conflictedVotes: 3, totalVotes: 67, finding: "Lowest conflict rate this session — 3 of 67 voters flagged" },
  { bill: "S. 1102", title: "Drug Import Safety Act", date: "Mar 1, 2026", conflictedVotes: 9, totalVotes: 44, finding: "9 of 44 NO voters received pharma industry donations exceeding $100K" },
];

// C-SPAN's live network pages. embedUrl is the same live page; C-SPAN may send
// anti-framing headers on some domains, so the UI always shows a visible
// "open live feed" fallback link (watchUrl) that works regardless. Swap these
// URLs here if a different stream renders better on the production domain.
export const CSPAN_CHANNELS: CspanChannel[] = [
  {
    id: "c-span-2",
    label: "Senate",
    embedUrl: "https://www.c-span.org/networks/?channel=c-span-2",
    watchUrl: "https://www.c-span.org/networks/?channel=c-span-2",
  },
  {
    id: "c-span",
    label: "House",
    embedUrl: "https://www.c-span.org/networks/?channel=c-span",
    watchUrl: "https://www.c-span.org/networks/?channel=c-span",
  },
  {
    id: "c-span-3",
    label: "C-SPAN 3",
    embedUrl: "https://www.c-span.org/networks/?channel=c-span-3",
    watchUrl: "https://www.c-span.org/networks/?channel=c-span-3",
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
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function partyLabel(p: string): string {
  return p === "R" ? "Republican" : p === "D" ? "Democrat" : "Independent";
}

// URL-friendly slug for member profile pages, e.g.
// "Sen. Robert Caldwell" -> "robert-caldwell". Once the real member roster
// is loaded, these pages should switch to canonical Bioguide IDs with the
// name slug as a redirect (battle plan Task 33).
export function memberSlug(member: Member): string {
  return member.name
    .replace(/^(Sen\.|Rep\.)\s+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getMemberBySlug(slug: string): Member | undefined {
  return MEMBERS.find((m) => memberSlug(m) === slug);
}
