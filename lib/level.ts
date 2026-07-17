// ═══════════════════════════════════════════════════════════════════════
// LOBBY CAM THREAT LEVELS — a DEFCON-style escalation model for the site.
// ═══════════════════════════════════════════════════════════════════════
//
// The whole posture of the page — what it leads with, how loud it is — is
// driven by how live congressional floor activity is *right now*:
//
//   LEVEL 3 · ROUTINE   The floor is quiet (the usual state). Research mode:
//                       PAC funding, dark money, donor→contract conflicts,
//                       dug out of public records.
//   LEVEL 2 · ELEVATED  Congress is in session and members are speaking, but
//                       no recorded vote. Live coverage of who's on the floor,
//                       with conflict chyrons: who's talking, and who paid them.
//   LEVEL 1 · CRITICAL  A recorded roll-call vote is underway. Full spectacle —
//                       play-by-play positions as they land, each flagged
//                       against the member's donors and holdings.
//
// Congress almost never holds a recorded vote at any given moment, so LEVEL 3
// is the honest default. LOBBY CAM is a research tool that ESCALATES into a
// live broadcast when the floor heats up — instead of sitting on a dead
// "no vote in progress" box as the main event.
//
// Scaffolding status (see PROGRESS.md for the full roadmap):
//   - The level MODEL + derivation + banner are built and live.
//   - LEVEL 3 research mode is the current, working dashboard.
//   - LEVEL 1 / LEVEL 2 modes are scaffolded shells with honest placeholders
//     for the spectacle features that still need the red-tier data pipeline.

export type AlertLevel = 1 | 2 | 3;

export interface LevelMeta {
  level: AlertLevel;
  /** Short badge label, e.g. "LEVEL 3". */
  code: string;
  /** One-word state name, e.g. "Routine". */
  name: string;
  /** CSS color (var or hex) that themes the banner for this level. */
  color: string;
  /** One-line "what's happening" headline. */
  headline: string;
  /** How-to-read framing for this state. */
  blurb: string;
}

export const LEVELS: Record<AlertLevel, LevelMeta> = {
  3: {
    level: 3,
    code: "LEVEL 3",
    name: "Routine",
    color: "var(--blue)",
    headline: "The floor is quiet — follow the money.",
    blurb:
      "No live floor action. LOBBY CAM is in research mode: PAC funding, contract flows, and donor conflicts, all sourced from public records.",
  },
  2: {
    level: 2,
    code: "LEVEL 2",
    name: "Elevated",
    color: "#B8860B",
    headline: "The floor is live — watch who's talking, and who paid for them.",
    blurb:
      "Congress is in session and members are speaking. Live floor coverage with conflict chyrons: who's at the microphone, and the money behind them.",
  },
  1: {
    level: 1,
    code: "LEVEL 1",
    name: "Critical",
    color: "var(--red)",
    headline: "LIVE VOTE — every position, every conflict, in real time.",
    blurb:
      "A recorded roll-call vote is underway. Full play-by-play: senators' positions as they land, flagged against their donors and holdings.",
  },
};

/** Ordered high→low for rendering the DEFCON meter (3 · 2 · 1). */
export const LEVEL_SCALE: AlertLevel[] = [3, 2, 1];

export interface LevelSignals {
  /** A recorded roll-call vote is live right now (GovTrack). Drives LEVEL 1. */
  liveVote: boolean;
  /**
   * The floor is in session / a member is speaking, but no recorded vote.
   * Drives LEVEL 2. `null` means "unknown" — we can't yet detect this reliably
   * (see PROGRESS.md), and we deliberately do NOT claim the floor is live
   * when we're unsure. Fabricating an "elevated" state would violate the
   * no-fake-data rule the whole site is built on.
   */
  floorInSession: boolean | null;
}

/** Map the current live signals to a threat level. Highest activity wins. */
export function deriveLevel(signals: LevelSignals): AlertLevel {
  if (signals.liveVote) return 1;
  if (signals.floorInSession === true) return 2;
  return 3;
}

/**
 * Optional preview override for development / QA. `?level=1|2|3` forces a level
 * so the LEVEL 1 / LEVEL 2 scaffolding can be seen without waiting for a live
 * floor. Returns null for anything else. This ONLY changes which layout renders
 * — it never fabricates vote or conflict data; scaffolded modes still show their
 * honest "not built yet" placeholders.
 */
export function parseLevelOverride(value: string | null | undefined): AlertLevel | null {
  if (value === "1") return 1;
  if (value === "2") return 2;
  if (value === "3") return 3;
  return null;
}
